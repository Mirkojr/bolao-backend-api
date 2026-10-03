import express from 'express';
import userController from '../controllers/userController.js'
import { validate } from '../middlewares/validate.js';
import { schemaAtualizarUsuario, schemaCriarUsuario } from '../schemas/index.js';
import { isOwner, authMiddleware, adminOnly } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// retornar um usuário pelo id
router.get('/:id', isOwner, userController.show);

// A partir daqui, apenas admin pode realizar.
router.use(adminOnly);

// retornar todos os usuários
router.get('/', userController.index);

// criar um novo usuário
router.post('/', validate({ body: schemaCriarUsuario }), userController.store);

// atualizar um usuário pelo id
router.put('/:id', validate({ body: schemaAtualizarUsuario }), userController.update);

// apagar um usuário pelo id
router.delete('/:id', userController.delete);

export default router;