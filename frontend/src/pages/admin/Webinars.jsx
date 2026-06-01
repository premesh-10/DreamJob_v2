import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';
import ExportButtons from '../../components/ExportButtons';

const STATUS_OPTIONS = ['upcoming', 'live', 'completed', 'cancelled'];

const statusBadge = (status) => {
    const map = {
        upcoming: 'bg-blue-100 text-blue-700',
        live: 'bg-emerald-100 text-emerald-700',
        completed: 'bg-slate-100 text-slate-600',
        cancelled: 'bg-red-100 text-red-600'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${map[status] || 'bg-slate-100'}`}>{status}</span>;
};

export default function AdminWebinars() {
    const [webinars, setWebinars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selected, setSelected] = useState(null); // webinar being edited in modal
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [cancelModal, setCancelModal] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    useEffect(() => { fetchWebinars(); }, []);

    const fetchWebinars = async () => {
        try {
            const res = await api.get('/admin/webinars');
            setWebinars(res.data.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (w) => {
        setSelected(w);
        setEditForm({
            name: w.name,
            description: w.description || '',
            date: w.date ? w.date.slice(0, 10) : '',
            time: w.time || '',
            duration: w.duration,
            numberOfDays: w.numberOfDays,
            seatCapacity: w.seatCapacity,
            price: w.price || 0,
            category: w.category || 'General',
            meetingLink: w.meetingLink || '',
            recordingUrl: w.recordingUrl || '',
            status: w.status,
            isActive: w.isActive,
            isFeatured: w.isFeatured
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put(`/admin/webinars/${selected._id}`, {
                ...editForm,
                duration: Number(editForm.duration),
                numberOfDays: Number(editForm.numberOfDays),
                seatCapacity: Number(editForm.seatCapacity),
                price: Number(editForm.price)
            });
            setWebinars(prev => prev.map(w => w._id === selected._id ? { ...res.data.data, seatsLeft: Math.max(0, res.data.data.seatCapacity - (res.data.data.registeredUsers?.length || 0)), registeredCount: res.data.data.registeredUsers?.length || 0 } : w));
            setSelected(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update webinar');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (id, field, value) => {
        try {
            const res = await api.patch(`/admin/webinars/${id}/toggle`, { field, value });
            setWebinars(prev => prev.map(w => w._id === id ? { ...w, [field]: value } : w));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update');
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/admin/webinars/${id}`);
            setWebinars(prev => prev.filter(w => w._id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleAdminCancel = async () => {
        try {
            await api.patch(`/admin/webinars/${cancelModal.id}/cancel`, { reason: cancelReason });
            setWebinars(prev => prev.map(w => w._id === cancelModal.id ? { ...w, status: 'cancelled', isActive: false } : w));
            setCancelModal(null);
            setCancelReason('');
            alert('Webinar cancelled. Refunds issued to all paid registrants.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel');
        }
    };

    const filtered = webinars.filter(w => {
        const q = search.toLowerCase();
        const matchSearch = w.name?.toLowerCase().includes(q) || w.seller?.name?.toLowerCase().includes(q);
        const matchStatus = filterStatus === 'all' || w.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const inp = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-800";

    // Stats
    const stats = [
        { label: 'Total Webinars', value: webinars.length, icon: '🎙️', color: 'text-blue-600' },
        { label: 'Upcoming', value: webinars.filter(w => w.status === 'upcoming').length, icon: '📅', color: 'text-indigo-600' },
        { label: 'Live Now', value: webinars.filter(w => w.status === 'live').length, icon: '🔴', color: 'text-emerald-600' },
        { label: 'Total Registrations', value: webinars.reduce((a, w) => a + (w.registeredCount || 0), 0), icon: '👥', color: 'text-violet-600' },
        { label: 'Total Revenue', value: `$${webinars.reduce((a, w) => a + (w.revenue || 0), 0).toFixed(2)}`, icon: '💰', color: 'text-emerald-600' },
        { label: 'On Waitlists', value: webinars.reduce((a, w) => a + (w.waitlistCount || 0), 0), icon: '⏳', color: 'text-amber-600' },
    ];

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Webinar Management</h1>
                        <p className="text-slate-500 mt-1">Monitor, manage and control all webinars on the platform</p>
                    </div>
                    <ExportButtons
                        data={webinars}
                        filename="Webinars_Report"
                        columns={[
                            { header: 'Name', key: 'name' },
                            { header: 'Seller', key: 'seller', format: v => v?.name || '' },
                            { header: 'Date', key: 'date', format: v => new Date(v).toLocaleDateString() },
                            { header: 'Time', key: 'time' },
                            { header: 'Duration (min)', key: 'duration' },
                            { header: 'Days', key: 'numberOfDays' },
                            { header: 'Capacity', key: 'seatCapacity' },
                            { header: 'Registrations', key: 'registeredCount' },
                            { header: 'Status', key: 'status' },
                            { header: 'Active', key: 'isActive', format: v => v ? 'Yes' : 'No' },
                        ]}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map(s => (
                        <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <div className="text-2xl mb-1">{s.icon}</div>
                            <p className="text-slate-500 text-xs font-medium">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search by name or seller…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 min-w-[200px] px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-400"
                    />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-400">
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading webinars…</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-4xl mb-2">🎙️</div>
                                <p className="text-slate-500 font-medium">No webinars found</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {['Webinar', 'Seller', 'Date & Time', 'Duration', 'Days', 'Seats Left', 'Waitlist', 'Revenue', 'Status', 'Active', 'Featured', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map(w => (
                                        <tr key={w._id} className={`hover:bg-slate-50 transition ${!w.isActive ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-4 max-w-[160px]">
                                                <p className="font-semibold text-slate-900 truncate">{w.name}</p>
                                                <p className="text-xs text-slate-400">{w.category}</p>
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{w.seller?.name || '—'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <p className="text-slate-800 font-medium">{new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                <p className="text-xs text-slate-400">{w.time}</p>
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{w.duration} min</td>
                                            <td className="px-4 py-4 text-slate-600">{w.numberOfDays}</td>
                                            <td className="px-4 py-4">
                                                <span className={`font-semibold ${w.seatsLeft === 0 ? 'text-red-600' : w.seatsLeft < w.seatCapacity * 0.2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {w.seatsLeft}
                                                </span>
                                                <span className="text-slate-400 text-xs"> / {w.seatCapacity}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, ((w.registeredCount || 0) / w.seatCapacity) * 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs text-slate-600">{w.registeredCount || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {w.waitlistCount > 0
                                                    ? <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{w.waitlistCount}</span>
                                                    : <span className="text-slate-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-emerald-700 whitespace-nowrap">${(w.revenue || 0).toFixed(2)}</td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={w.status}
                                                    onChange={e => handleToggle(w._id, 'status', e.target.value)}
                                                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-400 bg-white text-slate-700"
                                                >
                                                    {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggle(w._id, 'isActive', !w.isActive)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${w.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${w.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleToggle(w._id, 'isFeatured', !w.isFeatured)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${w.isFeatured ? 'bg-amber-400' : 'bg-slate-300'}`}>
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${w.isFeatured ? 'translate-x-4' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => openEdit(w)} className="text-blue-600 hover:text-blue-800 font-medium text-xs whitespace-nowrap">Edit</button>
                                                    {w.status !== 'cancelled' && w.status !== 'completed' && (
                                                        <button onClick={() => { setCancelModal({ id: w._id, name: w.name }); setCancelReason(''); }} className="text-amber-600 hover:text-amber-800 font-medium text-xs">Cancel</button>
                                                    )}
                                                    <button onClick={() => setDeleteConfirm(w._id)} className="text-red-500 hover:text-red-700 font-medium text-xs">Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {selected && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Edit Webinar</h2>
                                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                            </div>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Webinar Name</label>
                                    <input className={inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea rows={2} className={inp} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                        <input type="date" className={inp} value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                                        <input type="time" className={inp} value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                                        <input type="number" min={1} className={inp} value={editForm.duration} onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Number of Days</label>
                                        <input type="number" min={1} className={inp} value={editForm.numberOfDays} onChange={e => setEditForm(f => ({ ...f, numberOfDays: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Seat Capacity</label>
                                        <input type="number" min={1} className={inp} value={editForm.seatCapacity} onChange={e => setEditForm(f => ({ ...f, seatCapacity: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                                        <input type="number" min={0} step={0.01} className={inp} value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select className={inp} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link</label>
                                    <input type="url" className={inp} placeholder="https://meet.google.com/..." value={editForm.meetingLink} onChange={e => setEditForm(f => ({ ...f, meetingLink: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Recording URL <span className="text-slate-400 font-normal">(add after webinar ends)</span></label>
                                    <input type="url" className={inp} placeholder="https://youtube.com/..." value={editForm.recordingUrl || ''} onChange={e => setEditForm(f => ({ ...f, recordingUrl: e.target.value }))} />
                                </div>
                                <div className="flex items-center gap-6 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
                                        <span className="text-sm font-medium text-slate-700">Active (visible to users)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={editForm.isFeatured} onChange={e => setEditForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                                        <span className="text-sm font-medium text-slate-700">Featured</span>
                                    </label>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setSelected(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
                                        {saving ? 'Saving…' : 'Save Changes'}
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
                                placeholder="e.g. Technical issues, host unavailable…"
                                value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">Back</button>
                            <button onClick={handleAdminCancel} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Confirm Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="text-4xl mb-3">⚠️</div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Webinar?</h3>
                        <p className="text-slate-500 text-sm mb-6">This action cannot be undone. All registrations will be lost.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
