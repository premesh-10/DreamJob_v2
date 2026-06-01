import Interview from '../models/Interview.js';
import Booking from '../models/Booking.js';
import Seller from '../models/Seller.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// @desc    Get all interview profiles (public listing)
// @route   GET /api/v1/interviews
// @access  Public
export const getInterviews = async (req, res, next) => {
    try {
        const { domain } = req.query;
        let query = {};
        if (domain) query.domain = { $regex: domain, $options: 'i' };

        const interviews = await Interview.find(query)
            .populate('interviewer', 'name experience qualification');

        res.status(200).json({
            success: true,
            count: interviews.length,
            data: interviews
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the seller's own interview profile
// @route   GET /api/v1/interviews/mine
// @access  Private/Seller
export const getMyInterviewProfile = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ interviewer: req.user.id });
        res.status(200).json({
            success: true,
            data: interview || null
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create/Update Interview Profile (Seller)
// @route   POST /api/v1/interviews
// @access  Private/Seller
export const createOrUpdateInterviewProfile = async (req, res, next) => {
    try {
        const { domain, price, meetingMode } = req.body;

        let interview = await Interview.findOne({ interviewer: req.user.id });

        if (interview) {
            interview.domain = domain || interview.domain;
            interview.price = price !== undefined ? price : interview.price;
            interview.meetingMode = meetingMode || interview.meetingMode;
            await interview.save();
        } else {
            interview = await Interview.create({
                interviewer: req.user.id,
                domain,
                price,
                meetingMode
            });
        }

        res.status(200).json({
            success: true,
            data: interview
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add slot to interview profile (Seller must provide a meeting link)
// @route   POST /api/v1/interviews/slots
// @access  Private/Seller
export const addSlot = async (req, res, next) => {
    try {
        const { startTime, endTime, meetingLink } = req.body;

        if (!meetingLink || meetingLink.trim() === '') {
            return res.status(400).json({ message: 'Meeting link is required for each slot' });
        }

        const interview = await Interview.findOne({ interviewer: req.user.id });
        if (!interview) {
            return res.status(404).json({ message: 'Interview profile not found. Please create your profile first.' });
        }

        interview.slots.push({ startTime, endTime, meetingLink });
        await interview.save();

        res.status(200).json({
            success: true,
            data: interview
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a slot from interview profile
// @route   DELETE /api/v1/interviews/slots/:slotId
// @access  Private/Seller
export const deleteSlot = async (req, res, next) => {
    try {
        const interview = await Interview.findOne({ interviewer: req.user.id });
        if (!interview) return res.status(404).json({ message: 'Interview profile not found' });

        interview.slots.pull({ _id: req.params.slotId });
        await interview.save();

        res.status(200).json({ success: true, data: interview });
    } catch (error) {
        next(error);
    }
};

// @desc    Book a slot (User)
// @route   POST /api/v1/interviews/:id/book
// @access  Private
export const bookSlot = async (req, res, next) => {
    try {
        const { slotId } = req.body;
        const interviewId = req.params.id;

        const interview = await Interview.findById(interviewId).populate('interviewer', 'name _id');
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        const slot = interview.slots.id(slotId);
        if (!slot) return res.status(404).json({ message: 'Slot not found' });

        if (slot.isBooked) return res.status(400).json({ message: 'This slot is already booked' });

        const user = await User.findById(req.user.id);
        const hasActiveSub = user.subscription?.plan && user.subscription.plan !== 'None';
        let amountPaid = 0;
        let paymentStatus = 'free';

        // Use the finalAmount calculated by the frontend (after coupon application)
        let actualPrice = req.body.finalAmount !== undefined ? Number(req.body.finalAmount) : interview.price;
        actualPrice = Math.max(0, actualPrice);

        // Wallet deduction for paid interviews
        if (actualPrice > 0) {
            if (!hasActiveSub) {
                if (user.walletBalance < actualPrice) {
                    return res.status(400).json({ message: 'Insufficient wallet balance' });
                }
                user.walletBalance -= actualPrice;
                await user.save();
                amountPaid = actualPrice;
                paymentStatus = 'paid';

                // Debit transaction for user
                await Transaction.create({
                    user: req.user.id,
                    type: 'debit',
                    amount: actualPrice,
                    description: `Interview booking with ${interview.interviewer.name}${req.body.couponCode ? ' (Coupon applied)' : ''}`,
                    status: 'completed'
                });

                // Credit seller earnings
                const sellerRecord = await Seller.findOne({ user: interview.interviewer._id });
                if (sellerRecord) {
                    sellerRecord.earnings += actualPrice;
                    await sellerRecord.save();

                    await Transaction.create({
                        user: interview.interviewer._id,
                        type: 'credit',
                        amount: actualPrice,
                        description: `Interview booking revenue`,
                        status: 'completed'
                    });
                }
            } else {
                amountPaid = 0;
                paymentStatus = 'free';
            }
        } else {
            amountPaid = 0;
            paymentStatus = 'free';
        }

        // Mark slot as booked and use the seller-provided meeting link
        slot.isBooked = true;
        await interview.save();

        const booking = await Booking.create({
            user: req.user.id,
            type: 'interview',
            interview: interviewId,
            slot: slotId,
            seller: interview.interviewer._id,
            amountPaid,
            paymentStatus,
            meetingLink: slot.meetingLink,
            status: 'confirmed'
        });

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Rate an interviewer (after booking)
// @route   POST /api/v1/interviews/:id/rate
// @access  Private
export const rateInterview = async (req, res, next) => {
    try {
        const { rating } = req.body; // 1-5
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        // Check user has a confirmed booking for this interview
        const booking = await Booking.findOne({
            user: req.user.id,
            interview: req.params.id,
            type: 'interview',
            status: { $in: ['confirmed', 'completed'] }
        });
        if (!booking) {
            return res.status(403).json({ message: 'You can only rate interviews you have booked' });
        }

        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        if (booking.rating && booking.rating > 0) {
            // Update existing rating
            const oldRating = booking.rating;
            const currentTotalSum = interview.ratings * interview.totalReviews;
            if (interview.totalReviews > 0) {
                interview.ratings = (currentTotalSum - oldRating + rating) / interview.totalReviews;
            } else {
                interview.ratings = rating;
                interview.totalReviews = 1;
            }
        } else {
            // New rating
            const newTotal = interview.totalReviews + 1;
            interview.ratings = ((interview.ratings * interview.totalReviews) + rating) / newTotal;
            interview.totalReviews = newTotal;
        }

        await interview.save();
        
        booking.rating = rating;
        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            data: { rating: interview.ratings, totalReviews: interview.totalReviews }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my bookings (User — interview + course)
// @route   GET /api/v1/interviews/bookings/me
// @access  Private
export const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ user: req.user.id })
            .populate({
                path: 'interview',
                populate: { path: 'interviewer', select: 'name' }
            })
            .populate('course', 'title thumbnail price category level')
            .populate('seller', 'name')
            .sort({ createdAt: -1 });

        // Lazy update for in-progress and completed interviews
        const now = new Date();
        for (const booking of bookings) {
            if (booking.type === 'interview' && (booking.status === 'confirmed' || booking.status === 'in-progress') && booking.interview && booking.interview.slots) {
                const slot = booking.interview.slots.find(s => s._id.toString() === booking.slot.toString());
                if (slot) {
                    const start = new Date(slot.startTime);
                    const end = new Date(slot.endTime);
                    if (now > end && booking.status !== 'completed') {
                        booking.status = 'completed';
                        await booking.save();
                    } else if (now >= start && now <= end && booking.status !== 'in-progress') {
                        booking.status = 'in-progress';
                        await booking.save();
                    }
                }
            }
        }

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bookings for the seller's own interviews + course sales
// @route   GET /api/v1/interviews/bookings/seller
// @access  Private/Seller
export const getSellerBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ 
            seller: req.user.id,
            user: { $ne: req.user.id }
        })
            .populate('user', 'name email')
            .populate({
                path: 'interview',
                select: 'domain price meetingMode slots'
            })
            .populate('course', 'title price thumbnail')
            .sort({ createdAt: -1 });

        // Lazy update for in-progress and completed interviews
        const now = new Date();
        for (const booking of bookings) {
            if (booking.type === 'interview' && (booking.status === 'confirmed' || booking.status === 'in-progress') && booking.interview && booking.interview.slots) {
                const slot = booking.interview.slots.find(s => s._id.toString() === booking.slot.toString());
                if (slot) {
                    const start = new Date(slot.startTime);
                    const end = new Date(slot.endTime);
                    if (now > end && booking.status !== 'completed') {
                        booking.status = 'completed';
                        await booking.save();
                    } else if (now >= start && now <= end && booking.status !== 'in-progress') {
                        booking.status = 'in-progress';
                        await booking.save();
                    }
                }
            }
        }

        res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};
