import express from 'express';
import sequelize from './config/database.js';
import router from './routes/routes.js'
import cors from 'cors';
import User from './models/User.js';
import helmet from 'helmet';
import corsMiddleware from './config/cors.js';

import 'dotenv/config';

const app = express();

const PORT = process.env.PORT || 3000;

// -- Segurança com helmet e rate limiter
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(router);

if (process.env.NODE_ENV === 'production'){
  app.set('trust proxy', 1);
};

app.get('/', (req, res) => {
  res.send('Voce está na API do Bolão!');
});

const startServer = async () => {
  try{
    await sequelize.authenticate();

    // Correção pontual: remove colunas de timestamp herdadas na tabela de junção N:N, fzendo aqui pq o render free é paia
  await sequelize.query(`
    ALTER TABLE "bolao_jogos" DROP COLUMN IF EXISTS "created_at";
    ALTER TABLE "bolao_jogos" DROP COLUMN IF EXISTS "updated_at";
  `);

    // Verifica se o usuário admin já existe, se não, cria um novo
    const adminExists = await User.findOne({ where: { role: 'ADMIN' } });
    
    if (!adminExists) {
      const adminName = process.env.ADMIN_NAME;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASS;

      await User.create({
        nome: adminName,
        email: adminEmail,
        senha_hash: adminPassword,
        role: 'ADMIN'
      });
      console.log('Usuário Admin padrão criado com sucesso!');
    }

    console.log('Conexão com o banco de dados foi um sucesso');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch(error){
    console.error('Não foi possível se conectar ao banco de dados: ', error);
  }
}

startServer();