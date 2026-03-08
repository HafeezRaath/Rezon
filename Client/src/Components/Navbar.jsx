import React, { 
    useState, 
    useEffect, 
    useCallback, 
    useRef, 
    useMemo 
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    FaComments,
    FaRegBell,
    FaUserCircle,
    FaTrash,
    FaPlus,
    FaMapMarkerAlt,
    FaSpinner,
    FaBars,
    FaTimes,
    FaSearch,
    FaChevronDown,
    FaStore,
    FaUserShield,
    FaSignOutAlt,
    FaCog,
    FaQuestionCircle,
    FaInfoCircle,
    FaUserEdit,
    FaBellSlash
} from "react-icons/fa";
import axios from "axios"; 
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

// ==========================================
// 🛡️ COMPONENT IMPORTS
// ==========================================
import LoginPopup from "./Loginpopup";
import LocationDropdown from "./LocationDropdown";

/**
 * Navbar Component - REZON Marketplace
 * Handles Navigation, Auth State, and Seller Verification Flow
 */
const Navbar = ({ onSearch, onLocationChange }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- 🔗 REFS ---
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const searchInputRef = useRef(null);
    
    // --- 📊 UI STATES ---
    const [selectedLocation, setSelectedLocation] = useState("Pakistan");
    const [showLogin, setShowLogin] = useState(false);
    const [showLocDropdown, setShowLocDropdown] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // --- 🌍 API CONFIGURATION ---
    const API_URL = window.location.hostname === "localhost" 
        ? "http://localhost:8000/api" 
        : "https://rezon.up.railway.app/api";

    // ==========================================
    // 📱 SCROLL EVENT LISTENER
    // ==========================================
    useEffect(() => {
        const handleScrollEffect = () => {
            if (window.scrollY > 30) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };
        window.addEventListener("scroll", handleScrollEffect);
        return () => window.removeEventListener("scroll", handleScrollEffect);
    }, []);

    // ==========================================
    // 🔒 CLICK OUTSIDE HANDLER
    // ==========================================
    useEffect(() => {
        const handleGlobalClick = (event) => {
            // Dropdown Close Logic
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            // Notification Close Logic
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            // Mobile Menu Close Logic
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setShowMobileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, []);

    // ==========================================
    // 👤 AUTHENTICATION STATE TRACKER
    // ==========================================
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const idToken = await currentUser.getIdToken(true);
                    localStorage.setItem('firebaseIdToken', idToken);
                    
                    setUser({
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                        email: currentUser.email,
                        photoURL: currentUser.photoURL || "/default-avatar.png",
                        emailVerified: currentUser.emailVerified
                    });

                    // Start notification polling if needed
                    fetchNotificationsData(idToken);
                } catch (err) {
                    console.error("Auth sync failed in Navbar");
                }
            } else {
                setUser(null);
                localStorage.removeItem('firebaseIdToken');
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // ==========================================
    // ➕ THE MAIN SELL LOGIC (SEQUENCE FIX)
    // ==========================================
    const handleSellClick = useCallback(async () => {
        console.log("Start Selling Triggered...");

        // 1. PHASE ONE: LOGIN CHECK
        if (!user) {
            toast("Identity hidden! Please login first. 🔒", {
                icon: '🔑',
                duration: 3000,
                position: 'top-center'
            });
            setShowLogin(true); // Open Popup
            return;
        }

        // 2. PHASE TWO: DATABASE VERIFICATION CHECK
        setIsVerifying(true);
        const toastLoadingId = toast.loading("Checking verification status...");

        try {
            const token = localStorage.getItem('firebaseIdToken');
            if (!token) throw new Error("No secure token found");

            const response = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });

            toast.dismiss(toastLoadingId);

            // 3. PHASE THREE: REDIRECTION LOGIC
            if (!response.data?.isVerified) {
                toast("Verification pending. Please complete your profile 🛡️", { icon: '⚠️' });
                navigate('/verify'); // REDIRECT TO VERIFICATION
            } else {
                toast.success("Ready to sell!");
                navigate('/post-ad'); // REDIRECT TO POST AD
            }
        } catch (error) {
            toast.dismiss(toastLoadingId);
            console.error("Verification system error:", error);
            
            if (error.response?.status === 401) {
                toast.error("Session expired. Please re-login.");
                setShowLogin(true);
            } else {
                // Fallback to verify page if server check fails
                navigate('/verify'); 
            }
        } finally {
            setIsVerifying(false);
        }
    }, [user, API_URL, navigate]);

    // ==========================================
    // 🔔 NOTIFICATIONS FETCHER
    // ==========================================
    const fetchNotificationsData = async (token) => {
        try {
            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = res.data?.notifications || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (e) {
            console.log("Notification fetch skipped");
        }
    };

    // ==========================================
    // 👤 USER INTERACTION HANDLERS
    // ==========================================
    const handleUserIconAction = () => {
        if (!user) {
            setShowLogin(true); // If no user, show login popup
        } else {
            setShowDropdown(prev => !prev); // Toggle profile menu
        }
    };

    const handleLocationClick = () => {
        setShowLocDropdown(true); // Open Location Selection Popup
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch?.(searchQuery);
            navigate(`/?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const performLogout = async () => {
        try {
            const confirmLogout = window.confirm("Are you sure you want to sign out?");
            if (!confirmLogout) return;

            await signOut(auth);
            setUser(null);
            setShowDropdown(false);
            localStorage.removeItem('firebaseIdToken');
            toast.success("Signed out successfully!");
            navigate('/');
        } catch (err) {
            toast.error("Logout process failed");
        }
    };

    // ==========================================
    // 🎨 RENDER SECTION
    // ==========================================
    return (
        <>
            <header 
                className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-700 ease-in-out ${
                    scrolled 
                    ? 'bg-slate-900/95 backdrop-blur-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] py-2' 
                    : 'bg-slate-900 py-5'
                } border-b border-slate-800/60`}
            >
                <div className="max-w-[1500px] mx-auto px-5 md:px-10">
                    <div className="flex items-center justify-between gap-6">
                        
                        {/* --- LEFT: BRANDING --- */}
                        <div className="flex items-center gap-5 shrink-0">
                            <button 
                                className="lg:hidden p-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-2xl transition-all"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                            >
                                {showMobileMenu ? <FaTimes size={24} /> : <FaBars size={24} />}
                            </button>
                            
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                                    <span className="text-white font-black text-2xl tracking-tighter">R</span>
                                </div>
                                <div className="flex flex-col leading-none hidden xs:block">
                                    <span className="text-2xl font-black text-white tracking-tighter">
                                        RE<span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">ZON</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Marketplace</span>
                                </div>
                            </Link>
                        </div>

                        {/* --- CENTER: ADVANCED SEARCH --- */}
                        <div className="hidden md:flex flex-1 max-w-3xl">
                            <form 
                                onSubmit={handleSearchSubmit}
                                className={`w-full relative group transition-all duration-500 ${isSearchFocused ? 'translate-y-[-2px]' : ''}`}
                            >
                                <div className={`absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl transition-opacity duration-500 ${isSearchFocused ? 'opacity-100' : 'opacity-0'}`}></div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Looking for a specific car or mobile? Search here..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-2xl py-3.5 pl-14 pr-6 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-800/90 transition-all relative z-10"
                                />
                                <FaSearch className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 z-20 ${isSearchFocused ? 'text-emerald-400 scale-110' : 'text-slate-500'}`} size={20} />
                            </form>
                        </div>

                        {/* --- RIGHT: ACTIONS & AUTH --- */}
                        <div className="flex items-center gap-3 sm:gap-6">
                            
                            {/* 📍 GEOLOCATION SELECTOR */}
                            <div className="relative shrink-0">
                                <button 
                                    onClick={handleLocationClick}
                                    className="hidden lg:flex items-center gap-3 px-5 py-3 bg-slate-800/20 hover:bg-slate-800 rounded-2xl border border-slate-700/30 text-slate-300 hover:text-emerald-400 transition-all duration-300 font-black text-xs uppercase tracking-widest"
                                >
                                    <FaMapMarkerAlt className="text-emerald-500 animate-pulse" />
                                    <span className="max-w-[110px] truncate">{selectedLocation}</span>
                                    <FaChevronDown size={12} className="opacity-30" />
                                </button>
                                
                                {showLocDropdown && (
                                    <LocationDropdown 
                                        onSelect={(loc) => { setSelectedLocation(loc); setShowLocDropdown(false); onLocationChange?.(loc); }} 
                                        onClose={() => setShowLocDropdown(false)} 
                                    />
                                )}
                            </div>

                            {/* 💬 SMART CHAT (HIDDEN IF LOGGED OUT) */}
                            {user && (
                                <Link 
                                    to="/conversations" 
                                    className="p-3.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-2xl transition-all relative group shadow-lg"
                                >
                                    <FaComments size={24} />
                                    <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-emerald-500/50 group-hover:scale-125 transition-transform"></span>
                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Messages</div>
                                </Link>
                            )}

                            {/* 🔔 NOTIFICATION ENGINE */}
                            <div className="relative shrink-0" ref={notifRef}>
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-3.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-2xl transition-all group"
                                >
                                    <FaRegBell size={24} className="group-hover:rotate-12 transition-transform" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* 👤 AVATAR & DROPDOWN ENGINE */}
                            <div className="relative shrink-0" ref={dropdownRef}>
                                <button 
                                    onClick={handleUserIconAction}
                                    className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl hover:bg-slate-800/80 border border-slate-800/0 hover:border-slate-700/50 transition-all duration-300 group"
                                >
                                    {user ? (
                                        <>
                                            <div className="relative">
                                                <img 
                                                    src={user.photoURL} 
                                                    alt="User Profile" 
                                                    className="w-10 h-10 rounded-xl border-2 border-emerald-500/20 object-cover group-hover:border-emerald-500 transition-colors shadow-lg" 
                                                />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                                            </div>
                                            <div className="hidden xl:flex flex-col items-start leading-none">
                                                <span className="text-xs font-black text-white">{user.displayName}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Member</span>
                                            </div>
                                            <FaChevronDown size={10} className="text-slate-600 group-hover:text-emerald-400" />
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <FaUserCircle size={32} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                            <span className="hidden sm:block text-xs font-black text-slate-400 uppercase tracking-widest">Sign In</span>
                                        </div>
                                    )}
                                </button>

                                {/* --- DROPDOWN BOX --- */}
                                {showDropdown && user && (
                                    <div className="absolute right-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] py-4 border border-slate-100 animate-in fade-in slide-in-from-top-5 overflow-hidden z-[100]">
                                        <div className="px-6 py-5 bg-slate-50/80 border-b border-slate-100 mb-3 mx-2 rounded-3xl">
                                            <p className="font-black text-slate-900 text-lg truncate leading-tight">{user.displayName}</p>
                                            <p className="text-[11px] text-slate-400 truncate font-bold uppercase tracking-tight">{user.email}</p>
                                        </div>
                                        
                                        <div className="px-2 space-y-1">
                                            <Link to="/profile" className="flex items-center gap-4 px-6 py-3.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-black transition-all group">
                                                <FaUserCircle size={18} className="text-slate-400 group-hover:text-emerald-500" /> Profile Overview
                                            </Link>
                                            <Link to="/my-ads" className="flex items-center gap-4 px-6 py-3.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-black transition-all group">
                                                <FaStore size={18} className="text-slate-400 group-hover:text-emerald-500" /> Listing Manager
                                            </Link>
                                            <Link to="/settings" className="flex items-center gap-4 px-6 py-3.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-black transition-all group">
                                                <FaCog size={18} className="text-slate-400 group-hover:text-emerald-500" /> Account Settings
                                            </Link>
                                        </div>

                                        <button 
                                            onClick={performLogout} 
                                            className="w-[90%] mx-auto flex items-center justify-center gap-3 py-4 text-sm text-rose-600 hover:bg-rose-50 rounded-2xl font-black border-t border-slate-100 mt-4 transition-all"
                                        >
                                            <FaSignOutAlt /> Sign Out Safely
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* --- 🔥 CALL TO ACTION: SELL BUTTON --- */}
                            <button
                                onClick={handleSellClick}
                                disabled={isVerifying}
                                className="group flex items-center gap-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white font-black text-sm px-8 py-4 rounded-2xl hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] hover:scale-[1.03] hover:-translate-y-1 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {isVerifying ? (
                                    <FaSpinner className="animate-spin" size={18} />
                                ) : (
                                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/40 transition-colors">
                                        <FaPlus className="text-[10px]" />
                                    </div>
                                )}
                                <span className="hidden sm:inline tracking-widest uppercase">Sell Item</span>
                            </button>

                        </div>
                    </div>
                </div>
            </header>

            {/* SPACER (Crucial for fixed header) */}
            <div className={`transition-all duration-500 ${scrolled ? 'h-20' : 'h-24'}`} />

            {/* ==========================================
                🛡️ POPUP RENDERING ENGINE
            ========================================== */}
            
            {/* 1. Login/Signup Flow */}
            {showLogin && (
                <LoginPopup 
                    onClose={() => setShowLogin(false)} 
                    onSuccess={() => { setShowLogin(false); toast.success("Welcome back!"); }}
                />
            )}

            {/* 2. Location Selection Overlay */}
            {showLocDropdown && (
                <div className="lg:hidden fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm p-5 flex items-center justify-center">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-slate-900 text-xl tracking-tighter">Select City</h3>
                            <button onClick={() => setShowLocDropdown(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <FaTimes />
                            </button>
                        </div>
                        <LocationDropdown 
                            onSelect={(loc) => { setSelectedLocation(loc); setShowLocDropdown(false); onLocationChange?.(loc); }} 
                            onClose={() => setShowLocDropdown(false)} 
                        />
                    </div>
                </div>
            )}
            
            {/* GLOBAL TOAST SYSTEM */}
            <Toaster 
                position="bottom-right" 
                reverseOrder={false}
                toastOptions={{ 
                    style: { 
                        borderRadius: '24px', 
                        background: '#0f172a', 
                        color: '#fff',
                        padding: '16px 24px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }} 
            />
        </>
    );
};

export default Navbar;