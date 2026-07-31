import rateLimit from 'express-rate-limit';

export default rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 100,
  message: { message: "Muitas requisições vindas deste IP, tente novamente mais tarde. "}
});