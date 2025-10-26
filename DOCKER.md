# Docker Setup for ORFinishes Dashboard

This directory contains Docker configuration files to run the ORFinishes Dashboard with Caddy as a reverse proxy.

## Files Created

- `Dockerfile` - Multi-stage build for the Bun React application
- `docker-compose.yml` - Orchestrates Caddy and Dashboard services
- `Caddyfile` - Caddy reverse proxy configuration
- `.dockerignore` - Optimizes Docker build context

## Quick Start

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual Supabase credentials
   ```

2. **Build and start the services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Dashboard: http://localhost
   - API endpoints: http://localhost/api/*

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key_here
SUPABASE_EDGE_FUNCTION_URL=your_supabase_edge_function_url_here
SUPABASE_FUNCTIONS_URL=your_supabase_functions_url_here

# Application Configuration
NODE_ENV=production
PORT=3000
```

## Services

### Dashboard Service
- **Container:** `orfinishes-dashboard`
- **Port:** 3000 (internal)
- **Health Check:** `/api/hello` endpoint
- **Build:** Multi-stage Bun build with production optimizations

### Caddy Service
- **Container:** `orfinishes-caddy`
- **Ports:** 80 (HTTP), 443 (HTTPS)
- **Features:**
  - Reverse proxy to dashboard
  - Automatic HTTPS (when domain configured)
  - Security headers
  - Gzip compression
  - Static asset caching
  - SPA routing support

## Production Deployment

For production deployment with HTTPS:

1. **Update Caddyfile:**
   - Uncomment the domain configuration section
   - Replace `your-domain.com` with your actual domain

2. **Set up DNS:**
   - Point your domain to your server's IP address

3. **Deploy:**
   ```bash
   docker-compose up -d --build
   ```

## Development

For development with hot reloading:

```bash
# Run in development mode
bun --hot src/index.tsx
```

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build

# Scale dashboard service (if needed)
docker-compose up --scale dashboard=3
```

## Architecture

```
Internet → Caddy (Port 80/443) → Dashboard (Port 3000)
```

- Caddy handles SSL termination, compression, and security headers
- Dashboard serves the React SPA and API routes
- Both services run in a custom Docker network for isolation
