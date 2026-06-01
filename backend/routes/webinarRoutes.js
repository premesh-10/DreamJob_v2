import express from 'express';
import {
    getWebinars,
    getWebinar,
    registerForWebinar,
    unregisterFromWebinar,
    getMyRegistrations,
    createWebinar,
    getMyWebinars,
    getAttendees,
    updateWebinar,
    cancelWebinar,
    deleteWebinar
} from '../controllers/webinarController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

const sellerRoles = ['seller', 'admin', 'super_admin'];

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/', getWebinars);
router.get('/:id', getWebinar);

// ── Authenticated user ───────────────────────────────────────────────────────
router.get('/my-registrations', protect, getMyRegistrations);
router.post('/:id/register', protect, registerForWebinar);
router.delete('/:id/register', protect, unregisterFromWebinar);

// ── Seller ───────────────────────────────────────────────────────────────────
router.get('/seller/mine', protect, authorize(...sellerRoles), getMyWebinars);
router.get('/:id/attendees', protect, getAttendees);
router.post('/', protect, authorize(...sellerRoles), createWebinar);
router.put('/:id', protect, updateWebinar);
router.patch('/:id/cancel', protect, cancelWebinar);
router.delete('/:id', protect, deleteWebinar);

export default router;
