# Use official Bun image
FROM oven/bun:1.2-alpine as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S elysia -u 1001

# Change ownership of the app directory
RUN chown -R elysia:nodejs /app
USER elysia

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/up || exit 1

# Start the application
CMD ["bun", "src/server.ts"]