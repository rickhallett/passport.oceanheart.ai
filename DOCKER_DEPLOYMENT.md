# Docker Deployment Guide

Complete guide for deploying Oceanheart Passport using Docker in both development and production environments.

## Architecture Overview

The Docker setup includes:
- **Multi-stage Dockerfile**: Optimized builds for development and production
- **PostgreSQL**: Database server
- **Redis**: Cache and session store
- **Nginx**: Reverse proxy with SSL termination (production)
- **Certbot**: Automatic SSL certificate management (production)

## Development Setup

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/rickhallett/passport.oceanheart.ai.git
   cd passport.oceanheart.ai
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start the development stack**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Application: http://lvh.me:8004
   - Database: localhost:5432
   - Redis: localhost:6379

### Development Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f web

# Run Rails console
docker-compose exec web rails console

# Run migrations
docker-compose exec web rails db:migrate

# Run tests
docker-compose exec web rails test

# Stop services
docker-compose down

# Reset everything (including volumes)
docker-compose down -v
```

## Production Deployment

### Prerequisites

- Server with Docker and Docker Compose installed
- Domain pointing to your server (passport.oceanheart.ai)
- Ports 80 and 443 open

### Initial Setup

1. **Clone the repository on your server**
   ```bash
   git clone https://github.com/rickhallett/passport.oceanheart.ai.git
   cd passport.oceanheart.ai
   ```

2. **Create production environment file**
   ```bash
   cp .env.production.example .env.production
   ```

3. **Configure environment variables**
   ```bash
   # Generate secret key
   docker run --rm passport-oceanheart:latest rails secret
   
   # Edit .env.production with:
   # - Generated secret key
   # - Strong database password
   # - Redis password
   # - Email configuration
   # - Monitoring keys (optional)
   nano .env.production
   ```

4. **Build production image**
   ```bash
   docker-compose -f docker-compose.production.yml build
   ```

5. **Initialize SSL certificates**
   ```bash
   # Create certificate directories
   mkdir -p certbot/conf certbot/www
   
   # Get initial certificate
   docker-compose -f docker-compose.production.yml run --rm certbot certonly \
     --webroot -w /var/www/certbot \
     --email admin@oceanheart.ai \
     --agree-tos \
     --no-eff-email \
     -d passport.oceanheart.ai
   ```

6. **Start production stack**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

7. **Initialize database**
   ```bash
   # Create and migrate database
   docker-compose -f docker-compose.production.yml exec web rails db:create db:migrate
   
   # Create admin user (optional)
   docker-compose -f docker-compose.production.yml exec web rails console
   > User.create!(email_address: 'admin@oceanheart.ai', password: 'secure_password', admin: true)
   ```

### Production Commands

```bash
# Start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Deploy updates
git pull
docker-compose -f docker-compose.production.yml build web
docker-compose -f docker-compose.production.yml up -d

# Backup database
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U passport passport_production > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U passport passport_production
```

## Monitoring

### Health Checks

```bash
# Application health
curl https://passport.oceanheart.ai/up

# Container status
docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats
```

### Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f web
docker-compose -f docker-compose.production.yml logs -f nginx

# Rails logs (inside container)
docker-compose -f docker-compose.production.yml exec web tail -f log/production.log
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :8004
   # Kill process or change port in docker-compose.yml
   ```

2. **Database connection issues**
   ```bash
   # Check database is running
   docker-compose exec postgres psql -U passport -c "\l"
   
   # Reset database
   docker-compose exec web rails db:drop db:create db:migrate
   ```

3. **SSL certificate issues**
   ```bash
   # Renew certificates manually
   docker-compose -f docker-compose.production.yml run --rm certbot renew
   
   # Restart nginx
   docker-compose -f docker-compose.production.yml restart nginx
   ```

4. **Asset compilation issues**
   ```bash
   # Rebuild with fresh assets
   docker-compose -f docker-compose.production.yml build --no-cache web
   ```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Network Security**
   - Keep Docker and system packages updated
   - Use firewall rules to restrict access
   - Enable fail2ban for brute force protection

3. **Backups**
   - Automate daily database backups
   - Store backups off-site
   - Test restore procedures regularly

4. **Monitoring**
   - Set up alerts for service failures
   - Monitor disk space and memory usage
   - Review logs for suspicious activity

## Performance Optimization

1. **Docker Settings**
   ```yaml
   # Increase Docker memory limit
   # Edit ~/.docker/daemon.json
   {
     "memory": 4096,
     "cpus": 2
   }
   ```

2. **Database Tuning**
   ```bash
   # Connect to postgres
   docker-compose exec postgres psql -U passport
   
   # Analyze query performance
   EXPLAIN ANALYZE SELECT ...;
   ```

3. **Redis Optimization**
   ```bash
   # Monitor Redis
   docker-compose exec redis redis-cli monitor
   
   # Check memory usage
   docker-compose exec redis redis-cli info memory
   ```

## Scaling

### Horizontal Scaling

1. **Multiple Web Workers**
   ```yaml
   # docker-compose.production.yml
   web:
     scale: 3  # Run 3 instances
   ```

2. **Load Balancing**
   - Use nginx upstream with multiple backends
   - Consider external load balancer (AWS ALB, etc.)

3. **Database Replication**
   - Set up read replicas
   - Use connection pooling

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/passport.oceanheart.ai
            git pull
            docker-compose -f docker-compose.production.yml build
            docker-compose -f docker-compose.production.yml up -d
            docker-compose -f docker-compose.production.yml exec -T web rails db:migrate
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/rickhallett/passport.oceanheart.ai/issues
- Documentation: https://docs.oceanheart.ai
