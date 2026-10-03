import { execSync } from 'node:child_process';

// Aplica as migrações no banco de teste uma vez, antes de todos os arquivos.
export default async function setup() {
  await import('./env.js');
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', env: process.env });
}
