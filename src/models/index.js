import Bolao from './Bolao.js';
import User from './User.js';

// Um Utilizador pode criar muitos Bolões
User.hasMany(Bolao, { foreignKey: 'criador_id' });

// Um Bolão pertence a um Utilizador específico
Bolao.belongsTo(User, { foreignKey: 'criador_id' });

export { User, Bolao };