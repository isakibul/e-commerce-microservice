# syntax=docker/dockerfile:1.7

FROM node:22-slim

WORKDIR /repo

COPY shared ./shared
COPY services/cart/package*.json ./services/cart/
WORKDIR /repo/services/cart
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
  npm ci --ignore-scripts --no-audit --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=20000 \
    --fetch-retry-maxtimeout=120000

COPY services/cart/tsconfig.json ./
COPY services/cart/src ./src

RUN npm run build

EXPOSE 4006

CMD ["npm", "start"]
