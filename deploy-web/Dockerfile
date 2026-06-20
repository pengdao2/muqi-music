FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY public/ ./public/
COPY server.mjs ./

EXPOSE 3000 30488

CMD ["node", "server.mjs"]
