import mongoose from 'mongoose';

// Detailed attempt record stored in a separate collection for scalability
const attemptAnswerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    questionText: { type: String }, // snapshot at time of attempt
    type: { type: String, enum: ['MCQ', 'MSQ'] },
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }],
    correctOptions: [{ type: mongoose.Schema.Types.ObjectId }], // snapshot
    isCorrect: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 }, // seconds
    marksAwarded: { type: Number, default: 0 },
    marksAvailable: { type: Number, default: 1 }
}, { _id: false });

const practiceTestAttemptSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    practiceTest: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeTest', required: true },
    attemptNumber: { type: Number, default: 1 },
    
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    
    // Scoring
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    
    // Time taken in seconds
    timeTaken: { type: Number, default: 0 },
    
    // Detailed answers
    answers: [attemptAnswerSchema],
    
    // Status
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'timed_out', 'abandoned'],
        default: 'in_progress'
    }
}, { timestamps: true });

const PracticeTestAttempt = mongoose.model('PracticeTestAttempt', practiceTestAttemptSchema);
export default PracticeTestAttempt;
