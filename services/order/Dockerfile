FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/order/package*.json ./services/order/
WORKDIR /repo/services/order
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/order/prisma ./prisma
COPY services/order/prisma.config.ts services/order/tsconfig.json ./
COPY services/order/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4007

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
