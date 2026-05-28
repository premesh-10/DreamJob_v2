import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, reset } from '../features/auth/authSlice';

function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [searchParams] = useSearchParams();

    const { email, password } = formData;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user, isLoading, isError, isSuccess, message } = useSelector(state => state.auth);

    // Show suspension banner if redirected from API interceptor
    useEffect(() => {
        if (searchParams.get('blocked') === '1') {
            setErrorMsg('🚫 Your account has been suspended. Please contact support@dreamjob.com for assistance.');
        }
    }, [searchParams]);

    useEffect(() => {
        if (isError) {
            setErrorMsg(message);
        }
        if (isSuccess || user) {
            navigate('/');
        }
        dispatch(reset());
    }, [user, isError, isSuccess, message, navigate, dispatch]);

    const onChange = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const onSubmit = e => {
        e.preventDefault();
        setErrorMsg('');
        dispatch(login({ email, password }));
    };

    const isBlocked = errorMsg.toLowerCase().includes('suspended');

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div>
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xl">D</div>
                    </div>
                    <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">Register here</Link>
                    </p>
                </div>

                {/* Error / Blocked banner */}
                {errorMsg && (
                    <div className={`p-4 rounded-xl border text-sm font-medium ${
                        isBlocked
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                        {isBlocked ? (
                            <div>
                                <p className="font-bold mb-1">🚫 Account Suspended</p>
                                <p className="text-red-700 font-normal">{errorMsg.replace('🚫 ', '')}</p>
                            </div>
                        ) : (
                            <p>⚠️ {errorMsg}</p>
                        )}
                    </div>
                )}

                <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm transition"
                                placeholder="you@example.com"
                                value={email}
                                onChange={onChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-sm transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={onChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center rounded-lg bg-primary-600 py-3 px-4 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 transition shadow-md shadow-primary-500/20"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Signing in...
                            </span>
                        ) : 'Sign in'}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        By signing in, you agree to our{' '}
                        <span className="text-primary-600 cursor-pointer hover:underline">Terms of Service</span>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;
