import Bolao from './Bolao.js';
import User from './User.js';
import Participante from './Participante.js';
import Jogo from './Jogo.js';
import Palpite from './Palpite.js';
import Time from './Time.js';

// Relação do usuáro com o bolão
User.hasMany(Bolao, { 
    foreignKey: 'criador_id', 
    as: 'boloesCriados' 
});
Bolao.belongsTo(User, { 
    foreignKey: 'criador_id', 
    as: 'criador' 
});

// Relação do bolão para o jogo, N por N
Bolao.belongsToMany(Jogo, { 
    through: 'bolao_jogos', 
    foreignKey: 'bolao_id', 
    otherKey: 'jogo_id',
    as: 'jogos'
});
Jogo.belongsToMany(Bolao, { 
    through: 'bolao_jogos', 
    foreignKey: 'jogo_id', 
    otherKey: 'bolao_id',
    as: 'boloes'
});

// Relação de jogos e time
Jogo.belongsTo(Time, { foreignKey: 'time_a_id', as: 'timeA' });
Jogo.belongsTo(Time, { foreignKey: 'time_b_id', as: 'timeB' });

// Um Bolão tem várias linhas de participação (seja user ou avulso)
Bolao.hasMany(Participante, { 
    foreignKey: 'bolao_id', 
    as: 'participantes' 
});
Participante.belongsTo(Bolao, { 
    foreignKey: 'bolao_id', 
    as: 'bolao' 
});


// Um Participante PODE ser um User (se user_id não for null)
Participante.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'usuario' 
});
// Um User pode ter várias participações em bolões diferentes
User.hasMany(Participante, { 
    foreignKey: 'user_id', 
    as: 'participacoes' 
});

// O Palpite pertence ao Participante
Participante.hasMany(Palpite, { 
    foreignKey: 'participante_id', 
    as: 'palpites' 
});
Palpite.belongsTo(Participante, { 
    foreignKey: 'participante_id', 
    as: 'participante' 
});

// O Palpite também pertence a um Jogo e um Bolão 
Palpite.belongsTo(Jogo, { foreignKey: 'jogo_id', as: 'jogo' });
Palpite.belongsTo(Bolao, { foreignKey: 'bolao_id', as: 'bolao' });

export { 
    User, 
    Bolao, 
    Participante, 
    Jogo, 
    Palpite, 
    Time 
};