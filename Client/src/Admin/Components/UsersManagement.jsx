import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaSearch, FaUserSlash, FaTrashAlt, FaUserCheck, 
    FaShieldAlt, FaEnvelope, FaCalendarAlt, FaExclamationTriangle,
    FaEye, FaHistory, FaAd
} from 'react-icons/fa';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);

    // ✅ CORRECT: Backend Railway pe hai
    const API_BASE_URL = "https://rezon.up.railway.app/api/admin";

    const getAuthHeaders = () => ({
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}`,
            'Content-Type': 'application/json'
        }
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/users/all`, getAuthHeaders());
            
            const usersData = res.data.users || res.data.data || res.data;
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (err) {
            console.error("Fetch Error:", err);
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Session expired! Please login again.");
                localStorage.removeItem('firebaseIdToken');
                window.location.href = '/login';
            } else {
                toast.error(err.response?.data?.message || "Users load nahi ho sake!");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        const actionConfig = {
            delete: { 
                msg: "Kya aap waqai is user ko DELETE karna chahte hain? Sab data permanently delete ho jayega!",
                color: "text-rose-500"
            },
            block: { 
                msg: "Kya aap is user ko BLOCK karna chahte hain? User login nahi kar payega.",
                color: "text-amber-500"
            },
            unblock: { 
                msg: "Kya aap is user ko UNBLOCK karna chahte hain?",
                color: "text-emerald-500"
            }
        };

        const config = actionConfig[action];
        if (!window.confirm(config.msg)) return;
        
        try {
            if (action === 'delete') {
                await axios.delete(`${API_BASE_URL}/users/${userId}`, getAuthHeaders());
                toast.success("🗑️ User permanently delete ho gaya");
            } else {
                await axios.post(`${API_BASE_URL}/users/toggle-block`, { userId }, getAuthHeaders());
                toast.success(`✅ User ${action === 'block' ? 'blocked' : 'unblocked'} ho gaya`);
            }
            fetchUsers(); 
        } catch (err) {
            toast.error(err.response?.data?.message || "❌ Action fail ho gaya");
        }
    };

    const viewUserDetails = async (user) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/users/${user.uid || user._id}`, getAuthHeaders());
            setSelectedUser(res.data.user || res.data);
            setShowUserModal(true);
        } catch (err) {
            setSelectedUser(user);
            setShowUserModal(true);
        }
    };

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const name = (user.displayName || user.name || user.fullName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const phone = (user.phone || user.phoneNumber || "").toLowerCase();
        
        return name.includes(searchLower) || 
               email.includes(searchLower) || 
               phone.includes(searchLower);
    });

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-8 w-48 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-10 w-64 bg-slate-800 rounded animate-pulse"></div>
                </div>
                {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <FaShieldAlt className="text-emerald-500" />
                        Users Management
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Total {users.length} users • {users.filter(u => u.isOnline).length} online
                    </p>
                </div>
                
                <div className="relative w-full md:w-96 group">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search by name, email or phone..." 
                        className="w-full bg-slate-800 text-slate-200 pl-12 pr-4 py-3 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-sm placeholder:text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: users.length, color: 'emerald', icon: FaShieldAlt },
                    { label: 'Online Now', value: users.filter(u => u.isOnline).length, color: 'blue', icon: FaUserCheck },
                    { label: 'Blocked', value: users.filter(u => u.isBlocked).length, color: 'rose', icon: FaUserSlash },
                    { label: 'New Today', value: users.filter(u => {
                        const created = new Date(u.createdAt);
                        const today = new Date();
                        return created.toDateString() === today.toDateString();
                    }).length, color: 'amber', icon: FaCalendarAlt }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                            <stat.icon className={`text-${stat.color}-500 text-lg`} />
                        </div>
                        <p className={`text-2xl font-black text-${stat.color}-400`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredUsers.map((user) => (
                                <tr key={user._id || user.uid} className="hover:bg-slate-800/50 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img 
                                                    src={user.photoURL || user.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                                    alt="profile" 
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 group-hover:border-emerald-500 transition-colors"
                                                    onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                                />
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${user.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-200 uppercase tracking-tight text-sm">
                                                    {user.displayName || user.name || "Unknown User"}
                                                </p>
                                                <p className="text-[10px] text-slate-500">ID: {(user.uid || user._id || "").substring(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                <FaEnvelope className="text-slate-500" />
                                                {user.email || "No email"}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                    <span>📱</span>
                                                    {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            user.isBlocked 
                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                            {user.isBlocked ? '🔒 Blocked' : '✅ Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        }) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => viewUserDetails(user)}
                                                className="p-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 hover:text-white transition-all active:scale-95"
                                                title="View Details"
                                            >
                                                <FaEye size={16} />
                                            </button>

                                            <button 
                                                onClick={() => handleAction(user._id || user.uid, user.isBlocked ? 'unblock' : 'block')}
                                                className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                                                    user.isBlocked 
                                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                                                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white'
                                                }`}
                                                title={user.isBlocked ? 'Unblock User' : 'Block User'}
                                            >
                                                {user.isBlocked ? <FaUserCheck size={16} /> : <FaUserSlash size={16} />}
                                            </button>

                                            <button 
                                                onClick={() => handleAction(user._id || user.uid, 'delete')}
                                                className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                                                title="Delete User Permanently"
                                            >
                                                <FaTrashAlt size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaSearch className="text-slate-600 text-3xl" />
                        </div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Koi user nahi mila</p>
                        <p className="text-slate-600 text-xs mt-2">Try different search terms</p>
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {showUserModal && selectedUser && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <FaShieldAlt className="text-emerald-500" />
                                User Details
                            </h3>
                            <button 
                                onClick={() => setShowUserModal(false)}
                                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={selectedUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700"
                                    alt="Profile"
                                />
                                <div>
                                    <h4 className="text-2xl font-bold text-white">{selectedUser.displayName || selectedUser.name}</h4>
                                    <p className="text-emerald-400 text-sm">{selectedUser.email}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${selectedUser.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {selectedUser.isOnline ? '🟢 Online' : '⚪ Offline'}
                                        </span>
                                        {selectedUser.isBlocked && (
                                            <span className="px-2 py-1 rounded text-xs font-bold bg-rose-500/20 text-rose-400">
                                                🔒 Blocked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-500 text-xs uppercase">Total Ads</p>
                                    <p className="text-xl font-black text-white">{selectedUser.adsCount || 0}</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-500 text-xs uppercase">Reports</p>
                                    <p className="text-xl font-black text-rose-400">{selectedUser.reportsCount || 0}</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-500 text-xs uppercase">Warnings</p>
                                    <p className="text-xl font-black text-amber-400">{selectedUser.warnings || 0}</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <p className="text-slate-500 text-xs uppercase">Member Since</p>
                                    <p className="text-sm font-bold text-slate-300">
                                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManagement;