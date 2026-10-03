import express from 'express';
import helmet from 'helmet';
import router from './routes/routes.js';
import corsMiddleware from './config/cors.js';

// App Express sem efeitos colaterais (não conecta no banco nem abre porta):
// o server.js sobe a aplicação e os testes de integração usam o app direto.
const app = express();

if (process.env.NODE_ENV === 'production'){
  app.set('trust proxy', 1);
};

// -- Segurança com helmet e rate limiter
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(router);

app.get('/', (req, res) => {
  res.send('Voce está na API do Bolão!');
});

export default app;
