import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    senha_hash: {
        type: DataTypes.STRING,
        allowNull: false,
        },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'USER', 
        allowNull: false
    },
    pontuacao_total: {
        type: DataTypes.INTEGER,
        defaultValue: 0
        },
}, {
    tableName: 'users', 
    timestamps: false
});

User.beforeSave(async (user, options) => {
    if(user.changed('senha_hash')) {
        const salt = await bcrypt.genSalt(10);
        user.senha_hash = await bcrypt.hash(user.senha_hash, salt);
    }
});

User.prototype.validPassword = function(password){
    return bcrypt.compare(password, this.senha_hash);
}

export default User;