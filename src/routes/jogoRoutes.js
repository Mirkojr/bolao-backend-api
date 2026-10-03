import express from 'express';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';
import GameController from '../controllers/jogoController.js';
import { validate } from '../middlewares/validate.js';
import { schemaAtualizarJogo, schemaCriarJogo } from '../schemas/index.js';

const router = express.Router();

router.use(authMiddleware);

// --- CRUD jogos ---
router.route('/')
    .get(GameController.index)
    .post(adminOnly, validate({ body: schemaCriarJogo }), GameController.store);

router.route('/:id')
    .put(adminOnly, validate({ body: schemaAtualizarJogo }), GameController.update)
    .delete(adminOnly, GameController.delete);

export default router;