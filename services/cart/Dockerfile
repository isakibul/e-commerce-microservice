FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 4006

CMD ["npm", "start"]
