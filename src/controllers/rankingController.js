import { recalcularTudo } from '../services/rankingService.js';

// A regra de pontuação e o recálculo ficam em services/rankingService.js.
export const RankingController = {
    /** Recálculo geral (rota administrativa). */
    async recalcularTudo(req, res) {
        await recalcularTudo();
        return res.status(200).json({ message: 'Recalculado com sucesso!' });
    },
};
