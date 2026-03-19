# ================================
# Stage 1: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm install typescript -g
RUN tsc

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
# Express serves from `dist/public` (see `src/api/server.ts`)
COPY --from=builder /app/src/public ./dist/public
# Migration runner reads `schema.sql` relative to `dist/db` (see `src/db/migrate.ts`)
COPY --from=builder /app/src/db/schema.sql ./dist/db/schema.sql

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
