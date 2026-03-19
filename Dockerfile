# ================================
# Stage 1: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

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
COPY --from=builder /app/src/public ./src/public
COPY --from=builder /app/src/db/schema.sql ./src/db/schema.sql

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
