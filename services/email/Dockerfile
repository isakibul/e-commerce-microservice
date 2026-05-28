FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src

RUN ./node_modules/.bin/prisma generate
RUN npm run build

EXPOSE 4005

CMD ["sh", "-c", "npm run migrate:prod && npm start"]
