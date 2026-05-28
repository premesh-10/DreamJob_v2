import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import AdminLayout from '../../components/AdminLayout';
import ExportButtons from '../../components/ExportButtons';

function AdminSellers() {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [viewSeller, setViewSeller] = useState(null);

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const { data } = await api.get('/admin/sellers');
                setSellers(data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSellers();
    }, []);

    const handleStatusChange = async (sellerId, newStatus) => {
        if(window.confirm(`Change seller status to ${newStatus}?`)) {
            try {
                await api.put(`/sellers/${sellerId}/status`, { status: newStatus });
                alert('Seller status updated successfully');
                // Refresh data
                const { data } = await api.get('/admin/sellers');
                setSellers(data.data);
            } catch (error) {
                alert('Failed to update seller status');
            }
        }
    };

    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('user.name', {
            header: 'Name',
            cell: info => <span className="font-medium text-slate-900">{info.getValue() || 'Unknown'}</span>,
        }),
        columnHelper.accessor('user.email', {
            header: 'Email',
            cell: info => info.getValue() || 'Unknown',
        }),
        columnHelper.accessor('contentType', {
            header: 'Content Type',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => (
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    info.getValue() === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    info.getValue() === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    info.getValue() === 'verifying' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                }`}>
                    {info.getValue() === 'applied' ? '📥 Applied' :
                     info.getValue() === 'verifying' ? '🔍 Verifying' :
                     info.getValue() === 'approved' ? '✅ Approved' : '❌ Rejected'}
                </span>
            )
        }),
        columnHelper.accessor('earnings', {
            header: 'Earnings',
            cell: info => <span className="font-medium text-emerald-600">${info.getValue()?.toFixed(2) || '0.00'}</span>,
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: (props) => {
                const seller = props.row.original;
                return (
                    <div className="flex items-center gap-3">
                        <select
                            value={seller.status}
                            onChange={e => handleStatusChange(seller._id, e.target.value)}
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="applied">📥 Applied</option>
                            <option value="verifying">🔍 Verifying</option>
                            <option value="approved">✅ Approved</option>
                            <option value="rejected">❌ Rejected</option>
                        </select>
                        <button onClick={() => setViewSeller(seller)} className="text-slate-600 hover:text-slate-800 font-medium text-xs">View</button>
                    </div>
                );
            },
        })
    ], []);

    const table = useReactTable({
        data: sellers,
        columns,
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Seller Management</h1>
                        <p className="text-slate-500">Review applications and monitor seller performance</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search sellers..."
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                        <ExportButtons
                            data={sellers}
                            filename="Sellers_Report"
                            columns={[
                                { header: 'Name', key: 'user', format: (v) => v?.name || 'Unknown' },
                                { header: 'Email', key: 'user', format: (v) => v?.email || '' },
                                { header: 'Content Type', key: 'contentType' },
                                { header: 'Expertise', key: 'targetedCourse' },
                                { header: 'Status', key: 'status' },
                                { header: 'Earnings', key: 'earnings', format: (v) => `$${(v || 0).toFixed(2)}` },
                                { header: 'Applied On', key: 'createdAt', format: (v) => new Date(v).toLocaleDateString() },
                            ]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading sellers...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th key={header.id} className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={header.column.getToggleSortingHandler()}>
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                        {{
                                                            asc: ' 🔼',
                                                            desc: ' 🔽',
                                                        }[header.column.getIsSorted()] ?? null}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50 transition">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-6 py-4">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                                </span>
                                <div className="space-x-2">
                                    <button 
                                        onClick={() => table.previousPage()}
                                        disabled={!table.getCanPreviousPage()}
                                        className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button 
                                        onClick={() => table.nextPage()}
                                        disabled={!table.getCanNextPage()}
                                        className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* View Seller Modal */}
            {viewSeller && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-bold text-slate-900">Seller Details</h2>
                            <button onClick={() => setViewSeller(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-lg">✕</button>
                        </div>

                        {/* Avatar + name */}
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-black">
                                {viewSeller.user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-lg">{viewSeller.user?.name}</p>
                                <p className="text-slate-500 text-sm">{viewSeller.user?.email}</p>
                                {viewSeller.user?.mobile && <p className="text-slate-400 text-xs">{viewSeller.user.mobile}</p>}
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {[
                                { label: 'Content Type', value: viewSeller.contentType },
                                { label: 'Expertise', value: viewSeller.targetedCourse || '—' },
                                { label: 'Total Earnings', value: `$${viewSeller.earnings?.toFixed(2) || '0.00'}` },
                                { label: 'Courses Created', value: viewSeller.courseCount ?? viewSeller.totalCourses ?? 0 },
                                { label: 'Total Students', value: viewSeller.totalStudents ?? 0 },
                                { label: 'Member Since', value: new Date(viewSeller.createdAt).toLocaleDateString() },
                            ].map(item => (
                                <div key={item.label} className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                                    <p className="font-semibold text-slate-800">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-slate-700">Application Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                viewSeller.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                viewSeller.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                viewSeller.status === 'verifying' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                            }`}>
                                {viewSeller.status === 'applied' ? '📥 Applied' :
                                 viewSeller.status === 'verifying' ? '🔍 Verifying' :
                                 viewSeller.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                            </span>
                        </div>

                        {/* Bio */}
                        {viewSeller.bio && (
                            <div className="mb-4">
                                <p className="text-xs text-slate-400 mb-1">Bio</p>
                                <p className="text-slate-600 text-sm leading-relaxed">{viewSeller.bio}</p>
                            </div>
                        )}

                        <button onClick={() => setViewSeller(null)}
                            className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AdminSellers;
