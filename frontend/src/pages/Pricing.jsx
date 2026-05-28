import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../lib/api';
import Layout from '../components/Layout';

function Pricing() {
    const [loading, setLoading] = useState(null);

    const plans = [
        {
            name: 'Silver',
            price: 9.99,
            features: [
                'Access to all basic courses',
                '2 Mock Interviews per month',
                'Community Forum Access',
                'Standard Support'
            ],
            color: 'bg-slate-400'
        },
        {
            name: 'Ruby',
            price: 19.99,
            features: [
                'Access to all courses',
                '5 Mock Interviews per month',
                'Resume Review',
                'Priority Support'
            ],
            color: 'bg-rose-500',
            popular: true
        },
        {
            name: 'Platinum',
            price: 29.99,
            features: [
                'Unlimited Course Access',
                'Unlimited Mock Interviews',
                '1-on-1 Mentorship',
                '24/7 Dedicated Support'
            ],
            color: 'bg-indigo-500'
        }
    ];

    const handleSubscribe = async (plan) => {
        setLoading(plan);
        try {
            const { data } = await api.post('/payments/create-checkout-session', {
                type: 'subscription',
                plan: plan
            });

            // Redirect to Stripe Checkout URL
            window.location.href = data.url;
        } catch (error) {
            alert('Failed to initiate checkout: ' + (error.response?.data?.message || error.message));
            setLoading(null);
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-12 py-10">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">Upgrade your career preparation with our premium features. Select the plan that fits your needs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                    {plans.map(plan => (
                        <div key={plan.name} className={`relative bg-white rounded-3xl p-8 shadow-sm border-2 ${plan.popular ? 'border-rose-500 shadow-xl scale-105' : 'border-slate-100 hover:border-slate-300'} transition flex flex-col`}>
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}
                            
                            <div className="text-center mb-8">
                                <h3 className={`text-2xl font-bold mb-2 ${plan.name === 'Silver' ? 'text-slate-600' : plan.name === 'Ruby' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-end justify-center justify-baseline space-x-1">
                                    <span className="text-5xl font-extrabold text-slate-900">${plan.price}</span>
                                    <span className="text-slate-500 font-medium pb-1">/mo</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start space-x-3 text-slate-600">
                                        <svg className={`w-5 h-5 shrink-0 mt-0.5 ${plan.popular ? 'text-rose-500' : 'text-primary-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => handleSubscribe(plan.name)}
                                disabled={loading === plan.name}
                                className={`w-full py-4 rounded-xl font-bold transition shadow-lg ${plan.popular ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/30'}`}
                            >
                                {loading === plan.name ? 'Processing...' : 'Subscribe Now'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

export default Pricing;
