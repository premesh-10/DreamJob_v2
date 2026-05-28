import express from 'express';
import {
    validateCoupon,
    rateCourse,
    getCourseReviews,
    deleteReview,
    reportReview,
    submitFeedback,
    getMyNotifications
} from '../controllers/userFeaturesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Coupon validation
router.post('/coupons/validate', protect, validateCoupon);

// ── Course reviews
router.post('/courses/:id/rate', protect, rateCourse);
router.get('/courses/:id/reviews', getCourseReviews);          // Public — no auth needed

// ── Review management
router.delete('/feedback/:id', protect, deleteReview);          // Own or admin
router.post('/feedback/:id/report', protect, reportReview);     // Any logged-in user

// ── Platform feedback
router.post('/feedback', protect, submitFeedback);

// ── User notifications
router.get('/notifications/me', protect, getMyNotifications);

export default router;
