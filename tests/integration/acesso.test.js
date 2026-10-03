import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, limparBanco, fecharBanco, criarUsuario, criarJogo, auth } from './helpers.js';

beforeEach(limparBanco);
afterAll(fecharBanco);

// Monta um bolão da "dona" com um jogo e um participante avulso
async function cenario() {
  const admin = await criarUsuario({ role: 'ADMIN' });
  const dona = await criarUsuario();
  const outro = await criarUsuario();
  const jogo = await criarJogo(admin.token);
  const { body: bolao } = await api().post('/boloes').set(auth(dona.token)).send({ nome: 'Bolão' });
  await api().post(`/boloes/${bolao.id}/jogos/${jogo.id}`).set(auth(dona.token));
  const { body: participante } = await api().post(`/boloes/${bolao.id}/participantes`)
    .set(auth(dona.token)).send({ nome: 'Convidado' });
  return { admin, dona, outro, jogo, bolao, participante };
}

const leituras = (id) => [
  `/boloes/${id}`,
  `/boloes/${id}/jogos`,
  `/boloes/${id}/participantes`,
  `/boloes/${id}/palpites`,
  `/boloes/${id}/export/excel`,
  `/boloes/${id}/export/pdf`,
];

describe('controle de acesso', () => {
  it('só dono, participante vinculado e admin leem o bolão', async () => {
    const { admin, dona, outro, bolao } = await cenario();

    for (const rota of leituras(bolao.id)) {
      expect((await api().get(rota).set(auth(dona.token))).status, `dona ${rota}`).toBe(200);
      expect((await api().get(rota).set(auth(admin.token))).status, `admin ${rota}`).toBe(200);
      expect((await api().get(rota).set(auth(outro.token))).status, `outro ${rota}`).toBe(403);
    }

    // ao ser vinculado como participante, passa a ler
    await api().post(`/boloes/${bolao.id}/participantes`).set(auth(dona.token)).send({ user_id: outro.user.id });
    for (const rota of leituras(bolao.id)) {
      expect((await api().get(rota).set(auth(outro.token))).status, `vinculado ${rota}`).toBe(200);
    }

    expect((await api().get('/boloes/9999').set(auth(dona.token))).status).toBe(404);
  });

  it('só o dono (ou admin) altera o bolão', async () => {
    const { outro, bolao, participante, jogo } = await cenario();
    const comoOutro = (req) => req.set(auth(outro.token));

    expect((await comoOutro(api().put(`/boloes/${bolao.id}`).send({ nome: 'x' }))).status).toBe(403);
    expect((await comoOutro(api().delete(`/boloes/${bolao.id}`))).status).toBe(403);
    expect((await comoOutro(api().post(`/boloes/${bolao.id}/participantes`).send({ nome: 'x' }))).status).toBe(403);
    expect((await comoOutro(api().delete(`/boloes/${bolao.id}/participantes/${participante.id}`))).status).toBe(403);
    expect((await comoOutro(api().post(`/boloes/${bolao.id}/palpites`)
      .send({ participante_id: participante.id, jogo_id: jogo.id, gol_a_palpite: 1, gol_b_palpite: 0 }))).status).toBe(403);
  });

  it('jogos e times só são criados pelo admin', async () => {
    const { dona } = await cenario();
    expect((await api().post('/times').set(auth(dona.token)).send({ nome: 'X' })).status).toBe(403);
    expect((await api().post('/jogos').set(auth(dona.token)).send({ time_a_id: 1, time_b_id: 2 })).status).toBe(403);
  });

  it('o include de usuário nos participantes não vaza e-mail nem hash', async () => {
    const { dona, outro, bolao } = await cenario();
    await api().post(`/boloes/${bolao.id}/participantes`).set(auth(dona.token)).send({ user_id: outro.user.id });

    const res = await api().get(`/boloes/${bolao.id}/participantes`).set(auth(dona.token));
    const vinculado = res.body.find((p) => p.user_id === outro.user.id);
    expect(vinculado.usuario).toEqual({ id: outro.user.id, nome: outro.user.nome });
    expect(JSON.stringify(res.body)).not.toMatch(/senha_hash|@teste\.com/);
  });
});

describe('validações', () => {
  it('palpite inválido ou de jogo fora do bolão dá 400', async () => {
    const { admin, dona, bolao, participante, jogo } = await cenario();
    const palpite = (body) => api().post(`/boloes/${bolao.id}/palpites`).set(auth(dona.token))
      .send({ participante_id: participante.id, jogo_id: jogo.id, ...body });

    expect((await palpite({ gol_a_palpite: -1, gol_b_palpite: 0 })).status).toBe(400);
    expect((await palpite({ gol_a_palpite: 1.5, gol_b_palpite: 0 })).status).toBe(400);
    expect((await palpite({})).status).toBe(400);

    const foraDoBolao = await criarJogo(admin.token);
    expect((await palpite({ jogo_id: foraDoBolao.id, gol_a_palpite: 1, gol_b_palpite: 0 })).status).toBe(400);
  });

  it('placar incompleto ou inválido dá 400', async () => {
    const { admin, jogo } = await cenario();
    const placar = (body) => api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send(body);

    expect((await placar({ gol_a_real: 2 })).status).toBe(400);
    expect((await placar({ gol_a_real: 'x', gol_b_real: 1 })).status).toBe(400);
  });

  it('excluir jogo com palpites dá 409; sem palpites, 204; inexistente, 404', async () => {
    const { admin, dona, bolao, participante, jogo } = await cenario();
    await api().post(`/boloes/${bolao.id}/palpites`).set(auth(dona.token))
      .send({ participante_id: participante.id, jogo_id: jogo.id, gol_a_palpite: 1, gol_b_palpite: 0 });

    expect((await api().delete(`/jogos/${jogo.id}`).set(auth(admin.token))).status).toBe(409);

    const livre = await criarJogo(admin.token);
    expect((await api().delete(`/jogos/${livre.id}`).set(auth(admin.token))).status).toBe(204);
    expect((await api().delete('/jogos/9999').set(auth(admin.token))).status).toBe(404);
  });

  it('excluir participante inexistente dá 404', async () => {
    const { dona, bolao } = await cenario();
    expect((await api().delete(`/boloes/${bolao.id}/participantes/9999`).set(auth(dona.token))).status).toBe(404);
  });
});
