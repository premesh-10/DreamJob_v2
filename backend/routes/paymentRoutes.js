import express from 'express';
import { createCheckoutSession, webhook } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);
// Webhook needs raw body, usually handled in server.js before body-parser
// but we will configure rawBody in server.js
router.post('/webhook', webhook);

export default router;
