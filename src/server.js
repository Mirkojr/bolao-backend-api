import express from 'express';
import 'dotenv/config';
import sequelize from './config/database.js';
import router from './routes/routes.js'
import cors from 'cors';

const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(router);

await sequelize.sync({ alter: true });

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

const startServer = async () => {
  try{
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados foi um sucesso');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch(error){
    console.error('Não foi possível se conectar ao banco de dados: ', error);
  }
}

startServer();