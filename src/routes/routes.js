import express from 'express';

import { authMiddleware, adminOnly }from '../middlewares/authMiddleware.js';

import authRoutes from './authRoutes.js';
import usersRoutes from './usersRoutes.js';
import bolaoRoutes from './bolaoRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/boloes', authMiddleware, adminOnly, bolaoRoutes);

export default router;