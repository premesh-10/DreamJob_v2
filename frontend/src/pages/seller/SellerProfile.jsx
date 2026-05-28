import { useState, useEffect } from 'react';
import SellerLayout from '../../components/SellerLayout';
import api from '../../lib/api';

function SellerProfile() {
    const [seller, setSeller] = useState(null);
    const [form, setForm] = useState({ bio: '', profilePic: '', expertise: '', socialLinks: { linkedin: '', github: '', website: '' } });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/sellers/me').then(r => {
            const d = r.data.data;
            setSeller(d);
            setForm({
                bio: d.bio || '',
                profilePic: d.profilePic || '',
                expertise: (d.expertise || []).join(', '),
                socialLinks: {
                    linkedin: d.socialLinks?.linkedin || '',
                    github: d.socialLinks?.github || '',
                    website: d.socialLinks?.website || ''
                }
            });
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSocial = e => setForm(p => ({ ...p, socialLinks: { ...p.socialLinks, [e.target.name]: e.target.value } }));

    const save = async e => {
        e.preventDefault(); setSaving(true); setMsg(''); setError('');
        try {
            const payload = {
                ...form,
                expertise: form.expertise.split(',').map(s => s.trim()).filter(Boolean)
            };
            await api.put('/sellers/me', payload);
            setMsg('Profile updated successfully!');
        } catch (err) { setError(err?.response?.data?.message || 'Failed to save profile'); }
        finally { setSaving(false); }
    };

    const statusColors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

    if (loading) return <SellerLayout><div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></SellerLayout>;

    return (
        <SellerLayout>
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Profile Settings</h1>
                    <p className="text-slate-500 mt-1">Manage your seller profile and public information</p>
                </div>

                {msg && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">{msg}</div>}
                {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

                {/* Read-only account info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="font-bold text-slate-900 mb-4">Account Information</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {[
                            { label: 'Name', value: seller?.user?.name },
                            { label: 'Email', value: seller?.user?.email },
                            { label: 'Content Type', value: seller?.contentType },
                            { label: 'Application Status', value: <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[seller?.status]}`}>{seller?.status}</span> },
                        ].map(item => (
                            <div key={item.label}>
                                <p className="text-slate-400 text-xs mb-0.5">{item.label}</p>
                                <p className="font-semibold text-slate-800">{item.value || '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editable profile */}
                <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <h2 className="font-bold text-slate-900">Public Profile</h2>

                    <div className="flex gap-4 items-start">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 overflow-hidden">
                            {form.profilePic ? <img src={form.profilePic} alt="Profile" className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} /> : seller?.user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Profile Picture URL</label>
                            <input type="url" name="profilePic" value={form.profilePic} onChange={handleChange}
                                placeholder="https://example.com/your-photo.jpg"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio</label>
                        <textarea name="bio" value={form.bio} onChange={handleChange} rows={4}
                            placeholder="Tell students about your experience, background, and teaching style..."
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Areas of Expertise</label>
                        <input type="text" name="expertise" value={form.expertise} onChange={handleChange}
                            placeholder="Python, React, System Design, Machine Learning (comma-separated)"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        <p className="text-xs text-slate-400 mt-1">Separate skills with commas</p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-slate-700">Social Links</label>
                        {[
                            { name: 'linkedin', label: '💼 LinkedIn', placeholder: 'https://linkedin.com/in/yourprofile' },
                            { name: 'github', label: '🐙 GitHub', placeholder: 'https://github.com/yourusername' },
                            { name: 'website', label: '🌐 Website', placeholder: 'https://yourwebsite.com' },
                        ].map(f => (
                            <div key={f.name} className="flex items-center gap-3">
                                <span className="w-24 text-sm text-slate-500">{f.label}</span>
                                <input type="url" name={f.name} value={form.socialLinks[f.name]} onChange={handleSocial}
                                    placeholder={f.placeholder}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold disabled:opacity-60 hover:shadow-md transition">
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>

                {/* Account settings link */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-slate-800">Account Settings</p>
                        <p className="text-sm text-slate-500 mt-0.5">Change your name, password, or personal details</p>
                    </div>
                    <a href="/profile" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition">
                        Go to Profile →
                    </a>
                </div>
            </div>
        </SellerLayout>
    );
}

export default SellerProfile;
