import { useState, useEffect } from 'react';
import SellerLayout from '../../components/SellerLayout';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ icon, label, value, sub, color = 'indigo' }) {
    const colors = { indigo: 'from-indigo-500 to-indigo-600', violet: 'from-violet-500 to-violet-600', emerald: 'from-emerald-500 to-emerald-600', sky: 'from-sky-500 to-sky-600', amber: 'from-amber-500 to-amber-600' };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-6 text-white shadow-lg`}>
            <div className="text-3xl mb-2">{icon}</div>
            <p className="text-white/70 text-sm font-medium">{label}</p>
            <p className="text-3xl font-black mt-1">{value}</p>
            {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
        </div>
    );
}

function SellerOverview() {
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [p, s, o] = await Promise.all([
                    api.get('/sellers/me'),
                    api.get('/sellers/me/stats'),
                    api.get('/interviews/bookings/seller')
                ]);
                setProfile(p.data.data);
                setStats(s.data.data);
                setOrders(o.data.data?.slice(0, 5) || []);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const chartData = stats?.monthlyEarnings?.map(m => ({
        name: MONTHS[(m._id.month - 1)],
        Revenue: m.total,
        Orders: m.count
    })) || [];

    if (loading) return <SellerLayout><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></SellerLayout>;

    return (
        <SellerLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Seller Overview</h1>
                    <p className="text-slate-500 mt-1">Welcome back! Here's your performance summary.</p>
                </div>

                {/* Status warning */}
                {profile?.status !== 'approved' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <span className="text-amber-500 text-xl">⏳</span>
                        <div>
                            <p className="font-semibold text-amber-800">Application {profile?.status}</p>
                            <p className="text-amber-700 text-sm">Your seller application is under review. You'll get full access once approved by admin.</p>
                        </div>
                    </div>
                )}

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    <StatCard icon="💰" label="Total Earnings" value={`$${stats?.totalEarnings?.toFixed(2) || '0.00'}`} color="indigo" />
                    <StatCard icon="💵" label="Available Balance" value={`$${stats?.presentBalance?.toFixed(2) || '0.00'}`} color="emerald" />
                    <StatCard icon="🎓" label="Total Students" value={stats?.totalStudents || 0} color="violet" />
                    <StatCard icon="📚" label="My Courses" value={profile?.totalCourses || 0} color="amber" />
                    <StatCard icon="📦" label="Total Orders" value={orders.length || 0} sub="All time" color="sky" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Monthly Revenue Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Monthly Revenue</h2>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={v => [`$${v}`, 'Revenue']} />
                                    <Bar dataKey="Revenue" fill="#6366f1" radius={[6,6,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                <span className="text-4xl mb-2">📈</span>
                                <p className="text-sm">No revenue data yet. Start selling!</p>
                            </div>
                        )}
                    </div>

                    {/* Top Courses */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Top Courses</h2>
                        {stats?.topCourses?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.topCourses.map((c, i) => (
                                    <div key={c._id} className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>{i+1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{c.title}</p>
                                            <p className="text-xs text-slate-500">{c.students} students · ${c.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-400 text-sm text-center py-8">No courses yet</p>}
                    </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Orders</h2>
                    {orders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-slate-500 border-b border-slate-100">{['Student','Type','Item','Amount','Date'].map(h=><th key={h} className="pb-3 pr-4 font-medium">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.map(o => (
                                        <tr key={o._id} className="hover:bg-slate-50">
                                            <td className="py-3 pr-4 font-medium text-slate-800">{o.user?.name}</td>
                                            <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${o.type==='course'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{o.type}</span></td>
                                            <td className="py-3 pr-4 text-slate-600">{o.course?.title || o.interview?.domain || '—'}</td>
                                            <td className="py-3 pr-4 font-semibold text-emerald-600">{o.paymentStatus==='free'?'Free':`$${o.amountPaid?.toFixed(2)}`}</td>
                                            <td className="py-3 text-slate-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-slate-400 text-sm text-center py-8">No orders yet</p>}
                </div>
            </div>
        </SellerLayout>
    );
}

export default SellerOverview;
