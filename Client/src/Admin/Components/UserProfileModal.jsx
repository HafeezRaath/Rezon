import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    FaTimes, FaEnvelope, FaPhone, FaMapMarkerAlt, 
    FaBox, FaHistory, FaFlag, FaUser, FaShieldAlt,
    FaAd, FaExclamationTriangle
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const UserProfileModal = ({ user, onClose }) => {
    const [userAds, setUserAds] = useState([]);
    const [userReports, setUserReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ads'); // 'ads' | 'reports'

    // ✅ FIXED: Space removed from URL
    const API_BASE_URL = "https://rezon.up.railway.app/api/admin";

    const getAuthHeaders = () => ({
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}`,
            'Content-Type': 'application/json'
        }
    });

    useEffect(() => {
        if (user?.uid || user?._id) fetchUserDetails();
    }, [user?.uid, user?._id]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            const userId = user.uid || user._id;
            
            // Parallel API calls for faster loading
            const [adsRes, reportsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/users/${userId}/ads`, getAuthHeaders()),
                axios.get(`${API_BASE_URL}/users/${userId}/report-history`, getAuthHeaders())
            ]);

            setUserAds(adsRes.data?.ads || adsRes.data || []);
            setUserReports(reportsRes.data?.reports || reportsRes.data || []);
        } catch (err) {
            console.error("Failed to fetch user details:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Session expired!");
                localStorage.removeItem('firebaseIdToken');
                window.location.href = '/login';
            } else {
                toast.error("User history load nahi ho saki.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl shadow-black/50 relative border border-slate-700">
                
                {/* 🔥 Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-6 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <FaShieldAlt className="text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">User Profile</h2>
                            <p className="text-xs text-slate-500">Detailed user information</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all flex items-center justify-center text-slate-400"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div className="p-6 space-y-6">
                        
                        {/* 🔥 User Info Card */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-4xl text-white font-black shadow-xl shadow-emerald-500/20">
                                        {(user.displayName || user.name || "U")?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-slate-800 ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                                </div>
                                
                                <div className="text-center md:text-left flex-1">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                                        {user.displayName || user.name || "Unknown User"}
                                    </h3>
                                    <div className="mt-3 space-y-2">
                                        <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-2">
                                            <FaEnvelope className="text-emerald-500" /> 
                                            {user.email || "No email"}
                                        </p>
                                        {user.phone && (
                                            <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-2">
                                                <FaPhone className="text-emerald-500" /> 
                                                {user.phone}
                                            </p>
                                        )}
                                        {user.location && (
                                            <p className="text-slate-400 text-sm flex items-center justify-center md:justify-start gap-2">
                                                <FaMapMarkerAlt className="text-emerald-500" /> 
                                                {user.location}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Status Badges */}
                                    <div className="flex gap-2 mt-4 justify-center md:justify-start">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            user.isBlocked 
                                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                            {user.isBlocked ? '🔒 Blocked' : '✅ Active'}
                                        </span>
                                        {user.isSuspended && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                ⏸️ Suspended
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-center min-w-[100px]">
                                        <FaAd className="mx-auto mb-2 text-blue-400 text-xl" />
                                        <p className="text-2xl font-black text-white">{userAds.length}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ads</p>
                                    </div>
                                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-center min-w-[100px]">
                                        <FaFlag className="mx-auto mb-2 text-rose-400 text-xl" />
                                        <p className="text-2xl font-black text-white">{userReports.length}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reports</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🔥 Tabs */}
                        <div className="flex gap-2 border-b border-slate-800">
                            <button
                                onClick={() => setActiveTab('ads')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                                    activeTab === 'ads' 
                                    ? 'text-emerald-400 border-emerald-500' 
                                    : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                <FaBox className="inline mr-2" />
                                Ads ({userAds.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('reports')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                                    activeTab === 'reports' 
                                    ? 'text-rose-400 border-rose-500' 
                                    : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                <FaHistory className="inline mr-2" />
                                Reports ({userReports.length})
                            </button>
                        </div>

                        {/* 🔥 Loading State */}
                        {loading && (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching user data...</p>
                            </div>
                        )}

                        {/* 🔥 Ads Tab */}
                        {!loading && activeTab === 'ads' && (
                            <div>
                                {userAds.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <FaBox className="text-slate-600 text-4xl mx-auto mb-3" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Koi ad nahi hai</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {userAds.map(ad => (
                                            <div key={ad._id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-4 hover:border-slate-600 transition-all group">
                                                <img 
                                                    src={ad.images?.[0] || 'https://via.placeholder.com/150'} 
                                                    alt={ad.title} 
                                                    className="w-20 h-20 rounded-lg object-cover border-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-200 text-sm truncate uppercase tracking-tight mb-1">
                                                        {ad.title}
                                                    </p>
                                                    <p className="text-emerald-400 font-black text-lg mb-2">
                                                        Rs {ad.price?.toLocaleString()}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                                            ad.status === 'Active' 
                                                            ? 'bg-emerald-500/10 text-emerald-400' 
                                                            : ad.status === 'Pending'
                                                            ? 'bg-amber-500/10 text-amber-400'
                                                            : 'bg-slate-700 text-slate-400'
                                                        }`}>
                                                            {ad.status || 'Unknown'}
                                                        </span>
                                                        {ad.isFeatured && (
                                                            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">
                                                                ⭐ Featured
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🔥 Reports Tab */}
                        {!loading && activeTab === 'reports' && (
                            <div>
                                {userReports.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <FaShieldAlt className="text-slate-600 text-4xl mx-auto mb-3" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Koi report nahi</p>
                                        <p className="text-slate-600 text-xs mt-1">User has clean record</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {userReports.map(report => (
                                            <div key={report._id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-rose-500/30 transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <FaExclamationTriangle className="text-rose-500" />
                                                        <span className="font-black text-rose-400 text-xs uppercase tracking-wider">
                                                            {report.reason || report.type || "Violation"}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                                                        report.status === 'Resolved' 
                                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                                        : report.status === 'Pending'
                                                        ? 'bg-amber-500/10 text-amber-400'
                                                        : 'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {report.status || 'Pending'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                                                    "{report.description || report.details || 'No details provided'}"
                                                </p>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-wider">
                                                    <span>By: {report.reportedBy?.name || report.reporterName || 'Anonymous'}</span>
                                                    <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;