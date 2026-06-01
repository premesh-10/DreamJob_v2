import express from 'express';
import {
    getCourses, getCourse, createCourse, updateCourse, deleteCourse,
    getMyCourses, getEnrolledCourses,
    addChapter, updateChapter, deleteChapter, uploadChapterPDF,
    addCourseResource, deleteCourseResource,
    reorderChapters, toggleCoursePublish,
    uploadCourseThumbnail,
    enrollCourse,
    checkCourseAccess,
    backfillChapterDurations
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    handleThumbnailUpload,
    handleVideoUpload,
    handlePDFUpload,
    handleResourceUpload
} from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getCourses);
router.get('/mine', protect, getMyCourses);
router.get('/enrolled', protect, getEnrolledCourses);

// ── Course CRUD (Seller/Admin) ─────────────────────────────────────────────────
// Note: createCourse supports multipart/form-data with optional thumbnail
router.post(
    '/',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleThumbnailUpload,
    createCourse
);

router.put(
    '/:id',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleThumbnailUpload,
    updateCourse
);

router.delete('/:id', protect, authorize('seller', 'admin', 'super_admin'), deleteCourse);

// ── Thumbnail Upload ───────────────────────────────────────────────────────────
router.post(
    '/:id/thumbnail',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleThumbnailUpload,
    uploadCourseThumbnail
);

// ── Chapters ───────────────────────────────────────────────────────────────────
router.post(
    '/:id/chapters',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleVideoUpload,
    addChapter
);

router.put(
    '/:id/chapters/reorder',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    reorderChapters
);

router.put(
    '/:id/chapters/:chapterId',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleVideoUpload,
    updateChapter
);

router.delete(
    '/:id/chapters/:chapterId',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    deleteChapter
);

// Chapter PDF upload
router.post(
    '/:id/chapters/:chapterId/pdf',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handlePDFUpload,
    uploadChapterPDF
);

// ── Course Resources ───────────────────────────────────────────────────────────
router.post(
    '/:id/resources',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    handleResourceUpload,
    addCourseResource
);

router.delete(
    '/:id/resources/:resourceId',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    deleteCourseResource
);

// ── Publish Toggle ─────────────────────────────────────────────────────────────
router.patch(
    '/:id/publish',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    toggleCoursePublish
);

// ── Enrollment (any authenticated user) ───────────────────────────────────────
router.post('/:id/enroll', protect, enrollCourse);

// ── Backfill video durations using ffprobe (re-probe existing uploads) ─────────
// Sellers can fix their own courses; admins fix all
router.post(
    '/backfill-durations',
    protect,
    authorize('seller', 'admin', 'super_admin'),
    backfillChapterDurations
);

// ── Single course (public — must be last to avoid catching /mine /enrolled etc.)
router.get('/:id/access', protect, checkCourseAccess);
router.get('/:id', getCourse);

export default router;
