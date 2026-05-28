import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    meetingLink: {
        type: String,
        default: ''
    },
    isBooked: {
        type: Boolean,
        default: false
    }
});

const interviewSchema = new mongoose.Schema({
    interviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    domain: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    meetingMode: {
        type: String,
        enum: ['Google Meet', 'Zoom', 'Teams', 'Custom Link'],
        default: 'Google Meet'
    },
    slots: [slotSchema],
    ratings: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Interview = mongoose.model('Interview', interviewSchema);
export default Interview;
