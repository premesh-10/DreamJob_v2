import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';

function Sidebar() {
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const onLogout = async () => {
        dispatch(reset());
        await dispatch(logout());
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Profile', path: '/profile' },
        { name: 'Wallet', path: '/wallet' },
        { name: 'Course Catalog', path: '/courses' },
        { name: 'Mock Interviews', path: '/interviews' },
        { name: 'Purchase History', path: '/history' },
        { name: 'Subscriptions', path: '/pricing' },
        { name: 'Notifications', path: '/notifications' },
        { name: 'Give Feedback', path: '/feedback' },
    ];

    const adminRoles = ['admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];
    if (adminRoles.includes(user?.role)) {
        navItems.push({ name: 'Admin Console', path: '/admin' });
    }

    return (
        <div className="w-64 bg-darker min-h-screen text-slate-300 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold text-white tracking-wider">DreamJob</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => (
                    <Link
                        key={item.name}
                        to={item.path}
                        className={`block px-4 py-3 rounded-lg transition-colors ${
                            location.pathname === item.path
                                ? 'bg-primary-600 text-white font-medium shadow-md shadow-primary-500/20'
                                : 'hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {item.name}
                    </Link>
                ))}
            </nav>
            {/* Seller CTA */}
            <div className="px-4 mb-2">
                {user?.role === 'seller' || user?.role === 'admin' || user?.role === 'super_admin' ? (
                    <Link to="/seller"
                        className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-violet-700 transition shadow-md">
                        <span>🏪 Seller Hub</span>
                        <span className="text-white/70">→</span>
                    </Link>
                ) : (
                    <Link to="/seller/register"
                        className="flex items-center justify-between w-full px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition border border-indigo-200">
                        <span>✨ Become a Seller</span>
                        <span className="text-indigo-400">→</span>
                    </Link>
                )}
            </div>
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center space-x-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{user?.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full py-2 text-sm text-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Sidebar;
