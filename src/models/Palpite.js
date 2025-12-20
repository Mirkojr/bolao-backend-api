import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Palpite = sequelize.define('Palpite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  bolao_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  jogo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gol_a_palpite: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gol_b_palpite: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pontos_ganhos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  data_palpite: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'palpites',
  timestamps: false,
});

export default Palpite;
