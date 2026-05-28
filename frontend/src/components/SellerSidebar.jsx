import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';

const navItems = [
    { name: 'Overview', path: '/seller', icon: '📊' },
    { name: 'My Courses', path: '/seller/courses', icon: '📚' },
    { name: 'Interview Schedule', path: '/seller/interviews', icon: '🗓️' },
    { name: 'Revenue Analytics', path: '/seller/revenue', icon: '💹' },
    { name: 'Wallet & Earnings', path: '/seller/wallet', icon: '💰' },
    { name: 'Orders', path: '/seller/orders', icon: '📦' },
    { name: 'My Students', path: '/seller/students', icon: '🎓' },
    { name: 'Profile Settings', path: '/seller/profile', icon: '⚙️' },
];

function SellerSidebar() {
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    const handleLogout = async () => {
        dispatch(reset());
        await dispatch(logout());
        navigate('/seller/login');
    };

    return (
        <div className="w-64 bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-900 min-h-screen text-indigo-100 flex flex-col fixed top-0 left-0 z-40 shadow-2xl">
            {/* Brand */}
            <div className="p-6 border-b border-indigo-800/50">
                <Link to="/seller" className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-sm">DJ</span>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm tracking-wide">DreamJob</p>
                        <p className="text-indigo-300 text-xs font-medium">Seller Hub</p>
                    </div>
                </Link>
                {/* User pill */}
                <div className="mt-4 flex items-center gap-3 bg-indigo-800/40 rounded-xl p-3 border border-indigo-700/40">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                        {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                        <span className="text-xs text-indigo-300 font-medium">Seller</span>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-indigo-300 hover:bg-white/8 hover:text-white'
                            }`}
                        >
                            <span className="text-base leading-none">{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-indigo-800/50 space-y-1">
                <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-300 hover:bg-white/8 hover:text-white transition-all">
                    <span>🌐</span> Main Platform
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all"
                >
                    <span>🚪</span> Logout
                </button>
            </div>
        </div>
    );
}

export default SellerSidebar;
