import express from 'express';
import { authMiddleware, bolaoOwner, bolaoMember } from '../middlewares/authMiddleware.js';

import BolaoController from '../controllers/bolaoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';
import { validate } from '../middlewares/validate.js';
import { schemaBolao, schemaParticipante, schemaPalpite, schemaRemoverPalpite } from '../schemas/index.js';

const router = express.Router();

// --- Autenticação necessária para fazer qualquer coisa com bolões ---
router.use(authMiddleware);

// --- CRUD Bolão ---
router.route('/')
  .get(BolaoController.index)
  .post(validate({ body: schemaBolao }), BolaoController.store);

router.route('/:id')
  .get(bolaoMember, BolaoController.show)
  .put(bolaoOwner, validate({ body: schemaBolao }), BolaoController.update)
  .delete(bolaoOwner, BolaoController.delete);


// --- Jogos DENTRO do Bolão ---
router.route('/:id/jogos')
  .get(bolaoMember, BolaoController.getJogos);

router.route('/:id/jogos/:jogoId')
  .post(bolaoOwner, BolaoController.addJogo)
  .delete(bolaoOwner, BolaoController.removeJogo);


// --- Participantes ---
router.route('/:id/participantes')
  .get(bolaoMember, ParticipantController.index)
  .post(bolaoOwner, validate({ body: schemaParticipante }), ParticipantController.store);

router.route('/:id/participantes/:participanteId')
  .delete(bolaoOwner, ParticipantController.delete);


// --- Palpites ---
router.route('/:id/palpites')
  .get(bolaoMember, PalpiteController.index)
  .post(bolaoOwner, validate({ body: schemaPalpite }), PalpiteController.store)
  .delete(bolaoOwner, validate({ body: schemaRemoverPalpite }), PalpiteController.delete);

export default router;