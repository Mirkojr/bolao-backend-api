import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, limparBanco, fecharBanco, criarUsuario, auth } from './helpers.js';

beforeEach(limparBanco);
afterAll(fecharBanco);

describe('cadastro e login', () => {
  it('cadastra, faz login e nunca devolve o hash da senha', async () => {
    const cadastro = await api().post('/auth/register')
      .send({ nome: 'Ana', email: 'ANA@Teste.com ', senha: 'segredo1' });
    expect(cadastro.status).toBe(201);
    expect(cadastro.body.user).toMatchObject({ nome: 'Ana', role: 'USER' });
    expect(JSON.stringify(cadastro.body)).not.toContain('senha_hash');

    // o e-mail é normalizado (minúsculo, sem espaços)
    const login = await api().post('/auth/login').send({ email: 'ana@teste.com', senha: 'segredo1' });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(login.body)).not.toContain('senha_hash');
  });

  it('recusa e-mail duplicado, senha curta e campos faltando', async () => {
    await api().post('/auth/register').send({ nome: 'Ana', email: 'ana@teste.com', senha: 'segredo1' });

    const duplicado = await api().post('/auth/register').send({ nome: 'Ana 2', email: 'ana@teste.com', senha: 'segredo1' });
    expect(duplicado.status).toBe(409);

    const curta = await api().post('/auth/register').send({ nome: 'Bia', email: 'bia@teste.com', senha: '123' });
    expect(curta.status).toBe(400);

    const vazio = await api().post('/auth/register').send({});
    expect(vazio.status).toBe(400);
  });

  it('login com senha errada ou e-mail inexistente dá 401', async () => {
    await api().post('/auth/register').send({ nome: 'Ana', email: 'ana@teste.com', senha: 'segredo1' });

    expect((await api().post('/auth/login').send({ email: 'ana@teste.com', senha: 'errada' })).status).toBe(401);
    expect((await api().post('/auth/login').send({ email: 'ninguem@teste.com', senha: 'x' })).status).toBe(401);
  });

  it('rotas protegidas exigem token válido', async () => {
    expect((await api().get('/boloes')).status).toBe(401);
    expect((await api().get('/boloes').set(auth('token-invalido'))).status).toBe(401);
  });

  it('GET /users (admin) não expõe o hash da senha', async () => {
    const { token } = await criarUsuario({ role: 'ADMIN' });
    await criarUsuario();

    const res = await api().get('/users').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain('senha_hash');
  });
});
