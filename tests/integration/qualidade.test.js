import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, limparBanco, fecharBanco, criarUsuario, criarJogo, auth } from './helpers.js';
import sequelize from '../../src/config/database.js';
import { PONTUACAO_EXATA } from '../../src/config/game.js';

beforeEach(limparBanco);
afterAll(fecharBanco);

describe('respostas de erro padronizadas', () => {
  it('JSON malformado dá 400 em JSON, não uma página HTML', async () => {
    const res = await api().post('/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'O corpo da requisição não é um JSON válido.' });
  });

  it('rota inexistente dá 404 em JSON', async () => {
    const res = await api().get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Rota não encontrada.' });
  });

  it('id não numérico na URL dá 400, não 500', async () => {
    const { token } = await criarUsuario();
    const res = await api().get('/boloes/abc').set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Parâmetro inválido.');
  });

  it('validação devolve a mensagem do schema, sem detalhes internos', async () => {
    const { token } = await criarUsuario({ role: 'ADMIN' });
    const res = await api().post('/times').set(auth(token)).send({ nome: 'X', escudo_url: 'não é url' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'O campo escudo deve ser uma URL válida.' });
  });
});

describe('status do jogo e desfazer placar', () => {
  it('lançar e desfazer o placar ajusta status e pontos', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const dona = await criarUsuario();
    const amigo = await criarUsuario({ nome: 'Amigo' });
    const jogo = await criarJogo(admin.token);
    const { body: bolao } = await api().post('/boloes').set(auth(dona.token)).send({ nome: 'B' });
    await api().post(`/boloes/${bolao.id}/jogos/${jogo.id}`).set(auth(dona.token));
    const { body: p } = await api().post(`/boloes/${bolao.id}/participantes`).set(auth(dona.token)).send({ user_id: amigo.user.id });
    await api().post(`/boloes/${bolao.id}/palpites`).set(auth(dona.token))
      .send({ participante_id: p.id, jogo_id: jogo.id, gol_a_palpite: 3, gol_b_palpite: 0 });

    const pontos = async () => (await api().get(`/boloes/${bolao.id}/participantes`).set(auth(dona.token))).body[0].pontuacao_no_bolao;
    const total = async () => (await api().get(`/users/${amigo.user.id}`).set(auth(amigo.token))).body.pontuacao_total;

    const lancado = await api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send({ gol_a_real: 3, gol_b_real: 0 });
    expect(lancado.body).toMatchObject({ status: 'FINALIZADO', gol_a_real: 3, gol_b_real: 0 });
    expect(await pontos()).toBe(PONTUACAO_EXATA);
    expect(await total()).toBe(PONTUACAO_EXATA);

    const desfeito = await api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send({ gol_a_real: null, gol_b_real: null });
    expect(desfeito.status).toBe(200);
    expect(desfeito.body).toMatchObject({ status: 'AGENDADO', gol_a_real: null, gol_b_real: null });
    expect(await pontos()).toBe(0);
    expect(await total()).toBe(0);
  });

  it('a API ignora "status" vindo no corpo: ele é derivado do placar', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const jogo = await criarJogo(admin.token);
    const res = await api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send({ status: 'FINALIZADO' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AGENDADO');
  });

  it('o banco recusa status incoerente com o placar', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const jogo = await criarJogo(admin.token);
    await expect(sequelize.query(`UPDATE jogos SET status = 'FINALIZADO' WHERE id = ${jogo.id}`))
      .rejects.toThrow(/check_status_placar/);
  });

  it('filtros e contagens usam o status', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const passado = await criarJogo(admin.token, '2020-01-01T12:00:00Z');
    await criarJogo(admin.token, '2020-01-02T12:00:00Z'); // passou e ficou sem placar
    await criarJogo(admin.token, '2099-01-01T12:00:00Z');
    await api().put(`/jogos/${passado.id}`).set(auth(admin.token)).send({ gol_a_real: 1, gol_b_real: 1 });

    const res = await api().get('/jogos?page=1&status=finalizado').set(auth(admin.token));
    expect(res.body.data.map((j) => j.id)).toEqual([passado.id]);
    expect(res.body.counts).toEqual({ todos: 3, agendados: 2, finalizados: 1, pendentes: 1 });
  });
});

describe('busca', () => {
  it('curingas digitados (% e _) são procurados literalmente', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    await api().post('/times').set(auth(admin.token)).send({ nome: '100% Futebol' });
    await api().post('/times').set(auth(admin.token)).send({ nome: 'Clube 1000' });

    const res = await api().get('/times?search=' + encodeURIComponent('100%')).set(auth(admin.token));
    expect(res.body.map((t) => t.nome)).toEqual(['100% Futebol']);

    const todos = await api().get('/times?search=' + encodeURIComponent('%')).set(auth(admin.token));
    expect(todos.body.map((t) => t.nome)).toEqual(['100% Futebol']);
  });
});

describe('formulário de jogo do frontend', () => {
  it('data vazia ("a definir") é aceita: na criação usa agora, na edição mantém a data', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const jogo = await criarJogo(admin.token, '2030-05-05T20:00:00Z');

    const criado = await api().post('/jogos').set(auth(admin.token))
      .send({ time_a_id: jogo.time_a_id, time_b_id: jogo.time_b_id, data_jogo: '' });
    expect(criado.status).toBe(201);
    expect(Math.abs(new Date(criado.body.data_jogo) - Date.now())).toBeLessThan(60_000);

    // o JogoFormModal manda tudo, inclusive gols null quando não há resultado
    const editado = await api().put(`/jogos/${jogo.id}`).set(auth(admin.token))
      .send({ time_a_id: jogo.time_a_id, time_b_id: jogo.time_b_id, data_jogo: '', gol_a_real: null, gol_b_real: null });
    expect(editado.status).toBe(200);
    expect(editado.body).toMatchObject({ data_jogo: '2030-05-05T20:00:00.000Z', status: 'AGENDADO' });
  });
});
