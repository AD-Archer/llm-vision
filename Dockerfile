# Use Node.js 22 Alpine for smaller image
FROM node:22-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat wget

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Provide a placeholder database URL so Prisma/Next build steps succeed without user secrets
ARG PRISMA_DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=${PRISMA_DATABASE_URL}

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat wget

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Define build argument for port with default value
ARG PORT=3000
ENV PORT=${PORT}
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy built application and generated Prisma client from base stage
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base --chown=nextjs:nodejs /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/prisma ./prisma

# Copy node_modules from base stage to include Prisma binaries
COPY --from=base --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create startup script that will regenerate Prisma if needed (before switching user)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
  echo 'if [ -z "$DATABASE_URL" ]; then' >> /app/start.sh && \
  echo '  echo "Error: DATABASE_URL environment variable is required." >&2' >> /app/start.sh && \
  echo '  echo "Pass it when running the container, e.g. -e DATABASE_URL=postgres://..." >&2' >> /app/start.sh && \
  echo '  exit 1' >> /app/start.sh && \
  echo 'fi' >> /app/start.sh && \
  echo 'echo "Generating Prisma client..."' >> /app/start.sh && \
  echo 'pnpm exec prisma generate' >> /app/start.sh && \
  echo 'echo "Running database migrations..."' >> /app/start.sh && \
  echo 'pnpm exec prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "Starting application..."' >> /app/start.sh && \
    echo 'exec node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE ${PORT}

# Health check using the configured port
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

# Start the application with startup script
CMD ["sh", "/app/start.sh"]