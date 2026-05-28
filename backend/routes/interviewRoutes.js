import express from 'express';
import {
    getInterviews, getMyInterviewProfile, createOrUpdateInterviewProfile,
    addSlot, deleteSlot, bookSlot, getMyBookings, getSellerBookings, rateInterview
} from '../controllers/interviewController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public — browse interviewers
router.get('/', getInterviews);

// Seller — manage own interview profile
router.get('/mine', protect, getMyInterviewProfile);
router.post('/', protect, authorize('seller', 'admin', 'super_admin'), createOrUpdateInterviewProfile);
router.post('/slots', protect, authorize('seller', 'admin', 'super_admin'), addSlot);
router.delete('/slots/:slotId', protect, authorize('seller', 'admin', 'super_admin'), deleteSlot);

// Booking history
router.get('/bookings/me', protect, getMyBookings);            // user's own bookings
router.get('/bookings/seller', protect, getSellerBookings);    // seller's incoming bookings

// Book a slot
router.post('/:id/book', protect, bookSlot);

// Rate an interviewer (after booking)
router.post('/:id/rate', protect, rateInterview);

export default router;
