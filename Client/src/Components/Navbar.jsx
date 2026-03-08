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
    FaBellSlash,
    FaHistory,
    FaShieldAlt,
    FaHeart
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
 * Comprehensive Logic for Auth, Verification, and Navigation
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
    const API_URL = "https://rezon.up.railway.app/api";

    // Admin Verification Utility
    const isAdmin = (uid) => uid === "btVq523cTvh4pTUS7AErSyVNER53";

    // ==========================================
    // 📱 SCROLL EFFECT ENGINE
    // ==========================================
    useEffect(() => {
        const handleScrollEffect = () => {
            setScrolled(window.scrollY > 25);
        };
        window.addEventListener("scroll", handleScrollEffect);
        return () => window.removeEventListener("scroll", handleScrollEffect);
    }, []);

    // ==========================================
    // 🔒 CLICK OUTSIDE ENGINE
    // ==========================================
    useEffect(() => {
        const handleGlobalClick = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setShowDropdown(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) setShowMobileMenu(false);
        };
        document.addEventListener("mousedown", handleGlobalClick);
        return () => document.removeEventListener("mousedown", handleGlobalClick);
    }, []);

    // ==========================================
    // 👤 AUTHENTICATION OBSERVER
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
                    });
                    fetchNotificationsData(idToken);
                } catch (err) { console.error("Session sync error"); }
            } else {
                setUser(null);
                localStorage.removeItem('firebaseIdToken');
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // ==========================================
    // ➕ THE MAIN SELL LOGIC (THE "SEEN" FLOW)
    // ==========================================
    const handleSellClick = useCallback(async () => {
        // 1. PHASE ONE: LOGIN CHECK
        if (!user) {
            toast("Identity hidden! Please login first. 🔒", { icon: '🔑' });
            setShowLogin(true); 
            return;
        }

        // 2. PHASE TWO: VERIFICATION CHECK
        setIsVerifying(true);
        const loadingToast = toast.loading("Verifying your account...");

        try {
            const token = localStorage.getItem('firebaseIdToken');
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.dismiss(loadingToast);

            // 3. PHASE THREE: THE REDIRECTION
            if (!res.data?.isVerified) {
                toast("Identity incomplete. Please verify profile 🛡️", { icon: '⚠️' });
                navigate('/verify'); 
            } else {
                toast.success("Identity Confirmed! Loading Post Ad...");
                navigate('/post-ad'); 
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            navigate('/verify'); // Safety default
        } finally {
            setIsVerifying(false);
        }
    }, [user, navigate]);

    // ==========================================
    // 🔔 NOTIFICATION SYSTEM
    // ==========================================
    const fetchNotificationsData = async (token) => {
        try {
            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = res.data?.notifications || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (e) { console.log("Notif sync silent"); }
    };

    // ==========================================
    // 👤 USER INTERACTION HANDLERS
    // ==========================================
    const handleUserIconAction = () => {
        if (!user) setShowLogin(true); // Popup flow
        else setShowDropdown(prev => !prev);
    };

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setShowDropdown(false);
        toast.success("Logged out successfully");
        navigate('/');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch?.(searchQuery);
            navigate(`/?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <>
            <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-700 ${
                scrolled ? 'bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl' : 'bg-slate-900 py-5'
            } border-b border-slate-800/60`}>
                
                <div className="max-w-[1600px] mx-auto px-6 md:px-12">
                    <div className="flex items-center justify-between gap-8">
                        
                        {/* LEFT: LOGO */}
                        <div className="flex items-center gap-6 shrink-0">
                            <button className="lg:hidden text-slate-400" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                                {showMobileMenu ? <FaTimes size={26} /> : <FaBars size={26} />}
                            </button>
                            <Link to="/" className="flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500">
                                    <span className="text-white font-black text-2xl">R</span>
                                </div>
                                <div className="hidden xs:block flex flex-col leading-none">
                                    <span className="text-2xl font-black text-white tracking-tighter">RE<span className="text-emerald-400">ZON</span></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marketplace</span>
                                </div>
                            </Link>
                        </div>

                        {/* CENTER: SEARCH */}
                        <div className="hidden md:flex flex-1 max-w-3xl">
                            <form onSubmit={handleSearchSubmit} className="w-full relative group">
                                <input
                                    type="text"
                                    placeholder="Search for Mobiles, Cars, Electronics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                    className="w-full bg-slate-800/40 border-2 border-slate-700/50 rounded-2xl py-3.5 pl-14 pr-6 text-white focus:border-emerald-500/50 transition-all outline-none"
                                />
                                <FaSearch className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-emerald-400' : 'text-slate-500'}`} size={20} />
                            </form>
                        </div>

                        {/* RIGHT: ACTIONS */}
                        <div className="flex items-center gap-4 sm:gap-7">
                            
                            {/* LOCATION (Pakistan) */}
                            <div className="relative shrink-0">
                                <button 
                                    onClick={() => setShowLocDropdown(true)}
                                    className="hidden lg:flex items-center gap-3 px-6 py-3 bg-slate-800/20 hover:bg-slate-800 rounded-2xl border border-slate-700/30 text-slate-300 hover:text-emerald-400 font-black text-xs tracking-widest"
                                >
                                    <FaMapMarkerAlt className="text-emerald-500" />
                                    <span className="max-w-[120px] truncate uppercase">{selectedLocation}</span>
                                    <FaChevronDown size={10} />
                                </button>
                                {showLocDropdown && (
                                    <LocationDropdown 
                                        onSelect={(loc) => { setSelectedLocation(loc); setShowLocDropdown(false); onLocationChange?.(loc); }} 
                                        onClose={() => setShowLocDropdown(false)} 
                                    />
                                )}
                            </div>

                            {/* CHAT (If Login) */}
                            {user && (
                                <Link to="/conversations" className="p-4 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-2xl relative shadow-xl transition-all">
                                    <FaComments size={26} />
                                    <span className="absolute top-3 right-3 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg"></span>
                                </Link>
                            )}

                            {/* NOTIFICATIONS */}
                            <div className="relative shrink-0" ref={notifRef}>
                                <button onClick={() => setShowNotifications(!showNotifications)} className="p-4 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-2xl">
                                    <FaRegBell size={26} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-3 right-3 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* PROFILE DROPDOWN */}
                            <div className="relative shrink-0" ref={dropdownRef}>
                                <button onClick={handleUserIconAction} className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all">
                                    {user ? (
                                        <>
                                            <img src={user.photoURL} alt="u" className="w-11 h-11 rounded-xl border-2 border-emerald-500/20 object-cover" />
                                            <FaChevronDown size={10} className="text-slate-500 hidden xl:block" />
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 pr-2">
                                            <FaUserCircle size={35} className="text-slate-500 hover:text-emerald-400 transition-colors" />
                                            <span className="hidden sm:block text-xs font-black text-slate-400 uppercase tracking-widest">Sign In</span>
                                        </div>
                                    )}
                                </button>

                                {showDropdown && user && (
                                    <div className="absolute right-0 mt-5 w-72 bg-white rounded-[2.5rem] shadow-2xl py-5 border border-slate-100 overflow-hidden z-[100] animate-in zoom-in-95">
                                        <div className="px-7 py-5 bg-slate-50/80 border-b mb-3 mx-2 rounded-3xl">
                                            <p className="font-black text-slate-900 text-lg truncate">{user.displayName}</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase">{user.email}</p>
                                        </div>
                                        <div className="px-3 space-y-1">
                                            {/* DASHBOARD LINK ADDED */}
                                            {isAdmin(user.uid) && (
                                                <Link to="/admin/dashboard" className="flex items-center gap-4 px-6 py-4 text-emerald-600 bg-emerald-50 rounded-2xl font-black transition-all">
                                                    <FaUserShield size={20} /> Admin Dashboard
                                                </Link>
                                            )}
                                            <Link to="/profile" className="flex items-center gap-4 px-6 py-4 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-black"><FaUserCircle /> Profile</Link>
                                            <Link to="/my-ads" className="flex items-center gap-4 px-6 py-4 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-2xl font-black"><FaStore /> My Ads</Link>
                                        </div>
                                        <button onClick={handleLogout} className="w-[90%] mx-auto flex items-center justify-center gap-3 py-5 text-sm text-rose-600 hover:bg-rose-50 rounded-2xl font-black border-t mt-4 transition-all">
                                            <FaSignOutAlt /> Sign Out Safely
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SELL BUTTON (+) */}
                            <button
                                onClick={handleSellClick}
                                disabled={isVerifying}
                                className="group flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm px-8 py-4 rounded-2xl hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all shadow-lg disabled:opacity-50"
                            >
                                {isVerifying ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                <span className="hidden sm:inline tracking-widest uppercase">Sell Item</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Spacer */}
            <div className={`transition-all duration-500 ${scrolled ? 'h-20' : 'h-24'}`} />

            {/* MODAL SYSTEM */}
            {showLogin && (
                <LoginPopup 
                    isOpen={showLogin} 
                    onClose={() => setShowLogin(false)} 
                    onSuccess={() => setShowLogin(false)}
                />
            )}
            
            <Toaster 
                position="bottom-right" 
                toastOptions={{ 
                    style: { borderRadius: '24px', background: '#0f172a', color: '#fff', fontWeight: 'bold' }
                }} 
            />
        </>
    );
};

export default Navbar;