import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
const getFileUrl = (path) => path ? (path.startsWith('http') ? path : `${API_BASE}${path}`) : '';

function Courses() {
    const [courses, setCourses] = useState([]);
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const { data } = await api.get('/courses');
                setCourses(data.data);
                setFilteredCourses(data.data);
            } catch (error) {
                console.error('Failed to fetch courses', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setFilteredCourses(courses);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = courses.filter(c =>
            c.title?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term) ||
            c.category?.toLowerCase().includes(term) ||
            c.seller?.name?.toLowerCase().includes(term)
        );
        setFilteredCourses(filtered);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleClear = () => {
        setSearchTerm('');
        setFilteredCourses(courses);
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Course Catalog</h1>
                        <p className="text-slate-500 mt-1">Explore our wide range of professional courses</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-full md:w-64"
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                        >
                            Search
                        </button>
                        {searchTerm && (
                            <button
                                onClick={handleClear}
                                className="bg-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-300 text-sm"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500">
                        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        Loading courses...
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        {searchTerm ? (
                            <>
                                <p className="font-medium">No courses found for "{searchTerm}"</p>
                                <button onClick={handleClear} className="mt-3 text-primary-600 font-medium hover:text-primary-700">Show all courses</button>
                            </>
                        ) : (
                            <p>No published courses available yet.</p>
                        )}
                    </div>
                ) : (
                    <>
                        {searchTerm && (
                            <p className="text-slate-500 text-sm">{filteredCourses.length} result{filteredCourses.length !== 1 ? 's' : ''} for "{searchTerm}"</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredCourses.map(course => (
                                <Link key={course._id} to={`/courses/${course._id}`} className="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col">
                                    <div className="aspect-video bg-slate-100 overflow-hidden">
                                        {(course.thumbnailPath || course.thumbnail) ? (
                                            <img
                                                src={getFileUrl(course.thumbnailPath || course.thumbnail)}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                                                <svg className="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="text-xs font-bold text-primary-600 mb-2 uppercase tracking-wide">{course.category}</div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-1.5 line-clamp-2">{course.title}</h3>
                                        <div className="flex items-center gap-1 mb-2">
                                            <span className="text-amber-400 text-sm">★</span>
                                            <span className="text-slate-700 font-semibold text-sm">{(course.rating || 0).toFixed(1)}</span>
                                            <span className="text-slate-400 text-xs ml-1">({course.totalReviews || 0})</span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{course.description}</p>
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                                            <div className="text-sm font-medium text-slate-700">By {course.seller?.name || 'Unknown'}</div>
                                            <div className="font-bold text-lg text-slate-900">
                                                {course.price > 0 ? `$${course.price}` : 'Free'}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

export default Courses;
