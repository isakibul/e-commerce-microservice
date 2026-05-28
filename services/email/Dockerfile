FROM node:22-slim

WORKDIR /repo

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY shared ./shared
COPY services/email/package*.json ./services/email/
WORKDIR /repo/services/email
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/email/prisma ./prisma
COPY services/email/prisma.config.ts services/email/tsconfig.json ./
COPY services/email/src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4005

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
