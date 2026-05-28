import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';

function AdminSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.get('/admin/settings').then(r => setSettings(r.data.data)).catch(console.error).finally(() => setLoading(false));
    }, []);

    const save = async () => {
        setSaving(true); setMsg('');
        try {
            await api.put('/admin/settings', settings);
            setMsg('Settings saved successfully!');
        } catch { setMsg('Failed to save settings'); }
        finally { setSaving(false); }
    };

    if (loading) return <AdminLayout><div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Platform Settings</h1>
                        <p className="text-slate-500">Configure platform-wide settings and policies</p>
                    </div>
                    <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-blue-700 transition shadow-md">
                        {saving ? 'Saving...' : '💾 Save Settings'}
                    </button>
                </div>

                {msg && <div className={`p-4 rounded-xl text-sm font-medium border ${msg.includes('Failed') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{msg}</div>}

                {/* Platform Info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">🏢 Platform Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Platform Name</label>
                            <input type="text" value={settings?.platform?.name || ''} readOnly
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Environment</label>
                            <div className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm">{process.env.NODE_ENV || 'development'}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            { label: 'Maintenance Mode', key: 'maintenanceMode', note: 'Disables platform access for non-admins' },
                            { label: 'Allow New Registrations', key: 'allowNewRegistrations', note: 'Enable/disable new user sign-ups' },
                        ].map(item => (
                            <div key={item.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${settings?.platform?.[item.key] ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400">{item.note}</p>
                                <p className="text-xs text-amber-600 mt-1">⚠️ Toggle coming soon</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Settings */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">💳 Payment Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Currency</p>
                            <p className="font-bold text-slate-800 text-lg">{settings?.payments?.currency || 'USD'}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Stripe Status</p>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${settings?.payments?.stripeEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {settings?.payments?.stripeEnabled ? '✓ Enabled' : '✗ Disabled'}
                            </span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Wallet System</p>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">✓ Enabled</span>
                        </div>
                    </div>
                </div>

                {/* Subscription Plans */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">💎 Subscription Plans</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-slate-500 border-b border-slate-100">{['Plan','Price / Month','Description'].map(h=><th key={h} className="pb-3 pr-6 font-medium">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(settings?.subscriptions?.plans || {}).map(([name, plan]) => (
                                    <tr key={name} className="hover:bg-slate-50">
                                        <td className="py-3 pr-6">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${name==='Silver'?'bg-slate-100 text-slate-700':name==='Ruby'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>
                                                {name==='Silver'?'🥈':name==='Ruby'?'💎':'👑'} {name}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-6 font-bold text-slate-800">${plan.price}</td>
                                        <td className="py-3 text-slate-500">{plan.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Seller Settings */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">🏪 Seller Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Auto-Approve Sellers</p>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">✗ Manual Review</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Platform Commission</p>
                            <p className="font-bold text-slate-800 text-lg">{settings?.seller?.commissionRate || 0}%</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                            <p className="text-xs text-slate-400 mb-1">Min Withdrawal</p>
                            <p className="font-bold text-slate-800 text-lg">${settings?.seller?.minWithdrawal || 10}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
export default AdminSettings;
