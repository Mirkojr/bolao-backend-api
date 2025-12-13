import express from 'express';
import usersRoutes from './usersRoutes.js';
import bolaoRoutes from './bolaoRoutes.js';

const router = express.Router();

router.use('/users', usersRoutes);
router.use('/boloes', bolaoRoutes);

export default router;