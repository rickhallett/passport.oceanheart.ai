package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gobuffalo/buffalo"
)

type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	
	// Clean up old entries periodically
	go rl.cleanup()
	
	return rl
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	windowStart := now.Add(-rl.window)
	
	// Get existing requests for this key
	requests := rl.requests[key]
	
	// Filter out old requests
	validRequests := []time.Time{}
	for _, req := range requests {
		if req.After(windowStart) {
			validRequests = append(validRequests, req)
		}
	}
	
	// Check if limit exceeded
	if len(validRequests) >= rl.limit {
		rl.requests[key] = validRequests
		return false
	}
	
	// Add current request
	validRequests = append(validRequests, now)
	rl.requests[key] = validRequests
	
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, requests := range rl.requests {
			validRequests := []time.Time{}
			for _, req := range requests {
				if req.After(now.Add(-rl.window)) {
					validRequests = append(validRequests, req)
				}
			}
			if len(validRequests) == 0 {
				delete(rl.requests, key)
			} else {
				rl.requests[key] = validRequests
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimit middleware factory
func RateLimit(limit int, window time.Duration) buffalo.MiddlewareFunc {
	limiter := NewRateLimiter(limit, window)
	
	return func(next buffalo.Handler) buffalo.Handler {
		return func(c buffalo.Context) error {
			// Use IP address as rate limit key
			key := c.Request().RemoteAddr
			
			if !limiter.Allow(key) {
				c.Flash().Add("danger", "Too many requests. Please try again later.")
				return c.Redirect(http.StatusTooManyRequests, "/sign_in")
			}
			
			return next(c)
		}
	}
}