import express from 'express';
import {
    getAnalytics, getUsers, toggleBlockUser, updateUserRole,
    getAdminSellers, getAdminPayments, getAdminCourses, toggleCoursePublished,
    getAdminInterviews,
    getAdminBookings,
    getAdminWallet,
    getAdminSubscriptions,
    getAdminCoupons, createCoupon, toggleCoupon, deleteCoupon,
    getAdminFeedback,
    getAdminNotifications, sendNotification, deleteNotification,
    getAdminReports,
    getSecurityLogs,
    getAdminSettings, updateAdminSettings,
    getAdminReviews, hideReview, deleteAdminReview
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes are protected
router.use(protect);
router.use(authorize('admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'));

// ── Dashboard
router.get('/analytics', getAnalytics);

// ── Users
router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.patch('/users/:id/role', authorize('admin', 'super_admin'), updateUserRole);

// ── Sellers
router.get('/sellers', getAdminSellers);

// ── Courses
router.get('/courses', getAdminCourses);
router.patch('/courses/:id/publish', toggleCoursePublished);

// ── Interviews
router.get('/interviews', getAdminInterviews);

// ── Payments / Transactions
router.get('/payments', getAdminPayments);

// ── Bookings
router.get('/bookings', getAdminBookings);

// ── Wallet
router.get('/wallet', getAdminWallet);

// ── Subscriptions
router.get('/subscriptions', getAdminSubscriptions);

// ── Coupons
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id/toggle', toggleCoupon);
router.delete('/coupons/:id', deleteCoupon);

// ── Feedback
router.get('/feedback', getAdminFeedback);

// ── Notifications
router.get('/notifications', getAdminNotifications);
router.post('/notifications', sendNotification);
router.delete('/notifications/:id', deleteNotification);

// ── Reports
router.get('/reports', getAdminReports);

// ── Security
router.get('/security', getSecurityLogs);

// ── Settings
router.get('/settings', getAdminSettings);
router.put('/settings', authorize('admin', 'super_admin'), updateAdminSettings);

// ── Review Management
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id/hide', hideReview);
router.delete('/reviews/:id', deleteAdminReview);

export default router;
