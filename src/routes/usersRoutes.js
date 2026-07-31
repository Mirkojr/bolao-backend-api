import express from 'express';
import { User } from '../models/index.js';
import userController from '../controllers/userController.js'
import { authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// retornar um usuário pelo id
router.get('/:id', userController.show);

// A partir daqui, apenas admin pode realizar.
router.use(adminOnly);

// retornar todos os usuários
router.get('/', userController.index);

// criar um novo usuário
router.post('/', userController.store);

// atualizar um usuário pelo id
router.put('/:id', userController.update);

// apagar um usuário pelo id
router.delete('/:id', userController.delete);

export default router;