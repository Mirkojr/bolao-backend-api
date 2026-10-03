import express from 'express';
import AuthController from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { schemaLogin, schemaRegistro } from '../schemas/index.js';

const router = express.Router();

router.post('/register', validate({ body: schemaRegistro }), AuthController.register);
router.post('/login', validate({ body: schemaLogin }), AuthController.login);

export default router;