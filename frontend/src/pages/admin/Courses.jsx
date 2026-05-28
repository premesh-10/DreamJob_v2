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

function AdminCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/admin/courses');
            setCourses(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleTogglePublish = async (courseId, currentStatus) => {
        if (window.confirm(`${currentStatus ? 'Unpublish' : 'Publish'} this course?`)) {
            try {
                const { data } = await api.patch(`/admin/courses/${courseId}/publish`, {});
                alert(data.message);
                setCourses(prev => prev.map(c => c._id === courseId ? { ...c, isPublished: data.isPublished } : c));
            } catch (error) {
                alert('Failed: ' + (error.response?.data?.message || error.message));
            }
        }
    };

    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('title', {
            header: 'Course Title',
            cell: info => <div className="font-medium text-slate-900 max-w-[200px] truncate">{info.getValue()}</div>,
        }),
        columnHelper.accessor('seller.name', {
            header: 'Seller',
            cell: info => info.getValue() || 'Unknown',
        }),
        columnHelper.accessor('category', {
            header: 'Category',
            cell: info => <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase">{info.getValue()}</span>,
        }),
        columnHelper.accessor('price', {
            header: 'Price',
            cell: info => <span className="font-medium text-emerald-600">${info.getValue()?.toFixed(2)}</span>,
        }),
        columnHelper.accessor('isPublished', {
            header: 'Status',
            cell: info => (
                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                    info.getValue() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {info.getValue() ? 'Published' : 'Draft'}
                </span>
            )
        }),
        columnHelper.accessor('enrolledUsers', {
            header: 'Enrollments',
            cell: info => info.getValue()?.length || 0,
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: (props) => {
                const course = props.row.original;
                return (
                    <div className="flex space-x-3">
                        <button
                            onClick={() => handleTogglePublish(course._id, course.isPublished)}
                            className={`font-medium ${course.isPublished ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}
                        >
                            {course.isPublished ? 'Unpublish' : 'Publish'}
                        </button>
                    </div>
                );
            },
        })
    ], []);

    const table = useReactTable({
        data: courses,
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
                        <h1 className="text-3xl font-bold text-slate-900">Content Moderation</h1>
                        <p className="text-slate-500">Review, approve, and manage uploaded courses</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search courses..."
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                        <ExportButtons
                            data={courses}
                            filename="Courses_Report"
                            columns={[
                                { header: 'Title', key: 'title' },
                                { header: 'Seller', key: 'seller', format: (v) => v?.name || 'Unknown' },
                                { header: 'Category', key: 'category' },
                                { header: 'Price', key: 'price', format: (v) => `$${(v||0).toFixed(2)}` },
                                { header: 'Status', key: 'isPublished', format: (v) => v ? 'Published' : 'Draft' },
                                { header: 'Enrollments', key: 'enrolledUsers', format: (v) => v?.length || 0 },
                                { header: 'Rating', key: 'rating', format: (v) => (v||0).toFixed(1) },
                            ]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading courses...</div>
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
                                {table.getRowModel().rows.length === 0 && (
                                    <div className="p-10 text-center text-slate-500">No courses found.</div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
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

export default AdminCourses;
