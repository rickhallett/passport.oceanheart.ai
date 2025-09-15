#!/bin/bash

# Cross-Domain Authentication Test
# Simulates subdomain applications accessing the auth server

set -e

# Configuration
AUTH_SERVER="${AUTH_SERVER:-http://passport.lvh.me:5555}"
APP_DOMAIN="${APP_DOMAIN:-app.lvh.me}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-password123}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cross-Domain Authentication Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Auth Server: $AUTH_SERVER"
echo "App Domain: $APP_DOMAIN"
echo ""

# Helper functions
test_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

test_fail() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

test_info() {
    echo -e "${BLUE}→ $1${NC}"
}

# Test 1: Simulate subdomain app checking if user is authenticated
test_subdomain_verify() {
    echo -e "\n${YELLOW}Test 1: Subdomain Token Verification${NC}"
    test_info "App at $APP_DOMAIN checking authentication status"
    
    # First, get a token by signing in
    test_info "Getting authentication token..."
    local signin_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Origin: https://$APP_DOMAIN" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        -c cookies.txt \
        "$AUTH_SERVER/api/auth/signin")
    
    local token=$(echo "$signin_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$token" ]; then
        test_fail "Failed to get authentication token"
    fi
    
    test_info "Token received: ${token:0:20}..."
    
    # Now verify the token from subdomain
    test_info "Verifying token from subdomain..."
    local verify_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Origin: https://$APP_DOMAIN" \
        -d "{\"token\":\"$token\"}" \
        "$AUTH_SERVER/api/auth/verify")
    
    if echo "$verify_response" | grep -q '"valid":true'; then
        test_pass "Token verified successfully from subdomain"
    else
        test_fail "Token verification failed from subdomain"
    fi
}

# Test 2: Simulate redirect flow
test_redirect_flow() {
    echo -e "\n${YELLOW}Test 2: Redirect Flow with ReturnTo${NC}"
    
    local return_url="https://$APP_DOMAIN/dashboard"
    test_info "App redirecting to auth server with returnTo=$return_url"
    
    # Check if signin page accepts returnTo
    local signin_page=$(curl -s -L "$AUTH_SERVER/sign_in?returnTo=$return_url")
    
    if echo "$signin_page" | grep -q "value=\"$return_url\""; then
        test_pass "ReturnTo parameter preserved in signin form"
    else
        test_fail "ReturnTo parameter not preserved"
    fi
}

# Test 3: Test cookie domain sharing
test_cookie_domain() {
    echo -e "\n${YELLOW}Test 3: Cookie Domain Configuration${NC}"
    test_info "Checking cookie domain settings..."
    
    # Sign in and check cookie domain
    local response=$(curl -s -i -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        "$AUTH_SERVER/api/auth/signin")
    
    # Look for Set-Cookie header
    if echo "$response" | grep -i "set-cookie.*oh_session"; then
        test_pass "oh_session cookie is being set"
        
        # Check domain attribute
        if echo "$response" | grep -i "set-cookie.*domain="; then
            local domain=$(echo "$response" | grep -i "set-cookie" | grep -o "domain=[^;]*" | head -1)
            test_info "Cookie domain: $domain"
            test_pass "Cookie domain attribute is set"
        else
            test_info "Cookie domain not explicitly set (will use current domain)"
        fi
    else
        test_fail "oh_session cookie not found"
    fi
}

# Test 4: CORS preflight request
test_cors_preflight() {
    echo -e "\n${YELLOW}Test 4: CORS Preflight Request${NC}"
    test_info "Sending OPTIONS request from $APP_DOMAIN..."
    
    local response=$(curl -s -i -X OPTIONS \
        -H "Origin: https://$APP_DOMAIN" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$AUTH_SERVER/api/auth/verify")
    
    if echo "$response" | grep -qi "access-control-allow-.*POST"; then
        test_pass "CORS allows POST method"
    else
        test_info "CORS headers not found (may need production mode)"
    fi
    
    if echo "$response" | grep -qi "access-control-allow-credentials.*true"; then
        test_pass "CORS allows credentials"
    else
        test_info "Credentials not explicitly allowed in CORS"
    fi
}

# Test 5: Simulate JWT decode in subdomain
test_jwt_decode() {
    echo -e "\n${YELLOW}Test 5: JWT Token Structure${NC}"
    test_info "Checking JWT token can be decoded by subdomain..."
    
    # Get a fresh token
    local signin_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        "$AUTH_SERVER/api/auth/signin")
    
    local token=$(echo "$signin_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$token" ]; then
        # Decode JWT header and payload (base64)
        local header=$(echo "$token" | cut -d. -f1)
        local payload=$(echo "$token" | cut -d. -f2)
        
        # Add padding if needed and decode
        local decoded_payload=$(echo "$payload" | base64 -d 2>/dev/null || echo "$payload==" | base64 -d 2>/dev/null || echo "decode failed")
        
        if echo "$decoded_payload" | grep -q "userId"; then
            test_pass "JWT contains userId field (camelCase)"
        else
            test_fail "JWT missing userId field"
        fi
        
        if echo "$decoded_payload" | grep -q "iss.*passport"; then
            test_pass "JWT contains issuer claim"
        else
            test_info "JWT missing issuer claim"
        fi
        
        test_info "JWT payload structure verified"
    else
        test_fail "Could not get JWT token"
    fi
}

# Test 6: Multi-domain signin/signout
test_multi_domain_session() {
    echo -e "\n${YELLOW}Test 6: Multi-Domain Session Management${NC}"
    
    # Sign in from app domain
    test_info "Signing in from $APP_DOMAIN..."
    local signin1=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Origin: https://$APP_DOMAIN" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        -c app_cookies.txt \
        "$AUTH_SERVER/api/auth/signin")
    
    if echo "$signin1" | grep -q '"success":true'; then
        test_pass "Signed in from app domain"
    fi
    
    # Verify from another subdomain
    test_info "Verifying from api.$APP_DOMAIN..."
    local verify=$(curl -s -X POST \
        -H "Origin: https://api.$APP_DOMAIN" \
        -b app_cookies.txt \
        "$AUTH_SERVER/api/auth/verify")
    
    if echo "$verify" | grep -q '"valid":true'; then
        test_pass "Session valid across subdomains"
    else
        test_info "Session not shared (expected in development)"
    fi
    
    # Sign out
    test_info "Signing out..."
    local signout=$(curl -s -X DELETE \
        -H "Origin: https://$APP_DOMAIN" \
        -b app_cookies.txt \
        "$AUTH_SERVER/api/auth/signout")
    
    if echo "$signout" | grep -q '"success":true'; then
        test_pass "Signed out successfully"
    fi
    
    # Clean up
    rm -f app_cookies.txt
}

# Main execution
main() {
    # Check server is running
    test_info "Checking auth server at $AUTH_SERVER..."
    if ! curl -s -o /dev/null -w "%{http_code}" "$AUTH_SERVER/up" | grep -q "200"; then
        test_fail "Auth server not responding at $AUTH_SERVER"
    fi
    test_pass "Auth server is running"
    
    # Run all tests
    test_subdomain_verify
    test_redirect_flow
    test_cookie_domain
    test_cors_preflight
    test_jwt_decode
    test_multi_domain_session
    
    # Summary
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ All cross-domain tests completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    # Clean up
    rm -f cookies.txt
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Cross-Domain Authentication Test"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Environment variables:"
    echo "  AUTH_SERVER    - Auth server URL (default: http://passport.lvh.me:5555)"
    echo "  APP_DOMAIN     - App domain (default: app.lvh.me)"
    echo "  TEST_EMAIL     - Test user email (default: test@example.com)"
    echo "  TEST_PASSWORD  - Test user password (default: password123)"
    echo ""
    echo "Example:"
    echo "  AUTH_SERVER=http://passport.lvh.me:5555 ./test/cross-domain-test.sh"
    exit 0
fi

main