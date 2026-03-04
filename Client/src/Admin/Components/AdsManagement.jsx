import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { 
    FaTrash, 
    FaEye, 
    FaSearch, 
    FaSpinner, 
    FaExclamationTriangle,
    FaFilter,
    FaSyncAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaEllipsisV
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

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

    // 📊 Fetch ads with pagination
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
            setError(err.response?.data?.message || "Failed to load ads");
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            } else {
                toast.error(err.response?.data?.message || "Failed to load ads");
            }
            setAds([]);
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
                        "{adTitle || 'Untitled'}" will be permanently deleted.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
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
            toast.success("Ad deleted successfully");
            setAds(prev => prev.filter(ad => ad._id !== adId));
        } catch (err) {
            console.error("Delete error:", err);
            toast.error(err.response?.data?.message || "Failed to delete ad");
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
                `${API_BASE_URL}/admin/ads/${adId}/status`, 
                { status: newStatus }, 
                authHeaders
            );
            toast.success(`Status updated to ${newStatus}`);
        } catch (err) {
            // Rollback on error
            setAds(prev => prev.map(ad => 
                ad._id === adId ? { ...ad, status: currentStatus } : ad
            ));
            toast.error(err.response?.data?.message || "Status update failed");
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
        
        const confirm = window.confirm(`Delete ${selectedAds.length} selected ads?`);
        if (!confirm) return;

        setBulkActionLoading(true);
        const authHeaders = getAuthHeaders();
        
        try {
            await axios.post(
                `${API_BASE_URL}/admin/ads/bulk-delete`,
                { ids: selectedAds },
                authHeaders
            );
            toast.success(`${selectedAds.length} ads deleted`);
            setAds(prev => prev.filter(ad => !selectedAds.includes(ad._id)));
            setSelectedAds([]);
        } catch (err) {
            toast.error("Bulk delete failed");
        } finally {
            setBulkActionLoading(false);
        }
    }, [selectedAds, getAuthHeaders]);

    // 🔍 Filter and sort ads
    const filteredAds = useMemo(() => {
        let result = Array.isArray(ads) ? [...ads] : [];
        
        // Filter by status
        if (filter !== 'all') {
            result = result.filter(ad => ad.status === filter);
        }
        
        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(ad => 
                ad.title?.toLowerCase().includes(query) ||
                ad.postedBy?.name?.toLowerCase().includes(query) ||
                ad.category?.toLowerCase().includes(query)
            );
        }
        
        // Sort
        result.sort((a, b) => {
            switch(sortBy) {
                case 'newest':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                case 'oldest':
                    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                case 'price-high':
                    return (b.price || 0) - (a.price || 0);
                case 'price-low':
                    return (a.price || 0) - (b.price || 0);
                default:
                    return 0;
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
                <div className="relative">
                    <div className="animate-spin h-16 w-16 border-4 border-pink-200 border-t-pink-600 rounded-full"></div>
                    <FaSpinner className="absolute inset-0 m-auto text-pink-600 text-xl animate-spin" />
                </div>
                <p className="text-gray-600 font-medium">Loading ads...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4 p-4">
                <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center max-w-md">
                    <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Failed to load ads</h3>
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                    <button 
                        onClick={() => fetchAds(1)}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition flex items-center gap-2 mx-auto"
                    >
                        <FaSyncAlt /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4">
            <Toaster position="top-right" />
            
            {/* Header with Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Ads</p>
                    <p className="text-2xl font-black text-gray-900">{ads.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100">
                    <p className="text-xs text-green-600 uppercase font-bold">Active</p>
                    <p className="text-2xl font-black text-green-700">
                        {ads.filter(a => a.status === 'Active').length}
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase font-bold">Sold</p>
                    <p className="text-2xl font-black text-blue-700">
                        {ads.filter(a => a.status === 'Sold').length}
                    </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl shadow-sm border border-purple-100">
                    <p className="text-xs text-purple-600 uppercase font-bold">Selected</p>
                    <p className="text-2xl font-black text-purple-700">{selectedAds.length}</p>
                </div>
            </div>

            {/* Controls Header */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-2">
                    {/* Filter Buttons */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {['all', 'Active', 'Sold', 'Reserved'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                    filter === status 
                                        ? 'bg-white text-pink-600 shadow-sm' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                {status === 'all' ? 'All' : status}
                            </button>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-pink-500 bg-white"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="price-low">Price: Low to High</option>
                    </select>
                </div>
                
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search ads, sellers, categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-gray-200 rounded-xl w-full focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all font-medium text-sm"
                    />
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedAds.length > 0 && (
                <div className="bg-pink-50 border border-pink-200 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                    <p className="text-pink-800 font-semibold text-sm">
                        {selectedAds.length} ads selected
                    </p>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSelectedAds([])}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={handleBulkDelete}
                            disabled={bulkActionLoading}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {bulkActionLoading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Ads Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 w-12">
                                    <input 
                                        type="checkbox"
                                        checked={selectedAds.length === filteredAds.length && filteredAds.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                </th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500">Ad Details</th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500">Category</th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500">Price</th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500">Status</th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500">Seller</th>
                                <th className="p-4 font-semibold text-xs uppercase text-gray-500 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedAds.map(ad => (
                                <tr 
                                    key={ad._id} 
                                    className={`hover:bg-gray-50 transition-colors ${
                                        selectedAds.includes(ad._id) ? 'bg-pink-50/50' : ''
                                    }`}
                                >
                                    <td className="p-4">
                                        <input 
                                            type="checkbox"
                                            checked={selectedAds.includes(ad._id)}
                                            onChange={() => toggleSelectAd(ad._id)}
                                            className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <img 
                                                    src={ad.images?.[0] || '/placeholder-ad.jpg'} 
                                                    className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100"
                                                    alt=""
                                                    onError={(e) => {e.target.src = '/placeholder-ad.jpg'}}
                                                />
                                                {ad.images?.length > 1 && (
                                                    <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                                        +{ad.images.length - 1}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">
                                                    {ad.title || 'Untitled'}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'No date'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                                            {ad.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-900">Rs {ad.price?.toLocaleString() || '0'}</p>
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={ad.status || 'Active'}
                                            onChange={(e) => handleStatusChange(ad._id, e.target.value, ad.status)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 cursor-pointer outline-none transition-all ${
                                                ad.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                ad.status === 'Sold' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                ad.status === 'Reserved' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Sold">Sold</option>
                                            <option value="Reserved">Reserved</option>
                                            <option value="Suspended">Suspended</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate max-w-[120px]">
                                                {ad.postedBy?.name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate max-w-[120px]">
                                                {ad.postedBy?.email || ad.postedBy?.phone || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-1">
                                            <button 
                                                onClick={() => window.open(`/ad/${ad._id}`, '_blank')}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="View"
                                            >
                                                <FaEye size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAd(ad._id, ad.title)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <FaTrash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Empty State */}
                {filteredAds.length === 0 && (
                    <div className="text-center py-16 bg-gray-50/50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <FaSearch size={32} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No ads found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAds.length)} of {filteredAds.length}
                        </p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-sm font-medium text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-200 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
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