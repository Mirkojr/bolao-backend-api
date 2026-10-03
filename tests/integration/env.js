// Carregado antes de cada arquivo de teste (e pelo global-setup), antes de a
// app ser importada. Só preenche o que não veio do ambiente.
process.env.NODE_ENV ??= 'test';
process.env.ACCESS_TOKEN_KEY ??= 'segredo-de-teste';
// Os testes fazem muitas requisições seguidas: limites altos para não dar 429
process.env.MAX_API_CALLS ??= '100000';
process.env.MAX_WRITE_CALLS ??= '100000';
process.env.MAX_LOGIN_ATTEMPTS ??= '100000';

// Trava de segurança: os testes apagam todas as tabelas antes de cada caso.
const banco = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).pathname.slice(1)
  : process.env.DB_NAME;
if (!banco || !banco.endsWith('_test')) {
  throw new Error(
    `Os testes de integração apagam o banco: use um banco cujo nome termine em "_test" (atual: "${banco}"). ` +
    'Ex.: DB_HOST=127.0.0.1 DB_NAME=bolao_test npm run test:integration'
  );
}
