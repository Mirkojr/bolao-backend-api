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
        unique: {
            msg: "Este e-mail já está cadastrado."
        },
        validate: {
            isEmail: {
                msg: "Insira um e-mail válido."
            }
        }
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
    timestamps: true,      
    createdAt: 'created_at', 
    updatedAt: false     
});

User.beforeSave(async (user) => {
    // Só criptografa se o campo foi modificado (ou se é um novo registro)
    if (user.changed('senha_hash')) {
        const salt = await bcrypt.genSalt(10);
        user.senha_hash = await bcrypt.hash(user.senha_hash, salt);
    }
});

// Método de instância para verificar senha no login
User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.senha_hash);
};

export default User;