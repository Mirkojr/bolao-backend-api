import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

import BolaoController from '../controllers/bolaoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// --- CRUD Bolão ---
router.post('/', authMiddleware, adminOnly, BolaoController.store);
router.get('/', authMiddleware, BolaoController.index);
router.get('/:id', authMiddleware, BolaoController.show); 
router.put('/:id', authMiddleware, adminOnly, BolaoController.update); 
router.delete('/:id', authMiddleware, adminOnly, BolaoController.delete); 

// --- Jogos DENTRO do Bolão ---
router.get('/:id/jogos', authMiddleware, BolaoController.getJogos); 
router.post('/:id/jogos/:jogoId', authMiddleware, adminOnly, BolaoController.addJogo);
router.delete('/:id/jogos/:jogoId', authMiddleware, adminOnly, BolaoController.removeJogo);

// --- Participantes ---
router.get('/:id/participantes', authMiddleware, ParticipantController.index);
router.post('/:id/participantes', authMiddleware, adminOnly, ParticipantController.store);
router.delete('/:id/participantes/:participanteId', authMiddleware, adminOnly, ParticipantController.delete);

// --- Palpites ---
router.get('/:id/palpites', authMiddleware, PalpiteController.index);
router.post('/:id/palpites', authMiddleware, adminOnly, PalpiteController.store);
router.delete('/:id/palpites', authMiddleware, adminOnly, PalpiteController.delete);

export default router;