import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';

const typeIcons = { info: 'ℹ️', warning: '⚠️', success: '✅', alert: '🔔' };
const typeColors = { info: 'bg-blue-100 text-blue-700', warning: 'bg-yellow-100 text-yellow-700', success: 'bg-emerald-100 text-emerald-700', alert: 'bg-red-100 text-red-700' };
const roleColors = { all: 'bg-slate-100 text-slate-700', user: 'bg-sky-100 text-sky-700', seller: 'bg-indigo-100 text-indigo-700', admin: 'bg-purple-100 text-purple-700' };

function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ title: '', message: '', targetRole: 'all', type: 'info' });
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState('');

    const fetch = async () => {
        setLoading(true);
        api.get('/admin/notifications').then(r => setNotifications(r.data.data || [])).catch(console.error).finally(() => setLoading(false));
    };
    useEffect(() => { fetch(); }, []);

    const send = async e => {
        e.preventDefault(); setSending(true); setMsg('');
        try {
            await api.post('/admin/notifications', form);
            setForm({ title: '', message: '', targetRole: 'all', type: 'info' });
            setMsg('Notification sent!');
            fetch();
        } catch (err) { setMsg('Failed to send'); }
        finally { setSending(false); }
    };

    const del = async (id) => {
        try { await api.delete(`/admin/notifications/${id}`); fetch(); }
        catch { alert('Failed to delete'); }
    };

    return (
        <AdminLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
                    <p className="text-slate-500">Broadcast messages to users, sellers, or everyone</p>
                </div>

                {/* Send form */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">📢 Send New Notification</h2>
                    {msg && <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.includes('Failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{msg}</div>}
                    <form onSubmit={send} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
                                <input type="text" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} required placeholder="Notification title"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target</label>
                                    <select value={form.targetRole} onChange={e=>setForm(p=>({...p,targetRole:e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
                                        {['all','user','seller','admin'].map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none">
                                        {['info','warning','success','alert'].map(t=><option key={t} value={t}>{typeIcons[t]} {t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
                                <textarea value={form.message} onChange={e=>setForm(p=>({...p,message:e.target.value}))} required rows={3} placeholder="Notification message..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                            </div>
                        </div>
                        <button type="submit" disabled={sending} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-blue-700 transition">
                            {sending ? 'Sending...' : '📤 Send Notification'}
                        </button>
                    </form>
                </div>

                {/* History */}
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-slate-800">Sent Notifications ({notifications.length})</h2>
                    {loading ? <div className="text-center py-10 text-slate-400">Loading...</div>
                    : notifications.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                            <span className="text-4xl">🔔</span><p className="mt-2 text-sm">No notifications sent yet</p>
                        </div>
                    ) : notifications.map(n => (
                        <div key={n._id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between gap-4 hover:shadow-sm transition">
                            <div className="flex items-start gap-3">
                                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${typeColors[n.type]}`}>{typeIcons[n.type]}</span>
                                <div>
                                    <p className="font-bold text-slate-900">{n.title}</p>
                                    <p className="text-slate-500 text-sm mt-0.5">{n.message}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${roleColors[n.targetRole]}`}>→ {n.targetRole}</span>
                                        <span className="text-slate-400 text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => del(n._id)} className="text-red-400 hover:text-red-600 text-xs font-medium flex-shrink-0">Delete</button>
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
export default AdminNotifications;
