import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaCheck, FaTimes, FaUser, FaFlag, FaHistory, FaSearch,
    FaPhone, FaMapMarkerAlt, FaBox, FaTrashAlt, FaEye
} from 'react-icons/fa';
import ActionModal from './ActionModal';
import UserProfileModal from './UserProfileModal'; 

const ReportsManagement = () => {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionModal, setActionModal] = useState(null);
    const [profileModal, setProfileModal] = useState(null); 
    const [adPreviewModal, setAdPreviewModal] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // ✅ UPDATED: RAILWAY LIVE API URL
    const API_BASE_URL = "https://rezon.up.railway.app/api";
    const API_URL = `${API_BASE_URL}/admin`;
    
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
            const res = await axios.get(`${API_URL}/reports`, getAuthHeaders());
            const reportsData = res.data?.reports || res.data || [];
            setReports(Array.isArray(reportsData) ? reportsData : []);
        } catch (err) {
            toast.error("Reports load nahi huay. Railway connection check karein!");
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (reportId) => {
        if (!window.confirm("🚨 Warning: Kya aap waqai is report ko hamesha ke liye delete karna chahte hain?")) return;

        try {
            await axios.delete(`${API_URL}/reports/${reportId}`, getAuthHeaders());
            toast.success("Report list se permanently delete ho gayi!");
            fetchReports();
            setSelectedReport(null);
        } catch (err) {
            toast.error("Report delete karne mein masla aya");
            console.error(err);
        }
    };

    const handleAction = async (actionData) => {
        try {
            const { actionType, duration, reason, notifyUser } = actionData;
            let endpoint = '';
            let method = 'post';
            let body = { 
                reason: reason || `Admin action: ${actionType}`, 
                notifyUser, 
                reportId: selectedReport._id 
            };

            switch(actionType) {
                case 'WARN':
                    endpoint = `${API_URL}/users/${selectedReport.reportedUserId._id}/warn`;
                    break;
                case 'SUSPEND':
                    endpoint = `${API_URL}/users/${selectedReport.reportedUserId._id}/suspend`;
                    body.duration = duration || 3;
                    break;
                case 'BAN':
                    endpoint = `${API_URL}/users/${selectedReport.reportedUserId._id}/ban`;
                    break;
                case 'DELETE_AD':
                    endpoint = `${API_URL}/ads/${selectedReport.adId._id}`;
                    method = 'delete';
                    break;
                case 'HIDE_AD':
                    endpoint = `${API_URL}/ads/${selectedReport.adId._id}/hide`;
                    break;
                case 'DISMISS':
                    await axios.put(`${API_URL}/reports/${selectedReport._id}`, {
                        status: 'Dismissed',
                        adminNotes: reason || 'No action taken'
                    }, getAuthHeaders());
                    toast.success("Report dismissed");
                    fetchReports();
                    setSelectedReport(null);
                    return;
            }

            if (endpoint) {
                if (method === 'delete') {
                    await axios.delete(endpoint, { headers: getAuthHeaders().headers, data: body });
                } else {
                    await axios[method](endpoint, body, getAuthHeaders());
                }
                
                await axios.put(`${API_URL}/reports/${selectedReport._id}`, {
                    status: 'Resolved',
                    actionTaken: actionType,
                    adminNotes: reason
                }, getAuthHeaders());

                toast.success(`${actionType} completed!`);
                fetchReports();
                setSelectedReport(null);
            }
        } catch (err) {
            toast.error("Action failed. Check backend logs.");
        }
    };

    const openProfile = (user) => setProfileModal(user);

    const filteredReports = reports.filter(report => {
        const matchesFilter = filter === 'all' || report.status?.toLowerCase() === filter;
        const matchesSearch = 
            report.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.reportedUserId?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'dismissed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100';
        }
    };

    if (loading) return <div className="text-center py-20 font-bold italic text-pink-600">Loading Rezon Reports...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
                    <p className="text-gray-500 text-xs uppercase font-bold">Pending</p>
                    <p className="text-2xl font-black">{reports.filter(r => r.status === 'Pending').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                    <p className="text-gray-500 text-xs uppercase font-bold">Resolved</p>
                    <p className="text-2xl font-black">{reports.filter(r => r.status === 'Resolved').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
                    <p className="text-gray-500 text-xs uppercase font-bold">Scams</p>
                    <p className="text-2xl font-black">{reports.filter(r => r.reason?.toLowerCase().includes('scam')).length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                    <p className="text-gray-500 text-xs uppercase font-bold">Total</p>
                    <p className="text-2xl font-black">{reports.length}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Reports List */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow h-[700px] flex flex-col border border-gray-100">
                    <div className="p-4 border-b">
                        <div className="relative mb-3">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-pink-500 text-sm font-medium"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'pending', 'resolved'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredReports.length > 0 ? filteredReports.map(report => (
                            <div
                                key={report._id}
                                onClick={() => setSelectedReport(report)}
                                className={`p-4 border-b cursor-pointer transition-all ${selectedReport?._id === report._id ? 'bg-pink-50 border-l-4 border-pink-600' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(report.status)}`}>
                                        {report.status}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">{new Date(report.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="font-black text-gray-800 text-sm line-clamp-1 uppercase tracking-tight">{report.reason}</p>
                                <p className="text-xs text-gray-500 line-clamp-1 italic font-medium">{report.description}</p>
                                <p className="text-[10px] text-pink-600 mt-1 font-black uppercase">👤 {report.reportedUserId?.name}</p>
                            </div>
                        )) : <div className="p-10 text-center text-gray-400 text-xs font-bold uppercase">No reports found.</div>}
                    </div>
                </div>

                {/* Report Detail View */}
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-white rounded-xl shadow p-6 space-y-6 border border-gray-100 animate-in fade-in duration-300 overflow-y-auto h-[700px] custom-scrollbar">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Investigation Case</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Ref ID: {selectedReport._id}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleDeleteReport(selectedReport._id)}
                                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <FaTrashAlt /> Purge Case
                                    </button>
                                    <button onClick={() => setSelectedReport(null)} className="text-gray-300 hover:text-red-500 transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Violation Summary */}
                            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-black text-red-800 flex items-center gap-2 text-lg uppercase tracking-tight">
                                        <FaFlag /> {selectedReport.reason}
                                    </h3>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(selectedReport.status)}`}>
                                        {selectedReport.status}
                                    </span>
                                </div>
                                <p className="text-red-700 text-sm font-medium leading-relaxed italic">"{selectedReport.description}"</p>
                            </div>

                            {/* Linked Content */}
                            {selectedReport.adId ? (
                                <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-6 bg-gray-50">
                                    <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-4">Evidence: Linked Ad</h4>
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <img 
                                            src={selectedReport.adId.images?.[0] || 'https://via.placeholder.com/150'} 
                                            className="w-full md:w-44 h-44 rounded-3xl object-cover border-4 border-white shadow-xl"
                                            alt="ad evidence"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <h5 className="font-black text-2xl text-gray-900 uppercase tracking-tighter leading-none">{selectedReport.adId.title}</h5>
                                            <p className="text-pink-600 font-black text-3xl">Rs {selectedReport.adId.price?.toLocaleString()}</p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black text-gray-500 border uppercase">{selectedReport.adId.category}</span>
                                                <span className="bg-white px-3 py-1 rounded-full text-[9px] font-black text-gray-500 border uppercase flex items-center gap-1"><FaMapMarkerAlt size={8}/> {selectedReport.adId.location}</span>
                                            </div>
                                            <button 
                                                onClick={() => setAdPreviewModal(selectedReport.adId)}
                                                className="mt-4 flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-pink-600 transition-all text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                                            >
                                                <FaEye /> Full Investigation
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="p-10 border-2 border-dashed rounded-[2rem] text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">No Direct Ad Evidence Linked</div>}

                            {/* Profiles Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-red-100 rounded-3xl p-5 bg-white shadow-sm relative overflow-hidden group">
                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <h4 className="font-black text-red-600 text-[10px] uppercase tracking-widest">Target Account</h4>
                                        <button onClick={() => openProfile(selectedReport.reportedUserId)} className="text-[9px] bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-black uppercase hover:bg-red-600 hover:text-white transition-all">Profile</button>
                                    </div>
                                    <p className="font-black text-gray-800 text-lg relative z-10">{selectedReport.reportedUserId?.name || "Unknown User"}</p>
                                    <p className="text-xs text-gray-400 font-bold truncate relative z-10">{selectedReport.reportedUserId?.email}</p>
                                    <FaUser className="absolute -bottom-4 -right-4 text-gray-50 text-6xl group-hover:text-red-50 transition-colors" />
                                </div>

                                <div className="border border-blue-100 rounded-3xl p-5 bg-white shadow-sm relative overflow-hidden group">
                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <h4 className="font-black text-blue-600 text-[10px] uppercase tracking-widest">Reporting Agent</h4>
                                        <button onClick={() => openProfile(selectedReport.reporterId)} className="text-[9px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Profile</button>
                                    </div>
                                    <p className="font-black text-gray-800 text-lg relative z-10">{selectedReport.reporterId?.name || "System"}</p>
                                    <p className="text-xs text-gray-400 font-bold truncate relative z-10">{selectedReport.reporterId?.email}</p>
                                    <FaHistory className="absolute -bottom-4 -right-4 text-gray-50 text-6xl group-hover:text-blue-50 transition-colors" />
                                </div>
                            </div>

                            {/* Action Control Panel */}
                            {selectedReport.status === 'Pending' && (
                                <div className="pt-8 border-t border-gray-100">
                                    <h4 className="font-black text-gray-900 mb-5 text-[11px] uppercase tracking-[0.3em] text-center">Execute Enforcement Protocol</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <button onClick={() => setActionModal('WARN')} className="p-4 bg-white text-yellow-600 rounded-2xl font-black text-[10px] uppercase border-2 border-yellow-100 hover:bg-yellow-600 hover:text-white transition-all shadow-sm">⚠️ Issue Warning</button>
                                        <button onClick={() => setActionModal('HIDE_AD')} className="p-4 bg-white text-orange-600 rounded-2xl font-black text-[10px] uppercase border-2 border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm">🙈 Stealth Hide</button>
                                        <button onClick={() => setActionModal('DELETE_AD')} className="p-4 bg-white text-red-600 rounded-2xl font-black text-[10px] uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm">🗑️ Terminate Ad</button>
                                        <button onClick={() => setActionModal('SUSPEND')} className="p-4 bg-white text-purple-600 rounded-2xl font-black text-[10px] uppercase border-2 border-purple-100 hover:bg-purple-600 hover:text-white transition-all shadow-sm">⏸️ Suspense Acc</button>
                                        <button onClick={() => setActionModal('BAN')} className="p-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-xl shadow-gray-200">🚫 Perm Ban</button>
                                        <button onClick={() => handleAction({ actionType: 'DISMISS' })} className="p-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-[10px] uppercase hover:bg-gray-800 hover:text-white transition-all">✓ Dismiss</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[3rem] bg-white space-y-6">
                            <div className="bg-gray-50 p-10 rounded-full animate-pulse">
                                <FaFlag size={60} className="text-gray-200" />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-xl text-gray-800 uppercase tracking-tighter">System Idle</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Select a report to begin investigation</p>
                            </div>
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