import Router from 'express';
import { RankingController } from '../controllers/rankingController.js';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/recalcularPontos',  authMiddleware, adminOnly, RankingController.recalcularTudo);

export default router;