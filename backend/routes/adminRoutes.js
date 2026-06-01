import express from 'express';
import {
    getAnalytics, getUsers, toggleBlockUser, updateUserRole,
    getAdminSellers, getAdminPayments, getAdminCourses, toggleCoursePublished, adminDeleteCourse, adminDeleteChapter,
    adminApproveChapter, adminApproveResource, adminRejectCourseRequest, adminRejectChapterRequest,
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
import {
    adminGetAllWebinars, adminToggleWebinar, adminUpdateWebinar, adminDeleteWebinar, adminCancelWebinar
} from '../controllers/webinarController.js';
import {
    adminGetAllPracticeTests, adminTogglePracticeTestPublish,
    adminDeletePracticeTest, adminGetTestAttempts
} from '../controllers/practiceTestController.js';
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
router.patch('/courses/:id/reject', adminRejectCourseRequest);
router.delete('/courses/:id', adminDeleteCourse);
router.delete('/courses/:id/chapters/:chapterId', adminDeleteChapter);
router.get('/courses/:id', getAdminCourses);
router.patch('/courses/:id/chapters/:chapterId/approve', adminApproveChapter);
router.patch('/courses/:id/chapters/:chapterId/reject', adminRejectChapterRequest);
router.patch('/courses/:id/resources/:resourceId/approve', adminApproveResource);

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

// ── Webinars
router.get('/webinars', adminGetAllWebinars);
router.put('/webinars/:id', adminUpdateWebinar);
router.patch('/webinars/:id/toggle', adminToggleWebinar);
router.patch('/webinars/:id/cancel', adminCancelWebinar);
router.delete('/webinars/:id', adminDeleteWebinar);

// ── Practice Tests
router.get('/practice-tests', adminGetAllPracticeTests);
router.patch('/practice-tests/:id/publish', adminTogglePracticeTestPublish);
router.delete('/practice-tests/:id', adminDeletePracticeTest);
router.get('/practice-tests/:id/attempts', adminGetTestAttempts);

export default router;
