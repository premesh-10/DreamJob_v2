import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

const CATEGORIES = ['All'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];

// Format time nicely e.g. "14:30" → "2:30 PM"
function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Format date
function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Countdown timer
function useCountdown(date, time) {
    const [diff, setDiff] = useState(null);
    useEffect(() => {
        const calc = () => {
            if (!date || !time) return;
            const [h, m] = time.split(':').map(Number);
            const target = new Date(date);
            target.setHours(h, m, 0, 0);
            const delta = target - new Date();
            setDiff(delta > 0 ? delta : 0);
        };
        calc();
        const t = setInterval(calc, 1000);
        return () => clearInterval(t);
    }, [date, time]);

    if (diff === null || diff <= 0) return null;
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
}

function StatusBadge({ status }) {
    const map = {
        upcoming:  { cls: 'bg-blue-100 text-blue-700',     label: 'Upcoming' },
        live:      { cls: 'bg-emerald-100 text-emerald-700 animate-pulse', label: '🔴 LIVE' },
        completed: { cls: 'bg-slate-100 text-slate-500',   label: 'Ended' },
        cancelled: { cls: 'bg-red-100 text-red-600',       label: 'Cancelled' },
    };
    const s = map[status] || { cls: 'bg-slate-100 text-slate-500', label: status };
    return <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function SeatsBar({ left, capacity }) {
    const pct = capacity > 0 ? Math.min(100, ((capacity - left) / capacity) * 100) : 0;
    const color = left === 0 ? 'bg-red-500' : left < capacity * 0.2 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span className={`font-semibold ${left === 0 ? 'text-red-600' : left < capacity * 0.2 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {left === 0 ? 'Full' : `${left} seats left`}
                </span>
                <span>{capacity} total</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function WebinarCard({ w, onRegister, onUnregister, registering, myRegs, myWaitlist, onOpen }) {
    const countdown = useCountdown(w.date, w.time);
    const isRegistered = myRegs.has(w._id);
    const isWaitlisted = myWaitlist.has(w._id);
    const isFull = w.seatsLeft <= 0;
    const isCancelled = w.status === 'cancelled';
    const isEnded = w.status === 'completed';

    return (
        <div className={`group bg-white rounded-2xl shadow-sm border hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden
            ${isCancelled ? 'border-red-200 opacity-75' : isRegistered ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200'}`}>
            {/* Thumbnail */}
            <div className="relative h-40 overflow-hidden flex-shrink-0">
                {w.thumbnail ? (
                    <img src={w.thumbnail} alt={w.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center
                        ${w.isFeatured ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500'
                        : 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600'}`}>
                        <span className="text-6xl drop-shadow">🎙️</span>
                    </div>
                )}
                {/* Overlays */}
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <StatusBadge status={w.status} />
                    {w.isFeatured && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white">⭐ Featured</span>}
                </div>
                <div className="absolute top-3 right-3">
                    {w.price > 0
                        ? <span className="bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full shadow">${w.price}</span>
                        : <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Free</span>
                    }
                </div>
                {/* Countdown */}
                {countdown && !isCancelled && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/80 to-transparent px-3 py-2">
                        <p className="text-white text-xs font-medium">⏱ Starts in <span className="font-bold">{countdown}</span></p>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{w.category}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{w.level}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5 line-clamp-2 group-hover:text-indigo-700 transition">{w.name}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2 flex-1">{w.description}</p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><span>📅</span>{formatDate(w.date)}</span>
                    <span className="flex items-center gap-1"><span>🕐</span>{formatTime(w.time)}</span>
                    <span className="flex items-center gap-1"><span>⏱️</span>{w.duration} min</span>
                    <span className="flex items-center gap-1"><span>📆</span>{w.numberOfDays} day{w.numberOfDays > 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1 col-span-2"><span>👤</span>by <span className="font-medium text-slate-700 ml-0.5">{w.seller?.name}</span>
                        <span className="ml-auto text-slate-400">{w.language}</span>
                    </span>
                </div>

                <SeatsBar left={w.seatsLeft} capacity={w.seatCapacity} />
                {w.waitlistCount > 0 && !isRegistered && (
                    <p className="text-xs text-amber-600 mt-1">{w.waitlistCount} on waitlist</p>
                )}

                {/* Recording badge for completed */}
                {isEnded && w.recordingUrl && (
                    <a href={w.recordingUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 font-semibold hover:text-violet-800">
                        <span>▶️</span> Watch Recording
                    </a>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => onOpen(w)} className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition">Details</button>
                    <div className="flex-1" />
                    {isCancelled ? (
                        <span className="px-3 py-1.5 bg-red-50 text-red-400 text-xs font-bold rounded-lg">Cancelled</span>
                    ) : isEnded ? (
                        isRegistered && w.meetingLink ? (
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg">Ended</span>
                        ) : null
                    ) : isRegistered ? (
                        <button onClick={() => onUnregister(w._id)} disabled={registering === w._id}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-60 transition">
                            {registering === w._id ? '…' : '✓ Registered'}
                        </button>
                    ) : isWaitlisted ? (
                        <button onClick={() => onUnregister(w._id)} disabled={registering === w._id}
                            className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-60 transition">
                            {registering === w._id ? '…' : '⏳ Waitlisted'}
                        </button>
                    ) : (
                        <button onClick={() => onRegister(w)} disabled={registering === w._id}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg disabled:opacity-60 transition
                                ${isFull ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                            {registering === w._id ? '…' : isFull ? '+ Waitlist' : 'Register'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailModal({ w, onClose, isRegistered, isWaitlisted, onRegister, onUnregister, registering }) {
    const countdown = useCountdown(w.date, w.time);
    const isFull = w.seatsLeft <= 0;
    const isCancelled = w.status === 'cancelled';
    const isEnded = w.status === 'completed';

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header image */}
                <div className="relative h-44 flex-shrink-0 rounded-t-3xl overflow-hidden">
                    {w.thumbnail
                        ? <img src={w.thumbnail} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center"><span className="text-7xl">🎙️</span></div>
                    }
                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/50 text-lg">&times;</button>
                    {countdown && <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                        <p className="text-white text-sm font-medium">⏱ Starts in <span className="font-bold">{countdown}</span></p>
                    </div>}
                </div>

                <div className="p-7 space-y-5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{w.category}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{w.level}</span>
                        </div>
                        <StatusBadge status={w.status} />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{w.name}</h2>
                        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{w.description}</p>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { icon: '📅', label: 'Date',      val: formatDate(w.date) },
                            { icon: '🕐', label: 'Time',      val: formatTime(w.time) },
                            { icon: '⏱️', label: 'Duration', val: `${w.duration} min` },
                            { icon: '📆', label: 'Days',      val: `${w.numberOfDays} day${w.numberOfDays > 1 ? 's' : ''}` },
                            { icon: '👤', label: 'Host',      val: w.seller?.name },
                            { icon: '💰', label: 'Price',     val: w.price > 0 ? `$${w.price}` : 'Free' },
                            { icon: '🌐', label: 'Language',  val: w.language },
                            { icon: '📊', label: 'Level',     val: w.level },
                        ].map(m => (
                            <div key={m.label} className="bg-slate-50 rounded-xl p-3">
                                <p className="text-xs text-slate-400 mb-0.5">{m.icon} {m.label}</p>
                                <p className="font-semibold text-slate-800 text-sm">{m.val}</p>
                            </div>
                        ))}
                    </div>

                    <SeatsBar left={w.seatsLeft} capacity={w.seatCapacity} />
                    {w.waitlistCount > 0 && <p className="text-xs text-amber-600 font-medium">{w.waitlistCount} people on the waitlist</p>}

                    {/* Tags */}
                    {w.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {w.tags.map(t => <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{t}</span>)}
                        </div>
                    )}

                    {/* Recording for completed */}
                    {isEnded && w.recordingUrl && (
                        <a href={w.recordingUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-700 font-semibold text-sm hover:bg-violet-100 transition">
                            ▶️ Watch Recording
                        </a>
                    )}

                    {/* Cancellation notice */}
                    {isCancelled && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            <p className="font-bold mb-0.5">❌ Webinar Cancelled</p>
                            {w.cancellationReason && <p className="text-xs">{w.cancellationReason}</p>}
                            {w.refundIssued && <p className="text-xs text-emerald-600 mt-1">✓ Refunds have been issued</p>}
                        </div>
                    )}

                    {/* Meeting link (only for registered) */}
                    {isRegistered && w.meetingLink && !isEnded && !isCancelled && (
                        <a href={w.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition">
                            🔗 Join Meeting
                        </a>
                    )}

                    {/* CTA */}
                    {!isCancelled && !isEnded && (
                        isRegistered ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium text-center">
                                    ✅ You are registered for this webinar!
                                </div>
                                <button onClick={() => { onUnregister(w._id); onClose(); }} disabled={registering === w._id}
                                    className="w-full py-2 text-red-500 text-sm font-medium hover:text-red-700 transition">
                                    Cancel my registration
                                </button>
                            </div>
                        ) : isWaitlisted ? (
                            <div className="space-y-2">
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium text-center">
                                    ⏳ You're on the waitlist. We'll notify you if a seat opens!
                                </div>
                                <button onClick={() => { onUnregister(w._id); onClose(); }} disabled={registering === w._id}
                                    className="w-full py-2 text-slate-500 text-sm font-medium hover:text-red-600 transition">
                                    Leave waitlist
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => onRegister(w)} disabled={registering === w._id}
                                className={`w-full py-3 font-bold rounded-xl disabled:opacity-60 transition text-sm
                                    ${isFull ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'}`}>
                                {registering === w._id ? 'Processing…' : isFull
                                    ? '+ Join Waitlist'
                                    : `Register Now${w.price > 0 ? ` — $${w.price}` : ' — Free'}`}
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Webinars() {
    const { user } = useSelector(s => s.auth);
    const [webinars, setWebinars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [level, setLevel] = useState('All');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [registering, setRegistering] = useState(null);
    const [myRegs, setMyRegs]         = useState(new Set());
    const [myWaitlist, setMyWaitlist] = useState(new Set());
    const [toast, setToast] = useState(null);
    const [tab, setTab] = useState('browse'); // 'browse' | 'mine'
    const [myWebinars, setMyWebinars] = useState({ registered: [], waitlisted: [] });

    const cats = ['All', ...Array.from(new Set(webinars.map(w => w.category))).filter(Boolean)];

    useEffect(() => {
        fetchWebinars();
        if (user) fetchMyRegs();
    }, [user]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchWebinars = async () => {
        try {
            const res = await api.get('/webinars');
            setWebinars(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchMyRegs = async () => {
        try {
            const res = await api.get('/webinars/my-registrations');
            const { registered = [], waitlisted = [] } = res.data.data || {};
            setMyRegs(new Set(registered.map(w => w._id)));
            setMyWaitlist(new Set(waitlisted.map(w => w._id)));
            setMyWebinars({ registered, waitlisted });
        } catch (e) { }
    };

    const handleRegister = async (w) => {
        if (!user) { showToast('Please log in to register', 'error'); return; }
        setRegistering(w._id);
        try {
            const res = await api.post(`/webinars/${w._id}/register`);
            const { status: regStatus, meetingLink, waitlistPosition, amountPaid } = res.data;
            if (regStatus === 'waitlisted') {
                setMyWaitlist(prev => new Set([...prev, w._id]));
                showToast(`Added to waitlist — position #${waitlistPosition}`);
            } else {
                setMyRegs(prev => new Set([...prev, w._id]));
                // Update local seat count
                setWebinars(prev => prev.map(x => x._id === w._id ? { ...x, seatsLeft: Math.max(0, x.seatsLeft - 1), registeredCount: (x.registeredCount || 0) + 1 } : x));
                showToast(amountPaid > 0 ? `Registered! $${amountPaid} deducted from wallet.` : 'Successfully registered! Check your meeting link.');
            }
            if (selected?._id === w._id) setSelected(prev => ({ ...prev, isRegistered: true, seatsLeft: Math.max(0, prev.seatsLeft - 1), meetingLink: meetingLink || prev.meetingLink }));
            fetchMyRegs();
        } catch (err) {
            showToast(err.response?.data?.message || 'Registration failed', 'error');
        } finally { setRegistering(null); }
    };

    const handleUnregister = async (id) => {
        setRegistering(id);
        try {
            const res = await api.delete(`/webinars/${id}/register`);
            setMyRegs(prev => { const s = new Set(prev); s.delete(id); return s; });
            setMyWaitlist(prev => { const s = new Set(prev); s.delete(id); return s; });
            setWebinars(prev => prev.map(x => x._id === id ? { ...x, seatsLeft: x.seatsLeft + 1 } : x));
            showToast(res.data.message || 'Unregistered');
            fetchMyRegs();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to unregister', 'error');
        } finally { setRegistering(null); }
    };

    const filtered = webinars.filter(w => {
        const q = search.toLowerCase();
        return (w.name?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q) || w.seller?.name?.toLowerCase().includes(q))
            && (category === 'All' || w.category === category)
            && (level === 'All' || w.level === level)
            && (statusFilter === 'all' || w.status === statusFilter);
    });

    const featured = filtered.filter(w => w.isFeatured && w.status !== 'cancelled');
    const regular  = filtered.filter(w => !w.isFeatured || w.status === 'cancelled');

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Toast */}
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-center gap-2 transition-all
                        ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                        {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
                    </div>
                )}

                {/* Hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-10 text-white shadow-2xl">
                    <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="relative flex items-center justify-between flex-wrap gap-6">
                        <div>
                            <div className="text-5xl mb-3">🎙️</div>
                            <h1 className="text-4xl font-bold mb-2">Live Webinars</h1>
                            <p className="text-indigo-200 text-lg max-w-md">Join expert-led live sessions and level up your skills in real-time</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            {[
                                { val: webinars.filter(w => w.status === 'live').length,     label: 'Live Now',     icon: '🔴' },
                                { val: webinars.filter(w => w.status === 'upcoming').length, label: 'Upcoming',    icon: '📅' },
                                { val: webinars.filter(w => w.isFeatured).length,            label: 'Featured',    icon: '⭐' },
                                { val: webinars.filter(w => w.price === 0).length,           label: 'Free',        icon: '🎁' },
                            ].map(s => (
                                <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3">
                                    <p className="text-2xl font-bold">{s.icon} {s.val}</p>
                                    <p className="text-indigo-200 text-xs mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                {user && (
                    <div className="flex gap-2 border-b border-slate-200">
                        {[{ id: 'browse', label: 'Browse All' }, { id: 'mine', label: `My Webinars (${myRegs.size + myWaitlist.size})` }].map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`pb-2 px-4 text-sm font-semibold border-b-2 transition ${tab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* MY WEBINARS TAB */}
                {tab === 'mine' && user && (
                    <div className="space-y-8">
                        {/* Registered */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-4">✅ Registered ({myWebinars.registered.length})</h2>
                            {myWebinars.registered.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm">You haven't registered for any webinars yet.</p>
                                    <button onClick={() => setTab('browse')} className="mt-2 text-indigo-600 font-semibold text-sm hover:underline">Browse webinars →</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {myWebinars.registered.map(w => (
                                        <WebinarCard key={w._id} w={w} onRegister={handleRegister} onUnregister={handleUnregister}
                                            registering={registering} myRegs={myRegs} myWaitlist={myWaitlist} onOpen={setSelected} />
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Waitlisted */}
                        {myWebinars.waitlisted.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-4">⏳ Waitlisted ({myWebinars.waitlisted.length})</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {myWebinars.waitlisted.map(w => (
                                        <WebinarCard key={w._id} w={w} onRegister={handleRegister} onUnregister={handleUnregister}
                                            registering={registering} myRegs={myRegs} myWaitlist={myWaitlist} onOpen={setSelected} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* BROWSE TAB */}
                {tab === 'browse' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search webinars, hosts…"
                                className="flex-1 min-w-[200px] px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-400 text-sm" />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-400">
                                <option value="all">All Statuses</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="live">Live Now</option>
                                <option value="completed">Ended</option>
                            </select>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-400">
                                {LEVELS.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* Category pills */}
                        <div className="flex flex-wrap gap-2">
                            {cats.map(c => (
                                <button key={c} onClick={() => setCategory(c)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition
                                        ${category === c ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-slate-100" />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-5xl mb-3">🔍</div>
                                <p className="text-slate-600 font-semibold text-lg">No webinars match your filters</p>
                                <button onClick={() => { setSearch(''); setCategory('All'); setLevel('All'); setStatusFilter('all'); }}
                                    className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Clear filters</button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Featured section */}
                                {featured.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">⭐ Featured Webinars</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {featured.map(w => (
                                                <WebinarCard key={w._id} w={w} onRegister={handleRegister} onUnregister={handleUnregister}
                                                    registering={registering} myRegs={myRegs} myWaitlist={myWaitlist} onOpen={setSelected} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {regular.length > 0 && (
                                    <div>
                                        {featured.length > 0 && <h2 className="text-lg font-bold text-slate-800 mb-4">All Webinars</h2>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {regular.map(w => (
                                                <WebinarCard key={w._id} w={w} onRegister={handleRegister} onUnregister={handleUnregister}
                                                    registering={registering} myRegs={myRegs} myWaitlist={myWaitlist} onOpen={setSelected} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <DetailModal
                    w={selected}
                    onClose={() => setSelected(null)}
                    isRegistered={myRegs.has(selected._id)}
                    isWaitlisted={myWaitlist.has(selected._id)}
                    onRegister={handleRegister}
                    onUnregister={handleUnregister}
                    registering={registering}
                />
            )}
        </Layout>
    );
}
