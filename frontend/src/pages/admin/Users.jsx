import { useState, useEffect } from 'react';
import api from '../../lib/api';
import AdminLayout from '../../components/AdminLayout';
import ExportButtons from '../../components/ExportButtons';

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editModal, setEditModal] = useState({ open: false, user: null, role: '' });
    const [actionLoading, setActionLoading] = useState(null);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleBlock = async (userId) => {
        if (window.confirm('Are you sure you want to toggle block status for this user?')) {
            setActionLoading(userId + '_block');
            try {
                const { data } = await api.patch(`/admin/users/${userId}/block`, {});
                alert(data.message);
                // Update local state to reflect change immediately
                setUsers(prev => prev.map(u =>
                    u._id === userId ? { ...u, isBlocked: data.isBlocked } : u
                ));
            } catch (error) {
                alert('Failed to update user status: ' + (error.response?.data?.message || error.message));
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handleEditRole = async () => {
        setActionLoading(editModal.user._id + '_role');
        try {
            const { data } = await api.patch(`/admin/users/${editModal.user._id}/role`, { role: editModal.role });
            alert(`Role updated to ${editModal.role}`);
            setUsers(prev => prev.map(u => u._id === editModal.user._id ? { ...u, role: editModal.role } : u));
            setEditModal({ open: false, user: null, role: '' });
        } catch (error) {
            alert('Failed to update role: ' + (error.response?.data?.message || error.message));
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const allRoles = ['user', 'seller', 'admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'];

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                        <p className="text-slate-500">Manage platform users, roles, and access</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search users..."
                            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 shadow-sm"
                        />
                        <ExportButtons
                            data={filteredUsers}
                            filename="Users_Report"
                            columns={[
                                { header: 'Name', key: 'name' },
                                { header: 'Email', key: 'email' },
                                { header: 'Role', key: 'role' },
                                { header: 'Subscription', key: 'subscription', format: (v) => v?.plan || 'None' },
                                { header: 'Status', key: 'isBlocked', format: (v) => v ? 'Blocked' : 'Active' },
                                { header: 'Wallet Balance', key: 'walletBalance', format: (v) => `$${(v || 0).toFixed(2)}` },
                                { header: 'Joined', key: 'createdAt', format: (v) => new Date(v).toLocaleDateString() },
                            ]}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Loading users...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Subscription</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Joined</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map(u => (
                                        <tr key={u._id} className={`hover:bg-slate-50 transition ${u.isBlocked ? 'opacity-60 bg-red-50' : ''}`}>
                                            <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                                            <td className="px-6 py-4">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                                                    u.role.includes('admin') || u.role === 'moderator' ? 'bg-purple-100 text-purple-700' :
                                                    u.role === 'seller' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                                                    u.subscription?.plan === 'None' ? 'bg-slate-100 text-slate-600' :
                                                    u.subscription?.plan === 'Ruby' ? 'bg-rose-100 text-rose-700' :
                                                    u.subscription?.plan === 'Platinum' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-slate-200 text-slate-800'
                                                }`}>
                                                    {u.subscription?.plan || 'NONE'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {u.isBlocked ? 'Blocked' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={() => setEditModal({ open: true, user: u, role: u.role })}
                                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        Edit Role
                                                    </button>
                                                    <button
                                                        onClick={() => handleBlock(u._id)}
                                                        disabled={actionLoading === u._id + '_block'}
                                                        className={`font-medium ${u.isBlocked ? 'text-green-600 hover:text-green-800' : 'text-rose-600 hover:text-rose-800'}`}
                                                    >
                                                        {actionLoading === u._id + '_block' ? '...' : u.isBlocked ? 'Unblock' : 'Block'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="p-10 text-center text-slate-500">No users found.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Role Modal */}
            {editModal.open && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Edit Role for {editModal.user?.name}</h3>
                        <select
                            value={editModal.role}
                            onChange={e => setEditModal({ ...editModal, role: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-6"
                        >
                            {allRoles.map(r => (
                                <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                        </select>
                        <div className="flex space-x-3">
                            <button onClick={() => setEditModal({ open: false, user: null, role: '' })}
                                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium">Cancel</button>
                            <button
                                onClick={handleEditRole}
                                disabled={actionLoading}
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60">
                                {actionLoading ? 'Saving...' : 'Save Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AdminUsers;
