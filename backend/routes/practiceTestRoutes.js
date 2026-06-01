import express from 'express';
import {
    getPublicPracticeTests,
    getMyPracticeTests,
    getPracticeTest,
    createPracticeTest,
    updatePracticeTest,
    deletePracticeTest,
    togglePracticeTestPublish,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    startAttempt,
    submitAttempt,
    getAttemptResult,
    getMyAttempts,
    getAllMyAttempts
} from '../controllers/practiceTestController.js';
import { protect, authorize, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public / User Routes ───────────────────────────────────────────────────────
router.get('/', getPublicPracticeTests);

// My attempts across all tests
router.get('/my-attempts/all', protect, getAllMyAttempts);

// Seller's own tests
router.get('/mine', protect, authorize('seller', 'admin', 'super_admin'), getMyPracticeTests);

// ── Create / CRUD ─────────────────────────────────────────────────────────────
router.post('/', protect, authorize('seller', 'admin', 'super_admin'), createPracticeTest);

// Single test — no auth required (answers stripped for non-owners; attempt history only if logged in)
router.get('/:id', optionalProtect, getPracticeTest);
router.put('/:id', protect, authorize('seller', 'admin', 'super_admin'), updatePracticeTest);
router.delete('/:id', protect, authorize('seller', 'admin', 'super_admin'), deletePracticeTest);
router.patch('/:id/publish', protect, authorize('seller', 'admin', 'super_admin'), togglePracticeTestPublish);

// ── Questions ─────────────────────────────────────────────────────────────────
router.post('/:id/questions', protect, authorize('seller', 'admin', 'super_admin'), addQuestion);
router.put('/:id/questions/reorder', protect, authorize('seller', 'admin', 'super_admin'), reorderQuestions);
router.put('/:id/questions/:questionId', protect, authorize('seller', 'admin', 'super_admin'), updateQuestion);
router.delete('/:id/questions/:questionId', protect, authorize('seller', 'admin', 'super_admin'), deleteQuestion);

// ── Attempt Flow ──────────────────────────────────────────────────────────────
router.post('/:id/attempt/start', protect, startAttempt);
router.post('/:id/attempt/:attemptId/submit', protect, submitAttempt);
router.get('/:id/attempts/:attemptId', protect, getAttemptResult);
router.get('/:id/my-attempts', protect, getMyAttempts);

export default router;
