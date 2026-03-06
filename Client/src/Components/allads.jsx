import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { 
    FaSearch, FaStar, FaMapMarkerAlt, FaPhoneAlt, FaUserCircle, 
    FaCheckCircle, FaArrowLeft, FaArrowRight, FaFlag, FaShieldAlt
} from "react-icons/fa";
import toast from "react-hot-toast";

// ✅ UPDATED: RAILWAY LIVE API URL
const API_BASE_URL = "https://rezon.up.railway.app/api";

const MAIN_CATEGORIES = [
    { code: "All", name: "🏠 All" },
    { code: "Mobile", name: "📱 Mobiles" },
    { code: "Car", name: "🚗 Vehicles" },
    { code: "PropertySale", name: "🏠 Property Sale" },
    { code: "PropertyRent", name: "🏢 Property Rent" },
    { code: "Electronics", name: "📺 Electronics" },
    { code: "Bikes", name: "🏍️ Bikes" },
    { code: "Business", name: "💼 Business" },
    { code: "Services", name: "🛠️ Services" },
    { code: "Jobs", name: "💼 Jobs" },
    { code: "Animals", name: "🐾 Animals" },
    { code: "Furniture", name: "🛋️ Furniture" },
    { code: "Fashion", name: "👕 Fashion" },
    { code: "Books", name: "📚 Books" },
    { code: "Kids", name: "👶 Kids" },
];

const AllAds = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [ads, setAds] = useState([]);
    const [filteredAds, setFilteredAds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    
    const [selectedAd, setSelectedAd] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [sellerTrust, setSellerTrust] = useState({ avg: 0, total: 0 });
    
    const [profileModalUid, setProfileModalUid] = useState(null);
    const [sellerInfo, setSellerInfo] = useState(null);
    const [sellerReviews, setSellerReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // Fetch Ads - Updated with Live URL
    useEffect(() => {
        const fetchAds = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/ads`);
                setAds(res.data);
                setFilteredAds(res.data);
            } catch (err) { 
                console.error("Ads fetch error"); 
            }
        };
        fetchAds();
    }, []);

    // Fetch Seller Details - Updated with Live URL
    useEffect(() => {
        const fetchSellerDetails = async () => {
            const uid = profileModalUid || selectedAd?.posted_by_uid;
            if (!uid) return;

            try {
                if (profileModalUid) setLoadingReviews(true);
                const res = await axios.get(`${API_BASE_URL}/reviews/seller/${uid}`);
                
                const reviews = res.data.reviews || [];
                const seller = res.data.seller || null;
                const avg = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

                if (profileModalUid) {
                    setSellerReviews(reviews);
                    setSellerInfo(seller);
                    setLoadingReviews(false);
                } else {
                    setSellerTrust({ avg, total: reviews.length });
                }
            } catch (err) { 
                console.error("Seller fetch error");
                setLoadingReviews(false);
            }
        };
        fetchSellerDetails();
    }, [selectedAd, profileModalUid]);

    // Search & Filter Logic
    useEffect(() => {
        let result = ads;
        if (activeCategory !== "All") {
            result = result.filter(ad => ad.category === activeCategory);
        }
        if (searchTerm) {
            result = result.filter(ad => ad.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredAds(result);
    }, [searchTerm, activeCategory, ads]);

    // Start Chat - Updated with Live URL
    const startChat = async (isReport = false) => {
        if (!user) return toast.error("Please login first!");
        try {
            const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
            const res = await axios.post(`${API_BASE_URL}/chat/start`, {
                buyerId: user.uid, 
                sellerId: selectedAd.posted_by_uid, 
                adId: selectedAd._id
            }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            if (res.data.chatId) {
                navigate(`/chat/${res.data.chatId}`, { state: { isReportRequest: isReport } });
            }
        } catch (error) { 
            toast.error("Chat start nahi ho saki."); 
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 pb-10">
            {/* Header & Filters */}
            <div className="p-4 md:p-8 bg-white border-b shadow-sm">
                <div className="relative max-w-4xl mx-auto mb-6">
                    <input 
                        type="text" 
                        placeholder="What are you looking for?" 
                        className="w-full pl-12 pr-6 py-3 rounded-2xl border-2 border-gray-100 focus:border-pink-500 outline-none shadow-sm text-sm"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FaSearch className="absolute left-4 top-3.5 text-gray-400" />
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
                    {MAIN_CATEGORIES.map((cat) => (
                        <button 
                            key={cat.code} 
                            onClick={() => setActiveCategory(cat.code)}
                            className={`px-5 py-2.5 rounded-full font-bold text-xs border transition-all whitespace-nowrap ${activeCategory === cat.code ? "bg-pink-600 text-white border-pink-600" : "bg-white text-gray-500 hover:border-pink-200"}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ads Grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredAds.map((ad) => (
                    <div 
                        key={ad._id} 
                        onClick={() => { setSelectedAd(ad); setCurrentImageIndex(0); }}
                        className="bg-white rounded-xl shadow-sm border p-2 cursor-pointer hover:shadow-md transition-all group"
                    >
                        <div className="relative overflow-hidden rounded-lg h-32 md:h-44">
                            <img 
                                src={ad.images[0]} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                alt="" 
                            />
                            <div className="absolute top-2 right-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                {ad.sellerRating || "4.5"} <FaStar className="text-yellow-400" />
                            </div>
                        </div>
                        <h2 className="font-bold text-xs mt-2 truncate text-gray-800">{ad.title}</h2>
                        <span className="text-pink-600 font-black text-sm block">Rs {ad.price?.toLocaleString()}</span>
                    </div>
                ))}
            </div>

            {/* Ad Detail Modal */}
            {selectedAd && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[100] p-2 md:p-10">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-[2rem] shadow-2xl relative flex flex-col overflow-hidden">
                        <button 
                            onClick={() => setSelectedAd(null)} 
                            className="absolute top-5 right-5 text-3xl text-gray-400 hover:text-red-500 z-10"
                        >
                            &times;
                        </button>
                        
                        <div className="overflow-y-auto p-4 md:p-8 flex-1">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                                <div className="relative h-64 md:h-[450px] rounded-2xl overflow-hidden border bg-gray-50">
                                    <img 
                                        src={selectedAd.images[currentImageIndex]} 
                                        className="w-full h-full object-contain" 
                                        alt="" 
                                    />
                                    {selectedAd.images?.length > 1 && (
                                        <div className="absolute inset-0 flex items-center justify-between px-2">
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p - 1 + selectedAd.images.length) % selectedAd.images.length)} 
                                                className="bg-white/80 p-2 rounded-full text-pink-600 shadow"
                                            >
                                                <FaArrowLeft/>
                                            </button>
                                            <button 
                                                onClick={() => setCurrentImageIndex(p => (p + 1) % selectedAd.images.length)} 
                                                className="bg-white/80 p-2 rounded-full text-pink-600 shadow"
                                            >
                                                <FaArrowRight/>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-between">
                                    <div>
                                        <h2 className="text-2xl md:text-4xl font-black text-gray-900">{selectedAd.title}</h2>
                                        <span className="text-3xl md:text-5xl font-black text-pink-600 block mt-2">Rs {selectedAd.price?.toLocaleString()}</span>
                                        <div className="flex items-center text-gray-500 text-xs mt-4">
                                            <FaMapMarkerAlt className="mr-2 text-pink-500" /> 
                                            {selectedAd.location}
                                        </div>
                                        
                                        <div className="mt-6 border-t pt-4">
                                            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-gray-400">Item Details</h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm italic text-gray-700">
                                                {Object.entries(selectedAd.details || {}).map(([key, val]) => (
                                                    <p key={key} className="capitalize">
                                                        <b>{key}:</b> {val}
                                                    </p>
                                                ))}
                                                <p><b>Condition:</b> {selectedAd.condition}</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Seller Trust Score</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-black text-gray-800">{sellerTrust.avg}</span>
                                                        <FaStar className="text-yellow-400" />
                                                        <span className="text-xs text-gray-400">({sellerTrust.total} Reviews)</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setProfileModalUid(selectedAd.posted_by_uid)} 
                                                    className="bg-white border-2 border-pink-100 text-pink-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase shadow-sm hover:bg-pink-50"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 space-y-3">
                                        <button 
                                            onClick={() => startChat(false)} 
                                            className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition"
                                        >
                                            Inquire Now
                                        </button>
                                        <button 
                                            className="w-full bg-blue-500 text-white py-4 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg"
                                        >
                                            <FaPhoneAlt className="mr-3" /> Contact Seller
                                        </button>
                                        <button 
                                            onClick={() => startChat(true)} 
                                            className="w-full text-red-400 text-[10px] font-bold flex items-center justify-center gap-1 uppercase opacity-60 hover:opacity-100 transition"
                                        >
                                            <FaFlag /> Report Ad
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 border-t pt-6">
                                <h4 className="font-black text-lg mb-2">Description</h4>
                                <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{selectedAd.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Profile Modal */}
            {profileModalUid && (
                <div className="fixed inset-0 bg-black/90 z-[120] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-[2.5rem] overflow-hidden relative flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="bg-pink-600 p-8 text-white text-center relative">
                            <button 
                                onClick={() => setProfileModalUid(null)} 
                                className="absolute top-5 right-6 text-white text-2xl"
                            >
                                &times;
                            </button>
                            <div className="relative inline-block">
                                <FaUserCircle size={80} className="mx-auto mb-3 bg-white text-pink-100 rounded-full shadow-lg" />
                                <div className="absolute bottom-4 right-0 bg-blue-500 p-1 rounded-full border-2 border-white">
                                    <FaCheckCircle className="text-white" size={12} />
                                </div>
                            </div>
                            <h3 className="font-black text-2xl tracking-tighter uppercase">{sellerInfo?.name || "Verified Seller"}</h3>
                            <div className="flex items-center justify-center gap-2 mt-1 opacity-80">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <FaShieldAlt/> Verified Merchant
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-black text-gray-800 text-xs uppercase tracking-widest border-l-4 border-pink-500 pl-3">Recent Feedback</h4>
                                <div className="text-pink-600 font-bold text-[10px] uppercase">{sellerReviews.length} REVIEWS</div>
                            </div>

                            {loadingReviews ? (
                                <div className="text-center py-10 font-bold text-gray-400 text-xs animate-pulse uppercase">Fetching Records...</div>
                            ) : sellerReviews.length > 0 ? (
                                <div className="space-y-4">
                                    {sellerReviews.map(rev => (
                                        <div key={rev._id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-gray-900 text-xs uppercase">{rev.buyerId?.name || "Buyer"}</span>
                                                <div className="flex text-yellow-400 text-[10px]">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar 
                                                            key={i} 
                                                            className={i < rev.rating ? "text-yellow-400" : "text-gray-200"} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed italic">&ldquo;{rev.comment}&rdquo;</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase mt-2 tracking-tighter">Item: {rev.adId?.title || "Product details"}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase">No reviews yet for this seller.</div>
                            )}
                        </div>
                        <div className="p-4 bg-white border-t text-center">
                            <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.2em]">Powered by Rezon Safety Shield</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllAds;