import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';

// Ensure all models are registered with Mongoose
import './models/User.js';
import './models/Seller.js';
import './models/Course.js';
import './models/Interview.js';
import './models/Booking.js';
import './models/Transaction.js';
import './models/Coupon.js';
import './models/Notification.js';
import './models/Feedback.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userFeatureRoutes from './routes/userFeatureRoutes.js';


// Connect to MongoDB Atlas
connectDB();

const app = express();

// Middleware
// Enable raw body for Stripe Webhook
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl.startsWith('/api/v1/payments/webhook')) {
            req.rawBody = buf.toString();
        }
    }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    credentials: true,
}));
app.use(helmet());

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/sellers', sellerRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
// User-facing features: coupon validation, course/interview ratings, feedback, notifications
app.use('/api/v1', userFeatureRoutes);

// Routes
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
