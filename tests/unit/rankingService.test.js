import { describe, it, expect, vi, afterEach} from "vitest";
import { aplicarPontosNosPalpites, calcularPontos, recalcularParticipantes, calcularPontuacaoJogo, recalcularTudo} from "../../src/services/rankingService.js";
import sequelize from "../../src/config/database.js";
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from "../../src/config/game.js";
import { Palpite, Participante, User, Jogo } from "../../src/models/index.js";

// Transação falsa: só precisa ser repassada adiante
const T = { id: "transacao-de-teste" };

describe('calcularPontos', ()=>{
    it("dá a pontuação exata quando crava o placar", ()=>{
        expect(calcularPontos(2, 1, 2, 1)).toBe(PONTUACAO_EXATA);
        expect(calcularPontos(5, 9, 5, 9)).toBe(PONTUACAO_EXATA);
        expect(calcularPontos(0, 0, 0, 0)).toBe(PONTUACAO_EXATA);
        expect(calcularPontos(0, 1, 0, 1)).toBe(PONTUACAO_EXATA);
        expect(calcularPontos(333, 44, 333, 44)).toBe(PONTUACAO_EXATA);
    });
    it("acertou o vencedor, mas não o placar", ()=>{
        expect(calcularPontos(4, 0, 1, 0)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(2, 5, 2, 8)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(0, 2, 1, 4)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(0, 90, 0, 1)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(11, 2, 1111, 4)).toBe(PONTUACAO_PARCIAL);
    });
    it("acertou o empate, placar diferente", ()=>{
        expect(calcularPontos(2, 2, 1, 1)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(0, 0, 5, 5)).toBe(PONTUACAO_PARCIAL);
        expect(calcularPontos(44, 44, 1, 1)).toBe(PONTUACAO_PARCIAL);
    });
    it("errou o resultado", ()=>{
        expect(calcularPontos(1, 1, 0, 1)).toBe(0);
        expect(calcularPontos(0, 2, 1, 1)).toBe(0);
        expect(calcularPontos(4, 2, 1, 4)).toBe(0);
    });
    it("jogo sem placar", ()=>{
        expect(calcularPontos(0, 0, null, null)).toBe(0);
        expect(calcularPontos(null, 0, 2, 1)).toBe(0);
        expect(calcularPontos(null, null, null, null)).toBe(0);
    });
});

describe("aplicarPontosNosPalpites", ()=>{
    it("atualiza o palpite quando a pontuação muda", async ()=>{
        const palpite = {
            gol_a_palpite: 2,
            gol_b_palpite: 1,
            pontos_ganhos: 0,
            update: vi.fn()
        }

        await aplicarPontosNosPalpites([palpite], 2, 1, T);

        expect(palpite.update).toHaveBeenCalledWith({ pontos_ganhos : PONTUACAO_EXATA}, { transaction: T });
    });
    it("pontuacao igual", async ()=>{
        const palpite = {
            gol_a_palpite: 2,
            gol_b_palpite: 1,
            pontos_ganhos: PONTUACAO_EXATA,
            update: vi.fn()
        }
        await aplicarPontosNosPalpites([palpite], 2, 1);
        expect(palpite.update).not.toHaveBeenCalled();
    });
    it("varios palpites", async ()=>{
        const palpite1 = {
            gol_a_palpite: 0,
            gol_b_palpite: 0,
            pontos_ganhos: PONTUACAO_PARCIAL,
            update: vi.fn()
        };
        const palpite2 = {
            gol_a_palpite: 2,
            gol_b_palpite: 2,
            pontos_ganhos: 0,
            update: vi.fn()
        };
        const palpite3 = {
            gol_a_palpite: 2,
            gol_b_palpite: 1,
            pontos_ganhos: PONTUACAO_EXATA,
            update: vi.fn()
        };

        const palpite4 = {
            gol_a_palpite: 0,
            gol_b_palpite: 0,
            pontos_ganhos: PONTUACAO_EXATA,
            update: vi.fn()
        }
        await aplicarPontosNosPalpites([palpite1, palpite2, palpite3, palpite4], 0, 0, T);

        expect(palpite1.update).toHaveBeenCalledWith({pontos_ganhos : PONTUACAO_EXATA}, { transaction: T });
        expect(palpite2.update).toHaveBeenCalledWith({pontos_ganhos : PONTUACAO_PARCIAL}, { transaction: T });
        expect(palpite3.update).toHaveBeenCalledWith({pontos_ganhos : 0}, { transaction: T });
        expect(palpite4.update).not.toHaveBeenCalled();
    });
    it("Lista vazia", async ()=>{
        let listaVazia = [];
        await aplicarPontosNosPalpites(listaVazia, 1, 1);
        expect(listaVazia).toStrictEqual([]);
    });

});

describe("recalcularParticipantes", () => {
  afterEach(() => vi.restoreAllMocks()); 

  it("grava a soma dos palpites em cada participante", async () => {
    vi.spyOn(Palpite, "findAll").mockResolvedValue([
      { participante_id: 1, total: "15" },
      { participante_id: 2, total: "8" },
    ]);
    const updateSpy = vi.spyOn(Participante, "update").mockResolvedValue([1]);

    await recalcularParticipantes([1, 2], T);

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 15 }, { where: { id: 1 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 8 },  { where: { id: 2 }, transaction: T });
  });

  it("participante que nao aparece nos totais deve receber 0", async ()=>{
    vi.spyOn(Palpite, "findAll").mockResolvedValue([
        { participante_id: 1, total: "0"},
        { participante_id: 2, total: "3"},
    ]);
    const updateSpy = vi.spyOn(Participante, "update").mockResolvedValue([1]);
    await recalcularParticipantes([1, 2, 3], T);

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 1 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 3 },  { where: { id: 2 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 3 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledTimes(3);
  });

  it("participanteIds não foi passado", async ()=>{
    vi.spyOn(Palpite, "findAll").mockResolvedValue([
        { participante_id: 1, total: "0"},
        { participante_id: 2, total: "3"},
    ]);
    vi.spyOn(Participante, "findAll").mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 }
    ]);
    const updateSpy = vi.spyOn(Participante, "update").mockResolvedValue([1]);
    
    await recalcularParticipantes(undefined, T);

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 1 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 3 },  { where: { id: 2 }, transaction: T });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 3 }, transaction: T });
  });
});

describe("transações", () => {
  afterEach(() => vi.restoreAllMocks());

  // Mocka as queries de um jogo com um palpite exato de um participante vinculado ao usuário 7
  const mockarJogoComUmPalpite = () => {
    const palpite = { participante_id: 1, gol_a_palpite: 2, gol_b_palpite: 1, pontos_ganhos: 0, update: vi.fn() };
    const palpiteFindAll = vi.spyOn(Palpite, "findAll").mockImplementation(async (opts) =>
      opts.group ? [{ participante_id: 1, total: "11" }] : [palpite]
    );
    const participanteFindAll = vi.spyOn(Participante, "findAll").mockImplementation(async (opts) =>
      opts.group ? [{ user_id: 7, total: "11" }] : [{ user_id: 7 }]
    );
    const participanteUpdate = vi.spyOn(Participante, "update").mockResolvedValue([1]);
    const userUpdate = vi.spyOn(User, "update").mockResolvedValue([1]);
    return { palpite, palpiteFindAll, participanteFindAll, participanteUpdate, userUpdate };
  };

  it("calcularPontuacaoJogo abre uma transação e a repassa a todas as queries", async () => {
    const transacao = vi.spyOn(sequelize, "transaction").mockImplementation(async (cb) => cb(T));
    const m = mockarJogoComUmPalpite();

    await calcularPontuacaoJogo(10, 2, 1);

    expect(transacao).toHaveBeenCalledTimes(1);
    for (const spy of [m.palpiteFindAll, m.participanteFindAll]) {
      for (const [opts] of spy.mock.calls) expect(opts.transaction).toBe(T);
    }
    expect(m.palpite.update).toHaveBeenCalledWith({ pontos_ganhos: PONTUACAO_EXATA }, { transaction: T });
    expect(m.participanteUpdate).toHaveBeenCalledWith({ pontuacao_no_bolao: 11 }, { where: { id: 1 }, transaction: T });
    expect(m.userUpdate).toHaveBeenCalledWith({ pontuacao_total: 11 }, { where: { id: 7 }, transaction: T });
  });

  it("calcularPontuacaoJogo usa a transação recebida em vez de abrir outra", async () => {
    const transacao = vi.spyOn(sequelize, "transaction");
    const m = mockarJogoComUmPalpite();

    await calcularPontuacaoJogo(10, 2, 1, T);

    expect(transacao).not.toHaveBeenCalled();
    expect(m.userUpdate).toHaveBeenCalledWith({ pontuacao_total: 11 }, { where: { id: 7 }, transaction: T });
  });

  it("uma falha no meio propaga o erro (para a transação ser desfeita)", async () => {
    vi.spyOn(sequelize, "transaction").mockImplementation(async (cb) => cb(T));
    const m = mockarJogoComUmPalpite();
    m.userUpdate.mockRejectedValue(new Error("falhou"));

    await expect(calcularPontuacaoJogo(10, 2, 1)).rejects.toThrow("falhou");
  });

  it("recalcularTudo roda numa única transação", async () => {
    const transacao = vi.spyOn(sequelize, "transaction").mockImplementation(async (cb) => cb(T));
    const jogoFindAll = vi.spyOn(Jogo, "findAll").mockResolvedValue([{ id: 10, gol_a_real: 2, gol_b_real: 1 }]);
    const m = mockarJogoComUmPalpite();
    vi.spyOn(User, "findAll").mockResolvedValue([{ id: 7 }]);

    await recalcularTudo();

    expect(transacao).toHaveBeenCalledTimes(1);
    expect(jogoFindAll.mock.calls[0][0].transaction).toBe(T);
    expect(m.palpite.update).toHaveBeenCalledWith({ pontos_ganhos: PONTUACAO_EXATA }, { transaction: T });
    expect(m.userUpdate).toHaveBeenCalledWith({ pontuacao_total: 11 }, { where: { id: 7 }, transaction: T });
  });
});
