import rateLimit from 'express-rate-limit';
import 'dotenv/config';

// Number() no env: sem isso, undefined faz o express-rate-limit
// cair no default de 5 req/janela e derrubar a aplicação com 429.
const maxApiCalls = Number(process.env.MAX_API_CALLS) || 1000;

const respostaLimite = (mensagem) => (req, res) => {
  const retryAfter = res.getHeader('RateLimit-Reset') ?? 60;
  res.status(429).json({ message: mensagem, retryAfter: Number(retryAfter) });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: maxApiCalls,
  standardHeaders: true,
  legacyHeaders: false,
  // preflight do CORS e health check não devem consumir cota
  skip: (req) => req.method === 'OPTIONS' || req.path === '/',
  handler: respostaLimite('Muitas requisições vindas deste IP, tente novamente mais tarde.'),
});

// Escrita é o que realmente precisa de freio
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.MAX_WRITE_CALLS) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'OPTIONS',
  handler: respostaLimite('Muitas operações em sequência. Aguarde alguns segundos.'),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: respostaLimite('Muitas tentativas de login. Tente novamente em 15 minutos.'),
});