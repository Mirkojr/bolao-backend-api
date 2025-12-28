import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';
import GameController from '../controllers/jogoController.js';

const router = express.Router();

// Listar todos os jogos disponíveis no sistema
router.get('/', authMiddleware, GameController.index); 

// Criar novo jogo (Ex: Brasil x Argentina)
router.post('/', authMiddleware, adminOnly, GameController.store); 

// Atualizar placar/status
router.put('/:id', authMiddleware, adminOnly, GameController.update); 

// Deletar jogo
router.delete('/:id', authMiddleware, adminOnly, GameController.delete);

export default router;