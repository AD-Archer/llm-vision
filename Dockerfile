# Multi-stage build for Next.js application

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile
# Generate Prisma Client (postinstall scripts are disabled in this environment)
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Stage 2: Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for runtime
RUN npm install -g pnpm

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod
# Generate Prisma Client for runtime
RUN pnpm prisma generate

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/prisma ./prisma

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run migrations then start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
