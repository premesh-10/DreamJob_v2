import Course from '../models/Course.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';

// @desc    Get all published courses (with optional search/filter)
// @route   GET /api/v1/courses
// @access  Public
export const getCourses = async (req, res, next) => {
    try {
        const { search, category, level } = req.query;
        let query = { isPublished: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) query.category = { $regex: category, $options: 'i' };
        if (level) query.level = level;

        const courses = await Course.find(query)
            .populate('seller', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single course
// @route   GET /api/v1/courses/:id
// @access  Public
export const getCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id).populate('seller', 'name email');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new course (Seller only)
// @route   POST /api/v1/courses
// @access  Private/Seller
export const createCourse = async (req, res, next) => {
    try {
        req.body.seller = req.user.id;
        const course = await Course.create(req.body);

        // Increment seller's totalCourses count
        await Seller.findOneAndUpdate(
            { user: req.user.id },
            { $inc: { totalCourses: 1 } }
        );

        res.status(201).json({
            success: true,
            data: course
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a course (Seller who owns it)
// @route   PUT /api/v1/courses/:id
// @access  Private/Seller
export const updateCourse = async (req, res, next) => {
    try {
        let course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to edit this course' });
        }

        course = await Course.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a course (Seller who owns it)
// @route   DELETE /api/v1/courses/:id
// @access  Private/Seller
export const deleteCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this course' });
        }

        await course.deleteOne();

        // Decrement seller's totalCourses count
        await Seller.findOneAndUpdate(
            { user: req.user.id },
            { $inc: { totalCourses: -1 } }
        );

        res.status(200).json({ success: true, message: 'Course deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get courses created by the logged-in seller
// @route   GET /api/v1/courses/mine
// @access  Private/Seller
export const getMyCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ seller: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get courses the user is enrolled in
// @route   GET /api/v1/courses/enrolled
// @access  Private
export const getEnrolledCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({ enrolledUsers: req.user.id })
            .populate('seller', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add chapter to course
// @route   POST /api/v1/courses/:id/chapters
// @access  Private/Seller
export const addChapter = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to add chapters to this course' });
        }

        course.chapters.push(req.body);
        await course.save();

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

// @desc    Enroll in course
// @route   POST /api/v1/courses/:id/enroll
// @access  Private
export const enrollCourse = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id).populate('seller', 'name');
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Check if already enrolled
        if (course.enrolledUsers.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        const user = await User.findById(req.user.id);
        let amountPaid = 0;
        let paymentStatus = 'paid';

        // Use the finalAmount calculated by the frontend (after coupon application)
        let actualPrice = req.body.finalAmount !== undefined ? Number(req.body.finalAmount) : course.price;
        
        // Ensure price is never negative
        actualPrice = Math.max(0, actualPrice);

        // ✅ Seller gets their own course for FREE
        const isCourseOwner = course.seller._id.toString() === req.user.id;

        if (isCourseOwner) {
            paymentStatus = 'free';
            amountPaid = 0;
        } else if (actualPrice > 0) {
            // User with active subscription gets courses for free
            const hasActiveSub = user.subscription?.plan && user.subscription.plan !== 'None';

            if (!hasActiveSub) {
                if (user.walletBalance < actualPrice) {
                    return res.status(400).json({ message: 'Insufficient wallet balance. Please top up your wallet.' });
                }
                // Deduct from user wallet
                user.walletBalance -= actualPrice;
                await user.save();
                amountPaid = actualPrice;

                // Create debit transaction for user
                await Transaction.create({
                    user: req.user.id,
                    type: 'debit',
                    amount: actualPrice,
                    description: `Course purchase: ${course.title}${req.body.couponCode ? ' (Coupon applied)' : ''}`,
                    status: 'completed'
                });

                // ✅ Credit seller's earnings
                const sellerRecord = await Seller.findOne({ user: course.seller._id });
                if (sellerRecord) {
                    sellerRecord.earnings += actualPrice;
                    sellerRecord.totalStudents += 1;
                    await sellerRecord.save();

                    // Credit transaction in seller's name
                    await Transaction.create({
                        user: course.seller._id,
                        type: 'credit',
                        amount: actualPrice,
                        description: `Earnings from course: ${course.title}`,
                        status: 'completed'
                    });
                }
                
                // If we want to increment coupon used count, we should do it in a dedicated coupon route, 
                // but for now relying on finalAmount is safest.
            } else {
                amountPaid = 0;
                paymentStatus = 'free';
            }
        } else {
            // Free course or 100% discount
            amountPaid = 0;
            paymentStatus = 'free';
        }

        // Enroll user
        course.enrolledUsers.push(req.user.id);
        await course.save();

        // ✅ Create a Booking record (type: 'course') so it shows in purchase history
        await Booking.create({
            user: req.user.id,
            type: 'course',
            course: course._id,
            seller: course.seller._id,
            amountPaid,
            paymentStatus,
            status: 'confirmed'
        });

        res.status(200).json({
            success: true,
            message: isCourseOwner
                ? 'Enrolled successfully (as course owner)'
                : 'Enrolled successfully'
        });
    } catch (error) {
        next(error);
    }
};

