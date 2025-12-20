import Bolao from './Bolao.js';
import User from './User.js';
import Participante from './Participante.js';
import Jogo from './Jogo.js';
import Palpite from './Palpite.js';
import Time from './Time.js';

// Um Utilizador pode criar muitos Bolões
User.hasMany(Bolao, { foreignKey: 'criador_id' });

// Um Bolão pertence a um Utilizador específico
Bolao.belongsTo(User, { foreignKey: 'criador_id' });

// Um Bolão pode ter muitos Participantes (Utilizadores)
Bolao.belongsToMany(Jogo, { through: 'bolao_jogos', foreignKey: 'bolao_id', otherKey: 'jogo_id' });

// Um Jogo pode pertencer a muitos Bolões
Jogo.belongsToMany(Bolao, { through: 'bolao_jogos', foreignKey: 'jogo_id', otherKey: 'bolao_id' });

export { 
    User, 
    Bolao, 
    Participante, 
    Jogo, 
    Palpite, 
    Time 
};