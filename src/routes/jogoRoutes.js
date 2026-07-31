import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';
import GameController from '../controllers/jogoController.js';

const router = express.Router();

router.use(authMiddleware);

// --- CRUD jogos ---
router.route('/')
    .get(GameController.index)
    .post(adminOnly, GameController.store);

router.route('/:id')
    .put(adminOnly, GameController.update)
    .delete(adminOnly, GameController.delete);

export default router;