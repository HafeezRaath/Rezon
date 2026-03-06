import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { 
    FaTrash, FaEye, FaSearch, FaSpinner, FaExclamationTriangle,
    FaFilter, FaSyncAlt, FaCheckCircle, FaTimesCircle, FaEllipsisV
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ✅ UPDATED: RAILWAY LIVE API URL
const API_BASE_URL = "https://rezon.up.railway.app/api";

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

    // 🔒 Secure auth headers with validation
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

    // 📊 Fetch ads from Railway with pagination
    const fetchAds = useCallback(async (page = 1) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axios.get(
                `${API_BASE_URL}/admin/ads?page=${page}&limit=${itemsPerPage}`, 
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
            setTotalPages(pagination.totalPages || 1);
            setCurrentPage(page);
            
        } catch (err) {
            console.error("Error fetching ads:", err);
            setError(err.response?.data?.message || "Failed to connect to Railway server");
            
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

    // 🗑️ Delete single ad with confirmation
    const handleDeleteAd = useCallback(async (adId, adTitle) => {
        const confirmDelete = await new Promise((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-3 max-w-sm">
                    <div className="flex items-center gap-2 text-red-600">
                        <FaExclamationTriangle />
                        <span className="font-bold">Delete Ad?</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        "{adTitle || 'Untitled'}" will be permanently removed from Railway.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold"
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
            await axios.delete(`${API_BASE_URL}/admin/ads/${adId}`, authHeaders);
            toast.success("Ad removed successfully");
            setAds(prev => prev.filter(ad => ad._id !== adId));
        } catch (err) {
            toast.error(err.response?.data?.message || "Delete operation failed");
        }
    }, [getAuthHeaders]);

    // 🔄 Update ad status
    const handleStatusChange = useCallback(async (adId, newStatus, currentStatus) => {
        if (newStatus === currentStatus) return;
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        setAds(prev => prev.map(ad => 
            ad._id === adId ? { ...ad, status: newStatus } : ad
        ));

        try {
            await axios.put(
                `${API_BASE_URL}/admin/ads/${adId}/status`, 
                { status: newStatus }, 
                authHeaders
            );
            toast.success(`Ad status synced: ${newStatus}`);
        } catch (err) {
            setAds(prev => prev.map(ad => 
                ad._id === adId ? { ...ad, status: currentStatus } : ad
            ));
            toast.error("Failed to sync status with server");
        }
    }, [getAuthHeaders]);

    // ☑️ Toggle ad selection
    const toggleSelectAd = useCallback((adId) => {
        setSelectedAds(prev => 
            prev.includes(adId) 
                ? prev.filter(id => id !== adId)
                : [...prev, adId]
        );
    }, []);

    // ☑️ Select all ads
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
        if (!window.confirm(`Delete ${selectedAds.length} selected ads from database?`)) return;

        setBulkActionLoading(true);
        const authHeaders = getAuthHeaders();
        
        try {
            await axios.post(
                `${API_BASE_URL}/admin/ads/bulk-delete`,
                { ids: selectedAds },
                authHeaders
            );
            toast.success(`${selectedAds.length} ads purged`);
            setAds(prev => prev.filter(ad => !selectedAds.includes(ad._id)));
            setSelectedAds([]);
        } catch (err) {
            toast.error("Bulk action failed");
        } finally {
            setBulkActionLoading(false);
        }
    }, [selectedAds, getAuthHeaders]);

    // 🔍 Filter and sort ads
    const filteredAds = useMemo(() => {
        let result = Array.isArray(ads) ? [...ads] : [];
        if (filter !== 'all') result = result.filter(ad => ad.status === filter);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(query) ||
                ad.postedBy?.name?.toLowerCase().includes(query) ||
                ad.category?.toLowerCase().includes(query)
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

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="animate-spin h-16 w-16 border-4 border-pink-200 border-t-pink-600 rounded-full"></div>
                <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">Syncing Ads...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-2 md:p-4">
            <Toaster position="top-right" />
            
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Vault</p>
                    <p className="text-3xl font-black text-gray-900 leading-none">{ads.length}</p>
                </div>
                <div className="bg-green-50 p-5 rounded-3xl shadow-sm border border-green-100">
                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Live Ads</p>
                    <p className="text-3xl font-black text-green-700 leading-none">{ads.filter(a => a.status === 'Active').length}</p>
                </div>
                <div className="bg-blue-50 p-5 rounded-3xl shadow-sm border border-blue-100">
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Success (Sold)</p>
                    <p className="text-3xl font-black text-blue-700 leading-none">{ads.filter(a => a.status === 'Sold').length}</p>
                </div>
                <div className="bg-purple-50 p-5 rounded-3xl shadow-sm border border-purple-100">
                    <p className="text-[10px] text-purple-500 font-black uppercase tracking-widest mb-1">Selection</p>
                    <p className="text-3xl font-black text-purple-700 leading-none">{selectedAds.length}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-2">
                    <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl">
                        {['all', 'Active', 'Sold', 'Reserved'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all uppercase tracking-tight ${
                                    filter === status ? 'bg-white text-pink-600 shadow-md' : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-pink-500 bg-white"
                    >
                        <option value="newest">Latest Uploads</option>
                        <option value="oldest">Historical Data</option>
                        <option value="price-high">Price Max-Min</option>
                        <option value="price-low">Price Min-Max</option>
                    </select>
                </div>
                
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search IDs, Titles, Sellers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl w-full focus:ring-2 focus:ring-pink-500 transition-all font-bold text-sm"
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <th className="p-6 w-12 text-center">
                                    <input 
                                        type="checkbox"
                                        checked={selectedAds.length === filteredAds.length && filteredAds.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-pink-600"
                                    />
                                </th>
                                <th className="p-6">Product Metadata</th>
                                <th className="p-6">Taxonomy</th>
                                <th className="p-6">Valuation</th>
                                <th className="p-6 text-center">Enforcement</th>
                                <th className="p-6">Account Holder</th>
                                <th className="p-6 text-center">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedAds.map(ad => (
                                <tr key={ad._id} className={`hover:bg-gray-50 transition-colors ${selectedAds.includes(ad._id) ? 'bg-pink-50/30' : ''}`}>
                                    <td className="p-6 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={selectedAds.includes(ad._id)}
                                            onChange={() => toggleSelectAd(ad._id)}
                                            className="w-4 h-4 rounded border-gray-300 text-pink-600"
                                        />
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative group shrink-0">
                                                <img src={ad.images?.[0] || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-110 transition-transform" alt="" />
                                                {ad.images?.length > 1 && <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">+{ad.images.length - 1}</span>}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black text-gray-800 text-xs uppercase truncate max-w-[180px]">{ad.title || 'Untitled Listing'}</h4>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{new Date(ad.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{ad.category}</span>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-black text-gray-900 text-sm">Rs {ad.price?.toLocaleString()}</p>
                                    </td>
                                    <td className="p-6">
                                        <select
                                            value={ad.status}
                                            onChange={(e) => handleStatusChange(ad._id, e.target.value, ad.status)}
                                            className={`w-full px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 outline-none transition-all cursor-pointer ${
                                                ad.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' :
                                                ad.status === 'Sold' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-gray-50 text-gray-500 border-gray-100'
                                            }`}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Sold">Sold</option>
                                            <option value="Reserved">Reserved</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </td>
                                    <td className="p-6">
                                        <div className="min-w-0">
                                            <p className="font-black text-gray-800 text-[10px] uppercase truncate max-w-[120px]">{ad.postedBy?.name || 'Unknown'}</p>
                                            <p className="text-[9px] text-gray-400 font-bold truncate max-w-[120px]">{ad.postedBy?.email || ad.postedBy?.phone}</p>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => window.open(`/ad/${ad._id}`, '_blank')} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Inspect Listing"><FaEye size={14} /></button>
                                            <button onClick={() => handleDeleteAd(ad._id, ad.title)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Terminate Listing"><FaTrash size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredAds.length === 0 && (
                    <div className="text-center py-24">
                        <FaSearch size={48} className="text-gray-100 mx-auto mb-4" />
                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">No matching listings found in vault</p>
                    </div>
                )}

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-8 border-t border-gray-50 bg-gray-50/30">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100 disabled:opacity-30 transition-all shadow-sm">Previous</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase hover:bg-gray-100 disabled:opacity-30 transition-all shadow-sm">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdsManagement;