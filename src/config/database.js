import { Sequelize } from 'sequelize';
import config from '../../config/database-config.cjs';

const { url, ...opcoes } = config;

const sequelize = url
  ? new Sequelize(url, opcoes)
  : new Sequelize(opcoes.database, opcoes.username, opcoes.password, opcoes);

export default sequelize;
