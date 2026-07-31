FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev   # instala só dependências de produção, reprodutível

COPY . .

EXPOSE 3000

CMD ["npm", "start"]