import { useState, useEffect, useMemo } from 'react';
import api from '../../lib/api';
import {
  createColumnHelper, flexRender,
  getCoreRowModel, useReactTable,
  getPaginationRowModel, getSortedRowModel, getFilteredRowModel,
} from '@tanstack/react-table';
import AdminLayout from '../../components/AdminLayout';
import ExportButtons from '../../components/ExportButtons';

const API_BASE = 'http://localhost:5000';
const getFileUrl = (p) => p ? (p.startsWith('http') ? p : `${API_BASE}${p}`) : '';
const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDuration = (secs) => {
    if (!secs || secs <= 0) return null;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s > 0 ? `${s}s` : ''}`.trim();
    return `${s}s`;
};

// ── Action Reason Modal ────────────────────────────────────────────────────────
function ActionReasonModal({ title, promptText, actionText, actionColor, isOpen, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    if (!isOpen) return null;
    const btnColorClass = actionColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-4">{promptText || 'Please provide a reason. This will be sent to the seller.'}</p>
                <textarea 
                    value={reason} onChange={e => setReason(e.target.value)} required rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
                    placeholder="Reason..."
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200">Cancel</button>
                    <button onClick={() => { if(reason.trim()) onConfirm(reason.trim()); }} disabled={!reason.trim()} className={`flex-1 py-2.5 text-white rounded-xl font-semibold disabled:opacity-50 ${btnColorClass}`}>
                        {actionText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Course Detail Drawer ───────────────────────────────────────────────────────
function CourseDrawer({ course, onClose, onUpdate }) {
    const [tab, setTab] = useState('chapters');

    const handleApproveChapter = async (chapterId) => {
        try {
            const { data } = await api.patch(`/admin/courses/${course._id}/chapters/${chapterId}/approve`, {});
            if (onUpdate) onUpdate(course._id, data.course);
        } catch { alert('Failed to approve chapter'); }
    };

    const handleApproveResource = async (resourceId) => {
        try {
            const { data } = await api.patch(`/admin/courses/${course._id}/resources/${resourceId}/approve`, {});
            if (onUpdate) onUpdate(course._id, data.course);
        } catch { alert('Failed to approve resource'); }
    };
    const [publishing, setPublishing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [rejectChapterTarget, setRejectChapterTarget] = useState(null);

    const handleTogglePublish = async () => {
        setPublishing(true);
        try {
            const { data } = await api.patch(`/admin/courses/${course._id}/publish`, {});
            onUpdate(course._id, { isPublished: data.isPublished });
        } catch { alert('Failed'); }
        finally { setPublishing(false); }
    };

    const handleDeleteCourse = async (reason) => {
        setDeleting(true);
        try {
            await api.delete(`/admin/courses/${course._id}`, { data: { reason } });
            setDeleteTarget(null);
            onClose();
            onUpdate(course._id, null); // null = deleted
        } catch { alert('Failed to delete course'); setDeleting(false); }
    };

    const handleDeleteChapter = async (reason) => {
        const chapterId = deleteTarget.chapterId;
        try {
            const { data } = await api.delete(`/admin/courses/${course._id}/chapters/${chapterId}`, { data: { reason } });
            setDeleteTarget(null);
            if (onUpdate) onUpdate(course._id, data.course);
        } catch { alert('Failed to delete chapter'); }
    };

    const handleRejectChapter = async (reason) => {
        try {
            const { data } = await api.patch(`/admin/courses/${course._id}/chapters/${rejectChapterTarget}/reject`, { reason });
            setRejectChapterTarget(null);
            if (onUpdate) onUpdate(course._id, data.course);
        } catch { alert('Failed to reject chapter request'); }
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-2xl bg-white h-screen overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-start gap-3">
                        {(course.thumbnailPath || course.thumbnail) && (
                            <img src={getFileUrl(course.thumbnailPath || course.thumbnail)} alt=""
                                className="w-16 h-12 object-cover rounded-xl flex-shrink-0"
                                onError={e => e.target.style.display = 'none'} />
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${course.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {course.isPublished ? '✓ Published' : 'Draft'}
                                </span>
                                <span className="text-xs text-slate-400">{course.category}</span>
                            </div>
                            <h2 className="font-bold text-slate-900 text-base leading-tight">{course.title}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">by {course.seller?.name || 'Unknown'} • {course.seller?.email}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={handleTogglePublish} disabled={publishing}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${course.isPublished ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                {publishing ? '...' : course.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button onClick={() => setDeleteTarget({ type: 'course' })} disabled={deleting}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition">
                                {deleting ? '...' : '🗑️ Delete'}
                            </button>
                            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-sm">✕</button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-200 flex-shrink-0">
                    {[
                        { label: 'Students', value: course.enrolledUsers?.length || 0 },
                        { label: 'Chapters', value: course.chapters?.length || 0 },
                        { label: 'Resources', value: course.resources?.length || 0 },
                        { label: 'Rating', value: course.rating?.toFixed(1) || '0.0' },
                    ].map(s => (
                        <div key={s.label} className="bg-white px-3 py-3 text-center">
                            <p className="text-xl font-black text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-400">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 flex-shrink-0">
                    {[['info', 'ℹ️ Info'], ['chapters', '📖 Chapters'], ['resources', '📎 Resources']].map(([id, label]) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`flex-1 py-3 text-sm font-semibold transition ${tab === id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 p-5 overflow-y-auto">
                    {tab === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Description</h3>
                                <p className="text-sm text-slate-700 leading-relaxed">{course.description}</p>
                            </div>
                            {course.whatYoullLearn?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What You'll Learn</h3>
                                    <ul className="space-y-1">
                                        {course.whatYoullLearn.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>{item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-0.5">Price</p>
                                    <p className="font-bold text-slate-800">{course.price > 0 ? `$${course.price}` : 'Free'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-0.5">Language</p>
                                    <p className="font-bold text-slate-800">{course.language || 'English'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-0.5">Level</p>
                                    <p className="font-bold text-slate-800">{(course.levels || [course.level]).join(', ')}</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-0.5">Reviews</p>
                                    <p className="font-bold text-slate-800">{course.totalReviews || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'chapters' && (
                        <div className="space-y-3">
                            {course.chapters?.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No chapters</p>}
                            {course.chapters?.map((ch, idx) => (
                                <div key={ch._id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">{idx + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <p className="font-semibold text-slate-800 text-sm">{ch.title}</p>
                                                {ch.isFree && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Free</span>}
                                                {ch.approvalStatus === 'pending_add' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⏳ Pending Add</span>}
                                                {ch.approvalStatus === 'pending_delete' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">🗑️ Pending Delete</span>}
                                            </div>
                                            {ch.description && <p className="text-xs text-slate-500 mb-2">{ch.description}</p>}
                                            <div className="flex gap-3 flex-wrap">
                                                {ch.videoPath && (
                                                    <a href={getFileUrl(ch.videoPath)} target="_blank" rel="noreferrer"
                                                        className="text-xs text-indigo-600 hover:underline">
                                                        🎬 Video {ch.videoSize ? `(${formatSize(ch.videoSize)})` : ''}
                                                    </a>
                                                )}
                                                {ch.videoUrl && !ch.videoPath && (
                                                    <a href={ch.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">🔗 Video URL</a>
                                                )}
                                                {ch.pdfPath && (
                                                    <a href={getFileUrl(ch.pdfPath)} target="_blank" rel="noreferrer"
                                                        className="text-xs text-red-600 hover:underline">
                                                        📄 {ch.pdfTitle || 'PDF'} {ch.pdfSize ? `(${formatSize(ch.pdfSize)})` : ''}
                                                    </a>
                                                )}
                                                {ch.duration > 0 && <span className="text-xs text-slate-400">⏱️ {fmtDuration(ch.duration)}</span>}
                                                {ch.approvalStatus === 'pending_add' && (
                                                    <>
                                                        <button onClick={() => handleApproveChapter(ch._id)} className="ml-auto text-xs px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm font-semibold">Approve Add</button>
                                                        <button onClick={() => setRejectChapterTarget(ch._id)} className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 shadow-sm font-semibold">Reject</button>
                                                    </>
                                                )}
                                                {ch.approvalStatus === 'pending_delete' && (
                                                    <>
                                                        <button onClick={() => handleApproveChapter(ch._id)} className="ml-auto text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-semibold">Approve Delete</button>
                                                        <button onClick={() => setRejectChapterTarget(ch._id)} className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 shadow-sm font-semibold">Reject</button>
                                                    </>
                                                )}
                                                {ch.approvalStatus !== 'pending_add' && ch.approvalStatus !== 'pending_delete' && (
                                                    <button onClick={() => setDeleteTarget({ type: 'chapter', chapterId: ch._id })} className="ml-auto text-xs px-3 py-1 bg-red-100 text-red-600 border border-red-200 rounded-lg hover:bg-red-200 shadow-sm font-semibold">Delete Video</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'resources' && (
                        <div className="space-y-3">
                            {course.resources?.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No resources</p>}
                            {course.resources?.map(r => (
                                <div key={r._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 text-lg">📄</div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                                                {r.approvalStatus === 'pending_add' && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">⏳ Pending Add</span>}
                                                {r.approvalStatus === 'pending_delete' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">🗑️ Pending Delete</span>}
                                            </div>
                                            <p className="text-xs text-slate-400">{r.fileType?.toUpperCase()} • {formatSize(r.fileSize)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={getFileUrl(r.filePath)} target="_blank" rel="noreferrer"
                                            className="text-xs px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">
                                            View
                                        </a>
                                        {r.approvalStatus === 'pending_add' && (
                                            <button onClick={() => handleApproveResource(r._id)} className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm font-semibold">Approve Add</button>
                                        )}
                                        {r.approvalStatus === 'pending_delete' && (
                                            <button onClick={() => handleApproveResource(r._id)} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm font-semibold">Approve Delete</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <ActionReasonModal
                title={deleteTarget?.type === 'course' ? 'Delete Course' : 'Delete Video'}
                promptText="Please provide a reason for this deletion. This will be sent to the seller."
                actionText="Delete Permanently"
                actionColor="red"
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={deleteTarget?.type === 'course' ? handleDeleteCourse : handleDeleteChapter}
            />

            <ActionReasonModal
                title="Reject Chapter Request"
                promptText="Please provide a reason for rejecting this chapter. This will be sent to the seller."
                actionText="Reject Request"
                actionColor="orange"
                isOpen={!!rejectChapterTarget}
                onClose={() => setRejectChapterTarget(null)}
                onConfirm={handleRejectChapter}
            />
        </div>
    );
}

// ── Main Admin Courses Page ────────────────────────────────────────────────────
function AdminCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const [drawerCourse, setDrawerCourse] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/admin/courses');
            setCourses(data.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchCourses(); }, []);

    const handleTogglePublish = async (courseId, currentStatus) => {
        if (window.confirm(`${currentStatus ? 'Unpublish' : 'Publish'} this course?`)) {
            try {
                const { data } = await api.patch(`/admin/courses/${courseId}/publish`, {});
                setCourses(prev => prev.map(c => c._id === courseId ? { ...c, isPublished: data.isPublished, approvalStatus: data.approvalStatus } : c));
            } catch { alert('Failed'); }
        }
    };

    const handleDeleteCourse = async (reason) => {
        try {
            await api.delete(`/admin/courses/${deleteTarget}`, { data: { reason } });
            setCourses(prev => prev.filter(c => c._id !== deleteTarget));
            setDeleteTarget(null);
        } catch { alert('Failed to delete course'); }
    };

    const handleRejectRequest = async (reason) => {
        try {
            const { data } = await api.patch(`/admin/courses/${rejectTarget}/reject`, { reason });
            setCourses(prev => prev.map(c => c._id === rejectTarget ? { ...c, isPublished: data.course.isPublished, approvalStatus: data.course.approvalStatus } : c));
            setRejectTarget(null);
        } catch { alert('Failed to reject request'); }
    };

    const handleUpdate = (courseId, updates) => {
        if (updates === null) {
            setCourses(prev => prev.filter(c => c._id !== courseId));
            if (drawerCourse?._id === courseId) setDrawerCourse(null);
        } else {
            setCourses(prev => prev.map(c => c._id === courseId ? { ...c, ...updates } : c));
            if (drawerCourse?._id === courseId) setDrawerCourse(prev => ({ ...prev, ...updates }));
        }
    };

    const columnHelper = createColumnHelper();
    const columns = useMemo(() => [
        columnHelper.display({
            id: 'thumb',
            header: '',
            cell: props => {
                const c = props.row.original;
                const src = c.thumbnailPath || c.thumbnail;
                return src ? (
                    <img src={src.startsWith('http') ? src : `${API_BASE}${src}`} alt="" className="w-12 h-9 object-cover rounded-lg"
                        onError={e => e.target.style.display = 'none'} />
                ) : <div className="w-12 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-xl">📚</div>;
            }
        }),
        columnHelper.accessor('title', {
            header: 'Course Title',
            cell: info => (
                <button onClick={() => setDrawerCourse(info.row.original)}
                    className="font-semibold text-slate-900 max-w-[180px] truncate text-left hover:text-blue-700 transition block">
                    {info.getValue()}
                </button>
            ),
        }),
        columnHelper.accessor('seller.name', {
            header: 'Seller',
            cell: info => <span className="text-slate-600">{info.getValue() || 'Unknown'}</span>
        }),
        columnHelper.accessor('category', {
            header: 'Category',
            cell: info => <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase">{info.getValue()}</span>
        }),
        columnHelper.accessor('price', {
            header: 'Price',
            cell: info => <span className="font-semibold text-emerald-600">{info.getValue() > 0 ? `$${info.getValue()?.toFixed(2)}` : 'Free'}</span>
        }),
        columnHelper.accessor('chapters', {
            header: 'Chapters',
            cell: info => `${info.getValue()?.length || 0} ch`
        }),
        columnHelper.accessor('isPublished', {
            header: 'Status',
            cell: info => {
                const isPub = info.getValue();
                const course = info.row.original;
                const approval = course.approvalStatus;
                
                if (approval === 'pending_delete') return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-red-500 text-white animate-pulse shadow-sm">Pending Delete</span>;
                if (approval === 'pending_unpublish') return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-orange-500 text-white animate-pulse shadow-sm">Pending Unpub</span>;
                
                const hasPendingUpdates = (course.chapters || []).some(c => c.approvalStatus === 'pending_add' || c.approvalStatus === 'pending_delete') ||
                                          (course.resources || []).some(r => r.approvalStatus === 'pending_add' || r.approvalStatus === 'pending_delete');

                if (isPub) {
                    if (hasPendingUpdates) return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-purple-500 text-white animate-pulse shadow-sm">Pending Updates</span>;
                    return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Published</span>;
                }
                
                if (approval === 'pending') return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-500 text-white animate-pulse shadow-sm">Pending Publish</span>;
                return <span className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-slate-100 text-slate-500">Draft</span>;
            }
        }),
        columnHelper.accessor('enrolledUsers', {
            header: 'Students',
            cell: info => <span className="font-medium">{info.getValue()?.length || 0}</span>
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: props => {
                const course = props.row.original;
                return (
                    <div className="flex gap-2">
                        <button onClick={() => setDrawerCourse(course)}
                            className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100">
                            View
                        </button>
                        {course.approvalStatus === 'pending_delete' ? (
                            <>
                                <button onClick={() => setDeleteTarget(course._id)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-sm">
                                    Approve Delete
                                </button>
                                <button onClick={() => setRejectTarget(course._id)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm">
                                    Reject
                                </button>
                            </>
                        ) : course.approvalStatus === 'pending_unpublish' ? (
                            <>
                                <button onClick={() => handleTogglePublish(course._id, course.isPublished)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-orange-600 text-white border-orange-700 hover:bg-orange-700 shadow-sm">
                                    Approve Unpub
                                </button>
                                <button onClick={() => setRejectTarget(course._id)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm">
                                    Reject
                                </button>
                            </>
                        ) : course.approvalStatus === 'pending' ? (
                            <>
                                <button onClick={() => handleTogglePublish(course._id, course.isPublished)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm">
                                    Approve Publish
                                </button>
                                <button onClick={() => setRejectTarget(course._id)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium border bg-red-100 text-red-700 hover:bg-red-200 shadow-sm">
                                    Reject
                                </button>
                            </>
                        ) : (
                            <button onClick={() => handleTogglePublish(course._id, course.isPublished)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border ${course.isPublished ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : course.approvalStatus === 'pending' ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                                {course.isPublished ? 'Unpublish' : course.approvalStatus === 'pending' ? 'Approve Publish' : 'Publish'}
                            </button>
                        )}
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

    // Summary
    const published = courses.filter(c => c.isPublished).length;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Content Moderation</h1>
                        <p className="text-slate-500">{published} published / {courses.length} total courses</p>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Search courses..."
                            className="px-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm" />
                        <ExportButtons
                            data={courses}
                            filename="Courses_Report"
                            columns={[
                                { header: 'Title', key: 'title' },
                                { header: 'Seller', key: 'seller', format: (v) => v?.name || 'Unknown' },
                                { header: 'Category', key: 'category' },
                                { header: 'Price', key: 'price', format: (v) => `$${(v || 0).toFixed(2)}` },
                                { header: 'Status', key: 'isPublished', format: (v) => v ? 'Published' : 'Draft' },
                                { header: 'Students', key: 'enrolledUsers', format: (v) => v?.length || 0 },
                                { header: 'Chapters', key: 'chapters', format: (v) => v?.length || 0 },
                            ]}
                        />
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Courses', value: courses.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        { label: 'Published', value: published, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        { label: 'Drafts', value: courses.length - published, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        { label: 'Total Students', value: courses.reduce((s, c) => s + (c.enrolledUsers?.length || 0), 0), color: 'bg-violet-50 text-violet-700 border-violet-200' },
                    ].map(s => (
                        <div key={s.label} className={`${s.color} rounded-2xl border p-4`}>
                            <p className="text-2xl font-black">{s.value}</p>
                            <p className="text-xs font-medium mt-1 opacity-70">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading courses...</div>
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
                                            <tr key={row.id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setDrawerCourse(row.original)}>
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-5 py-4" onClick={e => { if (cell.column.id === 'actions') e.stopPropagation(); }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {table.getRowModel().rows.length === 0 && <div className="p-10 text-center text-slate-500">No courses found.</div>}
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                                <span className="text-sm text-slate-500">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
                                <div className="space-x-2">
                                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50 text-sm">Previous</button>
                                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border border-slate-300 rounded-md bg-white text-slate-600 disabled:opacity-50 text-sm">Next</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {drawerCourse && <CourseDrawer course={drawerCourse} onClose={() => setDrawerCourse(null)} onUpdate={handleUpdate} />}
            <ActionReasonModal
                title="Delete Course"
                promptText="Please provide a reason for this deletion. This will be sent to the seller."
                actionText="Delete Permanently"
                actionColor="red"
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteCourse}
            />

            <ActionReasonModal
                title="Reject Request"
                promptText="Please provide a reason for rejecting this request. This will be sent to the seller."
                actionText="Reject Request"
                actionColor="orange"
                isOpen={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={handleRejectRequest}
            />
        </AdminLayout>
    );
}

export default AdminCourses;
