import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 100,
  standardHeaders: true,  // envia headers RateLimit-* (padrão novo)
  legacyHeaders: false,   // desativa os antigos X-RateLimit-*
  message: { message: "Muitas requisições vindas deste IP, tente novamente mais tarde. "}
});

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // só conta tentativas que falharam
    message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});