import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaSearch, FaUserSlash, FaTrashAlt, FaUserCheck } from 'react-icons/fa';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // ✅ UPDATED: RAILWAY LIVE API URL
    const API_BASE_URL = "https://rezon.up.railway.app/api";
    const API_URL = `${API_BASE_URL}/admin/users`;

    const getAuthHeaders = () => ({
        headers: { 'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}` }
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/all`, getAuthHeaders());
            setUsers(res.data);
        } catch (err) {
            console.error("Fetch Error:", err);
            toast.error("Users load nahi ho sakay. Railway connection check karein!");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        const confirmMsg = action === 'delete' 
            ? "Kya aap waqai is user ko delete karna chahte hain?"
            : `Kya aap is user ko ${action} karna chahte hain?`;

        if (!window.confirm(confirmMsg)) return;
        
        try {
            if (action === 'delete') {
                await axios.delete(`${API_URL}/${userId}`, getAuthHeaders());
                toast.success("User delete ho gaya");
            } else {
                await axios.post(`${API_URL}/toggle-block`, { userId }, getAuthHeaders());
                toast.success(`User status update ho gaya`);
            }
            fetchUsers(); 
        } catch (err) {
            toast.error(err.response?.data?.message || "Action fail ho gaya");
        }
    };

    const filteredUsers = users.filter(user => {
        const nameToSearch = (user.displayName || user.name || user.fullName || "No Name").toLowerCase();
        const emailToSearch = (user.email || "").toLowerCase();
        return nameToSearch.includes(searchTerm.toLowerCase()) || 
               emailToSearch.includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-10 w-10 border-4 border-pink-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Users Directory</h2>
                
                <div className="relative w-full md:w-80">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium text-sm"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b">
                        <tr>
                            <th className="px-6 py-4">User Details</th>
                            <th className="px-6 py-4">Email Address</th>
                            <th className="px-6 py-4">Account Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map((user) => (
                            <tr key={user._id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img 
                                                src={user.photoURL || user.image || user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                                alt="profile" 
                                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                            />
                                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        </div>
                                        <span className="font-bold text-gray-800 uppercase tracking-tight text-sm">
                                            {user.displayName || user.name || user.fullName || "Unknown User"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-medium text-xs">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                        user.isBlocked ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                                    }`}>
                                        {user.isBlocked ? 'Blocked' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-3">
                                        <button 
                                            onClick={() => handleAction(user._id, user.isBlocked ? 'unblock' : 'block')}
                                            className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                                                user.isBlocked 
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            }`}
                                            title={user.isBlocked ? 'Unblock User' : 'Block User'}
                                        >
                                            {user.isBlocked ? <FaUserCheck size={18} /> : <FaUserSlash size={18} />}
                                        </button>

                                        <button 
                                            onClick={() => handleAction(user._id, 'delete')}
                                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all active:scale-90 shadow-sm"
                                            title="Delete User"
                                        >
                                            <FaTrashAlt size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-gray-200 mb-2 flex justify-center"><FaSearch size={40} /></div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Koi bhi user nahi mila...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersManagement;