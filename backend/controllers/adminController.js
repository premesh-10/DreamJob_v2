import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Booking from '../models/Booking.js';
import Seller from '../models/Seller.js';
import Course from '../models/Course.js';
import Interview from '../models/Interview.js';
import Coupon from '../models/Coupon.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';

// ─── Admin Interviews ──────────────────────────────────────────────────────────

// @desc    Get all interview profiles for admin
// @route   GET /api/v1/admin/interviews
// @access  Private/Admin
export const getAdminInterviews = async (req, res, next) => {
    try {
        const interviews = await Interview.find()
            .populate('interviewer', 'name email experience');

        // Enrich with booking counts
        const enriched = await Promise.all(interviews.map(async (iv) => {
            const bookingCount = await Booking.countDocuments({
                interview: iv._id,
                type: 'interview'
            });
            return {
                _id: iv._id,
                domain: iv.domain,
                price: iv.price,
                meetingMode: iv.meetingMode,
                ratings: iv.ratings,
                totalReviews: iv.totalReviews,
                interviewer: iv.interviewer,
                totalSlots: iv.slots?.length || 0,
                availableSlots: iv.slots?.filter(s => !s.isBooked).length || 0,
                totalBookings: bookingCount,
                createdAt: iv.createdAt
            };
        }));

        res.status(200).json({
            success: true,
            count: enriched.length,
            data: enriched
        });
    } catch (error) {
        next(error);
    }
};

// ─── Analytics ────────────────────────────────────────────────────────────────

// @desc    Get platform analytics
// @route   GET /api/v1/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalSellers = await User.countDocuments({ role: 'seller' });
        const totalCourses = await Course.countDocuments();
        const publishedCourses = await Course.countDocuments({ isPublished: true });

        const subscriptions = await User.find({ 'subscription.plan': { $ne: 'None' } });
        const activeSubscriptions = subscriptions.length;

        const paidBookings = await Booking.find({ paymentStatus: 'paid' });
        const courseRevenue = paidBookings.filter(b => b.type === 'course').reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
        const interviewRevenue = paidBookings.filter(b => b.type === 'interview').reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
        const totalRevenue = courseRevenue + interviewRevenue;

        const totalBookings = await Booking.countDocuments();
        const pendingSellers = await Seller.countDocuments({ status: 'pending' });

        // Recent 7-day revenue trend
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentRevenue = await Transaction.aggregate([
            { $match: { type: 'credit', status: 'completed', createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt isBlocked');

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalSellers,
                totalCourses,
                publishedCourses,
                activeSubscriptions,
                totalRevenue,
                courseRevenue,
                interviewRevenue,
                totalBookings,
                pendingSellers,
                recentRevenue,
                recentUsers
            }
        });
    } catch (error) {
        next(error);
    }
};

// ─── Users ────────────────────────────────────────────────────────────────────

// @desc    Get all users
// @route   GET /api/v1/admin/users
export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) { next(error); }
};

// @desc    Block or Unblock User
// @route   PATCH /api/v1/admin/users/:id/block
export const toggleBlockUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isBlocked = !user.isBlocked;
        await user.save({ validateBeforeSave: false });
        res.status(200).json({
            success: true,
            isBlocked: user.isBlocked,
            message: `User ${user.name} has been ${user.isBlocked ? 'blocked' : 'unblocked'}`
        });
    } catch (error) { next(error); }
};

// @desc    Update user role
// @route   PATCH /api/v1/admin/users/:id/role
export const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['user', 'seller', 'admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
        if (!allowedRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: false }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (role === 'seller') {
            const existingSeller = await Seller.findOne({ user: user._id });
            if (existingSeller) {
                if (existingSeller.status !== 'approved') {
                    existingSeller.status = 'approved';
                    await existingSeller.save();
                }
            } else {
                await Seller.create({
                    user: user._id,
                    status: 'approved',
                    contentType: 'Both'
                });
            }
        } else if (role === 'user') {
            // Remove the seller profile entirely if they are demoted to a regular user
            await Seller.findOneAndDelete({ user: user._id });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
};

// ─── Sellers ──────────────────────────────────────────────────────────────────

// @desc    Get Sellers with course count, earnings
// @route   GET /api/v1/admin/sellers
export const getAdminSellers = async (req, res, next) => {
    try {
        const sellers = await Seller.find()
            .populate('user', 'name email mobile createdAt')
            .sort({ createdAt: -1 });

        // Attach course count for each seller
        const enriched = await Promise.all(sellers.map(async (s) => {
            const courseCount = await Course.countDocuments({ seller: s.user._id });
            return { ...s.toObject(), courseCount };
        }));

        res.status(200).json({ success: true, data: enriched });
    } catch (error) { next(error); }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

// @desc    Get all transactions
// @route   GET /api/v1/admin/payments
export const getAdminPayments = async (req, res, next) => {
    try {
        const transactions = await Transaction.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) { next(error); }
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

// @desc    Get all bookings (interviews + courses)
// @route   GET /api/v1/admin/bookings
export const getAdminBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'name email')
            .populate('seller', 'name email')
            .populate({ path: 'interview', select: 'domain price meetingMode' })
            .populate('course', 'title price')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) { next(error); }
};

// ─── Courses ──────────────────────────────────────────────────────────────────

// @desc    Get Courses for Moderation
// @route   GET /api/v1/admin/courses
export const getAdminCourses = async (req, res, next) => {
    try {
        const courses = await Course.find()
            .populate('seller', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: courses });
    } catch (error) { next(error); }
};

// @desc    Toggle course published status
// @route   PATCH /api/v1/admin/courses/:id/publish
export const toggleCoursePublished = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });
        course.isPublished = !course.isPublished;
        await course.save();
        res.status(200).json({
            success: true,
            isPublished: course.isPublished,
            message: `Course has been ${course.isPublished ? 'published' : 'unpublished'}`
        });
    } catch (error) { next(error); }
};

// ─── Wallet ───────────────────────────────────────────────────────────────────

// @desc    Platform wallet overview — all users with balances
// @route   GET /api/v1/admin/wallet
export const getAdminWallet = async (req, res, next) => {
    try {
        const users = await User.find({ walletBalance: { $gt: 0 } })
            .select('name email walletBalance role')
            .sort({ walletBalance: -1 });

        const totalPlatformBalance = users.reduce((acc, u) => acc + u.walletBalance, 0);
        const totalTransactions = await Transaction.countDocuments();
        const totalVolume = await Transaction.aggregate([
            { $match: { type: 'credit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                users,
                totalPlatformBalance,
                totalTransactions,
                totalVolume: totalVolume[0]?.total || 0
            }
        });
    } catch (error) { next(error); }
};

// ─── Subscriptions ────────────────────────────────────────────────────────────

// @desc    Get all active subscriptions
// @route   GET /api/v1/admin/subscriptions
export const getAdminSubscriptions = async (req, res, next) => {
    try {
        const subscribers = await User.find({ 'subscription.plan': { $ne: 'None' } })
            .select('name email subscription createdAt')
            .sort({ 'subscription.validUntil': -1 });

        const planCounts = {
            Silver: subscribers.filter(u => u.subscription.plan === 'Silver').length,
            Ruby: subscribers.filter(u => u.subscription.plan === 'Ruby').length,
            Platinum: subscribers.filter(u => u.subscription.plan === 'Platinum').length
        };

        res.status(200).json({
            success: true,
            count: subscribers.length,
            planCounts,
            data: subscribers
        });
    } catch (error) { next(error); }
};

// ─── Coupons ──────────────────────────────────────────────────────────────────

// @desc    Get all coupons
// @route   GET /api/v1/admin/coupons
export const getAdminCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: coupons });
    } catch (error) { next(error); }
};

// @desc    Create coupon
// @route   POST /api/v1/admin/coupons
export const createCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.create({ ...req.body, createdBy: req.user.id });
        res.status(201).json({ success: true, data: coupon });
    } catch (error) { next(error); }
};

// @desc    Toggle coupon active status
// @route   PATCH /api/v1/admin/coupons/:id/toggle
export const toggleCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.status(200).json({ success: true, data: coupon });
    } catch (error) { next(error); }
};

// @desc    Delete coupon
// @route   DELETE /api/v1/admin/coupons/:id
export const deleteCoupon = async (req, res, next) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Coupon deleted' });
    } catch (error) { next(error); }
};

// ─── Feedback ─────────────────────────────────────────────────────────────────

// @desc    Get all feedback/reviews (from bookings/courses)
// @route   GET /api/v1/admin/feedback
export const getAdminFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // For course/interview feedback, try to enrich with target name
        const enriched = await Promise.all(feedback.map(async (f) => {
            let targetName = null;
            if (f.type === 'course' && f.targetId) {
                const course = await Course.findById(f.targetId).select('title');
                targetName = course?.title || null;
            } else if (f.type === 'interview' && f.targetId) {
                const interview = await Interview.findById(f.targetId).select('domain');
                targetName = interview?.domain || null;
            }
            return {
                _id: f._id,
                user: f.user,
                type: f.type,
                category: f.category,
                rating: f.rating,
                review: f.review,
                targetName,
                createdAt: f.createdAt
            };
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) { next(error); }
};

// ─── Notifications ────────────────────────────────────────────────────────────

// @desc    Get all notifications
// @route   GET /api/v1/admin/notifications
export const getAdminNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: notifications });
    } catch (error) { next(error); }
};

// @desc    Send notification
// @route   POST /api/v1/admin/notifications
export const sendNotification = async (req, res, next) => {
    try {
        const { title, message, targetRole, type } = req.body;
        const notification = await Notification.create({
            title, message, targetRole, type, createdBy: req.user.id
        });
        res.status(201).json({ success: true, data: notification });
    } catch (error) { next(error); }
};

// @desc    Delete notification
// @route   DELETE /api/v1/admin/notifications/:id
export const deleteNotification = async (req, res, next) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) { next(error); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

// @desc    Get platform reports / aggregated stats
// @route   GET /api/v1/admin/reports
export const getAdminReports = async (req, res, next) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Monthly revenue (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyRevenue = await Transaction.aggregate([
            { $match: { type: 'credit', status: 'completed', createdAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    revenue: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // New users per month
        const monthlyUsers = await User.aggregate([
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Top selling courses
        const topCourses = await Course.find({ isPublished: true })
            .select('title price enrolledUsers category')
            .sort({ 'enrolledUsers': -1 })
            .limit(10);

        // Summary numbers
        const totalRevenue = await Transaction.aggregate([
            { $match: { type: 'credit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        const newBookingsThisMonth = await Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

        res.status(200).json({
            success: true,
            data: {
                monthlyRevenue,
                monthlyUsers,
                topCourses: topCourses.map(c => ({
                    _id: c._id,
                    title: c.title,
                    price: c.price,
                    students: c.enrolledUsers.length,
                    category: c.category
                })),
                summary: {
                    totalRevenue: totalRevenue[0]?.total || 0,
                    newUsersThisMonth,
                    newBookingsThisMonth
                }
            }
        });
    } catch (error) { next(error); }
};

// ─── Security ─────────────────────────────────────────────────────────────────

// @desc    Get security overview — blocked users, admin accounts
// @route   GET /api/v1/admin/security
export const getSecurityLogs = async (req, res, next) => {
    try {
        const blockedUsers = await User.find({ isBlocked: true })
            .select('name email role isBlocked createdAt')
            .sort({ updatedAt: -1 });

        const adminUsers = await User.find({
            role: { $in: ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'] }
        }).select('name email role createdAt');

        const recentRegistrations = await User.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .select('name email role createdAt');

        res.status(200).json({
            success: true,
            data: {
                blockedUsers,
                adminUsers,
                recentRegistrations,
                summary: {
                    totalBlocked: blockedUsers.length,
                    totalAdmins: adminUsers.length
                }
            }
        });
    } catch (error) { next(error); }
};

// ─── Settings ─────────────────────────────────────────────────────────────────

// @desc    Get platform settings (returns static config for now)
// @route   GET /api/v1/admin/settings
export const getAdminSettings = async (req, res, next) => {
    try {
        // In a real app, you'd store these in a Settings collection
        const settings = {
            platform: {
                name: 'DreamJob',
                maintenanceMode: false,
                allowNewRegistrations: true,
                requireEmailVerification: false
            },
            payments: {
                currency: 'USD',
                stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
                walletEnabled: true
            },
            subscriptions: {
                plans: {
                    Silver: { price: 9.99, description: 'Basic plan' },
                    Ruby: { price: 19.99, description: 'Pro plan' },
                    Platinum: { price: 29.99, description: 'Enterprise plan' }
                }
            },
            seller: {
                autoApprove: false,
                commissionRate: 0, // platform takes 0% for now
                minWithdrawal: 10
            }
        };
        res.status(200).json({ success: true, data: settings });
    } catch (error) { next(error); }
};

// @desc    Update platform settings
// @route   PUT /api/v1/admin/settings
export const updateAdminSettings = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: req.body
        });
    } catch (error) { next(error); }
};

// ─── Admin Review Management ───────────────────────────────────────────────────

// @desc    Get all reviews (with reported ones flagged)
// @route   GET /api/v1/admin/reviews
export const getAdminReviews = async (req, res, next) => {
    try {
        const { reported } = req.query;
        const query = reported === 'true' ? { isReported: true } : {};
        const reviews = await Feedback.find(query)
            .populate('user', 'name email')
            .populate('reportedBy', 'name')
            .sort({ isReported: -1, createdAt: -1 });

        // Enrich with target name for courses
        const enriched = await Promise.all(reviews.map(async (f) => {
            let targetName = null;
            if (f.type === 'course' && f.targetId) {
                const course = await Course.findById(f.targetId).select('title');
                targetName = course?.title || null;
            }
            return {
                _id: f._id,
                user: f.user,
                type: f.type,
                category: f.category,
                rating: f.rating,
                review: f.review,
                isHidden: f.isHidden,
                isReported: f.isReported,
                reportedBy: f.reportedBy,
                reportReason: f.reportReason,
                reportCount: f.reportedBy?.length || 0,
                targetName,
                targetId: f.targetId,
                createdAt: f.createdAt
            };
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) { next(error); }
};

// @desc    Toggle hide/show a review
// @route   PATCH /api/v1/admin/reviews/:id/hide
export const hideReview = async (req, res, next) => {
    try {
        const review = await Feedback.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        review.isHidden = !review.isHidden;
        review.isReported = false; // clear report flag if admin acts on it
        await review.save();

        // Recompute course rating if needed
        if (review.type === 'course' && review.targetId) {
            const course = await Course.findById(review.targetId);
            if (course) {
                const allReviews = await Feedback.find({ type: 'course', targetId: review.targetId, isHidden: false });
                course.rating = allReviews.length > 0 ? allReviews.reduce((s, f) => s + (f.rating || 0), 0) / allReviews.length : 0;
                course.totalReviews = allReviews.length;
                await course.save();
            }
        }

        res.status(200).json({ success: true, message: review.isHidden ? 'Review hidden from public' : 'Review restored', data: { isHidden: review.isHidden } });
    } catch (error) { next(error); }
};

// @desc    Hard delete a review (admin)
// @route   DELETE /api/v1/admin/reviews/:id
export const deleteAdminReview = async (req, res, next) => {
    try {
        const review = await Feedback.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        const targetId = review.targetId;
        const type = review.type;
        await review.deleteOne();

        if (type === 'course' && targetId) {
            const course = await Course.findById(targetId);
            if (course) {
                const allReviews = await Feedback.find({ type: 'course', targetId, isHidden: false });
                course.rating = allReviews.length > 0 ? allReviews.reduce((s, f) => s + (f.rating || 0), 0) / allReviews.length : 0;
                course.totalReviews = allReviews.length;
                await course.save();
            }
        }

        res.status(200).json({ success: true, message: 'Review permanently deleted' });
    } catch (error) { next(error); }
};

