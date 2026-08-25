import express from 'express';
import { authMiddleware, adminOnly, bolaoOwner } from '../middlewares/authMiddleware.js';

import BolaoController from '../controllers/bolaoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// --- Autenticação necessária para fazer qualquer coisa com bolões ---
router.use(authMiddleware);

// --- CRUD Bolão ---
router.route('/')
  .get(BolaoController.index)
  .post(BolaoController.store);

router.route('/:id')
  .get(BolaoController.show)
  .put(bolaoOwner, BolaoController.update)
  .delete(bolaoOwner, BolaoController.delete);


// --- Jogos DENTRO do Bolão ---
router.route('/:id/jogos')
  .get(BolaoController.getJogos);

router.route('/:id/jogos/:jogoId')
  .post(bolaoOwner, BolaoController.addJogo)
  .delete(bolaoOwner, BolaoController.removeJogo);


// --- Participantes ---
router.route('/:id/participantes')
  .get(ParticipantController.index)
  .post(bolaoOwner, ParticipantController.store);

router.route('/:id/participantes/:participanteId')
  .delete(bolaoOwner, ParticipantController.delete);


// --- Palpites ---
router.route('/:id/palpites')
  .get(PalpiteController.index)
  .post(bolaoOwner, PalpiteController.store)
  .delete(bolaoOwner, PalpiteController.delete);

export default router;