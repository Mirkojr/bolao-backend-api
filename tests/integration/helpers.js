import request from 'supertest';
import app from '../../src/app.js';
import sequelize from '../../src/config/database.js';
import { User } from '../../src/models/index.js';

export const api = () => request(app);

export async function limparBanco() {
  await sequelize.query(
    'TRUNCATE TABLE palpites, participantes_bolao, bolao_jogos, boloes, jogos, times, users RESTART IDENTITY CASCADE'
  );
}

export async function fecharBanco() {
  await sequelize.close();
}

let contador = 0;

/** Cria um usuário direto no banco e devolve { user, token } fazendo login pela API. */
export async function criarUsuario({ role = 'USER', nome } = {}) {
  contador += 1;
  const email = `usuario${contador}@teste.com`;
  const senha = 'senha123';
  const user = await User.create({ nome: nome ?? `Usuário ${contador}`, email, senha_hash: senha, role });

  const res = await api().post('/auth/login').send({ email, senha });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status} ${JSON.stringify(res.body)}`);

  return { user, token: res.body.token };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Admin cria dois times e um jogo entre eles. */
export async function criarJogo(adminToken, data = '2030-01-10T19:00:00Z') {
  const a = await api().post('/times').set(auth(adminToken)).send({ nome: `Time A ${contador}` });
  const b = await api().post('/times').set(auth(adminToken)).send({ nome: `Time B ${contador}` });
  const jogo = await api().post('/jogos').set(auth(adminToken))
    .send({ time_a_id: a.body.id, time_b_id: b.body.id, data_jogo: data });
  if (jogo.status !== 201) throw new Error(`criar jogo falhou: ${jogo.status} ${JSON.stringify(jogo.body)}`);
  return jogo.body;
}
