# Use the official Bun image
FROM oven/bun:1 as base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-slim as production

WORKDIR /app

# Copy package files
COPY package.json bun.lock bunfig.toml ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/src ./src

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/hello || exit 1

# Start the application
CMD ["bun", "run", "start"]
