import { describe, it, expect } from "vitest";
import { inicioDoDia } from "../../src/utils/datas.js";

describe("inicioDoDia", () => {
    it("usa o dia de Brasília, não o do servidor (22h30 de Brasília já é outro dia em UTC)", () => {
        const agora = new Date("2026-10-03T01:30:00Z"); // 02/10 22:30 em Brasília
        expect(inicioDoDia(agora, 0, "America/Sao_Paulo").toISOString()).toBe("2026-10-02T03:00:00.000Z");
        expect(inicioDoDia(agora, 1, "America/Sao_Paulo").toISOString()).toBe("2026-10-03T03:00:00.000Z");
        expect(inicioDoDia(agora, 7, "America/Sao_Paulo").toISOString()).toBe("2026-10-09T03:00:00.000Z");
    });

    it("meia-noite exata continua no mesmo dia", () => {
        const meiaNoite = new Date("2026-10-02T03:00:00Z");
        expect(inicioDoDia(meiaNoite, 0, "America/Sao_Paulo").toISOString()).toBe("2026-10-02T03:00:00.000Z");
    });

    it("vira mês e ano", () => {
        const reveillon = new Date("2027-01-01T02:00:00Z"); // 31/12 23h em Brasília
        expect(inicioDoDia(reveillon, 1, "America/Sao_Paulo").toISOString()).toBe("2027-01-01T03:00:00.000Z");
    });

    it("respeita horário de verão em fusos que têm", () => {
        // Nova York muda de -5 para -4 em 08/03/2026
        const domingo = new Date("2026-03-08T12:00:00Z");
        expect(inicioDoDia(domingo, 0, "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
        expect(inicioDoDia(domingo, 1, "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    });
});
