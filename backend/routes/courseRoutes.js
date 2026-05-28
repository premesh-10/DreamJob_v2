import express from 'express';
import {
    getCourses, getCourse, createCourse, updateCourse, deleteCourse,
    getMyCourses, getEnrolledCourses, addChapter, enrollCourse
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.get('/', getCourses);
router.get('/mine', protect, getMyCourses);               // seller's own courses
router.get('/enrolled', protect, getEnrolledCourses);    // user's enrolled courses
router.get('/:id', getCourse);

// Seller
router.post('/', protect, authorize('seller', 'admin', 'super_admin'), createCourse);
router.put('/:id', protect, authorize('seller', 'admin', 'super_admin'), updateCourse);
router.delete('/:id', protect, authorize('seller', 'admin', 'super_admin'), deleteCourse);
router.post('/:id/chapters', protect, authorize('seller', 'admin', 'super_admin'), addChapter);

// Enrollment (any authenticated user)
router.post('/:id/enroll', protect, enrollCourse);

export default router;
