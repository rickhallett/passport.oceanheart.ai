# syntax=docker/dockerfile:1
# check=error=true

# Multi-stage Dockerfile for Oceanheart Passport
# Supports both development and production environments

ARG RUBY_VERSION=3.4.5
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base

# Rails app lives here
WORKDIR /rails

# Install base packages
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    curl \
    libjemalloc2 \
    libvips \
    postgresql-client \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build gems
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    git \
    libpq-dev \
    libyaml-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy Gemfile first for better layer caching
COPY Gemfile Gemfile.lock ./

# Development stage - includes all gems
FROM build AS development

ENV RAILS_ENV="development" \
    BUNDLE_PATH="/usr/local/bundle"

# Install all gems including development
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache

# Copy application code
COPY . .

# Create directories for pids and logs
RUN mkdir -p tmp/pids log

# Expose port 5555 for development
EXPOSE 5555

# Use development entrypoint
ENTRYPOINT ["/rails/bin/docker-entrypoint-dev"]
CMD ["./bin/rails", "server", "-b", "0.0.0.0", "-p", "5555"]

# Production build stage
FROM build AS production-build

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test"

# Install production gems only
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy application code
COPY . .

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Precompiling assets for production without requiring secret RAILS_MASTER_KEY
RUN SECRET_KEY_BASE_DUMMY=1 ./bin/rails assets:precompile

# Final production stage
FROM base AS production

# Copy built artifacts: gems, application
COPY --from=production-build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=production-build /rails /rails

# Set production environment
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test" \
    RAILS_LOG_TO_STDOUT="true" \
    RAILS_SERVE_STATIC_FILES="true"

# Run and own only the runtime files as a non-root user for security
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp
USER 1000:1000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5555/up || exit 1

# Entrypoint prepares the database
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Expose port 5555 (we'll use nginx/traefik for SSL termination)
EXPOSE 5555

# Start server via puma by default
CMD ["./bin/rails", "server", "-b", "0.0.0.0", "-p", "5555"]