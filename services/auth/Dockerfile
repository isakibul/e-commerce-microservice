FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/auth/package*.json ./services/auth/
WORKDIR /repo/services/auth
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/auth/prisma ./prisma
COPY services/auth/prisma.config.ts services/auth/tsconfig.json ./
COPY services/auth/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4003

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
