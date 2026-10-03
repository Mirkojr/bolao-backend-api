// Configuração do sequelize-cli: a mesma conexão da API em todos os ambientes.
const config = require('./database-config.cjs');

module.exports = {
  development: config,
  test: config,
  production: config,
};
