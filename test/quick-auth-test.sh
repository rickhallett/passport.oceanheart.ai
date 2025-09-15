#!/bin/bash

# Quick Authentication Test
# Simple script to test auth endpoints without complex shell features

BASE_URL="http://localhost:5555"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="password123"

echo "========================================"
echo "Quick Authentication Test"
echo "========================================"

# Test 1: Check server
echo ""
echo "Test 1: Checking server..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/up")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is running"
else
    echo "❌ Server not responding (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: Sign in
echo ""
echo "Test 2: Testing signin..."
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$BASE_URL/api/auth/signin")

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Signin successful"
    TOKEN=$(echo "$RESPONSE" | sed 's/.*"token":"\([^"]*\)".*/\1/')
    echo "   Token: ${TOKEN:0:20}..."
else
    echo "❌ Signin failed"
    echo "   Response: $RESPONSE"
fi

# Test 3: Verify token
echo ""
echo "Test 3: Testing verify..."
VERIFY_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\"}" \
    "$BASE_URL/api/auth/verify")

if echo "$VERIFY_RESPONSE" | grep -q '"valid":true'; then
    echo "✅ Token verification successful"
else
    echo "❌ Token verification failed"
    echo "   Response: $VERIFY_RESPONSE"
fi

# Test 4: Get user with cookie
echo ""
echo "Test 4: Testing user endpoint with cookie..."
USER_RESPONSE=$(curl -s -X GET \
    -H "Cookie: oh_session=$TOKEN" \
    "$BASE_URL/api/auth/user")

if echo "$USER_RESPONSE" | grep -q '"userId"'; then
    echo "✅ User endpoint successful"
else
    echo "❌ User endpoint failed"
    echo "   Response: $USER_RESPONSE"
fi

# Test 5: Sign out
echo ""
echo "Test 5: Testing signout..."
SIGNOUT_RESPONSE=$(curl -s -X DELETE \
    -H "Cookie: oh_session=$TOKEN" \
    "$BASE_URL/api/auth/signout")

if echo "$SIGNOUT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Signout successful"
else
    echo "❌ Signout failed"
    echo "   Response: $SIGNOUT_RESPONSE"
fi

# Test 6: Invalid signin
echo ""
echo "Test 6: Testing invalid signin..."
INVALID_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@example.com","password":"wrongpass"}' \
    "$BASE_URL/api/auth/signin")

if echo "$INVALID_RESPONSE" | grep -q '"success":false'; then
    echo "✅ Invalid signin properly rejected"
else
    echo "❌ Invalid signin not handled correctly"
    echo "   Response: $INVALID_RESPONSE"
fi

# Test 7: ReturnTo parameter
echo ""
echo "Test 7: Testing returnTo parameter..."
RETURN_URL="https://app.oceanheart.ai/dashboard"
SIGNIN_PAGE=$(curl -s "$BASE_URL/sign_in?returnTo=$RETURN_URL")

if echo "$SIGNIN_PAGE" | grep -q "value=\"$RETURN_URL\""; then
    echo "✅ ReturnTo parameter preserved"
else
    echo "❌ ReturnTo parameter not preserved"
fi

echo ""
echo "========================================"
echo "Test Complete!"
echo "========================================"