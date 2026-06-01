import Course from '../models/Course.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import PracticeTestAttempt from '../models/PracticeTestAttempt.js';
import Notification from '../models/Notification.js';
import { deleteUploadedFile } from '../middleware/uploadMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { getVideoDurationSeconds, resolveUploadPath } from '../utils/videoDuration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filterPendingAdd = (courseDoc) => {
    const c = typeof courseDoc.toObject === 'function' ? courseDoc.toObject() : courseDoc;
    if (c.chapters) c.chapters = c.chapters.filter(ch => ch.approvalStatus !== 'pending_add');
    if (c.resources) c.resources = c.resources.filter(r => r.approvalStatus !== 'pending_add');
    return c;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const buildFilePath = (file, subfolder) => {
    if (!file) return '';
    return `/uploads/${subfolder}/${file.filename}`;
};

const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
            data: courses.map(filterPendingAdd)
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
        const course = await Course.findById(req.params.id)
            .populate('seller', 'name email')
            .populate('practiceTests', 'title subject isPublished questions timeLimit');
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.status(200).json({
            success: true,
            data: filterPendingAdd(course)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new course (Seller only) — supports multipart/form-data
// @route   POST /api/v1/courses
// @access  Private/Seller
export const createCourse = async (req, res, next) => {
    try {
        const body = { ...req.body };
        body.seller = req.user.id;

        // Handle levels/level
        if (typeof body.levels === 'string') {
            try { body.levels = JSON.parse(body.levels); } catch { body.levels = [body.levels]; }
        }
        if (typeof body.whatYoullLearn === 'string') {
            try { body.whatYoullLearn = JSON.parse(body.whatYoullLearn); } catch { body.whatYoullLearn = []; }
        }
        if (typeof body.requirements === 'string') {
            try { body.requirements = JSON.parse(body.requirements); } catch { body.requirements = []; }
        }

        // Handle thumbnail upload
        if (req.file) {
            body.thumbnailPath = buildFilePath(req.file, 'thumbnails');
            body.thumbnail = body.thumbnailPath;
        }

        const course = await Course.create(body);

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

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to edit this course' });
        }

        const body = { ...req.body };

        // Handle levels
        if (typeof body.levels === 'string') {
            try { body.levels = JSON.parse(body.levels); } catch { body.levels = [body.levels]; }
        }
        if (typeof body.whatYoullLearn === 'string') {
            try { body.whatYoullLearn = JSON.parse(body.whatYoullLearn); } catch { body.whatYoullLearn = []; }
        }
        if (typeof body.requirements === 'string') {
            try { body.requirements = JSON.parse(body.requirements); } catch { body.requirements = []; }
        }

        // Handle thumbnail upload — delete old file if replacing
        if (req.file) {
            if (course.thumbnailPath) deleteUploadedFile(course.thumbnailPath);
            body.thumbnailPath = buildFilePath(req.file, 'thumbnails');
            body.thumbnail = body.thumbnailPath;
        }

        course = await Course.findByIdAndUpdate(req.params.id, body, {
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

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to delete this course' });
        }

        if (course.isPublished && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (course.approvalStatus === 'pending_delete') {
                course.approvalStatus = 'approved';
                await course.save();
                return res.status(200).json({ success: true, message: 'Delete request cancelled', approvalStatus: 'approved' });
            } else {
                const reason = req.body.reason || req.query.reason || 'No reason provided';
                course.approvalStatus = 'pending_delete';
                await course.save();

                await Notification.create({
                    title: 'Course Deletion Request',
                    message: `Seller requested to delete course "${course.title}". Reason: ${reason}`,
                    targetRole: 'admin',
                    type: 'warning',
                    createdBy: req.user.id
                });

                return res.status(200).json({ success: true, message: 'Delete request sent to admin', approvalStatus: 'pending_delete' });
            }
        }

        // Delete all uploaded files
        if (course.thumbnailPath) deleteUploadedFile(course.thumbnailPath);
        course.chapters.forEach(ch => {
            if (ch.videoPath) deleteUploadedFile(ch.videoPath);
            if (ch.pdfPath) deleteUploadedFile(ch.pdfPath);
        });
        course.resources.forEach(r => {
            if (r.filePath) deleteUploadedFile(r.filePath);
        });

        await course.deleteOne();

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
        const courses = await Course.find({ seller: req.user.id })
            .populate('practiceTests', 'title subject isPublished')
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
            data: courses.map(filterPendingAdd)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload / replace course thumbnail
// @route   POST /api/v1/courses/:id/thumbnail
// @access  Private/Seller
export const uploadCourseThumbnail = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        // Delete old thumbnail
        if (course.thumbnailPath) deleteUploadedFile(course.thumbnailPath);

        const thumbnailPath = buildFilePath(req.file, 'thumbnails');
        course.thumbnailPath = thumbnailPath;
        course.thumbnail = thumbnailPath;
        await course.save();

        res.status(200).json({
            success: true,
            thumbnailPath,
            message: 'Thumbnail uploaded successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add chapter to course (with optional video upload)
// @route   POST /api/v1/courses/:id/chapters
// @access  Private/Seller
export const addChapter = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized to add chapters to this course' });
        }

        const chapterData = {
            title: req.body.title,
            description: req.body.description || '',
            order: req.body.order || (course.chapters.length + 1),
            isFree: req.body.isFree === 'true' || req.body.isFree === true,
            duration: Number(req.body.duration) || 0,
            videoUrl: req.body.videoUrl || '',
            approvalStatus: course.isPublished ? 'pending_add' : 'approved'
        };

        // Handle video file upload — extract duration server-side via ffprobe
        if (req.file) {
            chapterData.videoPath = buildFilePath(req.file, 'videos');
            chapterData.videoSize = req.file.size;
            chapterData.videoMimeType = req.file.mimetype;

            // Accurate duration via ffprobe (overrides any manually-supplied value)
            const absolutePath = path.join(__dirname, '..', chapterData.videoPath);
            const probedDuration = await getVideoDurationSeconds(absolutePath);
            if (probedDuration > 0) {
                chapterData.duration = probedDuration;
                console.log(`[ffprobe] Chapter "${chapterData.title}": ${probedDuration}s`);
            }
        }

        course.chapters.push(chapterData);
        await course.save();

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};


// @desc    Update a chapter
// @route   PUT /api/v1/courses/:id/chapters/:chapterId
// @access  Private/Seller
export const updateChapter = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Update fields
        if (req.body.title) chapter.title = req.body.title;
        if (req.body.description !== undefined) chapter.description = req.body.description;
        if (req.body.isFree !== undefined) chapter.isFree = req.body.isFree === 'true' || req.body.isFree === true;
        if (req.body.videoUrl !== undefined) chapter.videoUrl = req.body.videoUrl;

        // Only update duration from body if NO new video is being uploaded
        // (ffprobe will override it anyway if a file is present)
        if (req.body.duration !== undefined && !req.file) {
            chapter.duration = Number(req.body.duration) || 0;
        }

        // Handle new video upload — re-probe duration immediately
        if (req.file) {
            if (chapter.videoPath) deleteUploadedFile(chapter.videoPath);
            chapter.videoPath = buildFilePath(req.file, 'videos');
            chapter.videoSize = req.file.size;
            chapter.videoMimeType = req.file.mimetype;

            // Accurate duration via ffprobe
            const absolutePath = path.join(__dirname, '..', chapter.videoPath);
            const probedDuration = await getVideoDurationSeconds(absolutePath);
            if (probedDuration > 0) {
                chapter.duration = probedDuration;
                console.log(`[ffprobe] Chapter "${chapter.title}" updated: ${probedDuration}s`);
            }
        }

        await course.save();
        res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};


// @desc    Delete a chapter
// @route   DELETE /api/v1/courses/:id/chapters/:chapterId
// @access  Private/Seller
export const deleteChapter = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Handle published course deletion requests
        if (course.isPublished && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (chapter.approvalStatus === 'pending_add') {
                if (chapter.videoPath) deleteUploadedFile(chapter.videoPath);
                if (chapter.pdfPath) deleteUploadedFile(chapter.pdfPath);
                course.chapters.pull(req.params.chapterId);
                await course.save();
                return res.status(200).json({ success: true, message: 'Draft chapter deleted', data: course });
            } else if (chapter.approvalStatus === 'pending_delete') {
                chapter.approvalStatus = 'approved';
                await course.save();
                return res.status(200).json({ success: true, message: 'Delete request cancelled', data: course });
            } else {
                const reason = req.body.reason || req.query.reason || 'No reason provided';
                chapter.approvalStatus = 'pending_delete';
                await course.save();

                await Notification.create({
                    title: 'Video Deletion Request',
                    message: `Seller requested to delete video "${chapter.title}" from course "${course.title}". Reason: ${reason}`,
                    targetRole: 'admin',
                    type: 'warning',
                    createdBy: req.user.id
                });

                return res.status(200).json({ success: true, message: 'Delete request sent to admin', data: course });
            }
        }

        // Delete associated files
        if (chapter.videoPath) deleteUploadedFile(chapter.videoPath);
        if (chapter.pdfPath) deleteUploadedFile(chapter.pdfPath);

        course.chapters.pull(req.params.chapterId);
        await course.save();

        res.status(200).json({ success: true, message: 'Chapter deleted', data: course });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload PDF for a chapter
// @route   POST /api/v1/courses/:id/chapters/:chapterId/pdf
// @access  Private/Seller
export const uploadChapterPDF = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

        // Delete old PDF
        if (chapter.pdfPath) deleteUploadedFile(chapter.pdfPath);

        chapter.pdfPath = buildFilePath(req.file, 'pdfs');
        chapter.pdfTitle = req.body.pdfTitle || req.file.originalname;
        chapter.pdfSize = req.file.size;
        await course.save();

        res.status(200).json({ success: true, data: course, message: 'Chapter PDF uploaded' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a resource (PDF/doc) to the course
// @route   POST /api/v1/courses/:id/resources
// @access  Private/Seller
export const addCourseResource = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const resource = {
            title: req.body.title || req.file.originalname,
            filePath: buildFilePath(req.file, 'resources'),
            fileType: path.extname(req.file.originalname).replace('.', '').toLowerCase() || 'pdf',
            fileSize: req.file.size,
            approvalStatus: course.isPublished ? 'pending_add' : 'approved'
        };

        course.resources.push(resource);
        await course.save();

        res.status(200).json({ success: true, data: course, message: 'Resource added' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a course resource
// @route   DELETE /api/v1/courses/:id/resources/:resourceId
// @access  Private/Seller
export const deleteCourseResource = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const resource = course.resources.id(req.params.resourceId);
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        if (course.isPublished && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            if (resource.approvalStatus === 'pending_add') {
                deleteUploadedFile(resource.filePath);
                course.resources.pull(req.params.resourceId);
                await course.save();
                return res.status(200).json({ success: true, message: 'Draft resource deleted', data: course });
            } else if (resource.approvalStatus === 'pending_delete') {
                resource.approvalStatus = 'approved';
                await course.save();
                return res.status(200).json({ success: true, message: 'Delete request cancelled', data: course });
            } else {
                resource.approvalStatus = 'pending_delete';
                await course.save();
                return res.status(200).json({ success: true, message: 'Delete request sent to admin', data: course });
            }
        }

        deleteUploadedFile(resource.filePath);
        course.resources.pull(req.params.resourceId);
        await course.save();

        res.status(200).json({ success: true, message: 'Resource deleted', data: course });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder chapters
// @route   PUT /api/v1/courses/:id/chapters/reorder
// @access  Private/Seller
export const reorderChapters = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { order } = req.body; // array of { id, order }
        if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array' });

        order.forEach(({ id, order: newOrder }) => {
            const ch = course.chapters.id(id);
            if (ch) ch.order = newOrder;
        });

        course.chapters.sort((a, b) => a.order - b.order);
        await course.save();

        res.status(200).json({ success: true, data: course });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle publish status (seller)
// @route   PATCH /api/v1/courses/:id/publish
// @access  Private/Seller
export const toggleCoursePublish = async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        if (course.seller.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Admin or super_admin can force publish/unpublish directly via this route if they want
        if (req.user.role === 'admin' || req.user.role === 'super_admin') {
            course.isPublished = !course.isPublished;
            course.approvalStatus = course.isPublished ? 'approved' : 'draft';
            await course.save();
            return res.status(200).json({
                success: true,
                isPublished: course.isPublished,
                approvalStatus: course.approvalStatus,
                message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`
            });
        }

        // Seller logic
        if (course.isPublished) {
            if (course.approvalStatus === 'pending_unpublish') {
                course.approvalStatus = 'approved';
                await course.save();
                return res.status(200).json({
                    success: true,
                    isPublished: course.isPublished,
                    approvalStatus: course.approvalStatus,
                    message: 'Unpublish request cancelled'
                });
            } else {
                course.approvalStatus = 'pending_unpublish';
                await course.save();
                return res.status(200).json({
                    success: true,
                    isPublished: course.isPublished,
                    approvalStatus: course.approvalStatus,
                    message: 'Unpublish request sent to admin'
                });
            }
        } else {
            if (course.approvalStatus === 'pending') {
                course.approvalStatus = 'draft';
                await course.save();
                return res.status(200).json({
                    success: true,
                    isPublished: course.isPublished,
                    approvalStatus: course.approvalStatus,
                    message: 'Publish request cancelled'
                });
            } else {
                course.approvalStatus = 'pending';
                await course.save();
                return res.status(200).json({
                    success: true,
                    isPublished: course.isPublished,
                    approvalStatus: course.approvalStatus,
                    message: 'Publish request sent to admin'
                });
            }
        }
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

        if (course.enrolledUsers.includes(req.user.id)) {
            return res.status(400).json({ message: 'Already enrolled in this course' });
        }

        const user = await User.findById(req.user.id);
        let amountPaid = 0;
        let paymentStatus = 'paid';

        let actualPrice = req.body.finalAmount !== undefined ? Number(req.body.finalAmount) : course.price;
        actualPrice = Math.max(0, actualPrice);

        const isCourseOwner = course.seller._id.toString() === req.user.id;
        let enrollmentType = req.body.enrollmentType || 'purchase';

        if (isCourseOwner) {
            paymentStatus = 'free';
            amountPaid = 0;
            enrollmentType = 'purchase'; // Owners always have lifelong access
        } else if (enrollmentType === 'subscription') {
            const hasActiveSub = user.subscription?.plan && user.subscription.plan !== 'None' && (!user.subscription.validUntil || new Date(user.subscription.validUntil) > new Date());
            if (!hasActiveSub) {
                return res.status(400).json({ message: 'No active subscription found. Please subscribe or purchase separately.' });
            }
            amountPaid = 0;
            paymentStatus = 'free';
        } else if (actualPrice > 0) {
            if (user.walletBalance < actualPrice) {
                return res.status(400).json({ message: 'Insufficient wallet balance. Please top up your wallet.' });
            }
            user.walletBalance -= actualPrice;
            await user.save();
            amountPaid = actualPrice;

            await Transaction.create({
                user: req.user.id,
                type: 'debit',
                amount: actualPrice,
                description: `Course purchase: ${course.title}${req.body.couponCode ? ' (Coupon applied)' : ''}`,
                status: 'completed'
            });

            const sellerRecord = await Seller.findOne({ user: course.seller._id });
            if (sellerRecord) {
                sellerRecord.earnings += actualPrice;
                sellerRecord.totalStudents += 1;
                await sellerRecord.save();

                await Transaction.create({
                    user: course.seller._id,
                    type: 'credit',
                    amount: actualPrice,
                    description: `Earnings from course: ${course.title}`,
                    status: 'completed'
                });
            }
        } else {
            amountPaid = 0;
            paymentStatus = 'free';
        }

        if (!course.enrolledUsers.includes(req.user.id)) {
            course.enrolledUsers.push(req.user.id);
            await course.save();
        }

        await Booking.create({
            user: req.user.id,
            type: 'course',
            course: course._id,
            seller: course.seller._id,
            amountPaid,
            paymentStatus,
            enrollmentType,
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

// @desc    Backfill missing video durations using ffprobe (for existing uploads)
// @route   POST /api/v1/courses/backfill-durations
// @access  Private/Seller+Admin
export const backfillChapterDurations = async (req, res, next) => {
    try {
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        const query = isAdmin ? {} : { seller: req.user.id };

        const courses = await Course.find(query);
        const results = [];
        let totalFixed = 0;

        for (const course of courses) {
            let courseChanged = false;

            for (const chapter of course.chapters) {
                // Only probe chapters that have a videoPath but missing/zero duration
                if (!chapter.videoPath || chapter.duration > 0) continue;

                const absolutePath = resolveUploadPath(chapter.videoPath);
                if (!absolutePath) continue;

                const probedDuration = await getVideoDurationSeconds(absolutePath);
                if (probedDuration > 0) {
                    chapter.duration = probedDuration;
                    courseChanged = true;
                    totalFixed++;
                    results.push({
                        courseId: course._id,
                        courseTitle: course.title,
                        chapterId: chapter._id,
                        chapterTitle: chapter.title,
                        duration: probedDuration
                    });
                    console.log(`[backfill] "${course.title}" > "${chapter.title}": ${probedDuration}s`);
                }
            }

            if (courseChanged) await course.save();
        }

        res.status(200).json({
            success: true,
            message: `Backfilled ${totalFixed} chapter duration${totalFixed !== 1 ? 's' : ''}`,
            totalFixed,
            results
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Check user's access status for a course
// @route   GET /api/v1/courses/:id/access
// @access  Private
export const checkCourseAccess = async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id;

        // Check if user is the seller
        const course = await Course.findById(courseId);
        if (course && course.seller.toString() === userId) {
            return res.status(200).json({
                success: true,
                hasAccess: true,
                method: 'purchase', // owner has full access equivalent to purchase
                validUntil: null
            });
        }

        const bookings = await Booking.find({
            user: userId,
            course: courseId,
            type: 'course',
            status: 'confirmed'
        });

        if (!bookings || bookings.length === 0) {
            return res.status(200).json({
                success: true,
                hasAccess: false,
                method: null,
                validUntil: null
            });
        }

        const purchaseBooking = bookings.find(b => b.enrollmentType === 'purchase');
        if (purchaseBooking) {
            return res.status(200).json({
                success: true,
                hasAccess: true,
                method: 'purchase',
                validUntil: null
            });
        }

        const subscriptionBooking = bookings.find(b => b.enrollmentType === 'subscription');
        if (subscriptionBooking) {
            const user = await User.findById(userId).select('subscription');
            const hasActiveSub = user.subscription?.plan && user.subscription.plan !== 'None';
            const isValid = hasActiveSub && (!user.subscription.validUntil || new Date(user.subscription.validUntil) > new Date());
            
            return res.status(200).json({
                success: true,
                hasAccess: isValid,
                method: 'subscription',
                validUntil: user.subscription.validUntil || null
            });
        }

        res.status(200).json({
            success: true,
            hasAccess: false,
            method: null,
            validUntil: null
        });
    } catch (error) {
        next(error);
    }
};

