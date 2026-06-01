import mongoose from 'mongoose';

// ── Option Schema ─────────────────────────────────────────────────────────────
const optionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
}, { _id: true });

// ── Question Schema ───────────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: {
        type: String,
        enum: ['MCQ', 'MSQ'], // MCQ = single correct, MSQ = multi-select
        required: true
    },
    options: {
        type: [optionSchema],
        validate: {
            validator: function (v) { return v.length >= 2 && v.length <= 5; },
            message: 'Questions must have between 2 and 5 options'
        }
    },
    // Per-question timer (seller-configurable, 0 = no timer)
    timeLimit: { type: Number, default: 0 }, // seconds; 0 = no per-question timer
    explanation: { type: String, default: '' }, // shown after answering
    marks: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    image: { type: String, default: '' } // optional question image path
}, { _id: true });

// ── Answer Schema (within attempt) ───────────────────────────────────────────
const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }], // option _ids selected
    isCorrect: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 }, // seconds taken for this question
    marksAwarded: { type: Number, default: 0 }
}, { _id: false });

// ── Attempt Schema (embedded) ─────────────────────────────────────────────────
const attemptSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNumber: { type: Number, default: 1 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    answers: [answerSchema],
    timeTaken: { type: Number, default: 0 } // total seconds taken
}, { _id: true, timestamps: false });

// ── Practice Test Schema ──────────────────────────────────────────────────────
const practiceTestSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, default: '' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Optional link to a course
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    
    // Tags for discoverability
    tags: [{ type: String }],
    
    // ── Timer Settings (all seller-configurable) ───────────────────────────
    // Overall test timer (0 = no overall timer)
    timeLimit: { type: Number, default: 0 }, // minutes; 0 = unlimited
    // Whether questions have individual timers (controlled per-question in questionSchema)
    hasPerQuestionTimer: { type: Boolean, default: false },
    
    // ── Re-take Policy ────────────────────────────────────────────────────
    // 0 = unlimited re-takes
    maxAttempts: { type: Number, default: 0 }, // 0 = unlimited
    
    // ── Scoring ───────────────────────────────────────────────────────────
    passingScore: { type: Number, default: 60 }, // percentage
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResultsImmediately: { type: Boolean, default: true },
    
    // ── Status ────────────────────────────────────────────────────────────
    isPublished: { type: Boolean, default: false },
    
    // ── Content ───────────────────────────────────────────────────────────
    questions: [questionSchema],
    
    // Embedded attempts (for quick stats; full attempts in PracticeTestAttempt collection)
    // We store only summary attempts here for performance
    
    // ── Stats (denormalized for quick display) ─────────────────────────────
    totalAttempts: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 } // percentage

}, { timestamps: true });

// Virtual: total marks
practiceTestSchema.virtual('totalMarks').get(function () {
    return this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
});

const PracticeTest = mongoose.model('PracticeTest', practiceTestSchema);
export default PracticeTest;
