import mongoose from 'mongoose';
import multer from 'multer';
import Seller from '../models/Seller.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import { uploadAvatar, deleteUploadedFile } from '../middleware/uploadMiddleware.js';

// @desc    Apply to be a seller
// @route   POST /api/v1/sellers/apply
// @access  Private
export const applySeller = async (req, res, next) => {
    try {
        const { contentType, targetedCourse } = req.body;

        const existingSeller = await Seller.findOne({ user: req.user.id });
        if (existingSeller) {
            return res.status(400).json({ message: 'Seller application already exists' });
        }

        const seller = await Seller.create({
            user: req.user.id,
            contentType,
            targetedCourse,
            status: 'applied'
        });

        res.status(201).json({
            success: true,
            data: seller
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the logged-in user's seller application status
// @route   GET /api/v1/sellers/my-status
// @access  Private
export const getMyApplicationStatus = async (req, res, next) => {
    try {
        const seller = await Seller.findOne({ user: req.user.id }).select('status contentType targetedCourse createdAt');
        if (!seller) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({ success: true, data: seller });
    } catch (error) {
        next(error);
    }
};

// @desc    Get the logged-in seller's own profile + stats
// @route   GET /api/v1/sellers/me
// @access  Private/Seller
export const getMySellerProfile = async (req, res, next) => {
    try {
        const seller = await Seller.findOne({ user: req.user.id })
            .populate('user', 'name email mobile experience qualification');

        if (!seller) {
            return res.status(404).json({ message: 'Seller profile not found' });
        }

        // Compute live stats
        const totalCourses = await Course.countDocuments({ seller: req.user.id });
        const uniqueStudents = await Booking.distinct('user', { 
            seller: req.user.id,
            user: { $ne: req.user.id },
            paymentStatus: { $in: ['paid', 'free'] } 
        });

        res.status(200).json({
            success: true,
            data: {
                ...seller.toObject(),
                totalCourses,
                totalStudents: uniqueStudents.length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update seller profile (bio, pic, expertise, social links)
// @route   PUT /api/v1/sellers/me
// @access  Private/Seller
export const updateMySellerProfile = async (req, res, next) => {
    try {
        const { bio, expertise, socialLinks } = req.body;

        const seller = await Seller.findOneAndUpdate(
            { user: req.user.id },
            { bio, expertise, socialLinks },
            { new: true, runValidators: false }
        ).populate('user', 'name email');

        if (!seller) return res.status(404).json({ message: 'Seller profile not found' });

        res.status(200).json({ success: true, data: seller });
    } catch (error) {
        next(error);
    }
};

// @desc    Get seller revenue & stats summary
// @route   GET /api/v1/sellers/me/stats
// @access  Private/Seller
export const getMySellerStats = async (req, res, next) => {
    try {
        const seller = await Seller.findOne({ user: req.user.id });
        if (!seller) return res.status(404).json({ message: 'Seller profile not found' });

        // Monthly earnings breakdown (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyEarnings = await Booking.aggregate([
            {
                $match: {
                    seller: seller.user,
                    user: { $ne: new mongoose.Types.ObjectId(req.user.id) },
                    paymentStatus: 'paid',
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    total: { $sum: '$amountPaid' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Integrate admin adjustments into monthly earnings
        const adjustments = seller.withdrawals.filter(w => w.type === 'admin_adjustment' && new Date(w.processedAt || w.requestedAt) >= sixMonthsAgo);
        
        adjustments.forEach(adj => {
            const date = new Date(adj.processedAt || adj.requestedAt);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // 1-12
            
            let monthData = monthlyEarnings.find(m => m._id.year === year && m._id.month === month);
            if (!monthData) {
                monthData = { _id: { year, month }, total: 0, count: 0 };
                monthlyEarnings.push(monthData);
            }
            
            const isDeduct = adj.adminNote?.toLowerCase().includes('deducted');
            monthData.total += isDeduct ? -adj.amount : adj.amount;
        });

        monthlyEarnings.sort((a, b) => {
            if (a._id.year !== b._id.year) return a._id.year - b._id.year;
            return a._id.month - b._id.month;
        });

        // Top courses by enrollment
        const topCourses = await Course.find({ seller: req.user.id })
            .select('title enrolledUsers price rating')
            .sort({ 'enrolledUsers': -1 })
            .limit(5);

        // Calculate unique students (distinct users who bought from this seller, excluding the seller themselves)
        const uniqueStudents = await Booking.distinct('user', { 
            seller: req.user.id,
            user: { $ne: req.user.id },
            paymentStatus: { $in: ['paid', 'free'] } 
        });
        const totalStudents = uniqueStudents.length;

        const totalWithdrawn = seller.withdrawals
            .filter(w => w.status === 'completed' && w.type === 'withdrawal')
            .reduce((sum, w) => sum + (w.approvedAmount !== null ? w.approvedAmount : w.amount), 0);
        
        const lifetimeEarnings = seller.earnings + totalWithdrawn;

        res.status(200).json({
            success: true,
            data: {
                totalEarnings: lifetimeEarnings,
                presentBalance: seller.earnings,
                totalStudents,
                monthlyEarnings,
                topCourses: topCourses.map(c => ({
                    _id: c._id,
                    title: c.title,
                    students: c.enrolledUsers.length,
                    price: c.price,
                    rating: c.rating
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Request a withdrawal
// @route   POST /api/v1/sellers/me/withdraw
// @access  Private/Seller
export const requestWithdrawal = async (req, res, next) => {
    try {
        const { amount, bankDetails } = req.body;
        const parsedAmount = parseFloat(amount);

        if (!parsedAmount || parsedAmount < 10) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is $10' });
        }

        const seller = await Seller.findOne({ user: req.user.id });
        if (!seller) return res.status(404).json({ message: 'Seller profile not found' });
        if (seller.earnings < parsedAmount) {
            return res.status(400).json({ message: 'Insufficient earnings balance' });
        }

        // Check for any already in-progress withdrawal
        const hasPending = seller.withdrawals.some(w => ['initiated', 'approval_in_progress'].includes(w.status));
        if (hasPending) {
            return res.status(400).json({ message: 'You already have a pending withdrawal request. Please wait for it to be processed.' });
        }

        // Deduct from earnings (held during approval)
        seller.earnings -= parsedAmount;
        seller.withdrawals.push({
            amount: parsedAmount,
            status: 'initiated',
            bankDetails: bankDetails || {}
        });
        await seller.save();

        res.status(201).json({
            success: true,
            message: 'Withdrawal request initiated! Admin will review it shortly.',
            data: seller.withdrawals[seller.withdrawals.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// ─── Admin routes ────────────────────────────────────

// @desc    Get all withdrawal requests across all sellers (Admin)
// @route   GET /api/v1/sellers/withdrawals
// @access  Private/Admin
export const getWithdrawalRequests = async (req, res, next) => {
    try {
        const sellers = await Seller.find({ 'withdrawals.0': { $exists: true } })
            .populate('user', 'name email mobile')
            .select('user withdrawals earnings');

        // Flatten all withdrawals with seller info
        const requests = [];
        sellers.forEach(seller => {
            seller.withdrawals.forEach(w => {
                requests.push({
                    _id: w._id,
                    sellerId: seller._id,
                    sellerName: seller.user?.name,
                    sellerEmail: seller.user?.email,
                    amount: w.amount,
                    approvedAmount: w.approvedAmount,
                    refundedToSeller: w.refundedToSeller,
                    status: w.status,
                    bankDetails: w.bankDetails,
                    adminNote: w.adminNote,
                    requestedAt: w.requestedAt,
                    processedAt: w.processedAt
                });
            });
        });

        // Sort newest first
        requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        next(error);
    }
};

// @desc    Process a withdrawal request (Admin) — advance stage or reject
// @route   PUT /api/v1/sellers/:sellerId/withdrawals/:withdrawalId
// @access  Private/Admin
export const processWithdrawal = async (req, res, next) => {
    try {
        const { status, adminNote, approvedAmount, refundRemaining = true } = req.body;
        const validStatuses = ['initiated', 'approval_in_progress', 'completed', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid withdrawal status' });
        }

        const seller = await Seller.findById(req.params.sellerId);
        if (!seller) return res.status(404).json({ message: 'Seller not found' });

        const withdrawal = seller.withdrawals.id(req.params.withdrawalId);
        if (!withdrawal) return res.status(404).json({ message: 'Withdrawal request not found' });

        const prevStatus = withdrawal.status;
        withdrawal.status = status;
        if (adminNote !== undefined) withdrawal.adminNote = adminNote;
        
        // Handle approvedAmount (only applied when marking as completed)
        if (status === 'completed' && approvedAmount !== undefined) {
            const parsedApproved = parseFloat(approvedAmount);
            if (parsedApproved > withdrawal.amount) {
                return res.status(400).json({ message: 'Approved amount cannot exceed requested amount' });
            }
            if (parsedApproved < 0) {
                 return res.status(400).json({ message: 'Approved amount cannot be negative' });
            }
            
            withdrawal.approvedAmount = parsedApproved;
            
            // Handle difference between requested and approved
            const difference = withdrawal.amount - parsedApproved;
            if (difference > 0) {
                if (refundRemaining === false || refundRemaining === 'false') {
                    withdrawal.refundedToSeller = false;
                    // Transfer the unapproved difference to the admin's wallet
                    const adminUser = await User.findById(req.user.id);
                    if (adminUser) {
                        adminUser.walletBalance += difference;
                        await adminUser.save();
                    }
                } else {
                    withdrawal.refundedToSeller = true;
                    // Refund to seller
                    seller.earnings += difference;
                }
            } else {
                withdrawal.refundedToSeller = true;
            }
            withdrawal.processedAt = new Date();
        }

        // If rejected — refund full requested amount back to seller
        if (status === 'rejected' && prevStatus !== 'rejected') {
            seller.earnings += withdrawal.amount;
            withdrawal.processedAt = new Date();
            withdrawal.approvedAmount = 0;
        }

        await seller.save();

        // If completed, record this payout as a platform debit transaction so it shows in Admin Payments
        if (status === 'completed' && prevStatus !== 'completed') {
            await Transaction.create({
                user: seller.user,
                type: 'debit',
                amount: withdrawal.approvedAmount !== null ? withdrawal.approvedAmount : withdrawal.amount,
                description: `Seller Withdrawal Payout (Ref: ${withdrawal._id})`,
                status: 'completed'
            });
        }

        res.status(200).json({
            success: true,
            message: `Withdrawal status updated to "${status}"`,
            data: withdrawal
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all sellers (Admin)
// @route   GET /api/v1/sellers
// @access  Private/Admin
export const getSellers = async (req, res, next) => {
    try {
        const sellers = await Seller.find()
            .populate('user', 'name email mobile experience')
            .sort({ createdAt: -1 });

        const enrichedSellers = sellers.map(seller => {
            const sellerObj = seller.toObject();
            const totalWithdrawn = seller.withdrawals
                .filter(w => w.status === 'completed')
                .reduce((sum, w) => sum + (w.approvedAmount !== null ? w.approvedAmount : w.amount), 0);
            
            sellerObj.lifetimeEarnings = seller.earnings + totalWithdrawn;
            sellerObj.presentBalance = seller.earnings;
            return sellerObj;
        });

        res.status(200).json({
            success: true,
            data: enrichedSellers
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve or reject seller (Admin)
// @route   PUT /api/v1/sellers/:id/status
// @access  Private/Admin
export const updateSellerStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ['applied', 'verifying', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const seller = await Seller.findById(req.params.id).populate('user', 'name email');
        if (!seller) return res.status(404).json({ message: 'Seller application not found' });

        seller.status = status;
        await seller.save();

        if (status === 'approved') {
            // Grant seller role
            await User.findByIdAndUpdate(seller.user._id, { role: 'seller' });
        } else if (status === 'rejected' || status === 'applied' || status === 'verifying') {
            // Revert/keep as regular user
            await User.findByIdAndUpdate(seller.user._id, { role: 'user' });
        }

        res.status(200).json({ success: true, data: seller });
    } catch (error) {
        next(error);
    }
};

// @desc    Adjust a seller's wallet balance (earnings) (Admin)
// @route   POST /api/v1/sellers/:id/wallet-adjust
// @access  Private/Admin
export const adjustSellerWallet = async (req, res, next) => {
    try {
        const { action, amount, description } = req.body;
        
        if (!['add', 'deduct'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Use "add" or "deduct"' });
        }
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ message: 'Please provide a valid positive amount' });
        }

        const seller = await Seller.findById(req.params.id).populate('user');
        if (!seller) return res.status(404).json({ message: 'Seller not found' });

        const adminUser = await User.findById(req.user.id);
        if (!adminUser) return res.status(404).json({ message: 'Admin user not found' });

        if (action === 'add') {
            seller.earnings += parsedAmount;
            adminUser.walletBalance -= parsedAmount;
        } else if (action === 'deduct') {
            seller.earnings -= parsedAmount; // Allows negative balance per user requirements
            adminUser.walletBalance += parsedAmount;
        }

        // Add to withdrawals array so it shows up in seller's wallet history
        seller.withdrawals.push({
            amount: parsedAmount,
            status: 'completed',
            type: 'admin_adjustment',
            adminNote: `${action === 'add' ? 'Added' : 'Deducted'} by Admin${description ? ': ' + description : ''}`,
            processedAt: Date.now()
        });

        await seller.save();
        await adminUser.save();

        // Log transaction for seller visibility
        await Transaction.create({
            user: seller.user._id,
            type: action === 'add' ? 'credit' : 'debit',
            amount: parsedAmount,
            description: description || `Admin wallet adjustment (${action})`,
            status: 'completed'
        });

        const sellerObj = seller.toObject();
        const totalWithdrawn = seller.withdrawals
            .filter(w => w.status === 'completed' && w.type === 'withdrawal')
            .reduce((sum, w) => sum + (w.approvedAmount !== null ? w.approvedAmount : w.amount), 0);
        
        // Note: Admin additions are intrinsically reflected in `seller.earnings`. 
        // Admin deductions reduce `seller.earnings`.
        // So `seller.earnings + totalWithdrawn` gives the correct lifetime earnings without double counting admin_adjustments.
        sellerObj.lifetimeEarnings = seller.earnings + totalWithdrawn;
        sellerObj.presentBalance = seller.earnings;

        res.status(200).json({
            success: true,
            message: `Successfully ${action === 'add' ? 'added' : 'deducted'} $${parsedAmount} ${action === 'add' ? 'to' : 'from'} seller wallet`,
            data: sellerObj
        });
    } catch (error) {
        next(error);
    }
};
