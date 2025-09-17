#!/bin/bash

# Authentication Test Suite for Centralized Auth Server
# Tests all authentication endpoints and flows

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8004}"
API_BASE="${BASE_URL}/api"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    local test_name="$1"
    echo -e "\n${YELLOW}Running:${NC} $test_name"
    ((TESTS_RUN++))
}

# Check if server is running
check_server() {
    log_info "Checking if server is running at $BASE_URL..."
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/up")
    if [ "$http_code" = "200" ]; then
        log_success "Server is running"
    else
        log_error "Server is not responding at $BASE_URL (HTTP $http_code)"
        echo "Please start the server with: bin/rails server -p 8004"
        exit 1
    fi
}

# Test signin endpoint
test_signin() {
    run_test "POST /api/auth/signin"
    
    local response=$(curl -s -X POST --max-time 5 \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
        -c cookies.txt \
        "$API_BASE/auth/signin")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Response: $response"
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Signin successful"
        
        # Extract token and userId (handle potential whitespace)
        TOKEN=$(echo "$response" | sed 's/.*"token":"\([^"]*\)".*/\1/')
        USER_ID=$(echo "$response" | sed 's/.*"userId":\([0-9]*\).*/\1/')
        
        if [ -n "$TOKEN" ]; then
            log_success "Token received: ${TOKEN:0:20}..."
            echo "$TOKEN" > .test_token
        else
            log_error "No token in response"
        fi
        
        if [ -n "$USER_ID" ]; then
            log_success "User ID received: $USER_ID"
        else
            log_error "No userId in response"
        fi
        
        # Check for oh_session cookie
        if grep -q "oh_session" cookies.txt; then
            log_success "oh_session cookie set"
        else
            log_error "oh_session cookie not found"
        fi
    else
        log_error "Signin failed"
        echo "Response: $response"
    fi
}

# Test verify endpoint
test_verify() {
    run_test "POST /api/auth/verify"
    
    # Test with token in body
    if [ -f .test_token ]; then
        TOKEN=$(cat .test_token)
        
        local response=$(curl -s -X POST --max-time 5 \
            -H "Content-Type: application/json" \
            -d "{\"token\":\"$TOKEN\"}" \
            "$API_BASE/auth/verify")
        
        if [ "$VERBOSE" = "true" ]; then
            echo "Response: $response"
        fi
        
        if echo "$response" | grep -q '"valid":true'; then
            log_success "Token verification successful (body)"
        else
            log_error "Token verification failed (body)"
            echo "Response: $response"
        fi
    fi
    
    # Test with cookie
    local response=$(curl -s -X POST --max-time 5 \
        -b cookies.txt \
        "$API_BASE/auth/verify")
    
    if echo "$response" | grep -q '"valid":true'; then
        log_success "Token verification successful (cookie)"
    else
        log_error "Token verification failed (cookie)"
    fi
}

# Test refresh endpoint
test_refresh() {
    run_test "POST /api/auth/refresh"
    
    local response=$(curl -s -X POST --max-time 5 \
        -b cookies.txt \
        -c cookies.txt \
        "$API_BASE/auth/refresh")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Response: $response"
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Token refresh successful"
        
        # Update stored token
        NEW_TOKEN=$(echo "$response" | sed 's/.*"token":"\([^"]*\)".*/\1/')
        if [ -n "$NEW_TOKEN" ]; then
            echo "$NEW_TOKEN" > .test_token
            log_success "New token received"
        fi
    else
        log_error "Token refresh failed"
        echo "Response: $response"
    fi
}

# Test user endpoint
test_user() {
    run_test "GET /api/auth/user"
    
    local response=$(curl -s -X GET --max-time 5 \
        -b cookies.txt \
        "$API_BASE/auth/user")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Response: $response"
    fi
    
    if echo "$response" | grep -q '"userId"'; then
        log_success "User endpoint successful"
    else
        log_error "User endpoint failed"
        echo "Response: $response"
    fi
}

# Test signout endpoint
test_signout() {
    run_test "DELETE /api/auth/signout"
    
    local response=$(curl -s -X DELETE --max-time 5 \
        -b cookies.txt \
        -c cookies.txt \
        "$API_BASE/auth/signout")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Response: $response"
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Signout successful"
        
        # Verify cookie is cleared
        if ! grep -q "oh_session" cookies.txt || grep "oh_session.*deleted" cookies.txt; then
            log_success "oh_session cookie cleared"
        else
            log_warning "oh_session cookie may not be cleared"
        fi
    else
        log_error "Signout failed"
        echo "Response: $response"
    fi
}

# Test returnTo parameter
test_return_to() {
    run_test "ReturnTo Parameter Handling"
    
    local return_url="https://app.oceanheart.ai/dashboard"
    local signin_url="${BASE_URL}/sign_in?returnTo=${return_url}"
    
    # Check if returnTo is preserved in form
    local response=$(curl -s -L "$signin_url")
    
    if echo "$response" | grep -q "value=\"$return_url\""; then
        log_success "ReturnTo parameter preserved in form"
    else
        log_error "ReturnTo parameter not found in form"
    fi
}

# Test CORS headers
test_cors() {
    run_test "CORS Headers"
    
    local origin="https://app.oceanheart.ai"
    local response=$(curl -s -I -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: POST" \
        "$API_BASE/auth/verify")
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Headers: $response"
    fi
    
    if echo "$response" | grep -qi "access-control-allow-origin"; then
        log_success "CORS headers present"
    else
        log_warning "CORS headers not found (may be OK if not in production mode)"
    fi
}

# Test invalid credentials
test_invalid_signin() {
    run_test "POST /api/auth/signin (invalid credentials)"
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"invalid@example.com","password":"wrongpassword"}' \
        "$API_BASE/auth/signin")
    
    if echo "$response" | grep -q '"success":false'; then
        log_success "Invalid signin properly rejected"
    else
        log_error "Invalid signin not properly handled"
        echo "Response: $response"
    fi
}

# Test invalid token
test_invalid_token() {
    run_test "POST /api/auth/verify (invalid token)"
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"token":"invalid.token.here"}' \
        "$API_BASE/auth/verify")
    
    if echo "$response" | grep -q '"valid":false'; then
        log_success "Invalid token properly rejected"
    else
        log_error "Invalid token not properly handled"
        echo "Response: $response"
    fi
}

# Cleanup
cleanup() {
    rm -f cookies.txt .test_token
    log_info "Cleaned up temporary files"
}

# Print summary
print_summary() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Test Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "Tests Run:    ${TESTS_RUN}"
    echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Authentication Test Suite${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "Base URL: $BASE_URL"
    echo -e "Test Email: $TEST_EMAIL"
    echo -e "Verbose: $VERBOSE"
    
    # Create test user if needed
    log_info "Note: Ensure test user exists with email: $TEST_EMAIL"
    
    # Run tests
    check_server
    
    # Valid flow tests
    test_signin
    test_verify
    test_refresh
    test_user
    test_signout
    
    # Invalid flow tests
    test_invalid_signin
    test_invalid_token
    
    # Additional tests
    test_return_to
    test_cors
    
    # Cleanup and summary
    cleanup
    print_summary
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            API_BASE="${BASE_URL}/api"
            shift 2
            ;;
        --email)
            TEST_EMAIL="$2"
            shift 2
            ;;
        --password)
            TEST_PASSWORD="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --url URL        Base URL (default: http://localhost:8004)"
            echo "  --email EMAIL    Test email (default: test@example.com)"
            echo "  --password PASS  Test password (default: password123)"
            echo "  --verbose, -v    Verbose output"
            echo "  --help, -h       Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
    esac
done

# Run main function
main
