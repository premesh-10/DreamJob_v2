import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';
import html2pdf from 'html2pdf.js';

function formatTime(secs) {
    if (!secs) return '0s';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatDate(d) {
    return new Date(d).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function PracticeTestReport() {
    const { id, attemptId } = useParams();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all | correct | incorrect | skipped

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await api.get(`/practice-tests/${id}/attempts/${attemptId}`);
                setReportData(res.data.data);
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [id, attemptId]);

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (error || !reportData) {
        return (
            <Layout>
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">❌</div>
                    <p className="text-slate-600 font-semibold text-lg">{error || 'Report not found'}</p>
                    <div className="flex gap-3 justify-center mt-4">
                        <Link to="/reports" className="text-violet-600 hover:underline">← My Reports</Link>
                        <Link to={`/practice-tests/${id}`} className="text-violet-600 hover:underline">Test Details</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const { attempt, test, questionResults } = reportData;

    const downloadPDF = () => {
        const element = document.getElementById('report-content');
        const opt = {
            margin:       0.5,
            filename:     `${test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const correctCount = questionResults.filter(q => q.isCorrect).length;
    const skippedCount = questionResults.filter(q => !q.options.some(o => o.wasSelected)).length;
    const incorrectCount = questionResults.length - correctCount - skippedCount;

    const filteredQuestions = questionResults.filter(q => {
        const wasSkipped = !q.options.some(o => o.wasSelected);
        if (filter === 'correct') return q.isCorrect;
        if (filter === 'incorrect') return !q.isCorrect && !wasSkipped;
        if (filter === 'skipped') return wasSkipped;
        return true;
    });

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6 py-6">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link to="/reports" className="hover:text-violet-600 transition">📊 My Reports</Link>
                    <span>/</span>
                    <Link to={`/practice-tests/${id}`} className="hover:text-violet-600 transition truncate">{test.title}</Link>
                    <span>/</span>
                    <span className="text-slate-800 font-medium">Attempt #{attempt.attemptNumber}</span>
                </div>
                
                <div className="flex justify-end">
                    <button onClick={downloadPDF} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition flex items-center gap-2">
                        <span>⬇️</span> Download Report
                    </button>
                </div>

                <div id="report-content" className="space-y-6">
                    {/* Scoreboard Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className={`h-2 ${attempt.passed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />
                    <div className="p-8">
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">Performance Report</h1>
                                <p className="text-slate-500 text-sm mt-1">{test.title} • {test.subject}</p>
                                {attempt.completedAt && (
                                    <p className="text-xs text-slate-400 mt-0.5">Submitted on {formatDate(attempt.completedAt)}</p>
                                )}
                            </div>
                            <span className={`px-4 py-2 rounded-xl font-black text-sm ${attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {attempt.passed ? '✓ PASSED' : '✗ FAILED'}
                            </span>
                        </div>

                        {/* Score progress bar */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between text-sm font-semibold text-slate-600 mb-2">
                                <span>Score: {attempt.score} / {attempt.totalMarks}</span>
                                <span className={`font-black text-lg ${attempt.passed ? 'text-emerald-600' : 'text-red-600'}`}>{attempt.percentage}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${attempt.passed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                    style={{ width: `${attempt.percentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>0%</span>
                                <span className="text-slate-500">Passing: {test.passingScore}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-emerald-700">{correctCount}</p>
                                <p className="text-xs font-semibold text-emerald-600 mt-1">✓ Correct</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-red-700">{incorrectCount}</p>
                                <p className="text-xs font-semibold text-red-600 mt-1">✗ Incorrect</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-slate-600">{skippedCount}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-1">— Skipped</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                                <p className="text-2xl font-black text-blue-700">{formatTime(attempt.timeTaken)}</p>
                                <p className="text-xs font-semibold text-blue-600 mt-1">⏱ Time</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                            Detailed Analysis
                            <span className="text-slate-400 font-normal text-sm ml-2">({filteredQuestions.length} of {questionResults.length})</span>
                        </h2>
                        {/* Filter Tabs */}
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 text-xs font-bold">
                            {[
                                { key: 'all', label: `All (${questionResults.length})` },
                                { key: 'correct', label: `✓ ${correctCount}` },
                                { key: 'incorrect', label: `✗ ${incorrectCount}` },
                                { key: 'skipped', label: `— ${skippedCount}` },
                            ].map(f => (
                                <button key={f.key} onClick={() => setFilter(f.key)}
                                    className={`px-3 py-1.5 rounded-lg transition ${filter === f.key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredQuestions.length === 0 && (
                        <div className="py-10 text-center bg-white rounded-2xl border border-slate-200">
                            <p className="text-slate-400">No questions in this category.</p>
                        </div>
                    )}

                    {filteredQuestions.map((q, index) => {
                        const wasSkipped = !q.options.some(o => o.wasSelected);
                        const originalIndex = questionResults.indexOf(q);
                        return (
                            <div key={q._id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${q.isCorrect ? 'border-emerald-100' : wasSkipped ? 'border-slate-200' : 'border-red-100'}`}>
                                <div className={`px-6 py-3 flex items-center justify-between border-b ${q.isCorrect ? 'bg-emerald-50 border-emerald-100' : wasSkipped ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${q.isCorrect ? 'bg-emerald-500' : wasSkipped ? 'bg-slate-400' : 'bg-red-500'}`}>
                                            {q.isCorrect ? '✓' : wasSkipped ? '—' : '✗'}
                                        </span>
                                        <span className="font-bold text-slate-700 text-sm">Q{originalIndex + 1}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{q.type}</span>
                                        {wasSkipped && <span className="text-xs text-slate-400 italic">Not attempted</span>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">
                                        {q.marksAwarded}/{q.marksAvailable} marks
                                    </span>
                                </div>

                                <div className="p-6">
                                    <p className="text-base font-medium text-slate-800 mb-5 leading-relaxed">{q.questionText}</p>

                                    <div className="space-y-2.5">
                                        {q.options.map((opt) => {
                                            const isCorrectPicked = opt.isCorrect && opt.wasSelected;
                                            const isMissedCorrect = opt.isCorrect && !opt.wasSelected;
                                            const isWrongPicked = !opt.isCorrect && opt.wasSelected;

                                            let style = 'border-slate-200 bg-slate-50/50 text-slate-600';
                                            let badge = null;
                                            if (isCorrectPicked) {
                                                style = 'border-emerald-400 bg-emerald-50 text-emerald-800';
                                                badge = <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">✓ Your Answer</span>;
                                            } else if (isMissedCorrect) {
                                                style = 'border-emerald-300 border-dashed bg-emerald-50/50 text-emerald-700';
                                                badge = <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex-shrink-0">✓ Correct</span>;
                                            } else if (isWrongPicked) {
                                                style = 'border-red-400 bg-red-50 text-red-800';
                                                badge = <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">✗ Your Answer</span>;
                                            }

                                            return (
                                                <div key={opt._id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 ${style}`}>
                                                    <span className="flex-1 text-sm">{opt.text}</span>
                                                    {badge}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {q.explanation && (
                                        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
                                            <span className="text-lg flex-shrink-0">💡</span>
                                            <div>
                                                <h4 className="font-bold text-sm text-amber-900 mb-1">Explanation</h4>
                                                <p className="text-sm text-amber-800 leading-relaxed">{q.explanation}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pb-4">
                    <Link to="/reports" className="flex-1 py-3 text-center bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition text-sm">
                        ← All Reports
                    </Link>
                    <Link to={`/practice-tests/${id}`} className="flex-1 py-3 text-center bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition text-sm">
                        Back to Test
                    </Link>
                </div>
            </div>
        </Layout>
    );
}

export default PracticeTestReport;
