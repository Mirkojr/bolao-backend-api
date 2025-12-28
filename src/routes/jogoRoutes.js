import express from 'express'

import { authMiddleware } from '../middlewares/authMiddleware'
import { adminOnly } from '../middlewares/authMiddleware'

import GameController from '../controllers/jogoController.js';

const router = express.Router();

router.get('/jogos', authMiddleware, adminOnly, GameController.all);
router.delete('/jogos/1', authMiddleware, adminOnly, GameController.delete)