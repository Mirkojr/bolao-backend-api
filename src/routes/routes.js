import express from 'express';

import authRoutes from './authRoutes.js';
import usersRoutes from './usersRoutes.js';
import bolaoRoutes from './bolaoRoutes.js';
import jogoRoutes from './jogoRoutes.js';
import timeRoutes from './timeRoutes.js';
import adminRoutes from './adminRoutes.js'

import { apiLimiter } from '../middlewares/rateLimiterMiddleware.js';
import { loginLimiter } from '../middlewares/rateLimiterMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { exportExcel, exportPdf } from '../controllers/exportController.js';

const router = express.Router();

router.use(apiLimiter);
router.use('/auth', loginLimiter, authRoutes);
router.use('/users', usersRoutes);
router.use('/boloes', bolaoRoutes);
router.use('/jogos', jogoRoutes);
router.use('/times', timeRoutes);
router.use('/admin', adminRoutes);
router.get('/boloes/:id/export/excel', authMiddleware, exportExcel);
router.get('/boloes/:id/export/pdf', authMiddleware, exportPdf);

export default router;