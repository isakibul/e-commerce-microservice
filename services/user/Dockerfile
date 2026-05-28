FROM node:22-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4004

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
