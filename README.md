# Sistema de Bolão - Backend

API do sistema de bolão esportivo. Este backend fornece autenticação, gestão de usuários, bolões, times, jogos, palpites, participantes e ranking.

## Visão geral

A API foi construída com Node.js, Express e Sequelize, usando PostgreSQL como banco de dados. Ela expõe rotas para o frontend consumir e centraliza a regra de negócio do sistema.

## Tecnologias utilizadas

- Node.js
- Express
- Sequelize
- PostgreSQL
- JSON Web Token
- CORS
- Helmet
- Express-rate-limit

## Pré-requisitos

Antes de rodar o projeto, tenha instalado:

- Git
- Node.js 18 ou superior
- Docker e Docker Compose

## Estrutura do projeto

```text
src/
├── config/        # Configuração do banco e autenticação
├── controllers/   # Regras de requisição e resposta
├── middlewares/   # Middlewares de autenticação e autorização
├── models/        # Modelos Sequelize
├── routes/        # Rotas da API
└── server.js      # Ponto de entrada da aplicação
```

## Instalação

```bash
npm install
```

## Variáveis de ambiente

O backend lê as variáveis abaixo:

```env
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_USER=admin
DB_PASS=admin123S
DB_NAME=bolao_db
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@email.com
ADMIN_PASS=admin123
ACCESS_TOKEN_KEY=uma_chave_secreta_forte
```

## Como rodar com Docker

Suba o banco e a API com:

```bash
docker compose up -d --build
```

Isso inicia o PostgreSQL e a API, que fica disponível na porta `3000` por padrão.

## Como rodar fora do Docker

Se você for executar a API ou os seeders direto no Windows, use o PostgreSQL exposto na máquina local. Nesse caso, ajuste o `DB_HOST` para `localhost` no seu `.env` antes de rodar `npm run db:seed` ou `npm start`.

## Endpoints principais

A API organiza as rotas em grupos para:

- autenticação
- usuários
- bolões
- jogos
- times

As rotas são protegidas por middleware de autenticação e, em alguns casos, por autorização de administrador.

## Fluxo de inicialização

Ao iniciar, a aplicação:

- conecta ao PostgreSQL com Sequelize
- sincroniza os modelos com o banco usando `sync({ alter: true })`
- garante a criação de um usuário administrador padrão, caso ainda não exista
- sobe o servidor HTTP na porta definida em `PORT`

## Banco de dados

O projeto usa o volume do Docker para persistir os dados do PostgreSQL e executa os scripts da pasta `database/` na primeira inicialização do container.

## Integração com o frontend

O frontend se comunica com esta API por meio da variável `VITE_API_URL`. Se o frontend não carregar dados ou o login falhar, verifique se:

- a API está em execução
- o banco PostgreSQL subiu corretamente
- a variável `ACCESS_TOKEN_KEY` está configurada
- o frontend aponta para a URL certa do backend

## Endereço local

Depois de subir a aplicação, a API responde em:

```text
http://localhost:3000/
```

Uma resposta simples é exibida na rota raiz para confirmar que o servidor está ativo.
