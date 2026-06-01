import Webinar from '../models/Webinar.js';
import User from '../models/User.js';
import Seller from '../models/Seller.js';
import Transaction from '../models/Transaction.js';

// ── Helper ─────────────────────────────────────────────────────────────────────
// Strip meetingLink from public webinar data (only revealed to registered users)
const publicView = (w, userId) => {
    const json = w.toJSON();
    const isRegistered = userId && w.registeredUsers.some(id => id.toString() === userId.toString());
    return {
        ...json,
        // Only expose meeting link if user is registered (or webinar completed with recording)
        meetingLink: isRegistered ? json.meetingLink : undefined,
        isRegistered: !!isRegistered,
        isOnWaitlist: userId ? w.waitlist.some(id => id.toString() === userId.toString()) : false,
    };
};

// Auto-compute status based on date + time + duration (without overriding manual 'cancelled')
const computeStatus = (webinar) => {
    if (webinar.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const [hh, mm] = (webinar.time || '00:00').split(':').map(Number);
    const start = new Date(webinar.date);
    start.setHours(hh, mm, 0, 0);
    // End = start + (duration * numberOfDays) in minutes
    const totalMinutes = (webinar.duration || 60) * (webinar.numberOfDays || 1);
    const end = new Date(start.getTime() + totalMinutes * 60000);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'live';
    return 'completed';
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC / USER endpoints
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get all active webinars
// @route   GET /api/v1/webinars
// @access  Public
export const getWebinars = async (req, res, next) => {
    try {
        const webinars = await Webinar.find({ isActive: true })
            .populate('seller', 'name email')
            .sort({ date: 1 });

        // Batch auto-update statuses without blocking the response
        const updates = [];
        const enriched = webinars.map(w => {
            const computed = computeStatus(w);
            if (computed !== w.status && w.status !== 'cancelled') {
                updates.push(Webinar.findByIdAndUpdate(w._id, { status: computed }));
            }
            const userId = req.user?.id;
            return {
                ...publicView(w, userId),
                status: computed,
            };
        });
        if (updates.length) Promise.all(updates).catch(() => {});

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single webinar
// @route   GET /api/v1/webinars/:id
// @access  Public
export const getWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id)
            .populate('seller', 'name email');

        if (!webinar) return res.status(404).json({ success: false, message: 'Webinar not found' });

        const computed = computeStatus(webinar);
        if (computed !== webinar.status && webinar.status !== 'cancelled') {
            await Webinar.findByIdAndUpdate(webinar._id, { status: computed });
        }

        const userId = req.user?.id;
        res.status(200).json({
            success: true,
            data: { ...publicView(webinar, userId), status: computed }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Register for a webinar (handles free + paid + waitlist)
// @route   POST /api/v1/webinars/:id/register
// @access  Private
export const registerForWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const computed = computeStatus(webinar);
        if (!webinar.isActive || webinar.status === 'cancelled') {
            return res.status(400).json({ message: 'This webinar is not available for registration' });
        }
        if (computed === 'completed') {
            return res.status(400).json({ message: 'This webinar has already ended' });
        }

        const userId = req.user.id;
        const alreadyRegistered = webinar.registeredUsers.some(id => id.toString() === userId);
        if (alreadyRegistered) return res.status(400).json({ message: 'You are already registered for this webinar' });

        const alreadyOnWaitlist = webinar.waitlist.some(id => id.toString() === userId);
        if (alreadyOnWaitlist) return res.status(400).json({ message: 'You are already on the waitlist' });

        const seatsLeft = webinar.seatCapacity - webinar.registeredUsers.length;

        // ── WAITLIST ─────────────────────────────────────────────────────────────
        if (seatsLeft <= 0) {
            webinar.waitlist.push(userId);
            await webinar.save();
            return res.status(200).json({
                success: true,
                message: 'No seats available. You have been added to the waitlist.',
                status: 'waitlisted',
                waitlistPosition: webinar.waitlist.length
            });
        }

        // ── PAYMENT ──────────────────────────────────────────────────────────────
        let amountPaid = 0;
        if (webinar.price > 0) {
            const user = await User.findById(userId);
            if (user.walletBalance < webinar.price) {
                return res.status(400).json({ message: `Insufficient wallet balance. You need $${webinar.price} to register.` });
            }
            user.walletBalance -= webinar.price;
            await user.save();
            amountPaid = webinar.price;

            // Debit transaction for attendee
            await Transaction.create({
                user: userId,
                type: 'debit',
                amount: webinar.price,
                description: `Webinar registration: ${webinar.name}`,
                status: 'completed'
            });

            // Credit seller earnings
            const sellerRecord = await Seller.findOne({ user: webinar.seller });
            if (sellerRecord) {
                sellerRecord.earnings += webinar.price;
                await sellerRecord.save();
                await Transaction.create({
                    user: webinar.seller,
                    type: 'credit',
                    amount: webinar.price,
                    description: `Webinar registration income: ${webinar.name}`,
                    status: 'completed'
                });
            }

            // Track payment for potential refund
            webinar.payments.push({ user: userId, amount: webinar.price });
        }

        webinar.registeredUsers.push(userId);
        await webinar.save();

        res.status(200).json({
            success: true,
            message: 'Successfully registered! Your meeting link is now available.',
            status: 'registered',
            amountPaid,
            meetingLink: webinar.meetingLink,
            seatsLeft: Math.max(0, webinar.seatCapacity - webinar.registeredUsers.length)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Unregister from a webinar (promotes waitlist users, issues refund)
// @route   DELETE /api/v1/webinars/:id/register
// @access  Private
export const unregisterFromWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const userId = req.user.id;

        // Check waitlist first
        const wlIdx = webinar.waitlist.findIndex(id => id.toString() === userId);
        if (wlIdx !== -1) {
            webinar.waitlist.splice(wlIdx, 1);
            await webinar.save();
            return res.status(200).json({ success: true, message: 'Removed from waitlist' });
        }

        const idx = webinar.registeredUsers.findIndex(id => id.toString() === userId);
        if (idx === -1) return res.status(400).json({ message: 'You are not registered for this webinar' });

        webinar.registeredUsers.splice(idx, 1);

        // ── REFUND if paid ──────────────────────────────────────────────────────
        const payment = webinar.payments.find(p => p.user.toString() === userId);
        if (payment && payment.amount > 0) {
            const user = await User.findById(userId);
            user.walletBalance += payment.amount;
            await user.save();
            await Transaction.create({
                user: userId,
                type: 'credit',
                amount: payment.amount,
                description: `Refund for webinar cancellation: ${webinar.name}`,
                status: 'completed'
            });
            webinar.payments = webinar.payments.filter(p => p.user.toString() !== userId);
        }

        // ── PROMOTE next waitlist user ──────────────────────────────────────────
        if (webinar.waitlist.length > 0) {
            const nextUserId = webinar.waitlist.shift();
            webinar.registeredUsers.push(nextUserId);
            // Note: In production, trigger email notification here
        }

        await webinar.save();

        res.status(200).json({
            success: true,
            message: payment?.amount > 0 ? 'Unregistered and refund issued to your wallet.' : 'Successfully unregistered.'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get webinars the current user is registered for or on waitlist
// @route   GET /api/v1/webinars/my-registrations
// @access  Private
export const getMyRegistrations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const registered = await Webinar.find({ registeredUsers: userId })
            .populate('seller', 'name email')
            .sort({ date: 1 });

        const waitlisted = await Webinar.find({ waitlist: userId })
            .populate('seller', 'name email')
            .sort({ date: 1 });

        const toView = (w, type) => {
            const computed = computeStatus(w);
            return {
                ...publicView(w, userId),
                status: computed,
                registrationType: type
            };
        };

        res.status(200).json({
            success: true,
            data: {
                registered: registered.map(w => toView(w, 'registered')),
                waitlisted: waitlisted.map(w => toView(w, 'waitlisted'))
            }
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SELLER endpoints
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create a webinar
// @route   POST /api/v1/webinars
// @access  Private/Seller
export const createWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.create({ ...req.body, seller: req.user.id });
        res.status(201).json({ success: true, data: webinar });
    } catch (error) {
        next(error);
    }
};

// @desc    Get seller's own webinars with full stats
// @route   GET /api/v1/webinars/seller/mine
// @access  Private/Seller
export const getMyWebinars = async (req, res, next) => {
    try {
        const webinars = await Webinar.find({ seller: req.user.id }).sort({ date: -1 });

        const enriched = webinars.map(w => {
            const computed = computeStatus(w);
            return {
                ...w.toJSON(),
                status: computed,
                revenue: w.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
            };
        });

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Get attendee list for a seller's webinar
// @route   GET /api/v1/webinars/:id/attendees
// @access  Private/Seller
export const getAttendees = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id)
            .populate('registeredUsers', 'name email')
            .populate('waitlist', 'name email');

        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const adminRoles = ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
        if (webinar.seller.toString() !== req.user.id && !adminRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.status(200).json({
            success: true,
            data: {
                registeredUsers: webinar.registeredUsers,
                waitlist: webinar.waitlist,
                seatCapacity: webinar.seatCapacity,
                seatsLeft: webinar.seatsLeft
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update seller's own webinar
// @route   PUT /api/v1/webinars/:id
// @access  Private/Seller
export const updateWebinar = async (req, res, next) => {
    try {
        let webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const adminRoles = ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
        if (webinar.seller.toString() !== req.user.id && !adminRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized to update this webinar' });
        }

        // Sellers cannot change price after registrations exist
        if (req.body.price !== undefined && webinar.registeredUsers.length > 0 && !adminRoles.includes(req.user.role)) {
            return res.status(400).json({ message: 'Cannot change price after users have registered' });
        }

        webinar = await Webinar.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        });

        res.status(200).json({ success: true, data: webinar });
    } catch (error) {
        next(error);
    }
};

// @desc    Cancel a webinar and refund all paid registrations
// @route   PATCH /api/v1/webinars/:id/cancel
// @access  Private/Seller or Admin
export const cancelWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const adminRoles = ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
        if (webinar.seller.toString() !== req.user.id && !adminRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (webinar.status === 'cancelled') {
            return res.status(400).json({ message: 'Webinar is already cancelled' });
        }

        // Issue refunds for all paid registrations
        const refundOps = webinar.payments.map(async (p) => {
            if (p.amount > 0) {
                const user = await User.findById(p.user);
                if (user) {
                    user.walletBalance += p.amount;
                    await user.save();
                    await Transaction.create({
                        user: p.user,
                        type: 'credit',
                        amount: p.amount,
                        description: `Refund: Webinar "${webinar.name}" was cancelled`,
                        status: 'completed'
                    });
                }
            }
        });
        await Promise.all(refundOps);

        webinar.status = 'cancelled';
        webinar.cancellationReason = req.body.reason || 'Cancelled by organizer';
        webinar.refundIssued = webinar.payments.some(p => p.amount > 0);
        webinar.isActive = false;
        await webinar.save();

        res.status(200).json({
            success: true,
            message: `Webinar cancelled. ${webinar.refundIssued ? 'Refunds issued to all paid registrants.' : ''}`,
            data: webinar
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a webinar
// @route   DELETE /api/v1/webinars/:id
// @access  Private/Seller or Admin
export const deleteWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });

        const adminRoles = ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
        if (webinar.seller.toString() !== req.user.id && !adminRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized to delete this webinar' });
        }

        if (webinar.registeredUsers.length > 0) {
            return res.status(400).json({ message: 'Cannot delete a webinar with registered users. Cancel it first.' });
        }

        await webinar.deleteOne();
        res.status(200).json({ success: true, message: 'Webinar deleted' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN endpoints
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Get ALL webinars for admin with full stats
// @route   GET /api/v1/admin/webinars
// @access  Private/Admin
export const adminGetAllWebinars = async (req, res, next) => {
    try {
        const webinars = await Webinar.find()
            .populate('seller', 'name email')
            .sort({ createdAt: -1 });

        const enriched = webinars.map(w => ({
            ...w.toJSON(),
            status: computeStatus(w),
            revenue: w.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle fields (isActive, isFeatured, status, meetingLink, recordingUrl)
// @route   PATCH /api/v1/admin/webinars/:id/toggle
// @access  Private/Admin
export const adminToggleWebinar = async (req, res, next) => {
    try {
        const { field, value } = req.body;
        const allowed = ['isActive', 'isFeatured', 'status', 'meetingLink', 'recordingUrl'];
        if (!allowed.includes(field)) return res.status(400).json({ message: 'Invalid field' });

        const webinar = await Webinar.findByIdAndUpdate(
            req.params.id,
            { [field]: value },
            { new: true, runValidators: true }
        ).populate('seller', 'name email');

        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });
        res.status(200).json({ success: true, data: webinar });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin full update
// @route   PUT /api/v1/admin/webinars/:id
// @access  Private/Admin
export const adminUpdateWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findByIdAndUpdate(req.params.id, req.body, {
            new: true, runValidators: true
        }).populate('seller', 'name email');
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });
        res.status(200).json({ success: true, data: webinar });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin cancel with refunds
// @route   PATCH /api/v1/admin/webinars/:id/cancel
// @access  Private/Admin
export const adminCancelWebinar = cancelWebinar;   // reuse same logic

// @desc    Admin delete
// @route   DELETE /api/v1/admin/webinars/:id
// @access  Private/Admin
export const adminDeleteWebinar = async (req, res, next) => {
    try {
        const webinar = await Webinar.findById(req.params.id);
        if (!webinar) return res.status(404).json({ message: 'Webinar not found' });
        await webinar.deleteOne();
        res.status(200).json({ success: true, message: 'Webinar deleted by admin' });
    } catch (error) {
        next(error);
    }
};
