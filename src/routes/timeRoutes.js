import express from 'express'
import timeController from '../controllers/timeController.js';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', timeController.index);
router.get('/:id', timeController.show);
router.get('/busca/:nome', timeController.searchByName);

router.use(adminOnly);

router.post('/', timeController.store);
router.put('/:id', timeController.update);
router.delete('/:id', timeController.delete);

export default router;