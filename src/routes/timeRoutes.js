import express from 'express'
import timeController from '../controllers/timeController.js';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { schemaAtualizarTime, schemaCriarTime } from '../schemas/index.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', timeController.index);
router.get('/:id', timeController.show);
router.get('/busca/:nome', timeController.searchByName);

router.use(adminOnly);

router.post('/', validate({ body: schemaCriarTime }), timeController.store);
router.put('/:id', validate({ body: schemaAtualizarTime }), timeController.update);
router.delete('/:id', timeController.delete);

export default router;