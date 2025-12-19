# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/api-principal/package*.json ./
COPY services/api-principal/tsconfig.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY services/api-principal/src ./src
COPY vendor/tinybone ./vendor/tinybone

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install production dependencies only
COPY services/api-principal/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/src/views ./views

# static/public assets
COPY --from=builder --chown=nodejs:nodejs /app/src/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/vendor/tinybone ./public/vendor/tinybone

# templates Dust
COPY --from=builder --chown=nodejs:nodejs /app/src/views ./views

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
