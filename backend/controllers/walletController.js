import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// @desc    Get user wallet balance and transactions
// @route   GET /api/v1/wallet
// @access  Private
export const getWallet = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            balance: user.walletBalance,
            transactions
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add money to wallet
// @route   POST /api/v1/wallet/add
// @access  Private
export const addMoney = async (req, res, next) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        const user = await User.findById(req.user.id);
        
        // Update balance
        user.walletBalance += Number(amount);
        await user.save();

        // Create transaction record
        const transaction = await Transaction.create({
            user: req.user.id,
            type: 'credit',
            amount: Number(amount),
            description: description || 'Added money to wallet',
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            balance: user.walletBalance,
            transaction
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deduct money from wallet
// @route   POST /api/v1/wallet/deduct
// @access  Private
export const deductMoney = async (req, res, next) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Please provide a valid amount' });
        }

        const user = await User.findById(req.user.id);

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }
        
        // Update balance
        user.walletBalance -= Number(amount);
        await user.save();

        // Create transaction record
        const transaction = await Transaction.create({
            user: req.user.id,
            type: 'debit',
            amount: Number(amount),
            description: description || 'Payment for service',
            status: 'completed'
        });

        res.status(200).json({
            success: true,
            balance: user.walletBalance,
            transaction
        });
    } catch (error) {
        next(error);
    }
};
