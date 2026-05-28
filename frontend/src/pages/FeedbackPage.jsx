import { useState } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

function StarRating({ value, onChange }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className={`text-3xl transition-transform hover:scale-125 cursor-pointer ${star <= (hover || value) ? 'text-amber-400' : 'text-slate-200'}`}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

const categories = [
    { value: 'general', label: '💬 General Feedback', desc: 'Share overall experience' },
    { value: 'content_quality', label: '📚 Content Quality', desc: 'About courses and materials' },
    { value: 'ui_ux', label: '🎨 Design & UX', desc: 'Platform usability and design' },
    { value: 'payment', label: '💳 Payments', desc: 'Billing and transactions' },
    { value: 'bug', label: '🐛 Bug Report', desc: 'Something isn\'t working' },
    { value: 'feature_request', label: '✨ Feature Request', desc: 'Suggest something new' },
];

function FeedbackPage() {
    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();

    const [category, setCategory] = useState('general');
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    if (!user) {
        return (
            <Layout>
                <div className="max-w-lg mx-auto text-center py-20">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Login Required</h2>
                    <p className="text-slate-500 mb-6">Please login to submit feedback</p>
                    <button onClick={() => navigate('/login')} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700">
                        Login
                    </button>
                </div>
            </Layout>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!review.trim() || review.trim().length < 5) {
            setError('Please write at least 5 characters of feedback');
            return;
        }
        setSubmitting(true); setError('');
        try {
            await api.post('/feedback', {
                type: 'platform',
                category,
                rating: rating || null,
                review: review.trim()
            });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
        } finally { setSubmitting(false); }
    };

    if (success) {
        return (
            <Layout>
                <div className="max-w-lg mx-auto text-center py-20">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">🙏</div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Thank You!</h2>
                    <p className="text-slate-600 text-lg mb-2">Your feedback has been received.</p>
                    <p className="text-slate-400 text-sm mb-8">We review every submission and use it to improve DreamJob for everyone.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => { setSuccess(false); setReview(''); setRating(0); setCategory('general'); }}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition">
                            Submit More
                        </button>
                        <button onClick={() => navigate('/')}
                            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-primary-500/30">
                        💬
                    </div>
                    <h1 className="text-3xl font-black text-slate-900">Share Feedback</h1>
                    <p className="text-slate-500 mt-2">Help us make DreamJob better. Your input matters!</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Category picker */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-4">What's your feedback about?</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {categories.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setCategory(cat.value)}
                                    className={`p-3 rounded-xl border-2 text-left transition ${category === cat.value ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                >
                                    <div className="text-lg mb-1">{cat.label.split(' ')[0]}</div>
                                    <p className={`text-xs font-semibold ${category === cat.value ? 'text-primary-700' : 'text-slate-700'}`}>
                                        {cat.label.split(' ').slice(1).join(' ')}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-2">Overall rating <span className="text-slate-400 font-normal text-sm">(optional)</span></h2>
                        <p className="text-slate-500 text-sm mb-4">How would you rate your overall DreamJob experience?</p>
                        <div className="flex items-center gap-4">
                            <StarRating value={rating} onChange={setRating} />
                            {rating > 0 && (
                                <div>
                                    <p className="font-bold text-slate-900">{['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'][rating]}</p>
                                    <button type="button" onClick={() => setRating(0)} className="text-xs text-slate-400 hover:text-red-500">Clear</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feedback text */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="font-bold text-slate-900 mb-2">Your feedback <span className="text-red-500">*</span></h2>
                        <p className="text-slate-500 text-sm mb-4">Be as detailed as possible — this helps our team understand and act on your feedback.</p>
                        <textarea
                            value={review}
                            onChange={e => setReview(e.target.value)}
                            placeholder={
                                category === 'bug' ? "Describe the bug: what happened, when, and what you expected to happen..." :
                                category === 'feature_request' ? "Describe the feature you'd like to see and how it would help you..." :
                                "Share your experience, suggestions, or anything else on your mind..."
                            }
                            rows={5}
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none transition"
                        />
                        <div className="flex justify-between mt-1">
                            <span className={`text-xs ${review.length < 5 ? 'text-red-400' : 'text-slate-400'}`}>{review.length} chars (min 5)</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || review.trim().length < 5}
                        className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/30 hover:from-primary-700 hover:to-primary-800 transition disabled:opacity-60 text-lg"
                    >
                        {submitting ? 'Submitting...' : '🚀 Submit Feedback'}
                    </button>
                </form>
            </div>
        </Layout>
    );
}

export default FeedbackPage;
