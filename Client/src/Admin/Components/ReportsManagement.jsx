import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaCheck, 
    FaTimes, 
    FaUser, 
    FaFlag, 
    FaHistory,
    FaSearch,
    FaPhone,
    FaMapMarkerAlt,
    FaBox,
    FaTrashAlt,
    FaEye
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

    // 🔥 LIVE API URL logic Hostinger deployment ke liye
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
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
            toast.error("Reports load nahi huay");
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
            toast.error("Action failed");
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

    if (loading) return <div className="text-center py-20 font-bold">Loading Rezon Reports...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-yellow-500">
                    <p className="text-gray-500 text-sm">Pending</p>
                    <p className="text-2xl font-bold">{reports.filter(r => r.status === 'Pending').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-green-500">
                    <p className="text-gray-500 text-sm">Resolved</p>
                    <p className="text-2xl font-bold">{reports.filter(r => r.status === 'Resolved').length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-red-500">
                    <p className="text-gray-500 text-sm">High Priority</p>
                    <p className="text-2xl font-bold">{reports.filter(r => r.reason?.toLowerCase().includes('scam')).length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow border-l-4 border-blue-500">
                    <p className="text-gray-500 text-sm">Total</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
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
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-pink-500 text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'pending', 'resolved'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1 rounded text-xs font-bold capitalize transition-all ${filter === f ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {filteredReports.length > 0 ? filteredReports.map(report => (
                            <div
                                key={report._id}
                                onClick={() => setSelectedReport(report)}
                                className={`p-4 border-b cursor-pointer transition-all ${selectedReport?._id === report._id ? 'bg-pink-50 border-l-4 border-pink-600' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(report.status)}`}>
                                        {report.status}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">{new Date(report.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="font-bold text-sm text-gray-800 line-clamp-1">{report.reason}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{report.description}</p>
                                <p className="text-[10px] text-pink-600 mt-1 font-semibold">👤 {report.reportedUserId?.name}</p>
                            </div>
                        )) : <div className="p-10 text-center text-gray-400 text-sm">Koi report nahi mili.</div>}
                    </div>
                </div>

                {/* Report Detail */}
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-white rounded-xl shadow p-6 space-y-6 border border-gray-100 animate-in fade-in duration-300">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-gray-800">Report Details</h2>
                                    <p className="text-xs text-gray-400 font-medium mt-1">ID: {selectedReport._id}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleDeleteReport(selectedReport._id)}
                                        className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all font-bold"
                                    >
                                        <FaTrashAlt /> Delete Report
                                    </button>
                                    <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <FaTimes size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Status & Reason */}
                            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-xl shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-red-800 flex items-center gap-2 text-lg">
                                        <FaFlag /> {selectedReport.reason}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(selectedReport.status)}`}>
                                        {selectedReport.status}
                                    </span>
                                </div>
                                <p className="text-red-700 text-sm leading-relaxed">{selectedReport.description}</p>
                            </div>

                            {/* Reported Ad Preview */}
                            {selectedReport.adId ? (
                                <div className="border rounded-2xl p-4 bg-gray-50 hover:bg-white transition-all group border-gray-200">
                                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <FaBox className="text-pink-600" /> Reported Product
                                    </h4>
                                    <div className="flex gap-5">
                                        <img 
                                            src={selectedReport.adId.images?.[0] || '/placeholder.jpg'} 
                                            alt="product"
                                            className="w-36 h-36 rounded-xl object-cover border-2 border-white shadow-md"
                                        />
                                        <div className="flex-1 flex flex-col justify-center">
                                            <h5 className="font-extrabold text-xl text-gray-800">{selectedReport.adId.title}</h5>
                                            <p className="text-pink-600 font-black text-3xl mt-1">Rs {selectedReport.adId.price?.toLocaleString()}</p>
                                            <div className="flex items-center gap-3 mt-2 text-gray-500 text-xs font-medium">
                                                <span>{selectedReport.adId.category}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><FaMapMarkerAlt size={10}/> {selectedReport.adId.location}</span>
                                            </div>
                                            <button 
                                                onClick={() => setAdPreviewModal(selectedReport.adId)}
                                                className="mt-4 flex items-center gap-2 w-fit bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold"
                                            >
                                                <FaEye /> View Full Ad Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : <div className="p-4 bg-gray-100 rounded-xl text-center text-sm text-gray-500 italic">Is report ke sath koi Ad link nahi hai.</div>}

                            {/* Profiles Section */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="border border-red-100 rounded-2xl p-5 bg-gradient-to-br from-red-50 to-white shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-red-800 flex items-center gap-2 text-sm uppercase">
                                            <FaUser /> Accused User
                                        </h4>
                                        <button onClick={() => openProfile(selectedReport.reportedUserId)} className="text-[10px] bg-white text-red-600 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-600 hover:text-white transition-all font-bold">
                                            Full Profile
                                        </button>
                                    </div>
                                    <p className="font-black text-gray-800">{selectedReport.reportedUserId?.name || "Unknown"}</p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedReport.reportedUserId?.email}</p>
                                </div>

                                <div className="border border-blue-100 rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase">
                                            <FaUser /> Reporter
                                        </h4>
                                        <button onClick={() => openProfile(selectedReport.reporterId)} className="text-[10px] bg-white text-blue-600 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-600 hover:text-white transition-all font-bold">
                                            Full Profile
                                        </button>
                                    </div>
                                    <p className="font-black text-gray-800">{selectedReport.reporterId?.name || "Anonymous"}</p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedReport.reporterId?.email}</p>
                                </div>
                            </div>

                            {/* Action Row */}
                            {selectedReport.status === 'Pending' && (
                                <div className="pt-6 border-t border-gray-100">
                                    <h4 className="font-black text-gray-800 mb-4 text-sm uppercase tracking-widest">Admin Actions Required:</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button onClick={() => setActionModal('WARN')} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-500 hover:text-white transition-all border border-yellow-100">
                                            ⚠️ Send Warning
                                        </button>
                                        <button onClick={() => setActionModal('HIDE_AD')} className="p-3 bg-orange-50 text-orange-700 rounded-xl font-bold text-xs hover:bg-orange-500 hover:text-white transition-all border border-orange-100">
                                            🙈 Hide Content
                                        </button>
                                        <button onClick={() => setActionModal('DELETE_AD')} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all border border-red-100">
                                            🗑️ Remove Ad
                                        </button>
                                        <button onClick={() => setActionModal('SUSPEND')} className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-600 hover:text-white transition-all border border-purple-100">
                                            ⏸️ Suspend Account
                                        </button>
                                        <button onClick={() => setActionModal('BAN')} className="p-3 bg-black text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-all">
                                            🚫 Hard Ban
                                        </button>
                                        <button onClick={() => handleAction({ actionType: 'DISMISS' })} className="p-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-800 hover:text-white transition-all">
                                            ✓ Dismiss Report
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl bg-white space-y-4">
                            <FaFlag size={50} className="text-gray-200 animate-bounce" />
                            <p className="font-bold text-lg">Select a report from the list to begin investigation</p>
                            <p className="text-xs">Rezon StrongZoom Protection is Active 🛡️</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- AD PREVIEW MODAL (FULL DETAILS) --- */}
            {adPreviewModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setAdPreviewModal(null)} 
                            className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full hover:bg-red-500 hover:text-white transition-all z-10"
                        >
                            <FaTimes size={20} />
                        </button>
                        
                        <div className="p-8">
                            <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                <FaBox className="text-pink-600" /> Full Ad Preview
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <img 
                                            src={adPreviewModal.images?.[0] || '/placeholder.jpg'} 
                                            className="w-full h-80 object-cover rounded-2xl shadow-lg border-4 border-gray-50" 
                                            alt="Ad main"
                                        />
                                        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-lg text-[10px] font-bold">
                                            {adPreviewModal.images?.length || 1} Images Total
                                        </div>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {adPreviewModal.images?.slice(1).map((img, i) => (
                                            <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover border" alt="thumb" />
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{adPreviewModal.title}</h2>
                                        <p className="text-4xl font-black text-pink-600 mt-2">Rs {adPreviewModal.price?.toLocaleString()}</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100">
                                            <h4 className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Item Description</h4>
                                            <p className="text-gray-700 text-sm leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {adPreviewModal.description || "No description provided."}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Category</p>
                                                <p className="text-xs font-bold text-gray-800">{adPreviewModal.category}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Condition</p>
                                                <p className="text-xs font-bold text-gray-800">{adPreviewModal.condition}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Location</p>
                                                <p className="text-xs font-bold text-gray-800">{adPreviewModal.location}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Posted Date</p>
                                                <p className="text-xs font-bold text-gray-800">{new Date(adPreviewModal.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={() => setAdPreviewModal(null)} 
                                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-pink-600 transition-all shadow-lg"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other Modals */}
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