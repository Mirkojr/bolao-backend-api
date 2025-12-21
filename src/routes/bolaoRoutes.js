import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';

// Importando os Controllers
import BolaoController from '../controllers/bolaoController.js';
import GameController from '../controllers/jogoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// Rotas de Bolão (CRUD)
router.post('/', authMiddleware, BolaoController.store);
router.get('/', authMiddleware, BolaoController.index);
router.get('/:id', authMiddleware, BolaoController.show); 
router.put('/:id', authMiddleware, BolaoController.update); 
router.delete('/:id', authMiddleware, BolaoController.delete); 

// Rotas de Jogos no Bolão
router.get('/:id/jogos', authMiddleware, GameController.index);
router.post('/:id/jogos', authMiddleware, GameController.store);

// Rotas de Participantes
router.get('/:id/participantes', authMiddleware, ParticipantController.index);
router.post('/:id/participantes', authMiddleware, ParticipantController.store);

// Rotas de Palpites
router.get('/:id/palpites', authMiddleware, PalpiteController.index);
router.post('/:id/palpites', authMiddleware, PalpiteController.store);

export default router;