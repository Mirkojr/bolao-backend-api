import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Time = sequelize.define('Time', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sigla: {
        type: DataTypes.STRING(3),
        unique: true,
        allowNull: false,
    },
    escudo_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'times',
    timestamps: false,
});

export default Time;