import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';
import {
    createColumnHelper, flexRender,
    getCoreRowModel, useReactTable,
    getPaginationRowModel, getSortedRowModel, getFilteredRowModel
} from '@tanstack/react-table';

function AttemptAnalyticsModal({ test, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/practice-tests/${test._id}/attempts`)
            .then(res => setData(res.data.data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [test._id]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">📊 Attempt Analytics</h2>
                        <p className="text-sm text-slate-500">{test.title}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">✕</button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : !data ? (
                        <p className="text-center text-slate-500 py-8">Failed to load analytics</p>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Total Attempts', value: data.analytics.totalAttempts, color: 'bg-violet-50 text-violet-700' },
                                    { label: 'Avg Score', value: `${data.analytics.avgScore}%`, color: 'bg-indigo-50 text-indigo-700' },
                                    { label: 'Pass Rate', value: `${data.analytics.passRate}%`, color: 'bg-emerald-50 text-emerald-700' },
                                    { label: 'Passing Score', value: `${data.test.passingScore}%`, color: 'bg-amber-50 text-amber-700' },
                                ].map(s => (
                                    <div key={s.label} className={`${s.color} rounded-2xl p-4 text-center`}>
                                        <p className="text-2xl font-black">{s.value}</p>
                                        <p className="text-xs font-medium mt-1 opacity-70">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Most missed questions */}
                            {data.analytics.mostMissedQuestions?.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-3">⚠️ Most Missed Questions</h3>
                                    <div className="space-y-2">
                                        {data.analytics.mostMissedQuestions.map((q, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center font-bold text-red-700 text-sm flex-shrink-0">
                                                    {q.missRate}%
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{q.questionText}</p>
                                                    <p className="text-xs text-slate-500">{q.missed}/{q.total} students missed</p>
                                                </div>
                                                <div className="w-24 bg-red-200 rounded-full h-2 flex-shrink-0">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${q.missRate}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent attempts table */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3">Recent Attempts</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                {['Student', 'Score', '%', 'Result', 'Time', 'Date'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-xs">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.attempts.slice(0, 10).map(a => (
                                                <tr key={a._id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{a.user?.name || 'Unknown'}</td>
                                                    <td className="px-4 py-3">{a.score}/{a.totalMarks}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-700">{a.percentage}%</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                            {a.passed ? 'PASS' : 'FAIL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">{a.timeTaken ? `${Math.floor(a.timeTaken / 60)}m ${a.timeTaken % 60}s` : '-'}</td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {data.attempts.length === 0 && (
                                        <p className="text-center text-slate-400 py-8 text-sm">No attempts yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AdminPracticeTests() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [analyticsTest, setAnalyticsTest] = useState(null);

    const fetchTests = async () => {
        try {
            const { data } = await api.get('/admin/practice-tests');
            setTests(data.data || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchTests(); }, []);

    const handleTogglePublish = async (testId, current) => {
        if (!window.confirm(`${current ? 'Unpublish' : 'Publish'} this practice test?`)) return;
        try {
            const { data } = await api.patch(`/admin/practice-tests/${testId}/publish`, {});
            setTests(prev => prev.map(t => t._id === testId ? { ...t, isPublished: data.isPublished } : t));
        } catch { alert('Failed'); }
    };

    const handleDelete = async (testId, title) => {
        if (!window.confirm(`Permanently delete "${title}"? All attempt data will be erased.`)) return;
        try {
            await api.delete(`/admin/practice-tests/${testId}`);
            setTests(prev => prev.filter(t => t._id !== testId));
        } catch { alert('Failed to delete'); }
    };

    const columnHelper = createColumnHelper();
    const columns = useMemo(() => [
        columnHelper.accessor('title', {
            header: 'Title',
            cell: info => <div className="font-semibold text-slate-900 max-w-[200px] truncate">{info.getValue()}</div>
        }),
        columnHelper.accessor('subject', {
            header: 'Subject',
            cell: info => <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">{info.getValue()}</span>
        }),
        columnHelper.accessor('seller.name', {
            header: 'Seller',
            cell: info => info.getValue() || 'Unknown'
        }),
        columnHelper.accessor('questionCount', {
            header: 'Questions',
            cell: info => <span className="font-bold text-slate-700">{info.getValue() || 0}</span>
        }),
        columnHelper.accessor('totalAttempts', {
            header: 'Attempts',
            cell: info => info.getValue() || 0
        }),
        columnHelper.accessor('passRate', {
            header: 'Pass Rate',
            cell: info => (
                <span className={`font-semibold ${info.getValue() >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {info.getValue() || 0}%
                </span>
            )
        }),
        columnHelper.accessor('isPublished', {
            header: 'Status',
            cell: info => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${info.getValue() ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {info.getValue() ? 'Published' : 'Draft'}
                </span>
            )
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: props => {
                const test = props.row.original;
                return (
                    <div className="flex gap-2">
                        <button onClick={() => setAnalyticsTest(test)}
                            className="text-xs px-2.5 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg font-medium hover:bg-violet-100">
                            Analytics
                        </button>
                        <button onClick={() => handleTogglePublish(test._id, test.isPublished)}
                            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border ${test.isPublished ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                            {test.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => handleDelete(test._id, test.title)}
                            className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100">
                            Delete
                        </button>
                    </div>
                );
            }
        })
    ], []);

    const table = useReactTable({
        data: tests,
        columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    // Summary stats
    const published = tests.filter(t => t.isPublished).length;
    const totalAttempts = tests.reduce((s, t) => s + (t.totalAttempts || 0), 0);
    const avgPassRate = tests.length ? Math.round(tests.reduce((s, t) => s + (t.passRate || 0), 0) / tests.length) : 0;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Practice Tests</h1>
                    <p className="text-slate-500">Manage all practice tests and view attempt analytics</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tests', value: tests.length, color: 'bg-violet-50 border-violet-200 text-violet-700' },
                        { label: 'Published', value: published, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                        { label: 'Total Attempts', value: totalAttempts, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                        { label: 'Avg Pass Rate', value: `${avgPassRate}%`, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                    ].map(s => (
                        <div key={s.label} className={`${s.color} rounded-2xl border p-4`}>
                            <p className="text-2xl font-black">{s.value}</p>
                            <p className="text-xs font-medium mt-1 opacity-70">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center gap-4">
                        <input type="text" value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search tests..."
                            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-72 shadow-sm" />
                        <span className="text-sm text-slate-400">{table.getFilteredRowModel().rows.length} tests</span>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        {table.getHeaderGroups().map(hg => (
                                            <tr key={hg.id}>
                                                {hg.headers.map(header => (
                                                    <th key={header.id} className="px-5 py-4 cursor-pointer hover:bg-slate-100" onClick={header.column.getToggleSortingHandler()}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted()] ?? null}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-5 py-4">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {table.getRowModel().rows.length === 0 && (
                                    <div className="p-10 text-center text-slate-400">No practice tests found.</div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <span className="text-sm text-slate-500">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
                                <div className="space-x-2">
                                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:opacity-50 text-sm">Previous</button>
                                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border border-slate-300 rounded-lg bg-white text-slate-600 disabled:opacity-50 text-sm">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {analyticsTest && <AttemptAnalyticsModal test={analyticsTest} onClose={() => setAnalyticsTest(null)} />}
        </AdminLayout>
    );
}

export default AdminPracticeTests;
