import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Palpite = sequelize.define('Palpite', {
  bolao_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  participante_id: {
    type: DataTypes.INTEGER,
    allowNull: false, 
    primaryKey: true,
  },
  jogo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  gol_a_palpite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: "O placar do time A não pode ser negativo."
      },
      isInt: {
        msg: "O placar deve ser um número inteiro."
      }
    }
  },
  gol_b_palpite: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: "O placar do time B não pode ser negativo."
      },
      isInt: {
        msg: "O placar deve ser um número inteiro."
      }
    }
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