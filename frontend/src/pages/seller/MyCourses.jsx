import { useState, useEffect } from 'react';
import SellerLayout from '../../components/SellerLayout';
import api from '../../lib/api';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const CATEGORIES = ['Web Development', 'Mobile Development', 'Data Science', 'Machine Learning', 'DevOps', 'Cloud Computing', 'Cybersecurity', 'UI/UX Design', 'Business', 'Marketing', 'Other'];

const emptyForm = { title: '', description: '', category: '', price: '', levels: ['Beginner'], thumbnail: '', language: 'English' };

const levelColors = { Beginner: 'bg-green-100 text-green-700', Intermediate: 'bg-amber-100 text-amber-700', Advanced: 'bg-red-100 text-red-700' };

function CourseModal({ course, onClose, onSave }) {
    const initLevels = course?.levels?.length > 0 ? course.levels : (course?.level ? [course.level] : ['Beginner']);
    const [form, setForm] = useState({ ...(course || emptyForm), levels: initLevels });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isEdit = !!course?._id;

    const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const toggleLevel = (lvl) => {
        setForm(p => {
            const current = p.levels || [];
            const updated = current.includes(lvl)
                ? current.filter(l => l !== lvl)
                : [...current, lvl];
            return { ...p, levels: updated.length === 0 ? [lvl] : updated, level: updated[0] || lvl };
        });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            if (isEdit) {
                await api.put(`/courses/${course._id}`, form);
            } else {
                await api.post('/courses', form);
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save course');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Course' : 'Create New Course'}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">✕</button>
                </div>
                {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Title *</label>
                            <input type="text" name="title" value={form.title} onChange={handleChange} required
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Complete Python Bootcamp" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description *</label>
                            <textarea name="description" value={form.description} onChange={handleChange} required rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="What will students learn?" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                            <select name="category" value={form.category} onChange={handleChange} required
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none">
                                <option value="">Select category</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Difficulty Level(s) *</label>
                            <p className="text-xs text-slate-400 mb-2">Select all levels that apply to this course</p>
                            <div className="flex gap-3">
                                {LEVELS.map(lvl => (
                                    <button key={lvl} type="button" onClick={() => toggleLevel(lvl)}
                                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${form.levels?.includes(lvl)
                                            ? lvl === 'Beginner' ? 'border-green-500 bg-green-50 text-green-700'
                                              : lvl === 'Intermediate' ? 'border-amber-500 bg-amber-50 text-amber-700'
                                              : 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                                        {form.levels?.includes(lvl) ? '✓ ' : ''}{lvl}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price ($)</label>
                            <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="0 for free" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Language</label>
                            <input type="text" name="language" value={form.language} onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Thumbnail URL</label>
                            <input type="url" name="thumbnail" value={form.thumbnail} onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="https://..." />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold disabled:opacity-60">
                            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MyCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalCourse, setModalCourse] = useState(undefined); // undefined=closed, null=create, object=edit

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/courses/mine');
            setCourses(data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCourses(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this course? This cannot be undone.')) return;
        try {
            await api.delete(`/courses/${id}`);
            fetchCourses();
        } catch (err) { alert('Failed to delete course'); }
    };

    return (
        <SellerLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">My Courses</h1>
                        <p className="text-slate-500 mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} created</p>
                    </div>
                    <button onClick={() => setModalCourse(null)}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition">
                        + Create Course
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                        <span className="text-6xl">📚</span>
                        <p className="text-slate-600 font-semibold mt-4 text-lg">No courses yet</p>
                        <p className="text-slate-400 text-sm mt-1">Create your first course and start earning!</p>
                        <button onClick={() => setModalCourse(null)} className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
                            Create Course
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {courses.map(course => (
                            <div key={course._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition">
                                {/* Thumbnail */}
                                <div className="aspect-video bg-gradient-to-br from-indigo-100 to-violet-100 relative overflow-hidden">
                                    {course.thumbnail ? (
                                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl">📚</div>
                                    )}
                                    <div className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${course.isPublished ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'}`}>
                                        {course.isPublished ? '✓ Published' : 'Draft'}
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-slate-900 leading-snug line-clamp-2">{course.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                                        {(course.levels?.length > 0 ? course.levels : [course.level]).map(l => (
                                            <span key={l} className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[l] || 'bg-slate-100 text-slate-600'}`}>{l}</span>
                                        ))}
                                        <span className="text-xs text-slate-500">{course.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                                        <span className="font-bold text-lg text-slate-900">{course.price > 0 ? `$${course.price}` : 'Free'}</span>
                                        <span>👥 {course.enrolledUsers?.length || 0} students</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setModalCourse(course)}
                                            className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(course._id)}
                                            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {modalCourse !== undefined && (
                <CourseModal
                    course={modalCourse}
                    onClose={() => setModalCourse(undefined)}
                    onSave={fetchCourses}
                />
            )}
        </SellerLayout>
    );
}

export default MyCourses;
