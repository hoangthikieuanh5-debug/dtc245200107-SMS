# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: Production Image
FROM node:20-alpine AS production

# Security: tạo non-root user riêng
RUN addgroup -g 1001 -S nodegroup && \
    adduser -u 1001 -S nodeuser -G nodegroup

WORKDIR /app

# Copy dependencies từ builder stage
COPY --from=builder --chown=nodeuser:nodegroup /build/node_modules ./node_modules

# Copy source code
COPY --chown=nodeuser:nodegroup . .

# Tạo thư mục logs với quyền phù hợp
RUN mkdir -p /app/logs && chown -R nodeuser:nodegroup /app/logs

# Security: không chạy bằng root
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
