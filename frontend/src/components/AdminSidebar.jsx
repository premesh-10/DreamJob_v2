import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';

function AdminSidebar() {
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    const navItems = [
        { name: 'Dashboard', path: '/admin' },
        { name: 'Users', path: '/admin/users' },
        { name: 'Sellers', path: '/admin/sellers' },
        { name: 'Courses', path: '/admin/courses' },
        { name: 'Practice Tests', path: '/admin/practice-tests' },
        { name: 'Mock Interviews', path: '/admin/interviews' },
        { name: 'Bookings', path: '/admin/bookings' },
        { name: 'Payments', path: '/admin/payments' },
        { name: 'Wallet', path: '/admin/wallet' },
        { name: 'Subscriptions', path: '/admin/subscriptions' },
        { name: 'Coupons', path: '/admin/coupons' },
        { name: 'Feedback', path: '/admin/feedback' },
        { name: 'Review Management', path: '/admin/reviews' },
        { name: 'Webinars', path: '/admin/webinars' },
        { name: 'Notifications', path: '/admin/notifications' },
        { name: 'Reports', path: '/admin/reports' },
        { name: 'Security Logs', path: '/admin/security' },
        { name: 'Settings', path: '/admin/settings' },
    ];

    const handleLogout = async () => {
        dispatch(reset());
        await dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="w-64 bg-slate-900 h-screen fixed top-0 left-0 text-slate-300 flex flex-col shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                <Link to="/admin" className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <span>DreamOps</span>
                </Link>
                <div className="mt-4 flex items-center space-x-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <p className="text-xs text-blue-400 font-bold uppercase truncate">{user?.role.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 py-4">
                <ul className="space-y-1 px-3">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.name}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                                        isActive 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-800 mt-auto">
                <Link to="/" className="flex items-center px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition mb-2">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                    Main Platform
                </Link>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition"
                >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default AdminSidebar;
