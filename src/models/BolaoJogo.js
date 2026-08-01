import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BolaoJogo = sequelize.define('BolaoJogo', {
    bolao_id: {
        type: DataTypes.INTEGER,
        references: { model: 'boloes', key: 'id' },
    },
    jogo_id: {
        type: DataTypes.INTEGER,
        references: { model: 'jogos', key: 'id' },
    },
}, {
    tableName: 'bolao_jogos',
    timestamps: false,  
    underscored: true,
});

export default BolaoJogo;