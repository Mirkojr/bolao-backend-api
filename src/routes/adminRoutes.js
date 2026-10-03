import Router from 'express';
import { RankingController } from '../controllers/rankingController.js';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/recalcularPontos', authMiddleware, adminOnly, RankingController.recalcularTudo);

// Obsoleto: GET não deveria alterar dados (e o frontend repete GETs em caso de
// falha de rede). Mantido só até o frontend em produção passar a usar POST.
router.get('/recalcularPontos', authMiddleware, adminOnly, RankingController.recalcularTudo);

export default router;
