'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        constraint_record record;
        index_record record;
      BEGIN
        FOR constraint_record IN
          SELECT tc.constraint_name AS constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
           AND ccu.constraint_schema = tc.constraint_schema
          WHERE tc.table_schema = current_schema()
            AND tc.table_name = 'times'
            AND tc.constraint_type = 'UNIQUE'
            AND ccu.column_name = 'sigla'
        LOOP
          EXECUTE format('ALTER TABLE times DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        END LOOP;

        FOR index_record IN
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = current_schema()
            AND tablename = 'times'
            AND indexdef ILIKE '%UNIQUE%'
            AND indexdef ILIKE '%(sigla)%'
        LOOP
          EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
        END LOOP;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.addConstraint('times', {
      fields: ['sigla'],
      type: 'unique',
      name: 'times_sigla_key',
    });
  },
};