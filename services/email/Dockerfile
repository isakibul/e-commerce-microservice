# syntax=docker/dockerfile:1.7

FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/email/package*.json ./services/email/
WORKDIR /repo/services/email
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  npm ci --ignore-scripts --no-audit --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000

COPY services/email/prisma ./prisma
COPY services/email/prisma.config.ts services/email/tsconfig.json ./
COPY services/email/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4005

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
