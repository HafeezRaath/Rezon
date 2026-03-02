import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PostAd from "./postad"; 
import UpdateAd from "./updatead"; 
import CategorySelector from "../Components/CategorySelector"; 

const getAuthHeaders = () => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
        toast.error("Aapka session khatam ho chuka hai. Dobara login karein.");
        return {}; 
    }
    return {
        headers: {
            'Authorization': `Bearer ${token}` 
        }
    };
};

const Ads = ({ onClose, user }) => {
    const [ads, setAds] = useState([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showPostModal, setShowPostModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [selectedAd, setSelectedAd] = useState(null);
    
    // Mark as Sold States
    const [showSoldModal, setShowSoldModal] = useState(false);
    const [selectedAdForSold, setSelectedAdForSold] = useState(null);
    const [chatUsers, setChatUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const handleCategorySelect = (categoryCode) => {
        setSelectedCategory(categoryCode);
        setShowCategorySelector(false);
        setShowPostModal(true); 
    };

    const handlePostAdClose = () => {
        setShowPostModal(false);
        setSelectedCategory(null);
    };
    
    useEffect(() => {
        const fetchMyAds = async () => {
            const authHeaders = getAuthHeaders();
            if (!authHeaders.headers) return; 

            try {
                const res = await axios.get("http://localhost:8000/api/myads", authHeaders); 
                setAds(res.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setAds([]);
                } else if (err.response?.status === 401 || err.response?.status === 403) {
                    toast.error("Session expired. Please sign in again.");
                    setAds([]);
                } else {
                    console.error("Error fetching my ads:", err);
                }
            }
        };

        fetchMyAds();
    }, []);

    const handleDelete = async (id) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders.headers) return; 
        
        if (!window.confirm("Are you sure you want to delete this ad?")) return;

        try {
            await axios.delete(`http://localhost:8000/api/ads/${id}`, authHeaders); 
            setAds(ads.filter((u) => u._id !== id));
            toast.success("Ad Deleted Successfully!");
        } catch (error) {
            console.error("Delete Error:", error.response?.data || error.message);
            if (error.response?.status === 403) {
                toast.error("Aap yeh ad delete nahi kar sakte (Ownership Error).");
            } else if (error.response?.status === 401) {
                 toast.error("Session error. Please login again.");
            } else {
                toast.error("Ad delete karne mein masla hua.");
            }
        }
    };

    const handleEdit = (ad) => {
        setSelectedAd(ad);
        setShowUpdateModal(true);
    };
    
    const handleAdAdded = (newAd) => {
        setAds([newAd, ...ads]); 
    }

    const handleAdUpdated = (updatedAd) => {
        setAds(ads.map((item) => (item._id === updatedAd._id ? updatedAd : item)));
    };

    const handleMarkAsSoldClick = async (ad) => {
        if (ad.status === 'Sold') {
            toast.error("Yeh item already sold hai");
            return;
        }
        
        setSelectedAdForSold(ad);
        setLoadingUsers(true);
        setShowSoldModal(true);
        
        try {
            const authHeaders = getAuthHeaders();
            const res = await axios.get(
                `http://localhost:8000/api/ad/${ad._id}/chat-users`, 
                authHeaders
            );
            setChatUsers(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || "Users load nahi huay");
            setChatUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    // ✅ TTL SOLUTION: Sirf mark as sold, delete mat karo
    const confirmMarkAsSold = async (buyerUid) => {
        try {
            const authHeaders = getAuthHeaders();
            
            const res = await axios.post(
                `http://localhost:8000/api/ad/${selectedAdForSold._id}/mark-sold`,
                { buyerUid },
                authHeaders
            );
            
            // UI se hatao
            setAds(ads.filter(ad => ad._id !== selectedAdForSold._id));
            
            toast.success(res.data.message || "✅ Sold! Ad auto-deletes in 30 days.");
            
            setShowSoldModal(false);
            setSelectedAdForSold(null);
            
        } catch (err) {
            console.error("Error:", err);
            toast.error(err.response?.data?.message || "Process failed");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-600 hover:text-red-500 text-2xl font-bold"
                >
                    ✕
                </button>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-extrabold text-pink-600">My Ads</h2>
                    <button
                        onClick={() => setShowCategorySelector(true)}
                        className="bg-pink-600 text-white px-6 py-2 rounded-xl hover:bg-pink-500 shadow-md transition font-bold"
                    >
                        + New Ad
                    </button>
                </div>

                <div className="space-y-6">
                    {ads.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-500 text-lg mb-2">Aapne abhi tak koi Ad post nahi kiya hai.</p>
                            <button 
                                onClick={() => setShowCategorySelector(true)}
                                className="text-pink-600 font-bold hover:underline"
                            >
                                Pehla Ad Post Karein →
                            </button>
                        </div>
                    )}
                    
                    {ads.map((ad) => ( 
                        <div
                            key={ad._id}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-pink-300 transition-all"
                        >
                            {ad.images && ad.images.length > 0 && (
                                <div className="flex overflow-x-auto gap-3 p-4 scrollbar-thin scrollbar-thumb-pink-300 scrollbar-track-gray-100 bg-gray-50">
                                    {ad.images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="min-w-[140px] h-[100px] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 shadow-sm"
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border-t border-gray-100 text-sm">
                                <div className="col-span-full flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                                        {ad.category}
                                    </span>
                                </div>
                                
                                <p><span className="text-gray-500">Title:</span> <b>{ad.title}</b></p>
                                <p><span className="text-gray-500">Price:</span> <b className="text-pink-600">Rs {ad.price?.toLocaleString()}</b></p>
                                <p><span className="text-gray-500">Condition:</span> <b>{ad.condition}</b></p>
                                
                                <p className="col-span-full"><span className="text-gray-500">Location:</span> {ad.location}</p>
                            </div>

                            <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => handleEdit(ad)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition shadow-md font-medium"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(ad._id)}
                                    className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition shadow-md font-medium"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => handleMarkAsSoldClick(ad)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition shadow-md font-bold flex items-center gap-2"
                                >
                                    <span>✓</span> Mark as Sold
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showCategorySelector && (
                <CategorySelector onClose={() => setShowCategorySelector(false)} onCategorySelect={handleCategorySelect} />
            )}

            {showPostModal && selectedCategory && (
                <PostAd onClose={handlePostAdClose} onAdAdded={handleAdAdded} category={selectedCategory} />
            )}
            
            {showUpdateModal && (
                <UpdateAd adData={selectedAd} onClose={() => setShowUpdateModal(false)} onUpdate={handleAdUpdated} category={selectedAd.category} />
            )}

            {showSoldModal && selectedAdForSold && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-2xl font-bold text-gray-800">Mark as Sold</h3>
                            <button onClick={() => setShowSoldModal(false)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">✕</button>
                        </div>
                        
                        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-500 mb-1">Item:</p>
                            <p className="font-bold text-gray-800">{selectedAdForSold.title}</p>
                            <p className="text-pink-600 font-bold">Rs {selectedAdForSold.price?.toLocaleString()}</p>
                        </div>
                        
                        <p className="text-gray-600 mb-4 text-sm">
                            Kis buyer ko sell kiya? <b>Sirf selected buyer hi review de sakay ga.</b>
                        </p>

                        {loadingUsers ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                Loading buyers...
                            </div>
                        ) : chatUsers.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                                <p className="mb-2">❌ Is ad pe koi chat nahi hai</p>
                                <p className="text-sm">Pehle buyer se baat karein</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {chatUsers.map((buyer) => (
                                    <button
                                        key={buyer.uid}
                                        onClick={() => confirmMarkAsSold(buyer.uid)}
                                        className="w-full flex items-center gap-3 p-4 border-2 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all text-left group bg-white"
                                    >
                                        <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                            {buyer.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 group-hover:text-green-700 text-lg">{buyer.name}</p>
                                            <p className="text-xs text-gray-500">{buyer.rating ? `⭐ ${buyer.rating}` : 'No reviews'}</p>
                                        </div>
                                        <span className="text-green-600 opacity-0 group-hover:opacity-100 font-bold text-xl">→</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        <button onClick={() => setShowSoldModal(false)} className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ads;