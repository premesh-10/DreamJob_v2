import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../lib/api';

// ── Timer component ───────────────────────────────────────────────────────────
function CircleTimer({ total, remaining, size = 56, color = '#7c3aed' }) {
    if (total <= 0) return null;
    const pct = remaining / total;
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const dash = circ * pct;
    const isLow = remaining <= 10;

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={5} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={isLow ? '#ef4444' : color}
                    strokeWidth={5}
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.9s linear' }}
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-bold text-xs ${isLow ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                {remaining}
            </div>
        </div>
    );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, onRetake, test }) {
    const { score, totalMarks, percentage, passed, passingScore, questionResults } = result;
    const [showReview, setShowReview] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Score card */}
                <div className={`rounded-3xl p-8 text-center shadow-xl ${passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-700 to-slate-900'} text-white`}>
                    <div className="text-6xl mb-4">{passed ? '🏆' : '📚'}</div>
                    <h2 className="text-3xl font-black mb-1">{passed ? 'Congratulations!' : 'Keep Practicing!'}</h2>
                    <p className="text-white/80 mb-6">{passed ? 'You passed the test!' : `You need ${passingScore}% to pass`}</p>

                    {/* Score ring */}
                    <div className="relative w-32 h-32 mx-auto mb-6">
                        <svg width="128" height="128" className="-rotate-90">
                            <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                            <circle cx="64" cy="64" r="56" fill="none"
                                stroke="white" strokeWidth="8"
                                strokeDasharray={`${(percentage / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                                strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black">{percentage}%</span>
                            <span className="text-white/70 text-xs">{score}/{totalMarks}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-black">{score}</p>
                            <p className="text-white/70 text-xs">Score</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black">{totalMarks}</p>
                            <p className="text-white/70 text-xs">Total</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-black ${passed ? 'text-white' : 'text-red-300'}`}>{passed ? 'PASS' : 'FAIL'}</p>
                            <p className="text-white/70 text-xs">Result</p>
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3">
                    {/* Only show Review Answers if results are available immediately */}
                    {questionResults && questionResults.length > 0 && (
                        <button onClick={() => setShowReview(!showReview)}
                            className="w-full py-3.5 bg-white border-2 border-violet-200 text-violet-700 rounded-2xl font-semibold hover:bg-violet-50 transition">
                            {showReview ? 'Hide' : '📋 Review'} Answers
                        </button>
                    )}
                    <div className="flex gap-3">
                        {result?.attemptId && (
                            <Link to={`/reports`}
                                className="flex-1 py-3.5 text-center bg-slate-100 border-2 border-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition">
                                📊 My Reports
                            </Link>
                        )}
                        {onRetake && (
                            <button onClick={onRetake}
                                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-lg transition">
                                🔁 Retake Test
                            </button>
                        )}
                    </div>
                </div>

                <Link to="/practice-tests" className="block text-center text-slate-500 text-sm hover:text-violet-600 transition">
                    ← Back to all tests
                </Link>

                {/* Question review */}
                {showReview && questionResults && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-900 text-lg">Question Review</h3>
                        {questionResults.map((q, idx) => (
                            <div key={idx} className={`rounded-2xl border p-5 ${q.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${q.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {q.isCorrect ? '✓' : '✗'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{q.type}</span>
                                            <span className="text-xs text-slate-500">{q.marksAwarded}/{q.marksAvailable} marks</span>
                                        </div>
                                        <p className="font-semibold text-slate-800 text-sm">{q.questionText}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5 ml-10">
                                    {q.options.map((opt, oi) => (
                                        <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${opt.isCorrect && opt.wasSelected ? 'bg-emerald-200 text-emerald-900 font-semibold' : opt.isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : opt.wasSelected ? 'bg-red-200 text-red-900' : 'bg-white/60 text-slate-600'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : opt.wasSelected ? 'border-red-400 bg-red-400 text-white' : 'border-slate-300'}`}>
                                                {opt.isCorrect ? '✓' : opt.wasSelected ? '✗' : ''}
                                            </span>
                                            {opt.text}
                                        </div>
                                    ))}
                                </div>

                                {q.explanation && (
                                    <div className="ml-10 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                                        <span className="font-semibold">💡 Explanation: </span>{q.explanation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Quiz Page ─────────────────────────────────────────────────────────────
function PracticeTestQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('loading'); // loading | ready | quiz | submitting | result | error
    const [testMeta, setTestMeta] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attemptId, setAttemptId] = useState(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionId: Set of selected optionIds }
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    // Timers
    const [overallTimeLeft, setOverallTimeLeft] = useState(0);
    const [overallTimerTotal, setOverallTimerTotal] = useState(0);
    const [perQTimeLeft, setPerQTimeLeft] = useState(0);
    const [perQTimerTotal, setPerQTimerTotal] = useState(0);
    const [startedAt] = useState(Date.now());
    const overallIntervalRef = useRef(null);
    const perQIntervalRef = useRef(null);

    // Start the quiz
    const startQuiz = useCallback(async () => {
        setPhase('loading');
        try {
            const { data } = await api.post(`/practice-tests/${id}/attempt/start`);
            const { attemptId: aId, test, questions: qs, startedAt: sa } = data.data;
            setAttemptId(aId);
            setTestMeta(test);
            setQuestions(qs);

            // Init overall timer
            if (test.timeLimit > 0) {
                const secs = test.timeLimit * 60;
                setOverallTimeLeft(secs);
                setOverallTimerTotal(secs);
            }

            // Init per-Q timer for first question
            const firstQ = qs[0];
            if (firstQ?.timeLimit > 0) {
                setPerQTimeLeft(firstQ.timeLimit);
                setPerQTimerTotal(firstQ.timeLimit);
            }

            setPhase('quiz');
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not start the test. Please try again.');
            setPhase('error');
        }
    }, [id]);

    useEffect(() => { startQuiz(); }, [startQuiz]);

    // Overall timer
    useEffect(() => {
        if (phase !== 'quiz' || overallTimerTotal <= 0) return;
        overallIntervalRef.current = setInterval(() => {
            setOverallTimeLeft(prev => {
                if (prev <= 1) { clearInterval(overallIntervalRef.current); handleAutoSubmit(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(overallIntervalRef.current);
    }, [phase, overallTimerTotal]);

    // Per-question timer
    useEffect(() => {
        if (phase !== 'quiz') return;
        const currentQ = questions[currentIdx];
        if (!currentQ || !currentQ.timeLimit) { setPerQTimeLeft(0); setPerQTimerTotal(0); return; }

        setPerQTimeLeft(currentQ.timeLimit);
        setPerQTimerTotal(currentQ.timeLimit);

        clearInterval(perQIntervalRef.current);
        perQIntervalRef.current = setInterval(() => {
            setPerQTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(perQIntervalRef.current);
                    // Auto-advance to next question
                    if (currentIdx < questions.length - 1) {
                        setTimeout(() => setCurrentIdx(i => i + 1), 300);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(perQIntervalRef.current);
    }, [phase, currentIdx, questions]);

    const handleSelectOption = (questionId, optionId, type) => {
        setAnswers(prev => {
            const current = new Set(prev[questionId] || []);
            if (type === 'MCQ') {
                // Single select
                return { ...prev, [questionId]: new Set([optionId]) };
            } else {
                // Multi-select toggle
                if (current.has(optionId)) current.delete(optionId);
                else current.add(optionId);
                return { ...prev, [questionId]: new Set(current) };
            }
        });
    };

    const handleAutoSubmit = useCallback(() => {
        submitAnswers(true);
    }, [answers, questions, attemptId]);

    const submitAnswers = async (autoSubmit = false) => {
        if (!autoSubmit && !window.confirm(`Submit test? You've answered ${Object.keys(answers).length}/${questions.length} questions.`)) return;

        clearInterval(overallIntervalRef.current);
        clearInterval(perQIntervalRef.current);
        setPhase('submitting');

        const timeTaken = Math.round((Date.now() - startedAt) / 1000);
        const formattedAnswers = questions.map(q => ({
            questionId: q._id,
            selectedOptionIds: Array.from(answers[q._id] || []),
            timeTaken: 0
        }));

        try {
            const { data } = await api.post(`/practice-tests/${id}/attempt/${attemptId}/submit`, {
                answers: formattedAnswers,
                timeTaken
            });
            setResult(data.data);
            setPhase('result');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to submit. Please try again.');
            setPhase('error');
        }
    };

    const handleRetake = () => {
        setPhase('loading');
        setAnswers({});
        setMarkedForReview(new Set());
        setCurrentIdx(0);
        setResult(null);
        setOverallTimeLeft(0);
        setPerQTimeLeft(0);
        startQuiz();
    };

    // ── Render phases ──────────────────────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-violet-700 font-semibold">Preparing your test...</p>
                </div>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-sm">
                    <div className="text-6xl mb-4">❌</div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Oops!</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <Link to="/practice-tests" className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50">← Back</Link>
                        <button onClick={startQuiz} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700">Try Again</button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'submitting') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-violet-700 font-semibold">Calculating your score...</p>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        return <ResultScreen result={result} onRetake={testMeta?.maxAttempts === 0 ? handleRetake : null} test={testMeta} />;
    }

    // ── Quiz UI ────────────────────────────────────────────────────────────────
    const currentQ = questions[currentIdx];
    const answeredCount = Object.keys(answers).filter(k => (answers[k]?.size || 0) > 0).length;
    const isAnswered = (answers[currentQ?._id]?.size || 0) > 0;

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top bar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/practice-tests" className="text-slate-400 hover:text-slate-600 transition">✕</Link>
                        <div>
                            <h1 className="font-bold text-slate-900 text-sm leading-none">{testMeta?.title}</h1>
                            <p className="text-xs text-slate-400 mt-0.5">{testMeta?.subject}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Progress */}
                        <span className="text-xs text-slate-500 font-medium hidden sm:block">
                            {answeredCount}/{questions.length} answered
                        </span>
                        {/* Overall timer */}
                        {overallTimerTotal > 0 && (
                            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold px-3 py-1.5 rounded-xl ${overallTimeLeft < 60 ? 'text-red-600 bg-red-50 animate-pulse' : overallTimeLeft < 300 ? 'text-amber-600 bg-amber-50' : 'text-violet-600 bg-violet-50'}`}>
                                ⏱️ {formatTime(overallTimeLeft)}
                            </div>
                        )}
                        <button onClick={() => submitAnswers(false)}
                            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-md transition">
                            Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-200">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-6">
                {/* Main question area */}
                <div className="flex-1 min-w-0">
                    {currentQ && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                            {/* Question header */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-8 h-8 bg-violet-600 text-white rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                                        {currentIdx + 1}
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${currentQ.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {currentQ.type === 'MCQ' ? '🔘 Single Answer' : '☑️ Multiple Answers'}
                                    </span>
                                    <span className="text-xs text-slate-400">{currentQ.marks} mark{currentQ.marks !== 1 ? 's' : ''}</span>
                                </div>
                                {/* Per-question timer */}
                                {perQTimerTotal > 0 && (
                                    <CircleTimer total={perQTimerTotal} remaining={perQTimeLeft} />
                                )}
                            </div>

                            <p className="text-slate-900 text-lg font-medium leading-relaxed">{currentQ.questionText}</p>

                            {/* Options */}
                            <div className="space-y-3">
                                {currentQ.options?.map((opt, oi) => {
                                    const selected = answers[currentQ._id]?.has(opt._id);
                                    return (
                                        <button key={opt._id}
                                            onClick={() => handleSelectOption(currentQ._id, opt._id, currentQ.type)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${selected
                                                ? 'border-violet-500 bg-violet-50 shadow-sm'
                                                : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-violet-600 bg-violet-600' : 'border-slate-300'}`}>
                                                {selected && <span className="text-white text-xs font-bold">✓</span>}
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 flex-shrink-0 w-4">{String.fromCharCode(65 + oi)}</span>
                                            <span className={`text-sm leading-snug ${selected ? 'text-violet-900 font-medium' : 'text-slate-700'}`}>{opt.text}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setMarkedForReview(p => { const n = new Set(p); n.has(currentQ._id) ? n.delete(currentQ._id) : n.add(currentQ._id); return n; }); }}
                                        className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition ${markedForReview.has(currentQ._id) ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:border-amber-300'}`}>
                                        🔖 {markedForReview.has(currentQ._id) ? 'Marked' : 'Mark for Review'}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                                        disabled={currentIdx === 0}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-slate-50 transition">
                                        ← Prev
                                    </button>
                                    {currentIdx < questions.length - 1 ? (
                                        <button onClick={() => setCurrentIdx(i => i + 1)}
                                            className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition">
                                            Next →
                                        </button>
                                    ) : (
                                        <button onClick={() => submitAnswers(false)}
                                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:shadow-md transition">
                                            Finish Test ✓
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Question navigator sidebar */}
                <div className="w-56 flex-shrink-0 hidden md:block">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-6">
                        <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Questions</h3>
                        <div className="grid grid-cols-5 gap-1.5 mb-4">
                            {questions.map((q, idx) => {
                                const answered = (answers[q._id]?.size || 0) > 0;
                                const marked = markedForReview.has(q._id);
                                const isCurrent = idx === currentIdx;
                                return (
                                    <button key={q._id} onClick={() => setCurrentIdx(idx)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all relative ${isCurrent ? 'bg-violet-600 text-white scale-110 shadow-md' : answered ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {idx + 1}
                                        {marked && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="space-y-1.5 text-xs">
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-violet-600 rounded" /><span className="text-slate-500">Current</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-100 border border-emerald-200 rounded" /><span className="text-slate-500">Answered ({answeredCount})</span></div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 rounded" /><span className="text-slate-500">Unanswered ({questions.length - answeredCount})</span></div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-100 rounded relative"><div className="w-2 h-2 bg-amber-400 rounded-full absolute -top-0.5 -right-0.5" /></div>
                                <span className="text-slate-500">Marked ({markedForReview.size})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PracticeTestQuiz;
