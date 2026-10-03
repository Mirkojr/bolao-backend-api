// Única fonte da configuração de conexão com o banco, usada pela API
// (src/config/database.js) e pelo sequelize-cli (config/config.cjs).
//
// Use DATABASE_URL (ex.: a URL externa do Render) ou DB_HOST/DB_PORT/DB_NAME/
// DB_USER/DB_PASS. SSL: ligado por padrão com DATABASE_URL e desligado com
// DB_*; DB_SSL=true|false força um ou outro.
require('dotenv').config();

const url = process.env.DATABASE_URL || null;
const ssl = process.env.DB_SSL ? process.env.DB_SSL === 'true' : Boolean(url);

const config = {
  dialect: 'postgres',
  logging: false,
  ...(ssl && { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }),
  ...(url
    ? { url }
    : {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      }),
};

module.exports = config;
