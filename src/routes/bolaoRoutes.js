import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

import BolaoController from '../controllers/bolaoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// --- Autenticação necessária para fazer qualquer coisa com bolões ---
router.use(authMiddleware);

// --- CRUD Bolão ---
router.route('/')
  .get(BolaoController.index)
  .post(adminOnly, BolaoController.store);

router.route('/:id')
  .get(BolaoController.show)
  .put(adminOnly, BolaoController.update)
  .delete(adminOnly, BolaoController.delete);


// --- Jogos DENTRO do Bolão ---
router.route('/:id/jogos')
  .get(BolaoController.getJogos);

router.route('/:id/jogos/:jogoId')
  .post(adminOnly, BolaoController.addJogo)
  .delete(adminOnly, BolaoController.removeJogo);


// --- Participantes ---
router.route('/:id/participantes')
  .get(ParticipantController.index)
  .post(adminOnly, ParticipantController.store);

router.route('/:id/participantes/:participanteId')
  .delete(adminOnly, ParticipantController.delete);


// --- Palpites ---
router.route('/:id/palpites')
  .get(PalpiteController.index)
  .post(adminOnly, PalpiteController.store)
  .delete(adminOnly, PalpiteController.delete);

export default router;