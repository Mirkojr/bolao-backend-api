import { describe, it, expect } from "vitest";
import { parseGols } from "../../src/utils/placar.js";

describe("parseGols", () => {
    it("aceita inteiros não negativos", () => {
        expect(parseGols(0)).toBe(0);
        expect(parseGols(3)).toBe(3);
    });
    it("converte strings numéricas", () => {
        expect(parseGols("2")).toBe(2);
        expect(parseGols("0")).toBe(0);
    });
    it("rejeita negativos, decimais e não números", () => {
        expect(parseGols(-1)).toBeNull();
        expect(parseGols(1.5)).toBeNull();
        expect(parseGols("abc")).toBeNull();
        expect(parseGols("")).toBeNull();
        expect(parseGols(null)).toBeNull();
        expect(parseGols(undefined)).toBeNull();
        expect(parseGols(true)).toBeNull();
        expect(parseGols([2])).toBeNull();
    });
});
