import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Participante = sequelize.define('Participante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nome_avulso: { 
    type: DataTypes.STRING,
    allowNull: true, 
  },
  bolao_id: {
    type: DataTypes.INTEGER,
    allowNull: false,

  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  pontuacao_no_bolao: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  data_entrada: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'participantes_bolao',
  timestamps: false,
});

export default Participante;
