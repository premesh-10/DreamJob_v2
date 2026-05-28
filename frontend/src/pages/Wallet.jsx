import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from '../components/Layout';

function Wallet() {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addAmount, setAddAmount] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const { user } = useSelector(state => state.auth);
    const navigate = useNavigate();

    const fetchWallet = async () => {
        try {
            const { data } = await api.get('/wallet');
            setBalance(data.balance);
            setTransactions(data.transactions);
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchWallet();
    }, [user]);

    // Via Stripe Checkout (recommended)
    const handleStripeTopup = async (e) => {
        e.preventDefault();
        if (!addAmount || Number(addAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        setCheckoutLoading(true);
        try {
            const { data } = await api.post('/payments/create-checkout-session', {
                type: 'wallet',
                amount: Number(addAmount)
            });
            // Redirect to Stripe
            window.location.href = data.url;
        } catch (error) {
            alert('Failed to initiate payment: ' + (error.response?.data?.message || error.message));
            setCheckoutLoading(false);
        }
    };

    // Direct add (for testing without Stripe)
    const handleDirectAdd = async (e) => {
        e.preventDefault();
        if (!addAmount || Number(addAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        try {
            await api.post('/wallet/add', { amount: Number(addAmount) });
            setAddAmount('');
            setShowModal(false);
            fetchWallet();
        } catch (error) {
            alert('Failed to add money: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-slate-900">Wallet</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1 md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-20">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z" /></svg>
                        </div>
                        <p className="text-slate-300 font-medium tracking-wide">Available Balance</p>
                        <h2 className="text-5xl font-bold mt-2 mb-8">${balance.toFixed(2)}</h2>
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded-xl transition"
                        >
                            + Add Money
                        </button>
                    </div>

                    <div className="col-span-1 md:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Transactions</h3>
                        {loading ? (
                            <div className="text-center py-10 text-slate-400">
                                <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                Loading transactions...
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                <p>No transactions found.</p>
                                <p className="text-sm mt-1">Add money to your wallet to get started.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {transactions.map((tx) => (
                                    <div key={tx._id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {tx.type === 'credit' ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{tx.description}</p>
                                                <p className="text-sm text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className={`font-bold text-lg ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Money Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Add Money to Wallet</h3>
                            <p className="text-slate-500 text-sm mb-6">Enter the amount you wish to add.</p>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Amount ($)</label>
                                <input
                                    type="number"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    min="1"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary-500 text-lg font-medium"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="space-y-3">
                                {/* Stripe checkout (real payment) */}
                                <button
                                    onClick={handleStripeTopup}
                                    disabled={checkoutLoading}
                                    className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/30 disabled:opacity-60"
                                >
                                    {checkoutLoading ? 'Redirecting...' : '💳 Pay via Stripe'}
                                </button>
                                {/* Direct add for testing */}
                                <button
                                    onClick={handleDirectAdd}
                                    className="w-full py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-sm"
                                >
                                    ⚡ Add Directly (Testing Only)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); setAddAmount(''); }}
                                    className="w-full py-3 px-4 bg-white text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition border border-slate-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Wallet;
