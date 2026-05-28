FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/user/package*.json ./services/user/
WORKDIR /repo/services/user
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/user/prisma ./prisma
COPY services/user/prisma.config.ts services/user/tsconfig.json ./
COPY services/user/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4004

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
