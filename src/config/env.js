import 'dotenv/config';

// Variáveis sem as quais a API não funciona. Faltando alguma, é melhor
// parar na inicialização do que falhar depois, no meio de uma requisição.
const OBRIGATORIAS = ['ACCESS_TOKEN_KEY', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];

const faltando = OBRIGATORIAS.filter((nome) => !process.env[nome]);

if (faltando.length > 0) {
  console.error(
    `Variáveis de ambiente obrigatórias não definidas: ${faltando.join(', ')}.\n` +
    'Copie o .env.example para .env e preencha os valores.'
  );
  process.exit(1);
}
