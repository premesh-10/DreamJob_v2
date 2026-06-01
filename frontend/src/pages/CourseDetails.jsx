import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useSelector } from 'react-redux';
import Layout from '../components/Layout';
import SecurePdfViewer from '../components/SecurePdfViewer';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const getVideoUrl = (chapter) => {
    if (chapter?.videoPath) {
        return chapter.videoPath.startsWith('http')
            ? chapter.videoPath
            : `${API_BASE}${chapter.videoPath}`;
    }
    return chapter?.videoUrl || '';
};

const getPDFUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${API_BASE}${path}`;
};

const formatDuration = (seconds) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    return `${s}s`;
};

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
function ReviewsSection({ courseId, isEnrolled, user, onReviewUpdated }) {
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
            if (onReviewUpdated) onReviewUpdated();
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
                                            <div className="mt-1"><StarRating value={r.rating || 0} readonly size="sm" /></div>
                                            <p className="text-slate-700 text-sm mt-2 leading-relaxed">{r.review}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isOwn && (
                                            <button onClick={() => handleDelete(r._id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition text-xs font-medium" title="Delete your review">
                                                🗑
                                            </button>
                                        )}
                                        {!isOwn && user && (
                                            <button onClick={() => setReportingId(r._id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition text-xs" title="Report this review">
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
                    onSubmitted={() => { loadReviews(); if (onReviewUpdated) onReviewUpdated(); }} />
            )}
            {reportingId && (
                <ReportModal reviewId={reportingId} onClose={() => setReportingId(null)}
                    onReported={() => alert('Thank you for reporting. Our team will review it.')} />
            )}
        </div>
    );
}

// ── Video Player ─────────────────────────────────────────────────────────────
function VideoPlayer({ chapter }) {
    const videoRef = useRef(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isBlackout, setIsBlackout] = useState(false);
    const videoUrl = getVideoUrl(chapter);
    const storageKey = `video_progress_${chapter?._id}`;

    // Security: Prevent Screenshots & Screen Recording
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey)) {
                setIsBlackout(true);
                setTimeout(() => setIsBlackout(false), 3000);
                try { navigator.clipboard.writeText('Screenshots are disabled for premium content.'); } catch (err) {}
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'PrintScreen') {
                setIsBlackout(true);
                setTimeout(() => setIsBlackout(false), 3000);
            }
        };

        const handleBlur = () => setIsBlackout(true);
        const handleFocus = () => setIsBlackout(false);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Reset on chapter change
    useEffect(() => {
        setError(false);
        setLoading(true);
        setPlaybackRate(1);
        if (videoRef.current) {
            videoRef.current.playbackRate = 1;
        }
    }, [chapter?._id]);

    const handleTimeUpdate = () => {
        if (videoRef.current && chapter?._id) {
            const currentTime = videoRef.current.currentTime;
            // Save progress if they have watched at least 5 seconds
            if (currentTime > 5) {
                localStorage.setItem(storageKey, currentTime.toString());
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current && chapter?._id) {
            const savedTime = localStorage.getItem(storageKey);
            if (savedTime) {
                videoRef.current.currentTime = parseFloat(savedTime);
            }
        }
    };
    const handleSpeedChange = (e) => {
        const speed = parseFloat(e.target.value);
        setPlaybackRate(speed);
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    };

    if (!videoUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <div className="text-5xl mb-3">🎬</div>
                    <p className="text-slate-300 font-medium">{chapter?.title}</p>
                    <p className="text-slate-500 text-sm mt-1">No video available for this chapter</p>
                </div>
            </div>
        );
    }

    // If it's a YouTube / external URL, use iframe
    const isExternal = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com');

    if (isExternal) {
        let embedUrl = videoUrl;
        if (videoUrl.includes('youtube.com/watch?v=')) {
            embedUrl = videoUrl.replace('watch?v=', 'embed/');
        } else if (videoUrl.includes('youtu.be/')) {
            embedUrl = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/');
        } else if (videoUrl.includes('vimeo.com/')) {
            const id = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
            embedUrl = `https://player.vimeo.com/video/${id}`;
        }
        return (
            <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={chapter?.title}
            />
        );
    }

    // Native HTML5 video player for uploaded files
    return (
        <div 
            className="relative w-full h-full bg-black group protected-content"
            onContextMenu={(e) => e.preventDefault()}
        >
            {isBlackout && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="text-4xl mb-3">🛡️</div>
                    <h3 className="text-xl font-bold">Screenshots Disabled</h3>
                    <p className="text-slate-400 mt-2">Screen recording and screenshots are not permitted for premium course content.</p>
                </div>
            )}
            
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/60 pointer-events-none">
                    <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900 text-white text-center p-6">
                    <div>
                        <div className="text-4xl mb-2">⚠️</div>
                        <p className="font-semibold">Could not load video</p>
                        <p className="text-slate-400 text-sm mt-1">The file may be missing or unsupported</p>
                    </div>
                </div>
            )}
            <video
                ref={videoRef}
                key={videoUrl}  // re-mount when source changes
                className={`w-full h-full ${isBlackout ? 'opacity-0' : 'opacity-100'}`}
                controls
                preload="metadata"
                controlsList="nodownload"
                crossOrigin="anonymous"
                onCanPlay={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
                onWaiting={() => setLoading(true)}
                onPlaying={() => setLoading(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            >
                <source src={videoUrl} type={chapter?.videoMimeType || 'video/mp4'} />
                <source src={videoUrl} type="video/webm" />
                <source src={videoUrl} type="video/ogg" />
                Your browser does not support the video tag.
            </video>

            {/* Custom Speed Control */}
            <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <select
                    value={playbackRate}
                    onChange={handleSpeedChange}
                    className="bg-black/70 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20 outline-none cursor-pointer backdrop-blur-md hover:bg-black/90 transition"
                    title="Playback Speed"
                >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x Normal</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={1.75}>1.75x</option>
                    <option value={2}>2x</option>
                </select>
            </div>
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
    const [activeTab, setActiveTab] = useState('chapters'); // chapters | resources | tests
    const [viewingPdfUrl, setViewingPdfUrl] = useState(null);
    const [accessInfo, setAccessInfo] = useState({ hasAccess: false, method: null, validUntil: null });
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    const fetchCourse = async () => {
        try {
            const { data } = await api.get(`/courses/${id}`);
            setCourse(data.data);
            setActiveChapter(prev => {
                if (prev) {
                    const updatedChapter = data.data.chapters?.find(c => c._id === prev._id);
                    return updatedChapter || data.data.chapters?.[0] || null;
                }
                return data.data.chapters?.[0] || null;
            });
        } catch { } finally { setLoading(false); }
    };

    const fetchAccess = async () => {
        if (!user) return;
        try {
            const { data } = await api.get(`/courses/${id}/access`);
            setAccessInfo({ hasAccess: data.hasAccess, method: data.method, validUntil: data.validUntil });
        } catch { }
    };

    useEffect(() => { 
        fetchCourse(); 
        fetchAccess();
    }, [id, user]);

    const handleEnrollClick = () => {
        if (!user) { navigate('/login'); return; }
        const hasActiveSub = user.subscription?.plan && user.subscription.plan !== 'None';
        if (hasActiveSub && course.price > 0) {
            setShowEnrollModal(true);
        } else {
            if (course.price > 0) {
                if (window.confirm(`Are you sure you want to purchase this course for $${couponData ? couponData.finalAmount : course.price}?`)) {
                    handleEnroll('purchase');
                }
            } else {
                handleEnroll('purchase');
            }
        }
    };

    const handleEnroll = async (enrollmentType = 'purchase') => {
        if (!user) { navigate('/login'); return; }
        setEnrolling(true);
        setShowEnrollModal(false);
        try {
            const finalPrice = couponData ? couponData.finalAmount : course.price;
            await api.post(`/courses/${id}/enroll`, { couponCode: couponData?.code || null, finalAmount: finalPrice, enrollmentType });
            await fetchCourse();
            await fetchAccess();
        } catch (err) { alert(err.response?.data?.message || 'Failed to enroll'); }
        finally { setEnrolling(false); }
    };

    if (loading) return <Layout><div className="p-8 text-center text-slate-500">Loading course details...</div></Layout>;
    if (!course) return <Layout><div className="p-8 text-center text-slate-500">Course not found</div></Layout>;

    const isEnrolled = accessInfo.hasAccess;
    const finalPrice = couponData ? couponData.finalAmount : course.price;
    const levels = course.levels?.length > 0 ? course.levels : [course.level].filter(Boolean);
    const sortedChapters = [...(course.chapters || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const totalDurationSecs = sortedChapters.reduce((s, ch) => s + (ch.duration || 0), 0);
    const hasResources = (course.resources || []).length > 0;
    const hasPracticeTests = (course.practiceTests || []).length > 0;

    // Chapters with free preview available even without enrollment
    const canWatchChapter = (chapter) => isEnrolled || chapter.isFree;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Video + Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* ── Video Player ── */}
                        <div className="bg-black rounded-2xl overflow-hidden aspect-video relative shadow-lg">
                            {activeChapter && canWatchChapter(activeChapter) ? (
                                <VideoPlayer
                                    chapter={activeChapter}
                                />
                            ) : activeChapter ? (
                                /* Locked video */
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
                                    <div className="text-center px-6">
                                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Enroll to Watch</h3>
                                        <p className="text-slate-400 text-sm mb-4">"{activeChapter.title}" is locked. Enroll to get full access.</p>
                                        <button onClick={handleEnrollClick} disabled={enrolling}
                                            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-60">
                                            {enrolling ? 'Enrolling...' : course.price > 0 ? `Enroll for $${finalPrice}` : 'Enroll Free'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* No chapters */
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                                    <div className="text-center">
                                        <div className="text-5xl mb-3">📚</div>
                                        <p className="text-slate-300 font-medium">No chapters yet</p>
                                        <p className="text-slate-500 text-sm mt-1">Content coming soon!</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Now playing bar */}
                        {activeChapter && isEnrolled && (
                            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-sm font-semibold text-indigo-800">Now Playing:</span>
                                <span className="text-sm text-indigo-700 truncate">{activeChapter.title}</span>
                                {activeChapter.duration > 0 && (
                                    <span className="ml-auto text-xs text-indigo-500 flex-shrink-0">⏱️ {formatDuration(activeChapter.duration)}</span>
                                )}
                                {activeChapter.pdfPath && (
                                    <button 
                                        onClick={() => setViewingPdfUrl(getPDFUrl(activeChapter.pdfPath))}
                                        className="flex-shrink-0 text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                                    >
                                        📄 PDF
                                    </button>
                                )}
                            </div>
                        )}

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
                                {totalDurationSecs > 0 && (
                                    <span className="ml-2 text-slate-400 text-sm">• ⏱️ {formatDuration(totalDurationSecs)} total</span>
                                )}
                            </div>

                            <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">{course.description}</p>

                            {course.whatYoullLearn?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-bold text-slate-800 mb-3">What You'll Learn</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {course.whatYoullLearn.map((item, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                    {/* Right: Enroll + Chapters/Resources/Tests */}
                    <div className="space-y-6">
                        {/* Enroll card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                            {isEnrolled ? (
                                <div className="text-center">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
                                    <p className="font-bold text-emerald-700 text-lg">You're Enrolled!</p>
                                    <p className="text-slate-500 text-sm mt-1">
                                        {accessInfo.method === 'subscription' && accessInfo.validUntil
                                            ? `Course valid till: ${new Date(accessInfo.validUntil).toLocaleDateString()}`
                                            : 'Life long access'}
                                    </p>
                                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <p className="font-bold text-slate-800">{sortedChapters.length}</p>
                                            <p className="text-xs text-slate-400">Chapters</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <p className="font-bold text-slate-800">{course.resources?.length || 0}</p>
                                            <p className="text-xs text-slate-400">Resources</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-2">
                                            <p className="font-bold text-slate-800">{course.practiceTests?.length || 0}</p>
                                            <p className="text-xs text-slate-400">Quizzes</p>
                                        </div>
                                    </div>
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
                                    <button onClick={handleEnrollClick} disabled={enrolling}
                                        className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-primary-500/30 disabled:opacity-70">
                                        {enrolling ? 'Enrolling...' : course.price > 0 ? `Enroll for $${finalPrice}` : 'Enroll Free'}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tab selector for right panel */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-slate-200">
                                <button onClick={() => setActiveTab('chapters')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition ${activeTab === 'chapters' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                    📖 Chapters
                                </button>
                                {hasResources && (
                                    <button onClick={() => setActiveTab('resources')}
                                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition ${activeTab === 'resources' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                        📎 Files
                                    </button>
                                )}
                                {hasPracticeTests && (
                                    <button onClick={() => setActiveTab('tests')}
                                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition ${activeTab === 'tests' ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                        📝 Quizzes
                                    </button>
                                )}
                            </div>

                            {/* Chapters tab */}
                            {activeTab === 'chapters' && (
                                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                                    {sortedChapters.length > 0 ? (
                                        sortedChapters.map((chapter, index) => {
                                            const canWatch = canWatchChapter(chapter);
                                            const isActive = activeChapter?._id === chapter._id;
                                            return (
                                                <button key={chapter._id}
                                                    onClick={() => canWatch && setActiveChapter(chapter)}
                                                    className={`w-full text-left p-4 transition flex items-start gap-3 ${isActive ? 'bg-primary-50 border-l-4 border-primary-500' : 'border-l-4 border-transparent hover:bg-slate-50'} ${!canWatch ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {isActive ? (
                                                            <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                            </div>
                                                        ) : canWatch ? (
                                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                            <p className={`font-medium text-sm ${isActive ? 'text-primary-700' : 'text-slate-700'}`}>
                                                                {index + 1}. {chapter.title}
                                                            </p>
                                                            {chapter.isFree && !isEnrolled && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">FREE</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {chapter.duration > 0 && (
                                                                <span className="text-xs text-slate-400">⏱️ {formatDuration(chapter.duration)}</span>
                                                            )}
                                                            {chapter.pdfPath && isEnrolled && (
                                                                <button onClick={(e) => { e.stopPropagation(); setViewingPdfUrl(getPDFUrl(chapter.pdfPath)); }}
                                                                    className="text-xs text-red-500 hover:underline">📄 Protected PDF</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="p-6 text-center text-sm text-slate-500">No chapters uploaded yet.</div>
                                    )}

                                    {/* Summary row */}
                                    {sortedChapters.length > 0 && (
                                        <div className="px-4 py-3 bg-slate-50 text-xs text-slate-500 flex items-center gap-3">
                                            <span>{sortedChapters.length} chapters</span>
                                            {totalDurationSecs > 0 && <span>• {formatDuration(totalDurationSecs)} total</span>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Resources tab */}
                            {activeTab === 'resources' && (
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {course.resources?.map(r => (
                                        <div key={r._id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition">
                                            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                                                {r.fileType === 'pdf' ? '📄' : r.fileType === 'ppt' || r.fileType === 'pptx' ? '📊' : '📎'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                                                <p className="text-xs text-slate-400">{r.fileType?.toUpperCase()}</p>
                                            </div>
                                            {isEnrolled ? (
                                                <button onClick={() => setViewingPdfUrl(getPDFUrl(r.filePath))}
                                                    className="text-xs px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 flex-shrink-0">
                                                    View Securely
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400 flex-shrink-0">🔒 Enroll</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Practice Tests tab */}
                            {activeTab === 'tests' && (
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {course.practiceTests?.map(test => (
                                        <div key={test._id || test} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition">
                                            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 flex-shrink-0 font-bold text-sm">
                                                📝
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                    {test.title || 'Practice Test'}
                                                </p>
                                                {test.subject && <p className="text-xs text-slate-400">{test.subject}</p>}
                                            </div>
                                            {isEnrolled && test._id ? (
                                                <a href={`/practice-tests/${test._id}/quiz`}
                                                    className="text-xs px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg font-medium hover:bg-violet-100 flex-shrink-0">
                                                    Start
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 flex-shrink-0">🔒 Enroll</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reviews Section — full width below */}
                <ReviewsSection courseId={id} isEnrolled={isEnrolled} user={user} onReviewUpdated={fetchCourse} />
            </div>

            {viewingPdfUrl && (
                <SecurePdfViewer 
                    url={viewingPdfUrl} 
                    onClose={() => setViewingPdfUrl(null)} 
                />
            )}
            {showEnrollModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">Choose Enrollment Option</h2>
                        <p className="text-sm text-slate-600 mb-6">
                            You have an active subscription! You can enroll for free as part of your subscription, or purchase it separately for lifetime access.
                        </p>
                        <div className="space-y-3">
                            <button onClick={() => { if (window.confirm('Are you sure you want to enroll in this course using your subscription?')) handleEnroll('subscription'); }} disabled={enrolling}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 transition text-left">
                                <div>
                                    <p className="font-bold text-primary-900">Enroll with Subscription</p>
                                    <p className="text-xs text-primary-700 mt-1">Free • Valid till subscription ends</p>
                                </div>
                                <div className="text-primary-600 text-xl">✨</div>
                            </button>
                            <button onClick={() => { if (window.confirm('Are you sure you want to purchase this course for lifetime access?')) handleEnroll('purchase'); }} disabled={enrolling}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left">
                                <div>
                                    <p className="font-bold text-slate-800">Purchase Separately</p>
                                    <p className="text-xs text-slate-500 mt-1">${finalPrice} • Lifetime access</p>
                                </div>
                                <div className="text-slate-400 text-xl">💳</div>
                            </button>
                        </div>
                        <div className="mt-6 text-center">
                            <button onClick={() => setShowEnrollModal(false)} className="text-sm text-slate-500 hover:text-slate-700 font-semibold">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CourseDetails;
