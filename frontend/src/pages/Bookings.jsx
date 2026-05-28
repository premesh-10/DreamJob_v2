import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from '../components/Layout';

function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchBookings();
    }, [user]);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            // Fetch all bookings and wallet transactions to include subscriptions
            const [bookingsRes, walletRes] = await Promise.all([
                api.get('/interviews/bookings/me'),
                api.get('/wallet').catch(() => ({ data: { transactions: [] } }))
            ]);
            
            let allItems = bookingsRes.data?.data || [];
            
            if (walletRes.data && walletRes.data.transactions) {
                const subTx = walletRes.data.transactions.filter(tx => tx.description.includes('Subscription Purchase'));
                const subItems = subTx.map(tx => ({
                    _id: tx._id,
                    type: 'subscription',
                    status: 'completed',
                    paymentStatus: 'paid',
                    amountPaid: tx.amount,
                    createdAt: tx.createdAt,
                    subscriptionPlan: tx.description
                }));
                allItems = [...allItems, ...subItems];
            }
            
            // Sort by date descending
            allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setBookings(allItems);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = activeTab === 'all' ? bookings
        : bookings.filter(b => b.type === activeTab);

    const tabs = [
        { id: 'all', label: 'All Orders', count: bookings.length },
        { id: 'course', label: 'Courses', count: bookings.filter(b => b.type === 'course').length },
        { id: 'interview', label: 'Interviews', count: bookings.filter(b => b.type === 'interview').length },
        { id: 'subscription', label: 'Subscriptions', count: bookings.filter(b => b.type === 'subscription').length },
    ];

    const getStatusColor = (status) => {
        const map = { confirmed: 'bg-green-100 text-green-700', 'in-progress': 'bg-orange-100 text-orange-700', completed: 'bg-blue-100 text-blue-700', pending: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-red-100 text-red-700' };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

    const getPaymentColor = (status) => {
        const map = { paid: 'bg-emerald-100 text-emerald-700', free: 'bg-slate-100 text-slate-600', pending: 'bg-yellow-100 text-yellow-700', refunded: 'bg-red-100 text-red-700' };
        return map[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Purchase History</h1>
                    <p className="text-slate-500 mt-1">All your course purchases and interview bookings</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                        >
                            {tab.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                        <svg className="w-14 h-14 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <p className="text-slate-500 font-medium">No {activeTab === 'all' ? 'orders' : activeTab + 's'} yet</p>
                        <div className="flex gap-3 justify-center mt-4">
                            <button onClick={() => navigate('/courses')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Browse Courses</button>
                            <button onClick={() => navigate('/interviews')} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Book Interview</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(booking => (
                            <div key={booking._id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between flex-wrap gap-4">
                                    <div className="flex items-start gap-4">
                                        {/* Type icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${booking.type === 'course' ? 'bg-blue-100' : booking.type === 'interview' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                                            {booking.type === 'course' ? (
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            ) : booking.type === 'interview' ? (
                                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            ) : (
                                                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${booking.type === 'course' ? 'bg-blue-100 text-blue-700' : booking.type === 'interview' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {booking.type}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getStatusColor(booking.status)}`}>
                                                    {booking.status === 'in-progress' ? 'In Progress' : booking.status}
                                                </span>
                                            </div>

                                            {/* Course booking */}
                                            {booking.type === 'course' && booking.course && (
                                                <>
                                                    <h3 className="font-semibold text-slate-900 text-lg">{booking.course.title}</h3>
                                                    <p className="text-slate-500 text-sm">{booking.course.category} • {booking.course.level}</p>
                                                    <button onClick={() => navigate(`/courses/${booking.course._id}`)} className="mt-2 text-primary-600 text-sm font-medium hover:underline">Go to Course →</button>
                                                </>
                                            )}

                                            {/* Interview booking */}
                                            {booking.type === 'interview' && booking.interview && (
                                                <>
                                                    <h3 className="font-semibold text-slate-900 text-lg">Mock Interview — {booking.interview.domain}</h3>
                                                    <p className="text-slate-500 text-sm">with {booking.seller?.name || 'Expert Interviewer'}</p>
                                                    {booking.meetingLink && (
                                                        <div className="mt-2">
                                                            {(() => {
                                                                const slot = booking.interview?.slots?.find(s => s._id === booking.slot);
                                                                const now = new Date();
                                                                let isJoinEnabled = true;
                                                                if (slot) {
                                                                    const start = new Date(slot.startTime);
                                                                    const end = new Date(slot.endTime);
                                                                    const oneHourBefore = new Date(start.getTime() - 60 * 60 * 1000);
                                                                    isJoinEnabled = now >= oneHourBefore && now <= end;
                                                                }
                                                                
                                                                if (isJoinEnabled) {
                                                                    return (
                                                                        <a href={booking.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                            Join Meeting
                                                                        </a>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <button disabled title="Link will be active 1 hour before the interview" className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-300 text-slate-500 text-sm rounded-lg cursor-not-allowed font-medium">
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                            Locked
                                                                        </button>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* Subscription purchase */}
                                            {booking.type === 'subscription' && (
                                                <>
                                                    <h3 className="font-semibold text-slate-900 text-lg">{booking.subscriptionPlan}</h3>
                                                    <p className="text-slate-500 text-sm">Premium Account Plan</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <p className="text-2xl font-bold text-slate-900">
                                            {booking.paymentStatus === 'free' ? <span className="text-emerald-600">FREE</span> : `$${booking.amountPaid?.toFixed(2)}`}
                                        </p>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPaymentColor(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(booking.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Bookings;
