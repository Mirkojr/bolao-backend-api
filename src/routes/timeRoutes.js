import express from 'express'
import timeController from '../controllers/timeController.js';
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, timeController.index);
router.get('/:id', authMiddleware, timeController.show);
router.get('/busca/:nome', authMiddleware, timeController.searchByName);
router.post('/', authMiddleware, adminOnly, timeController.store);
router.put('/:id', authMiddleware, adminOnly, timeController.update);
router.delete('/:id', authMiddleware, adminOnly, timeController.delete);

export default router;