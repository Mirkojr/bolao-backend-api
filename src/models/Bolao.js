import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Bolao = sequelize.define('Bolao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "O nome do bolão é obrigatório."
      }
    }
  },
  criador_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'boloes', 
  timestamps: true,    
  createdAt: 'created_at', 
  updatedAt: false      
});

export default Bolao;