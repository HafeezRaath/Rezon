import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { FaTrash, FaEye, FaSearch } from 'react-icons/fa';

const AdsManagement = () => {
    const [ads, setAds] = useState([]);  // ✅ Empty array se initialize kiya
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const API_URL = "http://localhost:8000/api/admin";
    
    const getAuthHeaders = () => {
        const token = localStorage.getItem('firebaseIdToken');
        return {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/ads`, getAuthHeaders());
            
            console.log("Full API Response:", res.data); // Debug ke liye
            
            // ✅ API response structure handle karo
            let adsData = [];
            
            if (Array.isArray(res.data)) {
                // Direct array hai
                adsData = res.data;
            } else if (res.data?.ads && Array.isArray(res.data.ads)) {
                // { ads: [...] } format mein hai
                adsData = res.data.ads;
            } else if (res.data?.data && Array.isArray(res.data.data)) {
                // { data: [...] } format mein hai
                adsData = res.data.data;
            } else {
                console.warn("Unexpected API response format:", res.data);
                adsData = [];
            }
            
            setAds(adsData);
            
        } catch (err) {
            console.error("Error fetching ads:", err);
            toast.error(err.response?.data?.message || "Ads load nahi huay");
            setAds([]); // Error pe empty array set karo
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAd = async (adId) => {
        if (!window.confirm("⚠️ Kya yeh ad delete karni hai?")) return;
        
        try {
            await axios.delete(`${API_URL}/ads/${adId}`, getAuthHeaders());
            toast.success("✅ Ad delete ho gayi");
            setAds(prev => prev.filter(ad => ad._id !== adId));
        } catch (err) {
            toast.error(err.response?.data?.message || "❌ Delete failed");
        }
    };

    const handleStatusChange = async (adId, newStatus) => {
        try {
            await axios.put(`${API_URL}/ads/${adId}/status`, 
                { status: newStatus }, 
                getAuthHeaders()
            );
            toast.success(`Status ${newStatus} kar diya gaya`);
            fetchAds();
        } catch (err) {
            toast.error("Status update failed");
        }
    };

    // ✅ Safe filter operation - pehle check karo ads array hai
    const filteredAds = Array.isArray(ads) ? ads.filter(ad => {
        const matchesFilter = filter === 'all' || ad.status === filter;
        const matchesSearch = ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            ad.postedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    }) : [];

    if (loading) return <div className="text-center py-20">Loading...</div>;

    return (
        <div className="space-y-6">
            <Toaster position="top-right" />
            
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm">
                <div className="flex gap-2">
                    {['all', 'Active', 'Sold'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                                filter === status 
                                    ? 'bg-pink-600 text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {status === 'all' ? 'All Ads' : status}
                        </button>
                    ))}
                </div>
                
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search ads or sellers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-80 focus:outline-none focus:border-pink-500"
                    />
                </div>
            </div>

            {/* Ads Table */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-bold text-gray-700">Ad Details</th>
                                <th className="p-4 font-bold text-gray-700">Category</th>
                                <th className="p-4 font-bold text-gray-700">Price</th>
                                <th className="p-4 font-bold text-gray-700">Status</th>
                                <th className="p-4 font-bold text-gray-700">Seller</th>
                                <th className="p-4 font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredAds.map(ad => (
                                <tr key={ad._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                src={ad.images?.[0] || '/placeholder-image.jpg'} 
                                                alt={ad.title || 'Ad image'} 
                                                className="w-16 h-16 rounded-lg object-cover border"
                                                onError={(e) => {e.target.src = '/placeholder-image.jpg'}}
                                            />
                                            <div>
                                                <h4 className="font-bold text-gray-800 line-clamp-1 max-w-xs">
                                                    {ad.title || 'Untitled Ad'}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'No date'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                                            {ad.category || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">
                                        Rs {ad.price?.toLocaleString() || '0'}
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={ad.status || 'Active'}
                                            onChange={(e) => handleStatusChange(ad._id, e.target.value)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border-0 cursor-pointer ${
                                                ad.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                ad.status === 'Sold' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Sold">Sold</option>
                                            <option value="Reserved">Reserved</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-800">{ad.postedBy?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{ad.postedBy?.email || 'No email'}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => window.open(`/ad/${ad._id}`, '_blank')}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="View Ad"
                                            >
                                                <FaEye />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAd(ad._id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete Ad"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredAds.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <FaSearch size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No ads found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdsManagement;