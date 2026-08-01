import { describe, it, expect, vi, afterEach} from "vitest";
import { aplicarPontosNosPalpites, calcularPontos, recalcularParticipantes} from "../../src/services/rankingService.js";
import { PONTUACAO_EXATA, PONTUACAO_PARCIAL } from "../../src/config/game.js";
import { Palpite, Participante } from "../../src/models/index.js";

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

        await aplicarPontosNosPalpites([palpite], 2, 1);

        expect(palpite.update).toHaveBeenCalledWith({ pontos_ganhos : PONTUACAO_EXATA});
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
        await aplicarPontosNosPalpites([palpite1, palpite2, palpite3, palpite4], 0, 0);

        expect(palpite1.update).toHaveBeenCalledWith({pontos_ganhos : PONTUACAO_EXATA});
        expect(palpite2.update).toHaveBeenCalledWith({pontos_ganhos : PONTUACAO_PARCIAL});
        expect(palpite3.update).toHaveBeenCalledWith({pontos_ganhos : 0});
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

    await recalcularParticipantes([1, 2]);

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 15 }, { where: { id: 1 } });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 8 },  { where: { id: 2 } });
  });

  it("participante que nao aparece nos totais deve receber 0", async ()=>{
    vi.spyOn(Palpite, "findAll").mockResolvedValue([
        { participante_id: 1, total: "0"},
        { participante_id: 2, total: "3"},
    ]);
    const updateSpy = vi.spyOn(Participante, "update").mockResolvedValue([1]);
    await recalcularParticipantes([1, 2, 3]);

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 1 } });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 3 },  { where: { id: 2 } });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 3 } });
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
    
    await recalcularParticipantes();

    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 1 } });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 3 },  { where: { id: 2 } });
    expect(updateSpy).toHaveBeenCalledWith({ pontuacao_no_bolao: 0 },  { where: { id: 3 } });
  });
});