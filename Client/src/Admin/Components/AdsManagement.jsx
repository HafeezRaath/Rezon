import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { 
    FaTrash, FaEye, FaSearch, FaSpinner, FaExclamationTriangle,
    FaFilter, FaSyncAlt, FaCheckCircle, FaTimesCircle, FaEllipsisV,
    FaBox, FaCheck, FaTimes, FaAd
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ✅ FIXED: Space removed from URL
const API_BASE_URL = "https://rezon.up.railway.app/api/admin";

const AdsManagement = () => {
    const navigate = useNavigate();
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAds, setSelectedAds] = useState([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 20;

    // 🔒 Secure auth headers
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('firebaseIdToken');
        if (!token) {
            toast.error("Session expired. Please login again.");
            navigate('/login');
            return null;
        }
        return {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        };
    }, [navigate]);

    // 📊 Fetch ads
    const fetchAds = useCallback(async (page = 1) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axios.get(
                `${API_BASE_URL}/ads?page=${page}&limit=${itemsPerPage}`, 
                authHeaders
            );
            
            let adsData = [];
            let pagination = { totalPages: 1 };
            
            if (Array.isArray(res.data)) {
                adsData = res.data;
            } else if (res.data?.ads && Array.isArray(res.data.ads)) {
                adsData = res.data.ads;
                pagination = res.data.pagination || pagination;
            } else if (res.data?.data && Array.isArray(res.data.data)) {
                adsData = res.data.data;
            }

            setAds(adsData);
            setTotalPages(pagination.totalPages || Math.ceil(adsData.length / itemsPerPage) || 1);
            setCurrentPage(page);
            
        } catch (err) {
            console.error("Error fetching ads:", err);
            setError(err.response?.data?.message || "Failed to connect to server");
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders, navigate]);

    useEffect(() => {
        fetchAds(1);
    }, [fetchAds]);

    // 🗑️ Delete single ad
    const handleDeleteAd = useCallback(async (adId, adTitle) => {
        const confirmDelete = await new Promise((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-3 max-w-sm bg-slate-800 text-white p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 text-rose-400">
                        <FaExclamationTriangle />
                        <span className="font-bold">Delete Ad?</span>
                    </div>
                    <p className="text-sm text-slate-300">
                        "{adTitle || 'Untitled'}" will be permanently removed.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-slate-700 rounded-lg hover:bg-slate-600 transition font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition font-bold"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ), { duration: 10000, position: 'top-center' });
        });

        if (!confirmDelete) return;

        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        try {
            await axios.delete(`${API_BASE_URL}/ads/${adId}`, authHeaders);
            toast.success("🗑️ Ad removed successfully");
            setAds(prev => prev.filter(ad => ad._id !== adId));
        } catch (err) {
            toast.error(err.response?.data?.message || "❌ Delete failed");
        }
    }, [getAuthHeaders]);

    // 🔄 Update ad status
    const handleStatusChange = useCallback(async (adId, newStatus, currentStatus) => {
        if (newStatus === currentStatus) return;
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        // Optimistic update
        setAds(prev => prev.map(ad => 
            ad._id === adId ? { ...ad, status: newStatus } : ad
        ));

        try {
            await axios.put(
                `${API_BASE_URL}/ads/${adId}/status`, 
                { status: newStatus }, 
                authHeaders
            );
            toast.success(`✅ Status updated: ${newStatus}`);
        } catch (err) {
            // Rollback on error
            setAds(prev => prev.map(ad => 
                ad._id === adId ? { ...ad, status: currentStatus } : ad
            ));
            toast.error("❌ Failed to update status");
        }
    }, [getAuthHeaders]);

    // ☑️ Toggle selection
    const toggleSelectAd = useCallback((adId) => {
        setSelectedAds(prev => 
            prev.includes(adId) 
                ? prev.filter(id => id !== adId)
                : [...prev, adId]
        );
    }, []);

    // ☑️ Select all
    const toggleSelectAll = useCallback(() => {
        if (selectedAds.length === filteredAds.length) {
            setSelectedAds([]);
        } else {
            setSelectedAds(filteredAds.map(ad => ad._id));
        }
    }, [selectedAds.length, filteredAds]);

    // 🗑️ Bulk delete
    const handleBulkDelete = useCallback(async () => {
        if (selectedAds.length === 0) return;
        if (!window.confirm(`Delete ${selectedAds.length} selected ads?`)) return;

        setBulkActionLoading(true);
        const authHeaders = getAuthHeaders();
        
        try {
            // If bulk API exists, use it, otherwise delete one by one
            if (selectedAds.length === 1) {
                await axios.delete(`${API_BASE_URL}/ads/${selectedAds[0]}`, authHeaders);
            } else {
                // Try bulk delete endpoint
                try {
                    await axios.post(
                        `${API_BASE_URL}/ads/bulk-delete`,
                        { ids: selectedAds },
                        authHeaders
                    );
                } catch {
                    // Fallback: delete one by one
                    await Promise.all(selectedAds.map(id => 
                        axios.delete(`${API_BASE_URL}/ads/${id}`, authHeaders)
                    ));
                }
            }
            
            toast.success(`🗑️ ${selectedAds.length} ads deleted`);
            setAds(prev => prev.filter(ad => !selectedAds.includes(ad._id)));
            setSelectedAds([]);
        } catch (err) {
            toast.error("❌ Bulk action failed");
        } finally {
            setBulkActionLoading(false);
        }
    }, [selectedAds, getAuthHeaders]);

    // 🔍 Filter and sort
    const filteredAds = useMemo(() => {
        let result = Array.isArray(ads) ? [...ads] : [];
        if (filter !== 'all') result = result.filter(ad => ad.status === filter);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(query) ||
                ad.postedBy?.name?.toLowerCase().includes(query) ||
                ad.category?.toLowerCase().includes(query) ||
                ad._id?.toLowerCase().includes(query)
            );
        }
        result.sort((a, b) => {
            switch(sortBy) {
                case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                case 'oldest': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                case 'price-high': return (b.price || 0) - (a.price || 0);
                case 'price-low': return (a.price || 0) - (b.price || 0);
                default: return 0;
            }
        });
        return result;
    }, [ads, filter, searchQuery, sortBy]);

    // 📄 Pagination
    const paginatedAds = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAds.slice(start, start + itemsPerPage);
    }, [filteredAds, currentPage]);

    // 🔥 Loading Skeleton
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
                <div className="h-16 bg-slate-800 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    // 🔥 Error State
    if (error) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                    <FaExclamationTriangle className="text-rose-500 text-3xl" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Connection Failed</h3>
                <p className="text-slate-400 text-sm mb-4">{error}</p>
                <button 
                    onClick={() => fetchAds(1)}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                    <FaSyncAlt /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <Toaster position="top-right" />
            
            {/* 🔥 Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { 
                        label: 'Total Ads', 
                        value: ads.length, 
                        color: 'emerald',
                        icon: FaBox
                    },
                    { 
                        label: 'Active', 
                        value: ads.filter(a => a.status === 'Active').length, 
                        color: 'blue',
                        icon: FaCheckCircle
                    },
                    { 
                        label: 'Sold', 
                        value: ads.filter(a => a.status === 'Sold').length, 
                        color: 'purple',
                        icon: FaCheck
                    },
                    { 
                        label: 'Selected', 
                        value: selectedAds.length, 
                        color: 'amber',
                        icon: FaAd
                    }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                            <stat.icon className={`text-${stat.color}-500 text-lg`} />
                        </div>
                        <p className={`text-3xl font-black text-${stat.color}-400`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* 🔥 Controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 bg-slate-800/30 border border-slate-700/50 p-4 rounded-2xl">
                <div className="flex flex-wrap gap-3">
                    {/* Filter Tabs */}
                    <div className="flex gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
                        {['all', 'Active', 'Sold', 'Reserved', 'Pending'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-tight ${
                                    filter === status 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    
                    {/* Sort Dropdown */}
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold uppercase text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="price-low">Price: Low to High</option>
                    </select>

                    {/* Bulk Actions */}
                    {selectedAds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkActionLoading}
                            className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {bulkActionLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                            Delete ({selectedAds.length})
                        </button>
                    )}
                </div>
                
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by title, seller, category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl w-full focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm text-slate-200 placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* 🔥 Table */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/80 border-b border-slate-700">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox"
                                        checked={selectedAds.length === filteredAds.length && filteredAds.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                </th>
                                <th className="p-4">Product</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Price</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Seller</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {paginatedAds.map(ad => (
                                <tr key={ad._id} className={`hover:bg-slate-800/50 transition-colors ${selectedAds.includes(ad._id) ? 'bg-emerald-500/5' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={selectedAds.includes(ad._id)}
                                            onChange={() => toggleSelectAd(ad._id)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative group shrink-0">
                                                <img 
                                                    src={ad.images?.[0] || 'https://via.placeholder.com/150'} 
                                                    className="w-12 h-12 rounded-xl object-cover border-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors"
                                                    alt=""
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                                />
                                                {ad.images?.length > 1 && (
                                                    <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border border-slate-700">
                                                        +{ad.images.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-200 text-xs uppercase truncate max-w-[150px]">
                                                    {ad.title || 'Untitled'}
                                                </h4>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                    {new Date(ad.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-600">
                                            {ad.category || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-black text-emerald-400 text-sm">
                                            Rs {ad.price?.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={ad.status}
                                            onChange={(e) => handleStatusChange(ad._id, e.target.value, ad.status)}
                                            className={`w-full px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border outline-none transition-all cursor-pointer bg-slate-900 ${
                                                ad.status === 'Active' ? 'text-emerald-400 border-emerald-500/30' :
                                                ad.status === 'Sold' ? 'text-blue-400 border-blue-500/30' :
                                                ad.status === 'Reserved' ? 'text-amber-400 border-amber-500/30' :
                                                'text-slate-400 border-slate-600'
                                            }`}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Sold">Sold</option>
                                            <option value="Reserved">Reserved</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-200 text-xs truncate max-w-[120px]">
                                                {ad.postedBy?.name || ad.postedBy?.displayName || 'Unknown'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                                {ad.postedBy?.email || ad.postedBy?.phone || 'No contact'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <button 
                                                onClick={() => window.open(`/ad/${ad._id}`, '_blank')} 
                                                className="p-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                                title="View Ad"
                                            >
                                                <FaEye size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAd(ad._id, ad.title)} 
                                                className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                                title="Delete Ad"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredAds.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaSearch className="text-slate-600 text-2xl" />
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No ads found</p>
                        <p className="text-slate-600 text-xs mt-2">Try adjusting your filters</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-6 border-t border-slate-700/50 bg-slate-800/30">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                disabled={currentPage === 1} 
                                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-all"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                disabled={currentPage === totalPages} 
                                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdsManagement;