# Backend Dockerfile for ProxyCDN API
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NODE_ENV=production
# Fix permissions for node_modules binaries
RUN chmod -R +x node_modules/.bin && npm run build

# Production image, copy all the files and run nuxt
FROM base AS runner
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=5001

# Copy built application
COPY --from=builder /app/.output /app/.output

# Executar como root para compatibilidade
USER root

EXPOSE 5001

ENV PORT=5001

CMD ["node", ".output/server/index.mjs"]