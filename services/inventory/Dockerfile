FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/inventory/package*.json ./services/inventory/
WORKDIR /repo/services/inventory
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/inventory/prisma ./prisma
COPY services/inventory/prisma.config.ts services/inventory/tsconfig.json ./
COPY services/inventory/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4002

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
