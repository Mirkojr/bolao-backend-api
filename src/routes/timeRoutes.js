import express from 'express'
import timeController from '../controllers/timeController.js';

const router = express.Router();

router.get('/', timeController.index);

export default router;