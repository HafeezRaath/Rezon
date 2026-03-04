import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { FaEdit, FaTrash, FaCheck, FaTimes, FaPlus, FaSpinner, FaUser, FaStar } from "react-icons/fa";
import PostAd from "./postad"; 
import UpdateAd from "./updatead"; 
import CategorySelector from "../Components/CategorySelector"; 

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const Ads = ({ onClose, user }) => {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedAd, setSelectedAd] = useState(null);
    const [showSoldModal, setShowSoldModal] = useState(false);
    const [selectedAdForSold, setSelectedAdForSold] = useState(null);
    const [chatUsers, setChatUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [processingSold, setProcessingSold] = useState(false);

    // 🔒 Secure auth headers with auto-redirect on 401
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('firebaseIdToken');
        if (!token) {
            toast.error("Session expired. Please login again.");
            onClose();
            window.location.href = '/login';
            return null;
        }
        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
    }, [onClose]);

    // 📊 Fetch ads with error handling
    const fetchMyAds = useCallback(async () => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/myads`, authHeaders);
            setAds(res.data?.ads || res.data || []);
        } catch (err) {
            console.error("Error fetching ads:", err);
            if (err.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                onClose();
            } else {
                toast.error("Failed to load ads. Please try again.");
            }
            setAds([]);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders, onClose]);

    useEffect(() => {
        fetchMyAds();
    }, [fetchMyAds]);

    // 🎯 Category selection handler
    const handleCategorySelect = useCallback((categoryCode) => {
        setSelectedCategory(categoryCode);
        setShowCategorySelector(false);
        setShowPostModal(true);
    }, []);

    const handlePostAdClose = useCallback(() => {
        setShowPostModal(false);
        setSelectedCategory(null);
    }, []);

    // 🗑️ Delete handler with optimistic UI
    const handleDelete = useCallback(async (id) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        const confirmDelete = await new Promise((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-medium">Are you sure you want to delete this ad?</p>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-3 py-1 text-sm bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ), { duration: 10000 });
        });

        if (!confirmDelete) return;

        // Optimistic update
        const previousAds = [...ads];
        setAds(prev => prev.filter(ad => ad._id !== id));

        try {
            await axios.delete(`${API_BASE_URL}/ads/${id}`, authHeaders);
            toast.success("Ad deleted successfully!");
        } catch (error) {
            // Rollback on error
            setAds(previousAds);
            console.error("Delete Error:", error);
            const errorMsg = error.response?.status === 403 
                ? "You don't have permission to delete this ad"
                : "Failed to delete ad. Please try again.";
            toast.error(errorMsg);
        }
    }, [ads, getAuthHeaders]);

    // ✏️ Edit handler
    const handleEdit = useCallback((ad) => {
        setSelectedAd(ad);
        setShowUpdateModal(true);
    }, []);

    // ➕ New ad handler
    const handleAdAdded = useCallback((newAd) => {
        setAds(prev => [newAd, ...prev]);
        toast.success("Ad posted successfully!");
    }, []);

    // 🔄 Update handler
    const handleAdUpdated = useCallback((updatedAd) => {
        setAds(prev => prev.map(item => item._id === updatedAd._id ? updatedAd : item));
        toast.success("Ad updated successfully!");
    }, []);

    // 💰 Mark as sold flow
    const handleMarkAsSoldClick = useCallback(async (ad) => {
        if (ad.status === 'sold') {
            toast.error("This item is already sold");
            return;
        }
        
        setSelectedAdForSold(ad);
        setLoadingUsers(true);
        setShowSoldModal(true);
        
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        try {
            const res = await axios.get(
                `${API_BASE_URL}/ad/${ad._id}/chat-users`, 
                authHeaders
            );
            setChatUsers(res.data?.users || res.data || []);
        } catch (err) {
            console.error("Error fetching chat users:", err);
            toast.error(err.response?.data?.message || "Failed to load buyers");
            setChatUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    }, [getAuthHeaders]);

    // ✅ Confirm sold with buyer selection
    const confirmMarkAsSold = useCallback(async (buyerUid) => {
        if (processingSold) return;
        
        setProcessingSold(true);
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        try {
            const res = await axios.post(
                `${API_BASE_URL}/ad/${selectedAdForSold._id}/mark-sold`,
                { buyerUid },
                authHeaders
            );
            
            // Optimistic update
            setAds(prev => prev.map(ad => 
                ad._id === selectedAdForSold._id 
                    ? { ...ad, status: 'sold', soldTo: buyerUid }
                    : ad
            ));
            
            toast.success(res.data?.message || "Marked as sold! Ad will auto-delete in 30 days.");
            setShowSoldModal(false);
            setSelectedAdForSold(null);
        } catch (err) {
            console.error("Error marking as sold:", err);
            toast.error(err.response?.data?.message || "Failed to process. Please try again.");
        } finally {
            setProcessingSold(false);
        }
    }, [selectedAdForSold, processingSold, getAuthHeaders]);

    // 🧹 Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cleanup any pending toasts
            toast.dismiss();
        };
    }, []);

    // 🎨 Memoized empty state
    const EmptyState = useMemo(() => (
        <div className="text-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaPlus className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No ads yet</h3>
            <p className="text-gray-500 mb-6">Start selling by posting your first ad</p>
            <button 
                onClick={() => setShowCategorySelector(true)}
                className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                Post Your First Ad
            </button>
        </div>
    ), []);

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-800">My Ads</h2>
                        <p className="text-sm text-gray-500 mt-1">{ads.length} active {ads.length === 1 ? 'ad' : 'ads'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCategorySelector(true)}
                            className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl hover:bg-pink-700 shadow-lg transition-all font-bold text-sm"
                        >
                            <FaPlus size={14} /> New Ad
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <FaSpinner className="animate-spin text-4xl text-pink-600 mb-4" />
                            <p className="text-gray-500">Loading your ads...</p>
                        </div>
                    ) : ads.length === 0 ? (
                        EmptyState
                    ) : (
                        <div className="grid gap-6">
                            {ads.map((ad) => (
                                <div
                                    key={ad._id}
                                    className={`bg-white rounded-2xl shadow-md overflow-hidden border-2 transition-all hover:shadow-lg ${
                                        ad.status === 'sold' ? 'border-gray-300 opacity-75' : 'border-gray-100 hover:border-pink-200'
                                    }`}
                                >
                                    {/* Sold Badge */}
                                    {ad.status === 'sold' && (
                                        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-bold flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <FaCheck /> SOLD
                                            </span>
                                            <span className="text-xs opacity-75">Auto-deletes in 30 days</span>
                                        </div>
                                    )}

                                    {/* Image Gallery */}
                                    {ad.images?.length > 0 && (
                                        <div className="flex overflow-x-auto gap-3 p-4 bg-gray-50 scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-gray-200">
                                            {ad.images.map((img, index) => (
                                                <div
                                                    key={index}
                                                    className="min-w-[160px] h-[120px] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm group"
                                                >
                                                    <img 
                                                        src={img} 
                                                        alt={`${ad.title} - ${index + 1}`}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Ad Details */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                                                {ad.category}
                                            </span>
                                            {ad.status !== 'sold' && (
                                                <span className="text-xs text-gray-400">
                                                    Posted {new Date(ad.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">{ad.title}</h3>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider">Price</p>
                                                <p className="font-bold text-pink-600 text-lg">Rs {ad.price?.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wider">Condition</p>
                                                <p className="font-semibold text-gray-800">{ad.condition}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-500 text-xs uppercase tracking-wider">Location</p>
                                                <p className="font-semibold text-gray-800 truncate">{ad.location}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {ad.status !== 'sold' && (
                                            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleEdit(ad)}
                                                    className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-semibold text-sm"
                                                >
                                                    <FaEdit size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ad._id)}
                                                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm"
                                                >
                                                    <FaTrash size={14} /> Delete
                                                </button>
                                                <button
                                                    onClick={() => handleMarkAsSoldClick(ad)}
                                                    className="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-lg hover:bg-green-100 transition-colors font-semibold text-sm ml-auto"
                                                >
                                                    <FaCheck size={14} /> Mark as Sold
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCategorySelector && (
                <CategorySelector 
                    onClose={() => setShowCategorySelector(false)} 
                    onCategorySelect={handleCategorySelect}
                />
            )}

            {showPostModal && selectedCategory && (
                <PostAd 
                    onClose={handlePostAdClose} 
                    onAdAdded={handleAdAdded} 
                    category={selectedCategory}
                    user={user}
                />
            )}
            
            {showUpdateModal && selectedAd && (
                <UpdateAd 
                    adData={selectedAd} 
                    onClose={() => setShowUpdateModal(false)} 
                    onUpdate={handleAdUpdated}
                    category={selectedAd.category}
                    user={user}
                />
            )}

            {/* Mark as Sold Modal */}
            {showSoldModal && selectedAdForSold && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4 animate-in fade-in"
                    onClick={(e) => e.target === e.currentTarget && setShowSoldModal(false)}
                >
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold text-gray-800">Mark as Sold</h3>
                            <button 
                                onClick={() => setShowSoldModal(false)} 
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Item</p>
                            <p className="font-bold text-gray-800 text-lg mb-1">{selectedAdForSold.title}</p>
                            <p className="text-pink-600 font-black text-xl">Rs {selectedAdForSold.price?.toLocaleString()}</p>
                        </div>
                        
                        <p className="text-gray-600 mb-4 text-sm">
                            Select the buyer. <span className="font-semibold text-gray-800">Only selected buyer can leave a review.</span>
                        </p>

                        <div className="flex-1 overflow-y-auto mb-4">
                            {loadingUsers ? (
                                <div className="text-center py-8">
                                    <FaSpinner className="animate-spin text-3xl text-pink-500 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Loading buyers...</p>
                                </div>
                            ) : chatUsers.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-xl">
                                    <FaUser className="text-4xl text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600 font-medium mb-1">No buyers found</p>
                                    <p className="text-sm text-gray-400">You haven't chatted with anyone about this ad</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {chatUsers.map((buyer) => (
                                        <button
                                            key={buyer.uid}
                                            onClick={() => confirmMarkAsSold(buyer.uid)}
                                            disabled={processingSold}
                                            className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group bg-white disabled:opacity-50"
                                        >
                                            <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {buyer.name?.charAt(0).toUpperCase() || <FaUser />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 group-hover:text-green-700 truncate">
                                                    {buyer.name || "Unknown Buyer"}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    {buyer.rating ? (
                                                        <>
                                                            <FaStar className="text-yellow-400" />
                                                            <span>{buyer.rating}</span>
                                                        </>
                                                    ) : (
                                                        <span>No reviews yet</span>
                                                    )}
                                                </div>
                                            </div>
                                            <FaCheck className={`text-green-600 transition-all ${processingSold ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'}`} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setShowSoldModal(false)} 
                            className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Ads;