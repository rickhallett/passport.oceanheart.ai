# Multi-stage build for smaller image
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git nodejs npm
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build assets and binary
RUN npm install && npm run build
RUN go build -o /bin/app

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/
COPY --from=builder /bin/app .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations

ENV GO_ENV=production
EXPOSE 3000

CMD ["./app"]