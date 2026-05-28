import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../features/auth/authSlice';
import api from '../lib/api';
import Layout from '../components/Layout';

function Profile() {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        experience: '',
        gender: '',
        qualification: '',
        country: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                mobile: user.mobile || '',
                experience: user.experience || '',
                gender: user.gender || '',
                qualification: user.qualification || '',
                country: user.country || '',
            });
        }
    }, [user]);

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg('');
        try {
            const { data } = await api.put('/users/profile', formData);
            
            // Update Redux store so sidebar and everywhere else reflects new name instantly
            dispatch(setUser(data.data));
            
            setIsEditing(false);
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error(error);
            alert('Failed to update profile: ' + (error.response?.data?.message || error.message));
        }
        setLoading(false);
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                {successMsg && (
                    <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium">
                        ✓ {successMsg}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Read Only)</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                                <input
                                    type="text"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                                <input
                                    type="text"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    placeholder="e.g. 3 years"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                                <input
                                    type="text"
                                    name="qualification"
                                    value={formData.qualification}
                                    onChange={onChange}
                                    disabled={!isEditing}
                                    placeholder="e.g. B.Tech Computer Science"
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Subscription Info */}
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Subscription</h3>
                            <div className="flex items-center space-x-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    user?.subscription?.plan === 'None' ? 'bg-slate-100 text-slate-600' :
                                    user?.subscription?.plan === 'Ruby' ? 'bg-rose-100 text-rose-700' :
                                    user?.subscription?.plan === 'Platinum' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-slate-200 text-slate-800'
                                }`}>
                                    {user?.subscription?.plan || 'Free'}
                                </span>
                                {user?.subscription?.plan !== 'None' && user?.subscription?.validUntil && (
                                    <span className="text-sm text-slate-500">
                                        Valid until {new Date(user.subscription.validUntil).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-60"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </Layout>
    );
}

export default Profile;
