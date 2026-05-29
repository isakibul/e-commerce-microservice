# syntax=docker/dockerfile:1.7

FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/order/package*.json ./services/order/
WORKDIR /repo/services/order
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  npm ci --ignore-scripts --no-audit --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000

COPY services/order/prisma ./prisma
COPY services/order/prisma.config.ts services/order/tsconfig.json ./
COPY services/order/src ./src

RUN npm run build

EXPOSE 4007

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
