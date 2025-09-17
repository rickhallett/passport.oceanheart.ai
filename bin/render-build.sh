#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Starting Render build process for Passport..."

# Install Ruby dependencies
echo "Installing Ruby dependencies..."
bundle install

# Install JavaScript dependencies if needed
# echo "Installing JavaScript dependencies..."
# yarn install --frozen-lockfile

# Precompile assets
echo "Precompiling assets..."
bundle exec rails assets:precompile

# Clean assets to reduce slug size
echo "Cleaning assets..."
bundle exec rails assets:clean

# Run database migrations
echo "Running database migrations..."
bundle exec rails db:migrate

# Seed database with required records
echo "Loading database seeds..."
bundle exec rails db:seed

echo "Build complete!"