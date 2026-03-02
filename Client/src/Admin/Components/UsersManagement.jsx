import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaSearch, FaUserSlash, FaTrashAlt, FaUserCheck } from 'react-icons/fa';

const UsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Backend Base URL
    const API_URL = "http://localhost:8000/api/admin/users";

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
            toast.error("Users load nahi ho sakay. Backend connection check karein!");
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

    // ✅ FIXED: Filter logic multiple fields check karega (name, displayName, fullName)
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
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Users Directory</h2>
                
                <div className="relative w-full md:w-80">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Name ya email se search karein..." 
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">User Details</th>
                            <th className="px-6 py-4">Email Address</th>
                            <th className="px-6 py-4">Account Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.map((user) => (
                            <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img 
                                            src={user.photoURL || user.image || user.profilePic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                            alt="profile" 
                                            className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
                                            onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                                        />
                                        {/* ✅ FIXED: Multiple keys check for Name */}
                                        <span className="font-semibold text-gray-700">
                                            {user.displayName || user.name || user.fullName || "Unknown User"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        user.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                        {user.isBlocked ? 'Blocked' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-3">
                                        <button 
                                            onClick={() => handleAction(user._id, user.isBlocked ? 'unblock' : 'block')}
                                            className={`p-2.5 rounded-lg transition-all ${
                                                user.isBlocked 
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            }`}
                                        >
                                            {user.isBlocked ? <FaUserCheck size={18} /> : <FaUserSlash size={18} />}
                                        </button>

                                        <button 
                                            onClick={() => handleAction(user._id, 'delete')}
                                            className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all shadow-sm"
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
                    <div className="text-center py-12">
                        <p className="text-gray-400 italic">Koi bhi user nahi mila...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UsersManagement;