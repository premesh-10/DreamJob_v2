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

function AdminPayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const { data } = await api.get('/admin/payments');
                setPayments(data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchPayments();
    }, []);

    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('_id', {
            header: 'Transaction ID',
            cell: info => <span className="font-mono text-xs text-slate-500">{info.getValue().substring(0, 8)}...</span>,
        }),
        columnHelper.accessor('user.name', {
            header: 'User',
            cell: info => <span className="font-medium text-slate-900">{info.getValue() || 'Unknown'}</span>,
        }),
        columnHelper.accessor('type', {
            header: 'Type',
            cell: info => (
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    info.getValue() === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                    {info.getValue()}
                </span>
            )
        }),
        columnHelper.accessor('amount', {
            header: 'Amount',
            cell: info => <span className="font-bold text-slate-900">${info.getValue()?.toFixed(2)}</span>,
        }),
        columnHelper.accessor('description', {
            header: 'Description',
            cell: info => <span className="text-slate-600 text-sm max-w-xs truncate block" title={info.getValue()}>{info.getValue() || '—'}</span>,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: info => (
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    info.getValue() === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {info.getValue()}
                </span>
            )
        }),
        columnHelper.accessor('createdAt', {
            header: 'Date',
            cell: info => new Date(info.getValue()).toLocaleString(),
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: () => (
                <button className="text-blue-600 hover:text-blue-800 font-medium">Refund</button>
            ),
        })
    ], []);

    const table = useReactTable({
        data: payments,
        columns,
        state: { globalFilter },
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
                        <h1 className="text-3xl font-bold text-slate-900">Financial Operations</h1>
                        <p className="text-slate-500">Monitor Stripe payments, wallet transactions, and process refunds</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search transactions..."
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                        <ExportButtons
                            data={payments}
                            filename="Payments_Report"
                            columns={[
                                { header: 'Transaction ID', key: '_id' },
                                { header: 'User', key: 'user', format: (v) => v?.name || 'Unknown' },
                                { header: 'Type', key: 'type' },
                                { header: 'Amount', key: 'amount', format: (v) => `$${(v || 0).toFixed(2)}` },
                                { header: 'Description', key: 'description' },
                                { header: 'Status', key: 'status' },
                                { header: 'Date', key: 'createdAt', format: (v) => new Date(v).toLocaleString() },
                            ]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading transactions...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th key={header.id} className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={header.column.getToggleSortingHandler()}>
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
                                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50">Previous</button>
                                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default AdminPayments;
