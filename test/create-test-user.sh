#!/bin/bash

# Script to create a test user for authentication testing

set -e

# Configuration
RAILS_ENV="${RAILS_ENV:-development}"
TEST_EMAIL="${1:-test@example.com}"
TEST_PASSWORD="${2:-password123}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Creating test user...${NC}"
echo "Email: $TEST_EMAIL"
echo "Password: [hidden]"
echo "Environment: $RAILS_ENV"

# Create Rails runner script
cat << 'RUBY' > /tmp/create_test_user.rb
email = ARGV[0]
password = ARGV[1]

begin
  # Check if user already exists
  user = User.find_by(email_address: email)
  
  if user
    puts "User already exists with email: #{email}"
    puts "Updating password..."
    user.update!(password: password)
    puts "✅ Password updated successfully"
  else
    # Create new user
    user = User.create!(
      email_address: email,
      password: password,
      role: 'user'
    )
    puts "✅ User created successfully"
  end
  
  puts "\nUser details:"
  puts "  ID: #{user.id}"
  puts "  Email: #{user.email_address}"
  puts "  Role: #{user.role}"
  
rescue => e
  puts "❌ Error: #{e.message}"
  exit 1
end
RUBY

# Run the Rails script
bin/rails runner /tmp/create_test_user.rb "$TEST_EMAIL" "$TEST_PASSWORD"

# Clean up
rm -f /tmp/create_test_user.rb

echo -e "\n${GREEN}Test user ready!${NC}"
echo "You can now run: ./test/auth-test.sh --email $TEST_EMAIL --password $TEST_PASSWORD"