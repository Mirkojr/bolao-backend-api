'use strict';

/**
 * O status do jogo passa a ser derivado do placar:
 *   - FINALIZADO  <=> os dois placares preenchidos
 *   - AGENDADO    <=> nenhum placar
 * EM_ANDAMENTO nunca foi usado pela API. Placares pela metade (só um lado)
 * não pontuavam e são limpos. Uma CHECK garante a regra daqui em diante.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE jogos SET gol_a_real = NULL, gol_b_real = NULL
       WHERE (gol_a_real IS NULL) <> (gol_b_real IS NULL);

      UPDATE jogos
         SET status = CASE WHEN gol_a_real IS NOT NULL THEN 'FINALIZADO' ELSE 'AGENDADO' END
       WHERE status IS DISTINCT FROM CASE WHEN gol_a_real IS NOT NULL THEN 'FINALIZADO' ELSE 'AGENDADO' END;

      ALTER TABLE jogos ALTER COLUMN status SET DEFAULT 'AGENDADO';
      ALTER TABLE jogos ALTER COLUMN status SET NOT NULL;

      ALTER TABLE jogos ADD CONSTRAINT check_status_placar CHECK (
        (status = 'FINALIZADO' AND gol_a_real IS NOT NULL AND gol_b_real IS NOT NULL)
        OR (status = 'AGENDADO' AND gol_a_real IS NULL AND gol_b_real IS NULL)
      );

      COMMENT ON COLUMN jogos.status IS 'AGENDADO (sem placar) ou FINALIZADO (com placar)';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE jogos DROP CONSTRAINT IF EXISTS check_status_placar;
      ALTER TABLE jogos ALTER COLUMN status DROP NOT NULL;
      COMMENT ON COLUMN jogos.status IS 'AGENDADO, EM_ANDAMENTO, FINALIZADO';
    `);
  },
};
