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
- express-rate-limit
- helmet
- vitest

## Pré-requisitos

Antes de rodar o projeto, tenha instalado:

- Git
- Node.js 18 ou superior
- Docker e Docker Compose

## Estrutura do projeto

```text
src/
├── config/        # Configuração do banco, autenticação e CORS
├── controllers/   # Regras de requisição e resposta
├── middlewares/   # Autenticação, autorização e rate limiting
├── models/        # Modelos Sequelize
├── routes/        # Rotas da API
└── server.js      # Ponto de entrada da aplicação
tests/
└── unit/          # Testes unitários
```

## Primeiros passos (desenvolvimento)

```bash
cp .env.example .env              # valores prontos para uso local
docker compose up -d --build      # sobe PostgreSQL + API com nodemon
docker compose exec api npm run seed:reset   # opcional: popula o banco com dados de exemplo
```

- A API responde em `http://localhost:3000` (variável `PORT`). O frontend deve usar essa URL em `VITE_API_URL`.
- Login do admin criado na inicialização: `ADMIN_EMAIL` / `ADMIN_PASS` do `.env` (`admin@email.com` / `admin123` no exemplo).
- Depois do seed: `admin@bolao.com` ou `user1@bolao.com`, ambos com a senha `123456`.
- Se você mudar o `package.json` ou já tinha rodado uma versão anterior do projeto, recrie o volume de `node_modules` do container com `docker compose up -d --build -V`.

## Testes

```bash
npm install
npm run test:unit
```

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz baseado no `.env.example`. **Nunca comite o `.env`** — ele está no `.gitignore` e no `.dockerignore`.

```env
# Servidor
PORT=3000

# Banco de dados PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_USER=seu_usuario
DB_PASS=defina_uma_senha_forte
DB_NAME=bolao_db

# Usuário administrador inicial
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASS=defina_uma_senha_forte

# Autenticação JWT
ACCESS_TOKEN_KEY=gere_um_segredo_longo_e_aleatorio

# Origens permitidas pelo CORS (separadas por vírgula)
CORS_ORIGINS=http://localhost:5173,https://bolao-frontend-five.vercel.app
```

> ⚠️ **Segurança:** use valores fortes e únicos para `DB_PASS`, `ADMIN_PASS` e `ACCESS_TOKEN_KEY`.
> Para gerar um segredo forte para o token:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> A aplicação não sobe se `ACCESS_TOKEN_KEY` não estiver definido, e o frontend é bloqueado se `CORS_ORIGINS` não incluir a URL dele.

## Como rodar com Docker

O projeto usa dois arquivos de compose:

- `docker-compose.yml` — configuração base, pronta para produção.
- `docker-compose.override.yml` — sobreposição de desenvolvimento (estágio `dev` do Dockerfile com nodemon, hot-reload e banco exposto em `localhost`), carregada automaticamente.

### Desenvolvimento

```bash
docker compose up -d --build
```

Sobe o PostgreSQL e a API com recarregamento automático (nodemon). O banco fica acessível apenas em `127.0.0.1:5432`.

### Produção

```bash
docker compose -f docker-compose.yml up -d --build
```

O `-f docker-compose.yml` ignora o override: a API roda com `npm start`, o código vem da imagem (sem volume) e a porta do PostgreSQL **não** é exposta para fora — o banco só é acessível pela rede interna do Compose.

A API fica disponível na porta definida em `PORT` (padrão `3000`).

## Endpoints principais

A API organiza as rotas em grupos para:

- autenticação
- usuários
- bolões
- jogos
- times

As rotas são protegidas por middleware de autenticação (JWT) e, em alguns casos, por autorização de administrador.

## Segurança

- **Autenticação** via JWT (`ACCESS_TOKEN_KEY`), com expiração dos tokens.
- **Autorização** por papel (`USER` / `ADMIN`) via middleware.
- **Senhas** armazenadas com hash bcrypt.
- **CORS** restrito às origens listadas em `CORS_ORIGINS`.
- **Rate limiting** com `express-rate-limit`, com limite reforçado na rota de login para mitigar brute force.
- **Cabeçalhos HTTP** reforçados com `helmet` para proteger contra ataques comuns.

## Fluxo de inicialização

Ao iniciar, a aplicação:

- confere se as variáveis obrigatórias (`ACCESS_TOKEN_KEY` e `DB_*`) estão definidas, e encerra com uma mensagem clara se faltar alguma
- conecta ao PostgreSQL com Sequelize
- garante a criação de um usuário administrador padrão (a partir de `ADMIN_*`), caso ainda não exista
- sobe o servidor HTTP na porta definida em `PORT`

Se qualquer etapa falhar, o processo encerra com código 1.

## Banco de dados

O projeto usa um volume do Docker para persistir os dados do PostgreSQL e executa os scripts da pasta `database/` na primeira inicialização do container.

## Integração com o frontend

O frontend se comunica com esta API por meio da variável `VITE_API_URL`. Se o frontend não carregar dados ou o login falhar, verifique se:

- a API está em execução
- o banco PostgreSQL subiu corretamente
- a variável `ACCESS_TOKEN_KEY` está configurada
- a URL do frontend está listada em `CORS_ORIGINS`
- o frontend aponta para a URL certa do backend

## Endereço local

Depois de subir a aplicação, a API responde em:

```text
http://localhost:3000/
```

Uma resposta simples é exibida na rota raiz para confirmar que o servidor está ativo.