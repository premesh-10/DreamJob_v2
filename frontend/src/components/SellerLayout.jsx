import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SellerSidebar from './SellerSidebar';

function SellerLayout({ children }) {
    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/seller/login');
        } else if (user.role !== 'seller' && user.role !== 'admin' && user.role !== 'super_admin') {
            navigate('/seller/login');
        }
    }, [user, navigate]);

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
            <SellerSidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <div className="flex-1 p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default SellerLayout;
