import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

// Importando os Controllers
import BolaoController from '../controllers/bolaoController.js';
import GameController from '../controllers/jogoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// Rotas de Bolão (CRUD)
router.post('/', authMiddleware, adminOnly, BolaoController.store);
router.get('/', authMiddleware, adminOnly, BolaoController.index);
router.get('/:id', authMiddleware, adminOnly, BolaoController.show); 
router.put('/:id', authMiddleware, adminOnly, BolaoController.update); 
router.delete('/:id', authMiddleware, adminOnly, BolaoController.delete); 

// Rotas de Jogos no Bolão
router.get('/:id/jogos', authMiddleware, adminOnly, GameController.index);
router.post('/:id/jogos', authMiddleware, adminOnly, GameController.store);

// Rotas de Participantes
router.get('/:id/participantes', authMiddleware, adminOnly, ParticipantController.index);
router.post('/:id/participantes', authMiddleware, adminOnly, ParticipantController.store);

// Rotas de Palpites
router.get('/:id/palpites', authMiddleware, adminOnly, PalpiteController.index);
router.post('/:id/palpites', authMiddleware, adminOnly, PalpiteController.store);

export default router;