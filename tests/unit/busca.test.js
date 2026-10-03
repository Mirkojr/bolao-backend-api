import { describe, it, expect } from "vitest";
import { termoContem } from "../../src/utils/busca.js";

describe("termoContem", () => {
    it("envolve o termo em % e tira os espaços das pontas", () => {
        expect(termoContem("  Flamengo ")).toBe("%Flamengo%");
    });
    it("escapa os curingas digitados pelo usuário", () => {
        expect(termoContem("50%")).toBe("%50\\%%");
        expect(termoContem("a_b")).toBe("%a\\_b%");
        expect(termoContem("c:\\x")).toBe("%c:\\\\x%");
    });
});
