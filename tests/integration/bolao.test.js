import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, limparBanco, fecharBanco, criarUsuario, criarJogo, auth } from './helpers.js';
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from '../../src/config/game.js';

beforeEach(limparBanco);
afterAll(fecharBanco);

describe('fluxo do bolão', () => {
  it('cria bolão, palpita, lança placar e calcula o ranking', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const dona = await criarUsuario({ nome: 'Dona' });
    const amigo = await criarUsuario({ nome: 'Amigo' });
    const jogo = await criarJogo(admin.token);

    const bolao = await api().post('/boloes').set(auth(dona.token)).send({ nome: 'Bolão da firma' });
    expect(bolao.status).toBe(201);
    const id = bolao.body.id;

    expect((await api().post(`/boloes/${id}/jogos/${jogo.id}`).set(auth(dona.token))).status).toBe(201);

    // um convidado avulso e um usuário cadastrado
    const avulso = await api().post(`/boloes/${id}/participantes`).set(auth(dona.token)).send({ nome: 'Convidado' });
    const vinculado = await api().post(`/boloes/${id}/participantes`).set(auth(dona.token)).send({ user_id: amigo.user.id });
    expect(avulso.status).toBe(201);
    expect(vinculado.status).toBe(201);
    expect(vinculado.body).toMatchObject({ user_id: amigo.user.id, nome_avulso: 'Amigo' });

    const palpitar = (participante, a, b) => api().post(`/boloes/${id}/palpites`).set(auth(dona.token))
      .send({ participante_id: participante.body.id, jogo_id: jogo.id, gol_a_palpite: a, gol_b_palpite: b });
    expect((await palpitar(avulso, 1, 0)).status).toBeLessThan(300);   // acerta o vencedor
    expect((await palpitar(vinculado, '2', '1')).status).toBeLessThan(300); // crava (enviado como string)

    // placar real 2x1
    const placar = await api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send({ gol_a_real: 2, gol_b_real: 1 });
    expect(placar.status).toBe(200);
    expect(placar.body.status).toBe('FINALIZADO');

    const ranking = await api().get(`/boloes/${id}/participantes`).set(auth(dona.token));
    expect(ranking.status).toBe(200);
    expect(ranking.body.map((p) => [p.nome, p.pontuacao_no_bolao])).toEqual([
      ['Amigo', PONTUACAO_EXATA],
      ['Convidado', PONTUACAO_PARCIAL],
    ]);

    // a pontuação total do usuário vinculado também é atualizada
    const perfil = await api().get(`/users/${amigo.user.id}`).set(auth(amigo.token));
    expect(perfil.body.pontuacao_total).toBe(PONTUACAO_EXATA);

    // excluir o palpite de um jogo finalizado tira os pontos do ranking
    const apagar = await api().delete(`/boloes/${id}/palpites`).set(auth(dona.token))
      .send({ participante_id: vinculado.body.id, jogo_id: jogo.id });
    expect(apagar.status).toBe(200);
    const depois = await api().get(`/boloes/${id}/participantes`).set(auth(dona.token));
    expect(depois.body.find((p) => p.nome === 'Amigo').pontuacao_no_bolao).toBe(0);

    // exportações
    const excel = await api().get(`/boloes/${id}/export/excel`).set(auth(dona.token));
    expect(excel.status).toBe(200);
    expect(excel.headers['content-type']).toContain('spreadsheet');
    const pdf = await api().get(`/boloes/${id}/export/pdf`).set(auth(dona.token));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toContain('pdf');
  });

  it('recálculo geral (POST) refaz os pontos de todos os jogos finalizados', async () => {
    const admin = await criarUsuario({ role: 'ADMIN' });
    const dona = await criarUsuario();
    const jogo = await criarJogo(admin.token);
    const { body: bolao } = await api().post('/boloes').set(auth(dona.token)).send({ nome: 'B' });
    await api().post(`/boloes/${bolao.id}/jogos/${jogo.id}`).set(auth(dona.token));
    const { body: p } = await api().post(`/boloes/${bolao.id}/participantes`).set(auth(dona.token)).send({ nome: 'X' });
    await api().post(`/boloes/${bolao.id}/palpites`).set(auth(dona.token))
      .send({ participante_id: p.id, jogo_id: jogo.id, gol_a_palpite: 0, gol_b_palpite: 0 });
    await api().put(`/jogos/${jogo.id}`).set(auth(admin.token)).send({ gol_a_real: 1, gol_b_real: 1 });

    expect((await api().post('/admin/recalcularPontos').set(auth(dona.token))).status).toBe(403);
    expect((await api().post('/admin/recalcularPontos').set(auth(admin.token))).status).toBe(200);

    const ranking = await api().get(`/boloes/${bolao.id}/participantes`).set(auth(dona.token));
    expect(ranking.body[0].pontuacao_no_bolao).toBe(PONTUACAO_PARCIAL);
  });
});
