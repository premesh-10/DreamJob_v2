import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    // Legacy URL support (kept for backward compatibility)
    videoUrl: { type: String, default: '' },
    // New: uploaded file paths (relative to server, e.g. /uploads/videos/...)
    videoPath: { type: String, default: '' },
    videoSize: { type: Number, default: 0 }, // bytes
    videoMimeType: { type: String, default: '' },
    // PDF per chapter
    pdfPath: { type: String, default: '' },
    pdfTitle: { type: String, default: '' },
    pdfSize: { type: Number, default: 0 },
    duration: { type: Number, default: 0 }, // in seconds
    order: { type: Number, required: true },
    isFree: { type: Boolean, default: false },
    description: { type: String, default: '' },
    approvalStatus: { type: String, enum: ['approved', 'pending_add', 'pending_delete'], default: 'approved' }
});

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, default: 'pdf' }, // pdf, doc, ppt, etc.
    fileSize: { type: Number, default: 0 }, // bytes
    uploadedAt: { type: Date, default: Date.now },
    approvalStatus: { type: String, enum: ['approved', 'pending_add', 'pending_delete'], default: 'approved' }
});

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: {
        type: String,
        default: ''
    },
    thumbnailPath: { type: String, default: '' }, // local upload path
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    price: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    approvalStatus: { 
        type: String, 
        enum: ['draft', 'pending', 'approved', 'rejected', 'pending_unpublish', 'pending_delete'], 
        default: 'draft' 
    },

    // ── Multi-level support ────────────────────────────────────────────────────
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    levels: {
        type: [String],
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: ['Beginner']
    },
    // ──────────────────────────────────────────────────────────────────────────

    language: { type: String, default: 'English' },
    chapters: [chapterSchema],

    // Downloadable resources (PDFs, slides, etc.) for the whole course
    resources: [resourceSchema],

    // Linked Practice Tests
    practiceTests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PracticeTest' }],

    enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Ratings (aggregate)
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    // What students will learn (bullet points)
    whatYoullLearn: [{ type: String }],
    requirements: [{ type: String }],

    // Estimated duration in hours
    totalDuration: { type: Number, default: 0 }

}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;
