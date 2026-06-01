import { useState, useEffect } from 'react';
import api from '../../lib/api';
import SellerLayout from '../../components/SellerLayout';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const typeConfig = {
    info:    { icon: 'ℹ️', bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700' },
    warning: { icon: '⚠️', bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700' },
    success: { icon: '✅', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
    alert:   { icon: '🚨', bg: 'bg-red-50',      border: 'border-red-200',    text: 'text-red-700',     badge: 'bg-red-100 text-red-700' },
};

function SellerNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) { navigate('/seller/login'); return; }
        
        api.get('/notifications/me')
            .then(r => setNotifications(r.data.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));

        // Mark as read
        api.patch('/notifications/read').catch(console.error);
    }, [user, navigate]);

    const formatTime = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <SellerLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Notifications</h1>
                        <p className="text-slate-500 mt-1">
                            {loading ? 'Loading...' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl flex items-center justify-center text-xl shadow-sm border border-indigo-200">🔔</div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-6xl mb-4">🔔</div>
                        <p className="text-xl font-bold text-slate-800">All caught up!</p>
                        <p className="text-slate-500 mt-2 text-sm">You have no notifications right now. We'll let you know when something important happens.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(n => {
                            const config = typeConfig[n.type] || typeConfig.info;
                            return (
                                <div
                                    key={n._id}
                                    className={`${config.bg} ${config.border} border rounded-2xl p-5 flex gap-4 transition hover:shadow-sm`}
                                >
                                    <div className="text-2xl flex-shrink-0 mt-0.5">{config.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <p className={`font-bold text-base ${config.text}`}>{n.title}</p>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${config.badge}`}>
                                                {n.type}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 mt-1.5 text-sm leading-relaxed">{n.message}</p>
                                        <p className="text-slate-400 text-xs mt-3 font-medium">{formatTime(n.createdAt)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </SellerLayout>
    );
}

export default SellerNotifications;
