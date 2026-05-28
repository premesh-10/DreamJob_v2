import express from 'express';
import { getWallet, addMoney, deductMoney } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/add', protect, addMoney);
router.post('/deduct', protect, deductMoney);

export default router;
