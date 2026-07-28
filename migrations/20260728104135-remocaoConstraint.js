'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeConstraint('times', 'times_sigla_key');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addConstraint('times', {
      fields: ['sigla'],
      type: 'unique',
      name: 'times_sigla_key'
    });
  }
};
