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
        validate: {
            len: [2, 3] 
        }
    },
    escudo_url: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: {
                msg: "O campo escudo deve ser uma URL válida."
            }
        }
    },
}, {
    tableName: 'times',
    timestamps: false,
});

export default Time;