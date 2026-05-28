import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    duration: { type: Number },
    order: { type: Number, required: true },
    isFree: { type: Boolean, default: false }
});

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, default: 'https://via.placeholder.com/400x225?text=Course+Thumbnail' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    price: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },

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
    enrolledUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Ratings (aggregate)
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
export default Course;
