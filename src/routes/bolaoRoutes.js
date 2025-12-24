import express from 'express';

// Importando os Controllers
import BolaoController from '../controllers/bolaoController.js';
import GameController from '../controllers/jogoController.js';
import ParticipantController from '../controllers/participanteController.js';
import PalpiteController from '../controllers/palpiteController.js';

const router = express.Router();

// Rotas de Bolão (CRUD)
router.post('/', BolaoController.store);
router.get('/', BolaoController.index);
router.get('/:id', BolaoController.show); 
router.put('/:id', BolaoController.update); 
router.delete('/:id', BolaoController.delete); 

// Rotas de Jogos no Bolão
router.get('/:id/jogos', GameController.index);
router.post('/:id/jogos', GameController.store);

// Rotas de Participantes
router.get('/:id/participantes', ParticipantController.index);
router.post('/:id/participantes', ParticipantController.store);
router.delete('/:id/participantes/:participanteId', ParticipantController.delete);

// Rotas de Palpites
router.get('/:id/palpites', PalpiteController.index);
router.post('/:id/palpites', PalpiteController.store);
router.delete('/:id/palpites', PalpiteController.delete);

export default router;