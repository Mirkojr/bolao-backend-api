import { defineConfig } from 'vitest/config';

// Testes de integração: API real (supertest) contra um Postgres de teste.
// Os arquivos rodam em série porque compartilham o mesmo banco.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.js'],
    globalSetup: ['tests/integration/global-setup.js'],
    setupFiles: ['tests/integration/env.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
