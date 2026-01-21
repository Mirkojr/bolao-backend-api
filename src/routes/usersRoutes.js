import express from 'express';
import { User } from '../models/index.js';
import userController from '../controllers/userController.js'

const router = express.Router();

// retornar todos os usuários
router.get('/', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});

// criar um novo usuário
router.post('/', userController.store);

// retornar um usuário pelo id
router.get('/:id', userController.index);

// atualizar um usuário pelo id
router.put('/:id', userController.update);

// apagar um usuário pelo id
router.delete('/:id', userController.delete);

export default router;