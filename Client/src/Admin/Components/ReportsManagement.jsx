import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaCheck, FaTimes, FaUser, FaFlag, FaHistory, FaSearch,
    FaPhone, FaMapMarkerAlt, FaBox, FaTrashAlt, FaEye,
    FaShieldAlt, FaExclamationTriangle, FaBan, FaEyeSlash,
    FaClock, FaCheckCircle
} from 'react-icons/fa';
import ActionModal from './ActionModal';
import UserProfileModal from './UserProfileModal'; 

const ReportsManagement = () => {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState(null);
    const [profileModal, setProfileModal] = useState(null); 
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ FIXED: API URL without space
    const API_BASE_URL = "https://rezon.up.railway.app/api/admin";
    
    const getAuthHeaders = () => ({
        headers: { 
            'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}`,
            'Content-Type': 'application/json'
        }
    });

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/reports`, getAuthHeaders());
            const reportsData = res.data?.reports || res.data?.data || res.data || [];
            setReports(Array.isArray(reportsData) ? reportsData : []);
        } catch (err) {
            console.error("Fetch error:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Session expired!");
                localStorage.removeItem('firebaseIdToken');
                window.location.href = '/login';
            } else {
                toast.error("Reports load nahi huay!");
            }
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm("🚨 Kya aap waqai is report ko permanently delete karna chahte hain?")) return;

        try {
            await axios.delete(`${API_BASE_URL}/reports/${reportId}`, getAuthHeaders());
            toast.success("🗑️ Report delete ho gayi!");
            fetchReports();
            setSelectedReport(null);
        } catch (err) {
            toast.error("❌ Delete failed");
            console.error(err);
        }
    };

    const handleAction = async (actionData) => {
        try {
            const { actionType, duration, reason, notifyUser } = actionData;
            const userId = selectedReport.reportedUserId?._id || selectedReport.reportedUserId?.uid;
            const adId = selectedReport.adId?._id;

            let endpoint = '';
            let method = 'post';
            let body = { 
                reason: reason || `Admin action: ${actionType}`, 
                notifyUser
            };

            switch(actionType) {
                case 'WARN':
                    endpoint = `${API_BASE_URL}/users/${userId}/warn`;
                    break;
                case 'SUSPEND':
                    endpoint = `${API_BASE_URL}/users/${userId}/suspend`;
                    body.duration = duration || 3;
                    break;
                case 'BAN':
                    endpoint = `${API_BASE_URL}/users/${userId}/ban`;
                    break;
                case 'DELETE_AD':
                    if (!adId) {
                        toast.error("No ad linked to this report!");
                        return;
                    }
                    endpoint = `${API_BASE_URL}/ads/${adId}`;
                    method = 'delete';
                    break;
                case 'HIDE_AD':
                    if (!adId) {
                        toast.error("No ad linked to this report!");
                        return;
                    }
                    endpoint = `${API_BASE_URL}/ads/${adId}/hide`;
                    break;
                case 'DISMISS':
                    await axios.put(`${API_BASE_URL}/reports/${selectedReport._id}`, {
                        status: 'Dismissed',
                        adminNotes: reason || 'No action taken'
                    }, getAuthHeaders());
                    toast.success("✅ Report dismissed");
                    fetchReports();
                    setSelectedReport(null);
                    setActionModal(null);
                    return;
                default:
                    return;
            }

            if (endpoint) {
                if (method === 'delete') {
                    await axios.delete(endpoint, { headers: getAuthHeaders().headers, data: body });
                } else {
                    await axios[method](endpoint, body, getAuthHeaders());
                }
                
                await axios.put(`${API_BASE_URL}/reports/${selectedReport._id}`, {
                    status: 'Resolved',
                    actionTaken: actionType,
                    adminNotes: reason
                }, getAuthHeaders());

                toast.success(`✅ ${actionType} completed!`);
                fetchReports();
                setSelectedReport(null);
                setActionModal(null);
            }
        } catch (err) {
            console.error("Action error:", err);
            toast.error(err.response?.data?.message || "❌ Action failed");
        }
    };

    const openProfile = (user) => {
        if (user) setProfileModal(user);
    };

    const filteredReports = reports.filter(report => {
        const matchesFilter = filter === 'all' || report.status?.toLowerCase() === filter;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
            report.reason?.toLowerCase().includes(searchLower) ||
            report.description?.toLowerCase().includes(searchLower) ||
            report.reportedUserId?.name?.toLowerCase().includes(searchLower) ||
            report.reportedUserId?.email?.toLowerCase().includes(searchLower);
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'dismissed': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending': return <FaClock className="text-amber-400" />;
            case 'resolved': return <FaCheckCircle className="text-emerald-400" />;
            case 'dismissed': return <FaTimes className="text-slate-400" />;
            default: return null;
        }
    };

    // 🔥 Loading Skeleton
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
                    <div className="bg-slate-800/50 rounded-xl animate-pulse"></div>
                    <div className="lg:col-span-2 bg-slate-800/50 rounded-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 min-h-screen">
            {/* 🔥 Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { 
                        label: 'Pending', 
                        value: reports.filter(r => r.status?.toLowerCase() === 'pending').length, 
                        color: 'amber',
                        icon: FaClock
                    },
                    { 
                        label: 'Resolved', 
                        value: reports.filter(r => r.status?.toLowerCase() === 'resolved').length, 
                        color: 'emerald',
                        icon: FaCheckCircle
                    },
                    { 
                        label: 'Scams', 
                        value: reports.filter(r => r.reason?.toLowerCase().includes('scam')).length, 
                        color: 'rose',
                        icon: FaExclamationTriangle
                    },
                    { 
                        label: 'Total', 
                        value: reports.length, 
                        color: 'blue',
                        icon: FaFlag
                    }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                            <stat.icon className={`text-${stat.color}-500 text-lg`} />
                        </div>
                        <p className={`text-3xl font-black text-${stat.color}-400`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* 🔥 Reports List */}
                <div className="lg:col-span-1 bg-slate-800/30 border border-slate-700/50 rounded-2xl h-[700px] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
                        <div className="relative mb-3">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 text-slate-200 pl-10 pr-4 py-2.5 border border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium placeholder:text-slate-600"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'pending', 'resolved', 'dismissed'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                        filter === f 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {filteredReports.length > 0 ? filteredReports.map(report => (
                            <div
                                key={report._id}
                                onClick={() => setSelectedReport(report)}
                                className={`p-4 border-b border-slate-700/50 cursor-pointer transition-all ${
                                    selectedReport?._id === report._id 
                                    ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                                    : 'hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusColor(report.status)}`}>
                                        {report.status}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold">
                                        {new Date(report.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="font-bold text-slate-200 text-sm line-clamp-1 uppercase tracking-tight mb-1">
                                    {report.reason}
                                </p>
                                <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                                    {report.description}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <FaUser className="text-emerald-500" />
                                    <span className="font-medium truncate">{report.reportedUserId?.name || 'Unknown'}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center">
                                <FaSearch className="text-slate-600 text-3xl mx-auto mb-3" />
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No reports found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔥 Report Detail View */}
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300 h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {/* Header */}
                            <div className="flex justify-between items-start border-b border-slate-700/50 pb-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                        <FaShieldAlt className="text-emerald-500" />
                                        Investigation Case
                                    </h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                        Ref ID: {selectedReport._id}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleDeleteReport(selectedReport._id)}
                                        className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <FaTrashAlt /> Delete
                                    </button>
                                    <button 
                                        onClick={() => setSelectedReport(null)} 
                                        className="w-10 h-10 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>

                            {/* Violation Summary */}
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-black text-rose-400 flex items-center gap-2 text-lg uppercase tracking-tight">
                                        <FaFlag /> {selectedReport.reason}
                                    </h3>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${getStatusColor(selectedReport.status)}`}>
                                        {selectedReport.status}
                                    </span>
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed italic">
                                    "{selectedReport.description}"
                                </p>
                            </div>

                            {/* Linked Ad */}
                            {selectedReport.adId ? (
                                <div className="border border-slate-700/50 rounded-2xl p-6 bg-slate-800/30">
                                    <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FaBox className="text-emerald-500" /> Linked Ad Evidence
                                    </h4>
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <img 
                                            src={selectedReport.adId.images?.[0] || 'https://via.placeholder.com/150'} 
                                            className="w-full md:w-44 h-44 rounded-2xl object-cover border-2 border-slate-700"
                                            alt="ad evidence"
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                        />
                                        <div className="flex-1 space-y-3">
                                            <h5 className="font-black text-xl text-white uppercase tracking-tight">
                                                {selectedReport.adId.title}
                                            </h5>
                                            <p className="text-emerald-400 font-black text-2xl">
                                                Rs {selectedReport.adId.price?.toLocaleString()}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-300 border border-slate-700">
                                                    {selectedReport.adId.category}
                                                </span>
                                                <span className="bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-300 border border-slate-700 flex items-center gap-1">
                                                    <FaMapMarkerAlt className="text-emerald-500" /> {selectedReport.adId.location}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-slate-700 rounded-2xl text-center">
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Ad Linked</p>
                                </div>
                            )}

                            {/* Profiles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Reported User */}
                                <div className="bg-slate-800/50 border border-rose-500/20 rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-rose-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <FaUser /> Target Account
                                        </h4>
                                        <button 
                                            onClick={() => openProfile(selectedReport.reportedUserId)} 
                                            className="text-[10px] bg-rose-500/10 text-rose-400 px-3 py-1.5 rounded-lg font-black uppercase hover:bg-rose-500 hover:text-white transition-all"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                    <p className="font-black text-white text-lg">
                                        {selectedReport.reportedUserId?.name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {selectedReport.reportedUserId?.email}
                                    </p>
                                </div>

                                {/* Reporter */}
                                <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-blue-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                            <FaHistory /> Reporting Agent
                                        </h4>
                                        <button 
                                            onClick={() => openProfile(selectedReport.reporterId)} 
                                            className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                    <p className="font-black text-white text-lg">
                                        {selectedReport.reporterId?.name || "System"}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {selectedReport.reporterId?.email}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {selectedReport.status?.toLowerCase() === 'pending' && (
                                <div className="pt-6 border-t border-slate-700/50">
                                    <h4 className="font-black text-white mb-4 text-xs uppercase tracking-widest text-center">
                                        Enforcement Actions
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <button 
                                            onClick={() => setActionModal('WARN')} 
                                            className="p-4 bg-amber-500/10 text-amber-400 rounded-xl font-black text-[10px] uppercase border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <FaExclamationTriangle className="text-lg" />
                                            Issue Warning
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('HIDE_AD')} 
                                            className="p-4 bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase border border-slate-600 hover:bg-slate-600 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <FaEyeSlash className="text-lg" />
                                            Hide Ad
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('DELETE_AD')} 
                                            className="p-4 bg-rose-500/10 text-rose-400 rounded-xl font-black text-[10px] uppercase border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <FaTrashAlt className="text-lg" />
                                            Delete Ad
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('SUSPEND')} 
                                            className="p-4 bg-purple-500/10 text-purple-400 rounded-xl font-black text-[10px] uppercase border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <FaClock className="text-lg" />
                                            Suspend User
                                        </button>
                                        <button 
                                            onClick={() => setActionModal('BAN')} 
                                            className="p-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex flex-col items-center gap-2"
                                        >
                                            <FaBan className="text-lg" />
                                            Permanent Ban
                                        </button>
                                        <button 
                                            onClick={() => handleAction({ actionType: 'DISMISS' })} 
                                            className="p-4 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] uppercase border border-slate-700 hover:bg-slate-700 hover:text-white transition-all flex flex-col items-center gap-2"
                                        >
                                            <FaCheck className="text-lg" />
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-[700px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/20">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <FaFlag className="text-slate-600 text-3xl" />
                            </div>
                            <p className="font-black text-xl text-white uppercase tracking-tight">Select a Report</p>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
                                Click on a report from the list to view details
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {profileModal && (
                <UserProfileModal 
                    user={profileModal}
                    onClose={() => setProfileModal(null)}
                />
            )}

            {actionModal && (
                <ActionModal
                    type={actionModal}
                    report={selectedReport}
                    onClose={() => setActionModal(null)}
                    onConfirm={handleAction}
                />
            )}
        </div>
    );
};

export default ReportsManagement;