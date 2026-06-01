import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';

// ─── Coupon Validation ────────────────────────────────────────────────────────

// @desc    Validate a coupon code
// @route   POST /api/v1/coupons/validate
// @access  Private
export const validateCoupon = async (req, res, next) => {
    try {
        const { code, orderAmount, applicableTo } = req.body;

        const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
        if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        if (!coupon.isActive) return res.status(400).json({ success: false, message: 'This coupon is no longer active' });
        if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ success: false, message: 'This coupon has expired' });
        if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
        if (orderAmount < coupon.minOrderAmount) return res.status(400).json({ success: false, message: `Minimum order amount is $${coupon.minOrderAmount}` });
        if (coupon.applicableTo !== 'all' && applicableTo && coupon.applicableTo !== applicableTo) {
            return res.status(400).json({ success: false, message: `This coupon is only valid for ${coupon.applicableTo}` });
        }

        let discount = coupon.discountType === 'percent'
            ? (orderAmount * coupon.discountValue) / 100
            : coupon.discountValue;
        discount = Math.min(discount, orderAmount);

        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully!',
            data: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discount: parseFloat(discount.toFixed(2)),
                finalAmount: parseFloat((orderAmount - discount).toFixed(2))
            }
        });
    } catch (error) { next(error); }
};

// ─── Course Rating & Review ───────────────────────────────────────────────────

// @desc    Rate + review a course (enrolled users only, one review per user per course)
// @route   POST /api/v1/courses/:id/rate
// @access  Private
export const rateCourse = async (req, res, next) => {
    try {
        const { rating, review } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        if (!review || review.trim().length < 3) return res.status(400).json({ message: 'Please write a short review (min 3 characters)' });

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const isEnrolled = course.enrolledUsers.map(u => u.toString()).includes(req.user.id);
        const isOwner   = course.seller.toString() === req.user.id;
        if (!isEnrolled && !isOwner) return res.status(403).json({ message: 'You must be enrolled to rate this course' });

        // Check if user already reviewed
        const existing = await Feedback.findOne({ user: req.user.id, type: 'course', targetId: course._id });
        if (existing) return res.status(400).json({ message: 'You have already reviewed this course. Delete your existing review to add a new one.' });

        // Save the review
        const feedback = await Feedback.create({
            user: req.user.id,
            type: 'course',
            targetId: course._id,
            rating: Number(rating),
            review: review.trim()
        });

        // Recompute rolling average from all non-hidden reviews
        const allReviews = await Feedback.find({ type: 'course', targetId: course._id, isHidden: false });
        const totalRating = allReviews.reduce((sum, f) => sum + (f.rating || 0), 0);
        course.rating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
        course.totalReviews = allReviews.length;
        await course.save();

        const populated = await feedback.populate('user', 'name');

        res.status(201).json({
            success: true,
            message: 'Review submitted!',
            data: populated
        });
    } catch (error) { next(error); }
};

// @desc    Get all public reviews for a course
// @route   GET /api/v1/courses/:id/reviews
// @access  Public
export const getCourseReviews = async (req, res, next) => {
    try {
        const reviews = await Feedback.find({
            type: 'course',
            targetId: req.params.id,
            isHidden: false
        })
            .populate('user', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) { next(error); }
};

// @desc    Delete own review
// @route   DELETE /api/v1/feedback/:id
// @access  Private (own review only)
export const deleteReview = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Review not found' });

        const isOwner = feedback.user.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user.role);
        if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorised to delete this review' });

        const targetId = feedback.targetId;
        const type     = feedback.type;

        await feedback.deleteOne();

        // Recompute course rating if it was a course review
        if (type === 'course' && targetId) {
            const course = await Course.findById(targetId);
            if (course) {
                const allReviews = await Feedback.find({ type: 'course', targetId, isHidden: false });
                course.rating = allReviews.length > 0
                    ? allReviews.reduce((s, f) => s + (f.rating || 0), 0) / allReviews.length
                    : 0;
                course.totalReviews = allReviews.length;
                await course.save();
            }
        }

        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (error) { next(error); }
};

// @desc    Report a review
// @route   POST /api/v1/feedback/:id/report
// @access  Private
export const reportReview = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Review not found' });

        // Prevent duplicate reports from same user
        if (feedback.reportedBy.map(u => u.toString()).includes(req.user.id)) {
            return res.status(400).json({ message: 'You have already reported this review' });
        }

        feedback.reportedBy.push(req.user.id);
        feedback.isReported = true;
        if (reason) feedback.reportReason = reason;
        await feedback.save();

        res.status(200).json({ success: true, message: 'Review reported. Our team will review it shortly.' });
    } catch (error) { next(error); }
};

// ─── Platform Feedback ────────────────────────────────────────────────────────

// @desc    Submit platform feedback
// @route   POST /api/v1/feedback
// @access  Private
export const submitFeedback = async (req, res, next) => {
    try {
        const { type = 'platform', targetId, rating, review, category } = req.body;
        if (!review || review.trim().length < 5) return res.status(400).json({ message: 'Feedback must be at least 5 characters' });

        const feedback = await Feedback.create({
            user: req.user.id,
            type,
            targetId: targetId || null,
            rating: rating ? Number(rating) : null,
            review: review.trim(),
            category: category || 'general'
        });

        res.status(201).json({ success: true, message: 'Thank you for your feedback!', data: feedback });
    } catch (error) { next(error); }
};

// ─── User Notifications ───────────────────────────────────────────────────────

// @desc    Get notifications for the current user (based on role)
// @route   GET /api/v1/notifications/me
// @access  Private
export const getMyNotifications = async (req, res, next) => {
    try {
        const role = req.user.role;
        const notifications = await Notification.find({
            $or: [
                { targetRole: { $in: ['all', role] }, targetUser: { $exists: false } },
                { targetRole: { $in: ['all', role] }, targetUser: null },
                { targetUser: req.user.id }
            ]
        }).sort({ createdAt: -1 }).limit(50);

        res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (error) { next(error); }
};

// @desc    Check if user has unread notifications
// @route   GET /api/v1/notifications/unread
// @access  Private
export const getUnreadNotificationCount = async (req, res, next) => {
    try {
        const role = req.user.role;
        const lastSeen = req.user.lastSeenNotifications || new Date(0);
        
        const count = await Notification.countDocuments({
            createdAt: { $gt: lastSeen },
            $or: [
                { targetRole: { $in: ['all', role] }, targetUser: { $exists: false } },
                { targetRole: { $in: ['all', role] }, targetUser: null },
                { targetUser: req.user.id }
            ]
        });

        res.status(200).json({ success: true, hasUnread: count > 0, count });
    } catch (error) { next(error); }
};

// @desc    Mark notifications as read
// @route   PATCH /api/v1/notifications/read
// @access  Private
export const markNotificationsRead = async (req, res, next) => {
    try {
        req.user.lastSeenNotifications = new Date();
        await req.user.save({ validateBeforeSave: false });
        res.status(200).json({ success: true, message: 'Notifications marked as read' });
    } catch (error) { next(error); }
};
