# Dockerfile - Multi-stage build for SpriteBox
FROM node:20-alpine AS builder

WORKDIR /app

# pnpm installieren
RUN npm install -g pnpm

# Dependencies installieren
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Source kopieren und builden
COPY . .
RUN pnpm build

# Production Image
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# Nur benötigte Dateien kopieren
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist apps/server/dist/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["pnpm", "--filter", "server", "start"]
