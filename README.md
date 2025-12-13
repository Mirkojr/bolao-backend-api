# bolao-backend-api
Backend do sistema 

# Start this project
1. npm init -y
2. npm install express dotenv
3. npm install sequelize pg pg-hstore
4. npm install --save-dev nodemon @babel/cli @babel/core @babel/node

# Estrutura de arquivos
bolao-api-backend/
├── node_modules/
├── src/
│   ├── config/          # Configurações do DB, Cognito, etc.
│   ├── models/          # Definições das Tabelas (Modelos Sequelize)
│   ├── controllers/     # Lógica de requisição/resposta (validação, etc.)
│   ├── services/        # Lógica de manipulação de dados e regras de negócio
│   ├── routes/          # Definições das URLs da API
│   └── server.js        # Arquivo principal para iniciar a aplicação
├── package.json
├── .babelrc
└── .env.example         # Arquivo de exemplo para variáveis de ambiente