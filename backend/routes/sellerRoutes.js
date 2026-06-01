import express from 'express';
import {
    applySeller, getSellers, updateSellerStatus, getMyApplicationStatus,
    getMySellerProfile, updateMySellerProfile, getMySellerStats,
    requestWithdrawal, getWithdrawalRequests, processWithdrawal,
    adjustSellerWallet
} from '../controllers/sellerController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Static routes first (before any :param routes) ────────────────────────────

// Seller — own profile & stats
router.get('/me', protect, getMySellerProfile);
router.put('/me', protect, authorize('seller', 'admin', 'super_admin'), updateMySellerProfile);
router.get('/me/stats', protect, getMySellerStats);
router.post('/me/withdraw', protect, authorize('seller', 'admin', 'super_admin'), requestWithdrawal);

// Any authenticated user can apply or check status
router.post('/apply', protect, applySeller);
router.get('/my-status', protect, getMyApplicationStatus);

// Admin — list all sellers & all withdrawal requests (static paths before param routes)
router.get('/', protect, authorize('admin', 'super_admin', 'moderator'), getSellers);
router.get('/withdrawals', protect, authorize('admin', 'super_admin', 'finance_admin'), getWithdrawalRequests);

// ── Param routes ───────────────────────────────────────────────────────────────

// Admin — seller status management
router.put('/:id/status', protect, authorize('admin', 'super_admin'), updateSellerStatus);

// Admin — withdrawal processing  (sellerId/withdrawals/withdrawalId)
router.put('/:sellerId/withdrawals/:withdrawalId', protect, authorize('admin', 'super_admin', 'finance_admin'), processWithdrawal);

// Admin — seller wallet adjustment
router.post('/:id/wallet-adjust', protect, authorize('admin', 'super_admin'), adjustSellerWallet);

export default router;
