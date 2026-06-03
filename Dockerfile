# ── Stage 1: Build ───────────────────────────────────────────────────────────
# Uses Node 20 Alpine for a lean build image
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cached layer unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build the production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
# Minimal Nginx Alpine image — no Node runtime in production
FROM nginx:1.25-alpine

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy hardened Nginx config (SPA routing + gzip + security headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root for additional security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
