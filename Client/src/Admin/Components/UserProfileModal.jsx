import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTimes, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBox, FaHistory, FaFlag } from 'react-icons/fa';
import toast from 'react-hot-toast';

const UserProfileModal = ({ user, onClose }) => {
    const [userAds, setUserAds] = useState([]);
    const [userReports, setUserReports] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✅ UPDATED: RAILWAY LIVE API URL
    const API_BASE_URL = "https://rezon.up.railway.app/api";
    const API_URL = `${API_BASE_URL}/admin`;

    const getAuthHeaders = () => ({
        headers: { 'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}` }
    });

    useEffect(() => {
        if (user?._id) fetchUserDetails();
    }, [user?._id]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            // Parallel API calls for faster loading
            const [adsRes, reportsRes] = await Promise.all([
                axios.get(`${API_URL}/users/${user._id}/ads`, getAuthHeaders()),
                axios.get(`${API_URL}/users/${user._id}/report-history`, getAuthHeaders())
            ]);

            setUserAds(adsRes.data?.ads || []);
            setUserReports(reportsRes.data?.reports || []);
        } catch (err) {
            console.error("Failed to fetch user details:", err);
            toast.error("User history load nahi ho saki.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-white/20">
                {/* Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b p-6 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">User Profile</h2>
                    <button onClick={onClose} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all text-gray-400">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* User Info */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-[2rem] flex items-center justify-center text-4xl text-white font-black shadow-lg">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{user.name}</h3>
                            <div className="mt-2 space-y-1">
                                <p className="text-gray-500 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                                    <FaEnvelope className="text-pink-500" /> {user.email}
                                </p>
                                {user.phone && (
                                    <p className="text-gray-500 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                                        <FaPhone className="text-pink-500" /> {user.phone}
                                    </p>
                                )}
                                {user.location && (
                                    <p className="text-gray-500 font-bold text-sm flex items-center justify-center md:justify-start gap-2">
                                        <FaMapMarkerAlt className="text-pink-500" /> {user.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl text-center group hover:bg-blue-50 transition-colors">
                            <FaBox className="mx-auto mb-2 text-blue-600 text-2xl group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-blue-900">{userAds.length}</p>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Ads</p>
                        </div>
                        <div className="bg-red-50/50 border border-red-100 p-6 rounded-3xl text-center group hover:bg-red-50 transition-colors">
                            <FaFlag className="mx-auto mb-2 text-red-600 text-2xl group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-red-900">{userReports.length}</p>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Reports Against</p>
                        </div>
                    </div>

                    {/* Report History Section */}
                    {userReports.length > 0 && (
                        <div>
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                <FaHistory className="text-orange-500" /> Report History
                            </h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {userReports.map(report => (
                                    <div key={report._id} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl transition-all hover:border-orange-200">
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-red-600 text-xs uppercase tracking-tighter">{report.reason}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${report.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-xs font-medium mt-1 leading-relaxed">"{report.description}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User's Ads Section */}
                    {userAds.length > 0 && (
                        <div className="pb-4">
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                                <FaBox className="text-pink-500" /> Active Listings ({userAds.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {userAds.map(ad => (
                                    <div key={ad._id} className="border border-gray-100 rounded-2xl p-3 flex gap-4 hover:bg-gray-50 transition-all cursor-pointer group">
                                        <img src={ad.images?.[0] || 'https://via.placeholder.com/150'} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform" />
                                        <div className="overflow-hidden flex-1">
                                            <p className="font-bold text-gray-800 text-sm truncate uppercase tracking-tight">{ad.title}</p>
                                            <p className="text-pink-600 font-black text-sm">Rs {ad.price?.toLocaleString()}</p>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${ad.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {ad.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-10">
                            <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fetching user data...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;