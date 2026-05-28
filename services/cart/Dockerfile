FROM node:22-slim

WORKDIR /repo

COPY shared ./shared
COPY services/cart/package*.json ./services/cart/
WORKDIR /repo/services/cart
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY services/cart/tsconfig.json ./
COPY services/cart/src ./src

RUN npm run build

EXPOSE 4006

CMD ["npm", "start"]
