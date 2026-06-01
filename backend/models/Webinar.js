import mongoose from 'mongoose';

const webinarSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a webinar name'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // ── Schedule ────────────────────────────────────────────────────────────────
    date: {
        type: Date,
        required: [true, 'Please provide a webinar date']
    },
    time: {
        type: String,       // stored as "HH:MM" (24-hour), displayed in local TZ on frontend
        required: [true, 'Please provide a webinar time']
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    duration: {
        type: Number,       // in minutes
        required: [true, 'Please provide duration in minutes'],
        min: 1
    },
    numberOfDays: {
        type: Number,
        default: 1,
        min: 1
    },
    // ── Seats ───────────────────────────────────────────────────────────────────
    seatCapacity: {
        type: Number,
        required: [true, 'Please provide seat capacity'],
        min: 1
    },
    registeredUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Waitlist: users who want a seat if one opens up
    waitlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // ── Pricing ─────────────────────────────────────────────────────────────────
    price: {
        type: Number,
        default: 0
    },
    // Tracks who paid and how much (for refunds on cancellation)
    payments: [{
        user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number, default: 0 }
    }],
    // ── Media ───────────────────────────────────────────────────────────────────
    thumbnail: {
        type: String,
        default: ''
    },
    // Hidden from unregistered users; revealed after registration
    meetingLink: {
        type: String,
        default: ''
    },
    // Visible to all once completed
    recordingUrl: {
        type: String,
        default: ''
    },
    // ── Classification ──────────────────────────────────────────────────────────
    category: {
        type: String,
        default: 'General'
    },
    tags: [String],
    language: {
        type: String,
        default: 'English'
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    // ── Admin Controls ──────────────────────────────────────────────────────────
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['upcoming', 'live', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    // Reason for cancellation (shown to registered users)
    cancellationReason: {
        type: String,
        default: ''
    },
    // Whether refunds were issued on cancellation
    refundIssued: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// ── Virtuals ────────────────────────────────────────────────────────────────────
webinarSchema.virtual('seatsLeft').get(function () {
    return Math.max(0, this.seatCapacity - (this.registeredUsers?.length || 0));
});

webinarSchema.virtual('waitlistCount').get(function () {
    return this.waitlist?.length || 0;
});

webinarSchema.virtual('registeredCount').get(function () {
    return this.registeredUsers?.length || 0;
});

webinarSchema.set('toJSON',   { virtuals: true });
webinarSchema.set('toObject', { virtuals: true });

const Webinar = mongoose.model('Webinar', webinarSchema);
export default Webinar;
