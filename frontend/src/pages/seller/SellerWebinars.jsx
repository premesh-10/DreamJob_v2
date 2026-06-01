import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../../lib/api';
import SellerLayout from '../../components/SellerLayout';

const EMPTY_FORM = {
    name: '', description: '', date: '', time: '', duration: 60,
    numberOfDays: 1, seatCapacity: 50, price: 0, category: 'General',
    meetingLink: '', recordingUrl: '', thumbnail: '', tags: '',
    timezone: 'Asia/Kolkata', language: 'English', level: 'All Levels'
};

const CATEGORIES = ['General', 'Technology', 'Business', 'Design', 'Marketing', 'Finance', 'Career', 'Health', 'Other'];
const LEVELS     = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const LANGUAGES  = ['English', 'Hindi', 'Tamil', 'Spanish', 'French', 'Other'];

function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function statusBadge(status) {
    const map = {
        upcoming:  'bg-blue-100 text-blue-700',
        live:      'bg-emerald-100 text-emerald-700',
        completed: 'bg-slate-100 text-slate-600',
        cancelled: 'bg-red-100 text-red-600'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${map[status] || 'bg-slate-100'}`}>{status}</span>;
}

export default function SellerWebinars() {
    const { user } = useSelector(s => s.auth);
    const [webinars, setWebinars]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [editId, setEditId]             = useState(null);
    const [form, setForm]                 = useState(EMPTY_FORM);
    const [saving, setSaving]             = useState(false);
    const [deleteConfirm, setDeleteConfirm]   = useState(null);
    const [cancelModal, setCancelModal]       = useState(null); // {id, name}
    const [cancelReason, setCancelReason]     = useState('');
    const [attendeeModal, setAttendeeModal]   = useState(null); // {name, registered, waitlist}
    const [loadingAttendees, setLoadingAttendees] = useState(false);

    useEffect(() => { fetchWebinars(); }, []);

    const fetchWebinars = async () => {
        try {
            const res = await api.get('/webinars/seller/mine');
            setWebinars(res.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setShowModal(true); };

    const openEdit = (w) => {
        setEditId(w._id);
        setForm({
            name: w.name, description: w.description || '',
            date: w.date?.slice(0, 10) || '', time: w.time || '',
            duration: w.duration, numberOfDays: w.numberOfDays,
            seatCapacity: w.seatCapacity, price: w.price || 0,
            category: w.category || 'General', meetingLink: w.meetingLink || '',
            recordingUrl: w.recordingUrl || '', thumbnail: w.thumbnail || '',
            tags: (w.tags || []).join(', '), timezone: w.timezone || 'Asia/Kolkata',
            language: w.language || 'English', level: w.level || 'All Levels'
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                duration: Number(form.duration), numberOfDays: Number(form.numberOfDays),
                seatCapacity: Number(form.seatCapacity), price: Number(form.price),
                tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
            };
            if (editId) {
                const res = await api.put(`/webinars/${editId}`, payload);
                setWebinars(prev => prev.map(w => w._id === editId ? { ...res.data.data, revenue: w.revenue, registeredCount: w.registeredCount, waitlistCount: w.waitlistCount } : w));
            } else {
                const res = await api.post('/webinars', payload);
                setWebinars(prev => [{ ...res.data.data, revenue: 0, registeredCount: 0, waitlistCount: 0 }, ...prev]);
            }
            setShowModal(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save webinar');
        } finally { setSaving(false); }
    };

    const handleCancel = async () => {
        try {
            await api.patch(`/webinars/${cancelModal.id}/cancel`, { reason: cancelReason });
            setWebinars(prev => prev.map(w => w._id === cancelModal.id ? { ...w, status: 'cancelled', isActive: false } : w));
            setCancelModal(null);
            setCancelReason('');
            alert('Webinar cancelled and refunds issued to paid registrants.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/webinars/${id}`);
            setWebinars(prev => prev.filter(w => w._id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    const openAttendees = async (w) => {
        setLoadingAttendees(true);
        setAttendeeModal({ name: w.name, registered: [], waitlist: [] });
        try {
            const res = await api.get(`/webinars/${w._id}/attendees`);
            setAttendeeModal({ name: w.name, ...res.data.data });
        } catch (err) {
            setAttendeeModal(null);
            alert(err.response?.data?.message || 'Failed to load attendees');
        } finally { setLoadingAttendees(false); }
    };

    // Stats
    const totalRevenue = webinars.reduce((a, w) => a + (w.revenue || 0), 0);
    const totalRegs    = webinars.reduce((a, w) => a + (w.registeredCount || 0), 0);

    const inp = "w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-sm";

    return (
        <SellerLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">My Webinars</h1>
                        <p className="text-slate-500 mt-1">Create and manage your live webinar sessions</p>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/25">
                        <span className="text-lg">+</span> Create Webinar
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Total', value: webinars.length, color: 'text-indigo-600' },
                        { label: 'Upcoming', value: webinars.filter(w => w.status === 'upcoming').length, color: 'text-blue-600' },
                        { label: 'Live', value: webinars.filter(w => w.status === 'live').length, color: 'text-emerald-600' },
                        { label: 'Registrations', value: totalRegs, color: 'text-violet-600' },
                        { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, color: 'text-emerald-600' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                            <p className="text-slate-500 text-xs font-medium">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading…</div>
                ) : webinars.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                        <div className="text-5xl mb-3">🎙️</div>
                        <p className="text-slate-700 font-semibold text-lg mb-1">No webinars yet</p>
                        <p className="text-slate-400 text-sm mb-5">Create your first webinar to start engaging your audience</p>
                        <button onClick={openCreate} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition">Create Webinar</button>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {['Webinar', 'Date & Time', 'Duration', 'Days', 'Seats', 'Waitlist', 'Revenue', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {webinars.map(w => (
                                        <tr key={w._id} className={`hover:bg-slate-50 transition ${!w.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-slate-900">{w.name}</p>
                                                <p className="text-xs text-slate-400">{w.category} · {w.level}</p>
                                                {w.price > 0 && <p className="text-xs text-indigo-600 font-medium mt-0.5">${w.price}/seat</p>}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <p className="font-medium text-slate-800">{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                <p className="text-xs text-slate-500">{formatTime(w.time)}</p>
                                            </td>
                                            <td className="px-4 py-4 text-slate-700">{w.duration} min</td>
                                            <td className="px-4 py-4 text-slate-700">{w.numberOfDays}</td>
                                            <td className="px-4 py-4">
                                                {/* Seat fill bar */}
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${w.seatsLeft === 0 ? 'bg-red-500' : w.seatsLeft < w.seatCapacity * 0.2 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                            style={{ width: `${Math.min(100, ((w.registeredCount || 0) / w.seatCapacity) * 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs text-slate-600 whitespace-nowrap">{w.seatsLeft}/{w.seatCapacity} left</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {w.waitlistCount > 0
                                                    ? <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{w.waitlistCount} waiting</span>
                                                    : <span className="text-xs text-slate-400">—</span>}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-emerald-700">${(w.revenue || 0).toFixed(2)}</td>
                                            <td className="px-4 py-4">{statusBadge(w.status)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => openEdit(w)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">Edit</button>
                                                    <button onClick={() => openAttendees(w)} className="text-slate-600 hover:text-slate-800 font-medium text-xs">Attendees</button>
                                                    {w.status !== 'cancelled' && w.status !== 'completed' && (
                                                        <button onClick={() => { setCancelModal({ id: w._id, name: w.name }); setCancelReason(''); }}
                                                            className="text-amber-600 hover:text-amber-800 font-medium text-xs">Cancel</button>
                                                    )}
                                                    {w.registeredCount === 0 && (
                                                        <button onClick={() => setDeleteConfirm(w._id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">{editId ? 'Edit Webinar' : 'Create Webinar'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Webinar Name *</label>
                                    <input required className={inp} placeholder="e.g. Mastering React in 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea rows={3} className={inp} placeholder="What will attendees learn?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                                        <input required type="date" className={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
                                        <input required type="time" className={inp} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min) *</label>
                                        <input required type="number" min={1} className={inp} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Number of Days *</label>
                                        <input required type="number" min={1} className={inp} value={form.numberOfDays} onChange={e => setForm(f => ({ ...f, numberOfDays: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Seat Capacity *</label>
                                        <input required type="number" min={1} className={inp} value={form.seatCapacity} onChange={e => setForm(f => ({ ...f, seatCapacity: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price ($) — 0 for free</label>
                                        <input type="number" min={0} step={0.01} className={inp} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                                        {editId && form.price !== webinars.find(w=>w._id===editId)?.price && (
                                            <p className="text-xs text-amber-600 mt-1">⚠️ Price cannot be changed after users register</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                        <select className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                                        <select className={inp} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                                            {LEVELS.map(l => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                                        <select className={inp} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                                            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link <span className="text-slate-400 font-normal">(shared with registered users only)</span></label>
                                    <input type="url" className={inp} placeholder="https://meet.google.com/…" value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Recording URL <span className="text-slate-400 font-normal">(add after webinar ends)</span></label>
                                    <input type="url" className={inp} placeholder="https://youtube.com/…" value={form.recordingUrl} onChange={e => setForm(f => ({ ...f, recordingUrl: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL</label>
                                    <input type="url" className={inp} placeholder="https://…" value={form.thumbnail} onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
                                    <input className={inp} placeholder="react, frontend, javascript" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition">
                                        {saving ? 'Saving…' : (editId ? 'Update Webinar' : 'Create Webinar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Cancel Webinar</h3>
                        <p className="text-slate-500 text-sm mb-4">"{cancelModal.name}"</p>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm mb-4">
                            ⚠️ All paid registrants will be automatically refunded to their wallets.
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason</label>
                            <textarea rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400"
                                placeholder="e.g. Host unavailable, technical issues…"
                                value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">Back</button>
                            <button onClick={handleCancel} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Confirm Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendees Modal */}
            {attendeeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Attendees</h3>
                                <p className="text-xs text-slate-400">{attendeeModal.name}</p>
                            </div>
                            <button onClick={() => setAttendeeModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        {loadingAttendees ? (
                            <div className="py-10 text-center text-slate-400">Loading…</div>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 mb-2">✅ Registered ({attendeeModal.registeredUsers?.length || 0})</p>
                                    {(attendeeModal.registeredUsers || []).length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-4">No registrations yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {attendeeModal.registeredUsers.map((u, i) => (
                                                <div key={u._id || i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">{u.name?.charAt(0)?.toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {(attendeeModal.waitlist || []).length > 0 && (
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 mb-2">⏳ Waitlist ({attendeeModal.waitlist.length})</p>
                                        <div className="space-y-2">
                                            {attendeeModal.waitlist.map((u, i) => (
                                                <div key={u._id || i} className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">{u.name?.charAt(0)?.toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                    <span className="ml-auto text-xs text-amber-600 font-medium">#{i + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="text-4xl mb-3">🗑️</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Webinar?</h3>
                        <p className="text-slate-500 text-sm mb-6">This action is permanent and cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </SellerLayout>
    );
}
