import express from 'express';
import { User } from '../models/index.js';
import UserController from '../controllers/userController.js';
import userController from '../controllers/userController.js';

const router = express.Router();

// retornar todos os usuários
router.get('/', UserController.index);

// criar um novo usuário
router.post('/', userController.store);

// retornar um usuário pelo id
router.get('/:id', userController.show);

// atualizar um usuário pelo id
router.put('/:id', userController.update);

// apagar um usuário pelo id
router.delete('/:id', userController.delete);

export default router;