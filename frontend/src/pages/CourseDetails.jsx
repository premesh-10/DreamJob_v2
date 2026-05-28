import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useSelector } from 'react-redux';
import Layout from '../components/Layout';

// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value = 0, onChange, readonly = false, size = 'md' }) {
    const [hover, setHover] = useState(0);
    const sz = size === 'sm' ? 'text-base' : 'text-2xl';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" disabled={readonly}
                    onClick={() => !readonly && onChange?.(star)}
                    onMouseEnter={() => !readonly && setHover(star)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    className={`${sz} transition-transform ${!readonly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'} ${star <= (hover || value) ? 'text-amber-400' : 'text-slate-200'}`}>
                    ★
                </button>
            ))}
        </div>
    );
}

// ── Coupon Input ─────────────────────────────────────────────────────────────
function CouponInput({ price, onDiscount }) {
    const [code, setCode] = useState('');
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const apply = async () => {
        if (!code.trim()) return;
        setChecking(true); setError(''); setResult(null);
        try {
            const { data } = await api.post('/coupons/validate', { code: code.trim(), orderAmount: price, applicableTo: 'courses' });
            setResult(data.data); onDiscount(data.data);
        } catch (err) { setError(err.response?.data?.message || 'Invalid coupon'); onDiscount(null); }
        finally { setChecking(false); }
    };

    const remove = () => { setCode(''); setResult(null); setError(''); onDiscount(null); };

    return (
        <div className="mt-4">
            {result ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div><p className="text-emerald-700 font-bold text-sm">🎉 {result.code} applied!</p><p className="text-emerald-600 text-xs">Saved ${result.discount}</p></div>
                    <button onClick={remove} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                </div>
            ) : (
                <div className="flex gap-2">
                    <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && apply()}
                        placeholder="COUPON CODE" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none uppercase" />
                    <button onClick={apply} disabled={checking} className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:bg-slate-900 transition">
                        {checking ? '...' : 'Apply'}
                    </button>
                </div>
            )}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}

// ── Rate Modal ───────────────────────────────────────────────────────────────
function RateModal({ courseId, onClose, onSubmitted }) {
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (rating === 0) { setError('Please select a star rating'); return; }
        if (review.trim().length < 3) { setError('Please write at least 3 characters'); return; }
        setSubmitting(true); setError('');
        try {
            const { data } = await api.post(`/courses/${courseId}/rate`, { rating, review: review.trim() });
            onSubmitted(data.data);
            onClose();
        } catch (err) { setError(err.response?.data?.message || 'Failed to submit'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900">Rate this Course</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center">✕</button>
                </div>
                <div className="flex justify-center mb-2"><StarRating value={rating} onChange={setRating} /></div>
                <p className="text-center text-sm text-slate-500 mb-4">{rating === 0 ? 'Select a rating' : ['', 'Terrible 😞', 'Poor 😕', 'Okay 😐', 'Good 😊', 'Excellent 🤩'][rating]}</p>
                <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Share your experience with other students..."
                    rows={4} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none" />
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                <div className="flex gap-3 mt-4">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200">Cancel</button>
                    <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 hover:bg-primary-700">
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Report Modal ─────────────────────────────────────────────────────────────
function ReportModal({ reviewId, onClose, onReported }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
        setSubmitting(true);
        try {
            await api.post(`/feedback/${reviewId}/report`, { reason });
            onReported(); onClose();
        } catch (err) { alert(err.response?.data?.message || 'Failed to report'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-slate-900 mb-3">Report Review</h3>
                <p className="text-sm text-slate-500 mb-4">Why are you reporting this review? Our team will investigate.</p>
                <select value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="">Select reason...</option>
                    <option value="spam">Spam or fake review</option>
                    <option value="offensive">Offensive content</option>
                    <option value="misleading">Misleading information</option>
                    <option value="other">Other</option>
                </select>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm">Cancel</button>
                    <button onClick={submit} disabled={submitting || !reason}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm disabled:opacity-60 hover:bg-red-700">
                        {submitting ? 'Reporting...' : 'Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reviews Section ──────────────────────────────────────────────────────────
function ReviewsSection({ courseId, isEnrolled, user }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRateModal, setShowRateModal] = useState(false);
    const [reportingId, setReportingId] = useState(null);
    const [myReview, setMyReview] = useState(null);

    const loadReviews = useCallback(async () => {
        try {
            const { data } = await api.get(`/courses/${courseId}/reviews`);
            const all = data.data || [];
            setReviews(all);
            setMyReview(user ? all.find(r => r.user?._id === user.id || r.user?._id === user._id) : null);
        } catch { } finally { setLoading(false); }
    }, [courseId, user]);

    useEffect(() => { loadReviews(); }, [loadReviews]);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete your review?')) return;
        try {
            await api.delete(`/feedback/${id}`);
            loadReviews();
        } catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
    };

    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    return (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Student Reviews</h2>
                    {reviews.length > 0 && (
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-4xl font-black text-slate-900">{avgRating.toFixed(1)}</span>
                            <div>
                                <StarRating value={Math.round(avgRating)} readonly size="md" />
                                <p className="text-slate-500 text-sm mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    )}
                </div>
                {isEnrolled && !myReview && (
                    <button onClick={() => setShowRateModal(true)}
                        className="px-5 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold text-sm hover:bg-amber-100 transition">
                        ⭐ Write a Review
                    </button>
                )}
            </div>

            {loading ? (
                <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : reviews.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500 text-sm">No reviews yet.{isEnrolled ? ' Be the first to review!' : ''}</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {reviews.map(r => {
                        const isOwn = user && (r.user?._id === user.id || r.user?._id === user._id);
                        return (
                            <div key={r._id} className={`p-5 rounded-xl border ${isOwn ? 'border-primary-200 bg-primary-50/30' : 'border-slate-100 bg-slate-50'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                            {r.user?.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-slate-800 text-sm">{r.user?.name}</span>
                                                {isOwn && <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded">You</span>}
                                                <span className="text-slate-400 text-xs">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="mt-1">
                                                <StarRating value={r.rating || 0} readonly size="sm" />
                                            </div>
                                            <p className="text-slate-700 text-sm mt-2 leading-relaxed">{r.review}</p>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isOwn && (
                                            <button onClick={() => handleDelete(r._id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition text-xs font-medium"
                                                title="Delete your review">
                                                🗑
                                            </button>
                                        )}
                                        {!isOwn && user && (
                                            <button onClick={() => setReportingId(r._id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition text-xs"
                                                title="Report this review">
                                                🚩
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showRateModal && (
                <RateModal courseId={courseId} onClose={() => setShowRateModal(false)}
                    onSubmitted={(newReview) => { loadReviews(); }} />
            )}
            {reportingId && (
                <ReportModal reviewId={reportingId} onClose={() => setReportingId(null)}
                    onReported={() => alert('Thank you for reporting. Our team will review it.')} />
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function CourseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [activeChapter, setActiveChapter] = useState(null);
    const [couponData, setCouponData] = useState(null);

    const fetchCourse = async () => {
        try {
            const { data } = await api.get(`/courses/${id}`);
            setCourse(data.data);
            if (data.data.chapters?.length > 0) setActiveChapter(data.data.chapters[0]);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchCourse(); }, [id]);

    const handleEnroll = async () => {
        if (!user) { navigate('/login'); return; }
        setEnrolling(true);
        try {
            const finalPrice = couponData ? couponData.finalAmount : course.price;
            await api.post(`/courses/${id}/enroll`, { couponCode: couponData?.code || null, finalAmount: finalPrice });
            await fetchCourse();
        } catch (err) { alert(err.response?.data?.message || 'Failed to enroll'); }
        finally { setEnrolling(false); }
    };

    if (loading) return <Layout><div className="p-8 text-center text-slate-500">Loading course details...</div></Layout>;
    if (!course) return <Layout><div className="p-8 text-center text-slate-500">Course not found</div></Layout>;

    const isEnrolled = user && course.enrolledUsers?.map(u => u.toString()).includes(user.id);
    const finalPrice = couponData ? couponData.finalAmount : course.price;
    const levels = course.levels?.length > 0 ? course.levels : [course.level].filter(Boolean);

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Video + Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Video */}
                        <div className="bg-black rounded-2xl overflow-hidden aspect-video relative shadow-lg">
                            {isEnrolled && activeChapter ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                                    <div className="text-center">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-primary-500 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        <p className="text-lg font-medium">Playing: {activeChapter.title}</p>
                                        <p className="text-sm text-slate-400 mt-2">{activeChapter.videoUrl}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-60" onError={e => e.target.style.display = 'none'} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center text-white">
                                            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            <h3 className="text-xl font-bold mb-2">Enroll to Start Learning</h3>
                                            <p className="text-sm opacity-80">This content is locked for non-enrolled users.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Course Info */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-primary-600 text-sm font-bold uppercase tracking-wider">{course.category}</span>
                                {levels.map(l => (
                                    <span key={l} className={`px-2 py-0.5 rounded-full text-xs font-bold ${l === 'Beginner' ? 'bg-green-100 text-green-700' : l === 'Intermediate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{l}</span>
                                ))}
                            </div>

                            <h1 className="text-3xl font-bold text-slate-900 mb-3">{course.title}</h1>

                            <div className="flex items-center gap-2 mb-4">
                                <StarRating value={Math.round(course.rating || 0)} readonly size="sm" />
                                <span className="text-slate-700 font-semibold text-sm">{(course.rating || 0).toFixed(1)}</span>
                                <span className="text-slate-400 text-sm">({course.totalReviews || 0} reviews)</span>
                            </div>

                            <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">{course.description}</p>

                            <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                    {course.seller?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Instructor</p>
                                    <p className="font-medium text-slate-900">{course.seller?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Enroll + Chapters */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            {isEnrolled ? (
                                <div className="text-center">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
                                    <p className="font-bold text-emerald-700 text-lg">You're Enrolled!</p>
                                    <p className="text-slate-500 text-sm mt-1">Full lifetime access granted</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center mb-4">
                                        {couponData ? (
                                            <div><span className="text-2xl font-bold text-slate-400 line-through mr-2">${course.price}</span><span className="text-4xl font-bold text-emerald-600">${couponData.finalAmount}</span></div>
                                        ) : (
                                            <h3 className="text-4xl font-bold text-slate-900">{course.price > 0 ? `$${course.price}` : 'Free'}</h3>
                                        )}
                                        <p className="text-slate-500 text-sm mt-1">Full lifetime access</p>
                                    </div>
                                    {course.price > 0 && <CouponInput price={course.price} onDiscount={setCouponData} />}
                                    <button onClick={handleEnroll} disabled={enrolling}
                                        className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-primary-500/30 disabled:opacity-70">
                                        {enrolling ? 'Enrolling...' : course.price > 0 ? `Enroll for $${finalPrice}` : 'Enroll Free'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Chapters */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 bg-slate-50 border-b border-slate-200">
                                <h3 className="font-bold text-slate-800">Course Content</h3>
                                <p className="text-xs text-slate-500 mt-1">{course.chapters?.length || 0} sections</p>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                {course.chapters?.length > 0 ? (
                                    course.chapters.sort((a, b) => a.order - b.order).map((chapter, index) => (
                                        <button key={chapter._id} onClick={() => isEnrolled && setActiveChapter(chapter)}
                                            className={`w-full text-left p-4 hover:bg-slate-50 transition flex items-start space-x-3 ${activeChapter?._id === chapter._id ? 'bg-primary-50 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}>
                                            <div className="mt-0.5 text-slate-400">
                                                {isEnrolled
                                                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                }
                                            </div>
                                            <div>
                                                <p className={`font-medium text-sm ${activeChapter?._id === chapter._id ? 'text-primary-700' : 'text-slate-700'}`}>{index + 1}. {chapter.title}</p>
                                                <p className="text-xs text-slate-500 mt-1">{chapter.duration} mins</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-sm text-slate-500">No chapters uploaded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section — full width below */}
                <ReviewsSection courseId={id} isEnrolled={isEnrolled} user={user} />
            </div>
        </Layout>
    );
}

export default CourseDetails;
