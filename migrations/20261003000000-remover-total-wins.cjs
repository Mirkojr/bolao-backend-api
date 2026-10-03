'use strict';

/**
 * participantes_bolao.total_wins nunca foi lida nem escrita pela API (não
 * existe no modelo Participante) e fica sempre no valor padrão 0.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE participantes_bolao DROP COLUMN IF EXISTS total_wins;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE participantes_bolao ADD COLUMN IF NOT EXISTS total_wins integer DEFAULT 0;'
    );
  },
};
