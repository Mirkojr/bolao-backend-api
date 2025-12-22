import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Jogo = sequelize.define('Jogo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    time_a_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    time_b_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    data_jogo: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    gol_a_real: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        }
    },
    gol_b_real: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'AGENDADO',
        validate: {
            isIn: {
                args: [['AGENDADO', 'EM_ANDAMENTO', 'FINALIZADO']],
                msg: "O status deve ser AGENDADO, EM_ANDAMENTO ou FINALIZADO"
            }
        }
    },
}, {
    tableName: 'jogos',
    timestamps: false,
});

export default Jogo;