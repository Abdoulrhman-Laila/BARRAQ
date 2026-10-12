# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* must be present at build time to be inlined into the browser bundle.
ARG NEXT_PUBLIC_API_BINDING_ENABLED=true
ARG NEXT_PUBLIC_APP_NAME=لوحة تحكم برّاق
ARG NEXT_PUBLIC_DEFAULT_LOCALE=ar
ARG NEXT_PUBLIC_DASHBOARD_VERSION=1.0.0
ARG API_BINDING_ENABLED=true
ENV NEXT_PUBLIC_API_BINDING_ENABLED=$NEXT_PUBLIC_API_BINDING_ENABLED \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE \
    NEXT_PUBLIC_DASHBOARD_VERSION=$NEXT_PUBLIC_DASHBOARD_VERSION \
    API_BINDING_ENABLED=$API_BINDING_ENABLED
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_BINDING_ENABLED=true \
    NEXT_PUBLIC_API_BINDING_ENABLED=true
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
