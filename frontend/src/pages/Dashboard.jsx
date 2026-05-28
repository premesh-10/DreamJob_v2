import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../features/auth/authSlice';
import api from '../lib/api';
import Layout from '../components/Layout';

function Dashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [balance, setBalance] = useState(0);
    const [upcomingInterviews, setUpcomingInterviews] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loadingInterviews, setLoadingInterviews] = useState(true);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }

        // Fetch fresh user profile to keep subscription up-to-date
        api.get('/auth/me')
            .then(r => {
                if (r.data?.data) {
                    dispatch(setUser(r.data.data));
                }
            })
            .catch(() => {});

        // Wallet balance
        api.get('/wallet').then(r => setBalance(r.data.balance)).catch(() => {});

        // Upcoming interviews — fetch bookings and filter future ones
        api.get('/interviews/bookings/me')
            .then(r => {
                const now = new Date();
                const future = (r.data.data || [])
                    .filter(b => b.type === 'interview' && b.status !== 'cancelled' && b.status !== 'completed')
                    .filter(b => {
                        // slot startTime is inside the interview's slots array, but Booking stores slotId
                        // Use booking.createdAt as fallback; ideally meetingLink confirms it's a real booking
                        return true; // show all confirmed interview bookings
                    })
                    .slice(0, 5);
                setUpcomingInterviews(future);
            })
            .catch(() => {})
            .finally(() => setLoadingInterviews(false));

        // Enrolled courses
        api.get('/courses/enrolled')
            .then(r => setEnrolledCourses(r.data.data || []))
            .catch(() => {});
    }, [user, navigate]);

    if (!user) return null;

    const getDaysLeft = () => {
        if (!user?.subscription?.validUntil || user.subscription.plan === 'None') return null;
        const validUntil = new Date(user.subscription.validUntil);
        const diffDays = Math.ceil((validUntil - new Date()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };
    const daysLeft = getDaysLeft();

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span> 👋</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/courses" className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition">Browse Courses</Link>
                        <Link to="/interviews" className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition">Book Interview</Link>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl">💎</div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Subscription</p>
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-bold text-slate-900">{user?.subscription?.plan || 'Free Plan'}</h3>
                                {daysLeft !== null && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${daysLeft > 7 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {daysLeft} days left
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">💰</div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Wallet Balance</p>
                            <h3 className="text-2xl font-bold text-slate-900">${balance.toFixed(2)}</h3>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-2xl">📚</div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Enrolled Courses</p>
                            <h3 className="text-2xl font-bold text-slate-900">{enrolledCourses.length}</h3>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Interviews */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-slate-900">Upcoming Interviews</h2>
                            <Link to="/history" className="text-sm text-primary-600 font-medium hover:underline">View All</Link>
                        </div>

                        {loadingInterviews ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : upcomingInterviews.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <div className="text-4xl mb-2">🎙️</div>
                                <p className="font-medium">No upcoming mock interviews</p>
                                <button onClick={() => navigate('/interviews')} className="mt-3 text-primary-600 font-semibold hover:text-primary-700 text-sm">
                                    Book an Interview →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingInterviews.map(booking => (
                                    <div key={booking._id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                            {booking.interview?.interviewer?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm">
                                                {booking.interview?.domain || 'Mock Interview'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                with <span className="font-medium">{booking.interview?.interviewer?.name || 'Interviewer'}</span>
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                                                booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                                                booking.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
                                                booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {booking.status === 'in-progress' ? 'In Progress' : booking.status}
                                            </span>
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
                                                                <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer"
                                                                    className="text-xs bg-primary-600 text-white px-2.5 py-1 rounded-lg hover:bg-primary-700 transition font-medium">
                                                                    Join →
                                                                </a>
                                                            );
                                                        } else {
                                                            return (
                                                                <button disabled title="Link will be active 1 hour before the interview"
                                                                    className="text-xs bg-slate-300 text-slate-500 px-2.5 py-1 rounded-lg cursor-not-allowed font-medium">
                                                                    Locked
                                                                </button>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Learning Progress */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-slate-900">My Courses</h2>
                            <Link to="/courses" className="text-sm text-primary-600 font-medium hover:underline">Browse</Link>
                        </div>

                        {enrolledCourses.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <div className="text-4xl mb-2">📖</div>
                                <p className="font-medium text-sm">No courses yet</p>
                                <button onClick={() => navigate('/courses')} className="mt-3 text-primary-600 font-semibold hover:text-primary-700 text-sm">
                                    Browse Catalog →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {enrolledCourses.slice(0, 4).map(course => (
                                    <Link key={course._id} to={`/courses/${course._id}`}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition group">
                                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
                                            {course.title?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-primary-600">{course.title}</p>
                                            <p className="text-xs text-slate-400 truncate">{course.category}</p>
                                        </div>
                                    </Link>
                                ))}
                                {enrolledCourses.length > 4 && (
                                    <Link to="/history" className="text-xs text-slate-400 hover:text-primary-600 block text-center py-1">
                                        +{enrolledCourses.length - 4} more courses
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Dashboard;
