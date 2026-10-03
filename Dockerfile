FROM node:20-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./

EXPOSE 3000

# Desenvolvimento: inclui as devDependencies (nodemon, vitest).
# Usado pelo docker-compose.override.yml.
FROM base AS dev

ENV NODE_ENV=development
RUN npm ci

COPY . .

CMD ["npm", "run", "dev"]

# Produção (estágio padrão, por ser o último): só dependências de produção.
FROM base AS prod

ENV NODE_ENV=production
RUN npm ci --omit=dev

COPY . .

CMD ["npm", "start"]
