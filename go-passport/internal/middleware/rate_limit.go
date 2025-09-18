package middleware

import (
	"net/http"
	"sync"
	"time"
)

type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
	rate    int
	window  time.Duration
}

type tokenBucket struct {
	tokens    int
	lastRefill time.Time
}

func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*tokenBucket),
		rate:    rate,
		window:  window,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

func (rl *RateLimiter) Limit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clientIP := getClientIP(r)
		
		if !rl.Allow(clientIP) {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}

func (rl *RateLimiter) LimitEndpoint(endpoint string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			clientIP := getClientIP(r)
			key := endpoint + ":" + clientIP
			
			if !rl.Allow(key) {
				http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
				return
			}

			next(w, r)
		}
	}
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	bucket, exists := rl.buckets[key]
	now := time.Now()

	if !exists {
		// Create new bucket
		rl.buckets[key] = &tokenBucket{
			tokens:     rl.rate - 1,
			lastRefill: now,
		}
		return true
	}

	// Calculate elapsed time and refill tokens
	elapsed := now.Sub(bucket.lastRefill)
	tokensToAdd := int(elapsed / (rl.window / time.Duration(rl.rate)))
	
	if tokensToAdd > 0 {
		bucket.tokens = min(rl.rate, bucket.tokens + tokensToAdd)
		bucket.lastRefill = now
	}

	// Check if request is allowed
	if bucket.tokens > 0 {
		bucket.tokens--
		return true
	}

	return false
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		
		// Remove buckets that haven't been used for 2x the window duration
		for key, bucket := range rl.buckets {
			if now.Sub(bucket.lastRefill) > 2 * rl.window {
				delete(rl.buckets, key)
			}
		}
		
		rl.mu.Unlock()
	}
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	return r.RemoteAddr
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}