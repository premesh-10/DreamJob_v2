import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import { useSelector } from 'react-redux';

function PracticeTestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/practice-tests/${id}`);
                setData(res.data.data);
            } catch (err) {
                setError(err?.response?.data?.message || 'Test not found');
            } finally { setLoading(false); }
        };
        fetch();
    }, [id]);

    const handleStart = () => {
        if (!user) { navigate('/login'); return; }
        navigate(`/practice-tests/${id}/quiz`);
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (error || !data) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">❌</div>
                    <p className="text-slate-600 font-semibold text-lg">{error || 'Test not found'}</p>
                    <Link to="/practice-tests" className="mt-4 inline-block text-violet-600 hover:underline">← Back to Practice Tests</Link>
                </div>
            </Layout>
        );
    }

    const test = data;
    const myAttempts = data.myAttempts || [];
    const totalMarks = test.questions?.reduce((s, q) => s + (q.marks || 1), 0) || test.totalMarks || 0;
    const canAttempt = test.maxAttempts === 0 || myAttempts.filter(a => a.status === 'completed').length < test.maxAttempts;
    const bestAttempt = myAttempts.filter(a => a.status === 'completed').sort((a, b) => b.percentage - a.percentage)[0];

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6 py-4">
                {/* Back */}
                <Link to="/practice-tests" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition">
                    ← All Practice Tests
                </Link>

                {/* Hero Card */}
                <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{test.subject}</span>
                                {test.course && (
                                    <span className="bg-white/15 text-white/90 text-xs px-3 py-1 rounded-full">📚 {test.course.title}</span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black mb-2 leading-tight">{test.title}</h1>
                            {test.description && <p className="text-white/75 text-sm leading-relaxed max-w-xl">{test.description}</p>}
                        </div>
                        <button
                            onClick={handleStart}
                            disabled={!canAttempt || starting}
                            className={`flex-shrink-0 px-7 py-3.5 rounded-2xl font-bold text-base transition shadow-lg ${canAttempt ? 'bg-white text-violet-700 hover:bg-violet-50 hover:shadow-xl active:scale-95' : 'bg-white/20 text-white/50 cursor-not-allowed'}`}>
                            {starting ? 'Starting...' : canAttempt ? '▶ Start Test' : 'Max Attempts Reached'}
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Questions', value: test.questionCount || test.questions?.length || 0, icon: '❓', color: 'bg-violet-50 border-violet-200 text-violet-800' },
                        { label: 'Total Marks', value: totalMarks, icon: '🎯', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
                        { label: 'Time Limit', value: test.timeLimit > 0 ? `${test.timeLimit} min` : 'No limit', icon: '⏱️', color: 'bg-blue-50 border-blue-200 text-blue-800' },
                        { label: 'Passing Score', value: `${test.passingScore}%`, icon: '✅', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                    ].map(s => (
                        <div key={s.label} className={`${s.color} border rounded-2xl p-4 text-center`}>
                            <p className="text-2xl mb-1">{s.icon}</p>
                            <p className="text-xl font-black">{s.value}</p>
                            <p className="text-xs font-medium opacity-60 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Test Settings */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="font-bold text-slate-900 mb-4">📋 Test Settings</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Attempts Allowed', value: test.maxAttempts === 0 ? 'Unlimited' : `${test.maxAttempts} attempt${test.maxAttempts !== 1 ? 's' : ''}` },
                                { label: 'Per-Question Timer', value: test.hasPerQuestionTimer ? 'Enabled' : 'Disabled' },
                                { label: 'Question Shuffle', value: test.shuffleQuestions ? 'Yes' : 'No' },
                                { label: 'Option Shuffle', value: test.shuffleOptions ? 'Yes' : 'No' },
                                { label: 'Show Results', value: test.showResultsImmediately ? 'After submission' : 'Later' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                    <span className="text-sm text-slate-500">{item.label}</span>
                                    <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* My Attempts */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-slate-900">🏆 My Attempts</h2>
                            {bestAttempt && (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bestAttempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    Best: {bestAttempt.percentage}%
                                </span>
                            )}
                        </div>

                        {myAttempts.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-4xl mb-2">📝</p>
                                <p className="text-slate-500 text-sm">You haven't taken this test yet.</p>
                                <button onClick={handleStart} disabled={!canAttempt}
                                    className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition">
                                    Take Test Now
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-72 overflow-y-auto">
                                {myAttempts.map((attempt, idx) => (
                                    <div key={attempt._id} className={`flex items-center gap-3 p-3 rounded-xl border ${attempt.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {attempt.percentage}%
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800">Attempt #{attempt.attemptNumber || idx + 1}</span>
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {attempt.passed ? '✓ PASS' : '✗ FAIL'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                {attempt.score}/{attempt.totalMarks} marks
                                                {attempt.timeTaken ? ` • ${Math.floor(attempt.timeTaken / 60)}m ${attempt.timeTaken % 60}s` : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-xs text-slate-400">
                                                {new Date(attempt.createdAt).toLocaleDateString()}
                                            </span>
                                            {attempt.status === 'completed' && (
                                                <Link to={`/practice-tests/${test._id}/attempts/${attempt._id}`} className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline">
                                                    View Report →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {canAttempt && myAttempts.length > 0 && (
                            <button onClick={handleStart} className="w-full mt-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-md transition">
                                🔁 Retake Test
                            </button>
                        )}
                        {myAttempts.filter(a => a.status === 'completed').length > 0 && (
                            <Link to="/reports" className="block w-full mt-2 py-2.5 text-center text-sm font-semibold text-violet-600 hover:underline">
                                📊 View all reports →
                            </Link>
                        )}
                    </div>
                </div>

                {/* Tags */}
                {test.tags?.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-500 font-medium">Tags:</span>
                        {test.tags.map(tag => (
                            <span key={tag} className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default PracticeTestDetail;
