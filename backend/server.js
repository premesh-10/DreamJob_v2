import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { lookup as mimeLookup } from 'mime-types';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import './models/Webinar.js';
import './models/PracticeTest.js';
import './models/PracticeTestAttempt.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userFeatureRoutes from './routes/userFeatureRoutes.js';
import webinarRoutes from './routes/webinarRoutes.js';
import practiceTestRoutes from './routes/practiceTestRoutes.js';

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

// Helmet — allow serving local videos/pdfs
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ── Serve uploaded files — with proper Range support for videos ──────────────
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', req.path);

    // Security: prevent path traversal
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    if (!fs.existsSync(filePath)) return next();

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = mimeLookup(filePath) || 'application/octet-stream';
    const isVideo = mimeType.startsWith('video/');

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Videos: support Range requests for seek / partial content
    if (isVideo) {
        const rangeHeader = req.headers.range;
        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024, fileSize - 1);
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
                'Cache-Control': 'no-cache',
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
            });
            fs.createReadStream(filePath).pipe(res);
        }
        return;
    }

    // Non-video files (PDFs, images, etc.) — standard static serving
    return express.static(path.join(__dirname, 'uploads'))(req, res, next);
});



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
app.use('/api/v1/webinars', webinarRoutes);
app.use('/api/v1/practice-tests', practiceTestRoutes);

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
