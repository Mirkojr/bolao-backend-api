import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Participante = sequelize.define('Participante', {
  bolao_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
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
