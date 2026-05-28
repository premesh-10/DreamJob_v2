import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Type of booking — interview or course purchase
    type: {
        type: String,
        enum: ['interview', 'course'],
        default: 'interview'
    },
    // For interview bookings
    interview: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Interview'
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId
    },
    // For course bookings
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    // The seller who receives the payment
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled'],
        default: 'confirmed'
    },
    meetingLink: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'free'],
        default: 'paid'
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
