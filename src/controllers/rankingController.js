import * as rankingService from '../services/rankingService.js';

export const RankingController = {
    // POST /admin/recalcularPontos
    async recalcularTudo(req, res) {
        try {
            await rankingService.recalcularTudo();
            return res.status(200).json({ message: 'Recalculado com sucesso!' });
        } catch (error) {
            console.error('Erro ao recalcular:', error);
            return res.status(500).json({ message: 'Erro ao recalcular' });
        }
    },
};