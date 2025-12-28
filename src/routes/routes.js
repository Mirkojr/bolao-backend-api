import express from 'express';

import authRoutes from './authRoutes.js';
import usersRoutes from './usersRoutes.js';
import bolaoRoutes from './bolaoRoutes.js';
import jogoRoutes from './jogoRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/boloes', bolaoRoutes);
router.use('/jogos', jogoRoutes);

export default router;