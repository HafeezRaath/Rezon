import React, {
    useState,
    useEffect,
    useCallback,
    useRef,
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
    FaHeart,
    FaHome,
    FaThLarge,
    FaArrowLeft,
    FaMobileAlt,
    FaCar,
    FaTv,
    FaMotorcycle,
    FaBriefcase,
    FaPaw,
    FaChair,
    FaTshirt,
    FaBookOpen,
    FaChild
} from "react-icons/fa";
import axios from "axios";
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

// Components
import LoginPopup from "./Loginpopup";
import LocationDropdown from "./LocationDropdown";
import Ads from "../CRUD/ads";

const Navbar = ({ onSearch, onLocationChange, onCategoryChange }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const mobileMenuRef = useRef(null);
    const searchInputRef = useRef(null);

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
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [showMyAds, setShowMyAds] = useState(false);

    const API_URL = "https://rezon.up.railway.app/api";

    const isAdmin = (uid) => uid === "btVq523cTvh4pTUS7AErSyVNER53";

    // 🔥 FIXED: Category list with icons
    const MOBILE_CATEGORIES = [
        { code: 'Mobile', label: 'Mobiles', icon: FaMobileAlt },
        { code: 'Car', label: 'Vehicles', icon: FaCar },
        { code: 'Electronics', label: 'Electronics', icon: FaTv },
        { code: 'Bikes', label: 'Bikes', icon: FaMotorcycle },
        { code: 'PropertySale', label: 'Property', icon: FaHome },
        { code: 'Furniture', label: 'Furniture', icon: FaChair },
        { code: 'Fashion', label: 'Fashion', icon: FaTshirt },
        { code: 'Jobs', label: 'Jobs', icon: FaBriefcase },
        { code: 'Animals', label: 'Animals', icon: FaPaw },
        { code: 'Books', label: 'Books', icon: FaBookOpen },
        { code: 'Kids', label: 'Kids', icon: FaChild },
    ];

    // SYNC SEARCH + LOCATION WITH URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlSearch = params.get("search");
        const urlLocation = params.get("location");

        if (urlSearch) {
            setSearchQuery(urlSearch);
        }
        if (urlLocation) {
            setSelectedLocation(urlLocation);
        }
    }, [location.search]);

    // Scroll effect
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 25);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) setShowMobileMenu(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auth observer
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
                    fetchNotifications(idToken);
                } catch (err) { console.error("Auth error:", err); }
            } else {
                setUser(null);
                localStorage.removeItem('firebaseIdToken');
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchNotifications = async (token) => {
        try {
            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = res.data?.notifications || [];
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (e) { console.log("Notifications fetch failed"); }
    };

    const handleSellClick = useCallback(async () => {
        if (!user) {
            toast("Please login first! 🔒", { icon: '🔑' });
            setShowLogin(true);
            return;
        }

        setIsVerifying(true);
        const loadingToast = toast.loading("Verifying...");

        try {
            const token = localStorage.getItem('firebaseIdToken');
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            toast.dismiss(loadingToast);

            if (!res.data?.isVerified) {
                toast("Please verify your profile 🛡️", { icon: '⚠️' });
                navigate('/verify');
            } else {
                setShowMyAds(true);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            navigate('/verify');
        } finally {
            setIsVerifying(false);
        }
    }, [user, navigate]);

    // 🔥 NEW: Handle category click - navigate to home with category param
    const handleCategoryClick = useCallback((categoryCode) => {
        setShowMobileMenu(false);
        onCategoryChange?.(categoryCode);

        // Navigate to home with category
        const params = new URLSearchParams(location.search);
        if (categoryCode && categoryCode !== 'All') {
            params.set('category', categoryCode);
        } else {
            params.delete('category');
        }
        const queryString = params.toString();
        navigate(queryString ? `/?${queryString}` : '/');
    }, [navigate, location.search, onCategoryChange]);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setShowDropdown(false);
        toast.success("Logged out");
        navigate('/');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        onSearch?.(searchQuery.trim());
        navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
        setShowMobileSearch(false);
        setShowMobileMenu(false);
    };

    const clearSearch = () => {
        setSearchQuery("");
        onSearch?.("");
        const params = new URLSearchParams();
        if (selectedLocation && selectedLocation !== 'Pakistan') {
            params.set('location', selectedLocation);
        }
        const queryString = params.toString();
        navigate(queryString ? `/?${queryString}` : '/');
    };

    const handleChatClick = useCallback(() => {
        if (!user) {
            setShowLogin(true);
            return;
        }
        navigate('/conversations');
        setShowMobileMenu(false);
    }, [user, navigate]);

    // MOBILE MENU COMPONENT
    const MobileMenu = () => (
        <div
            ref={mobileMenuRef}
            className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${showMobileMenu ? 'visible' : 'invisible'}`}
        >
            <div
                className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${showMobileMenu ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setShowMobileMenu(false)}
            />

            <div className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-out flex flex-col ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>

                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <Link to="/" className="flex items-center gap-3" onClick={() => setShowMobileMenu(false)}>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-black text-xl">R</span>
                        </div>
                        <span className="text-xl font-black text-white">RE<span className="text-emerald-400">ZON</span></span>
                    </Link>
                    <button
                        onClick={() => setShowMobileMenu(false)}
                        className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">
                    {user ? (
                        <div className="p-6 border-b border-slate-800 bg-slate-800/20">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={user.photoURL} alt="" className="w-14 h-14 rounded-xl border-2 border-emerald-500/30 object-cover" />
                                <div className="min-w-0">
                                    <p className="font-bold text-white truncate">{user.displayName}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                </div>
                            </div>
                            {isAdmin(user.uid) && (
                                <Link
                                    to="/admin/dashboard"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold mb-2 border border-emerald-500/20"
                                >
                                    <FaUserShield /> Admin Dashboard
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 border-b border-slate-800">
                            <button
                                onClick={() => { setShowMobileMenu(false); setShowLogin(true); }}
                                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                Login / Sign Up
                            </button>
                        </div>
                    )}

                    {/* 🔥 FIXED: Location Section - Better mobile display */}
                    <div className="p-6 border-b border-slate-800">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Your Location</p>
                        <div className="flex items-center gap-3 p-3.5 bg-slate-800/40 rounded-xl text-slate-300 border border-slate-700/50">
                            <FaMapMarkerAlt className="text-emerald-500 shrink-0" />
                            <span className="font-medium truncate flex-1">{selectedLocation || "Select Location"}</span>
                        </div>
                        <div className="mt-3">
                            <LocationDropdown
                                selected={selectedLocation}
                                onChange={(loc) => {
                                    setSelectedLocation(loc);
                                    onLocationChange?.(loc);
                                    setShowMobileMenu(false);

                                    const params = new URLSearchParams(location.search);
                                    if (loc && loc !== 'Pakistan') {
                                        params.set('location', loc);
                                    } else {
                                        params.delete('location');
                                    }
                                    const queryString = params.toString();
                                    navigate(queryString ? `/?${queryString}` : '/');
                                }}
                            />
                        </div>
                    </div>

                    {/* 🔥 FIXED: Categories - Navigate to home with category filter */}
                    <div className="p-4 space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2 mt-2">Browse Categories</p>

                        <Link
                            to="/"
                            onClick={() => { setShowMobileMenu(false); handleCategoryClick('All'); }}
                            className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-xl transition-all group"
                        >
                            <FaHome className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            <span className="font-medium">All Items</span>
                        </Link>

                        {MOBILE_CATEGORIES.map((item) => (
                            <button
                                key={item.code}
                                onClick={() => handleCategoryClick(item.code)}
                                className="w-full flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-xl transition-all group text-left"
                            >
                                <item.icon className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                <span className="font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {user && (
                        <div className="p-4 border-t border-slate-800 space-y-1 mt-2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">My Account</p>
                            <Link to="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl">
                                <FaUserEdit className="text-slate-500" /> Profile Settings
                            </Link>
                            <button onClick={() => { setShowMobileMenu(false); setShowMyAds(true); }} className="w-full flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl text-left">
                                <FaHistory className="text-slate-500" /> My Active Ads
                            </button>
                            <button onClick={() => { setShowMobileMenu(false); handleChatClick(); }} className="w-full flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl text-left">
                                <FaComments className="text-slate-500" /> Inbox Messages
                            </button>
                            <button
                                onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                                className="w-full flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors mt-4"
                            >
                                <FaSignOutAlt /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // MOBILE SEARCH OVERLAY
    const MobileSearch = () => (
        <div className={`fixed inset-0 z-[100] bg-slate-900 transform transition-transform duration-300 lg:hidden ${showMobileSearch ? 'translate-y-0' : '-translate-y-full'
            }`}>
            <div className="p-4 border-b border-slate-800 flex items-center gap-4">
                <button
                    onClick={() => setShowMobileSearch(false)}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shrink-0"
                >
                    <FaArrowLeft />
                </button>
                <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </form>
                <button
                    onClick={handleSearchSubmit}
                    className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0"
                >
                    <FaSearch />
                </button>
            </div>

            <div className="p-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Popular Searches</p>
                <div className="flex flex-wrap gap-2">
                    {['iPhone 15', 'Toyota Corolla', 'Samsung S24', 'Honda 125', 'Laptop'].map((term) => (
                        <button
                            key={term}
                            onClick={() => {
                                setSearchQuery(term);
                                onSearch?.(term);
                                navigate(`/?search=${encodeURIComponent(term)}`);
                                setShowMobileSearch(false);
                            }}
                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
                        >
                            {term}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // 🔥 FIXED: BOTTOM MOBILE NAV - No double footer
    const BottomNav = () => {
        // Don't show on chat pages
        if (location.pathname.startsWith('/chat')) return null;

        return (
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 lg:hidden z-40 pb-safe">
                <div className="flex items-center justify-around py-2">
                    <Link to="/" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/' && !location.search ? 'text-emerald-400' : 'text-slate-400'}`}>
                        <FaHome size={20} />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>
                    <button 
                        onClick={() => setShowMobileMenu(true)}
                        className={`flex flex-col items-center gap-1 p-2 ${location.search.includes('category') ? 'text-emerald-400' : 'text-slate-400'}`}
                    >
                        <FaThLarge size={20} />
                        <span className="text-[10px] font-medium">Categories</span>
                    </button>
                    <button
                        onClick={handleSellClick}
                        className="flex flex-col items-center -mt-6"
                    >
                        <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 border-4 border-slate-900">
                            <FaPlus size={24} />
                        </div>
                        <span className="text-[10px] font-medium text-emerald-400 mt-1">Sell</span>
                    </button>
                    <button 
                        onClick={handleChatClick}
                        className={`flex flex-col items-center gap-1 p-2 ${location.pathname.includes('chat') || location.pathname.includes('conversations') ? 'text-emerald-400' : 'text-slate-400'}`}
                    >
                        <FaComments size={20} />
                        <span className="text-[10px] font-medium">Chat</span>
                    </button>
                    <button
                        onClick={() => user ? navigate('/profile') : setShowLogin(true)}
                        className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/profile' ? 'text-emerald-400' : 'text-slate-400'}`}
                    >
                        {user ? (
                            <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                            <FaUserCircle size={20} />
                        )}
                        <span className="text-[10px] font-medium">Profile</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ${scrolled ? 'bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl' : 'bg-slate-900 py-2.5 sm:py-3 md:py-5'
                } border-b border-slate-800/60`}>

                <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-12">
                    <div className="flex items-center justify-between gap-2 sm:gap-4 h-full">

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <button
                                className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-400 shrink-0"
                                onClick={() => setShowMobileMenu(true)}
                            >
                                <FaBars size={20} />
                            </button>

                            <Link to="/" className="flex items-center gap-2 sm:gap-3 group" onClick={clearSearch}>
                                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all shrink-0">
                                    <span className="text-white font-black text-lg sm:text-xl md:text-2xl">R</span>
                                </div>
                                <div className="hidden sm:flex flex-col leading-none">
                                    <span className="text-xl md:text-2xl font-black text-white tracking-tighter">
                                        RE<span className="text-emerald-400">ZON</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Marketplace</span>
                                </div>
                            </Link>
                        </div>

                        {/* DESKTOP SEARCH */}
                        <div className="hidden lg:flex flex-1 max-w-2xl xl:max-w-3xl">
                            <form onSubmit={handleSearchSubmit} className="w-full relative">
                                <input
                                    type="text"
                                    placeholder="Search for Mobiles, Cars, Electronics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-10 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                />
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />

                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    >
                                        <FaTimes size={14} />
                                    </button>
                                )}
                            </form>
                        </div>

                        {/* Mobile search trigger */}
                        <button
                            className="lg:hidden flex-1 min-w-0 max-w-[120px] xs:max-w-[160px] sm:max-w-[200px] bg-slate-800/50 border border-slate-700 rounded-xl py-2 px-2 sm:py-3 sm:px-4 text-left text-slate-400 flex items-center gap-2 shrink-0"
                            onClick={() => setShowMobileSearch(true)}
                        >
                            <FaSearch size={16} className="shrink-0" />
                            <span className="text-xs sm:text-sm truncate">{searchQuery || "Search..."}</span>
                        </button>

                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0">

                            <div className="hidden xl:block relative">
                                <button
                                    onClick={() => setShowLocDropdown(prev => !prev)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/30 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-slate-300 hover:text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    <FaMapMarkerAlt className="text-emerald-500" />
                                    <span className="max-w-[100px] truncate">{selectedLocation}</span>
                                    <FaChevronDown
                                        size={10}
                                        className={`transition-transform duration-200 ${showLocDropdown ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {showLocDropdown && (
                                    <div className="absolute top-full left-0 mt-2 z-50">
                                        <LocationDropdown
                                            selected={selectedLocation}
                                            onChange={(loc) => {
                                                setSelectedLocation(loc);
                                                setShowLocDropdown(false);
                                                onLocationChange?.(loc);

                                                const params = new URLSearchParams(location.search);
                                                if (loc && loc !== 'Pakistan') {
                                                    params.set('location', loc);
                                                } else {
                                                    params.delete('location');
                                                }
                                                const queryString = params.toString();
                                                navigate(queryString ? `/?${queryString}` : '/');
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {user && (
                                <button
                                    onClick={handleChatClick}
                                    className="hidden md:flex p-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all relative shrink-0"
                                >
                                    <FaComments size={22} />
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
                                </button>
                            )}

                            <div className="relative hidden md:block" ref={notifRef}>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all relative shrink-0"
                                >
                                    <FaRegBell size={22} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="hidden md:flex items-center gap-3" ref={dropdownRef}>
                                {user ? (
                                    <div className="relative flex items-center gap-3">
                                        <button 
                                            onClick={() => setShowDropdown(!showDropdown)}
                                            className="flex items-center gap-2 p-1.5 bg-slate-800/40 hover:bg-slate-800 rounded-full border border-slate-700/50 transition-all shrink-0"
                                        >
                                            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                                            <FaChevronDown size={10} className={`text-slate-400 mr-1 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
                                        </button>

                                        {showDropdown && (
                                            <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-4 py-3 border-b border-slate-800">
                                                    <p className="font-bold text-white truncate">{user.displayName}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                                <Link to="/profile" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 transition-colors"><FaUserCircle /> My Profile</Link>
                                                <button onClick={() => { setShowDropdown(false); setShowMyAds(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 transition-colors text-left"><FaHistory /> My Ads</button>
                                                <button onClick={() => { setShowDropdown(false); handleChatClick(); }} className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 transition-colors text-left"><FaComments /> Messages</button>
                                                {isAdmin(user.uid) && <Link to="/admin/dashboard" onClick={() => setShowDropdown(false)} className="flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-emerald-500/10 transition-colors"><FaUserShield /> Admin Panel</Link>}
                                                <div className="border-t border-slate-800 mt-2">
                                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 transition-colors"><FaSignOutAlt /> Logout</button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleSellClick}
                                            className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm px-4 md:px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all shrink-0"
                                        >
                                            <FaPlus size={16} />
                                            <span>SELL</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setShowLogin(true)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shrink-0"
                                    >
                                        LOGIN
                                    </button>
                                )}
                            </div>

                            <button
                                className="md:hidden w-9 h-9 sm:w-10 sm:h-10 bg-slate-800 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-400 shrink-0 ml-1"
                                onClick={() => user ? navigate('/profile') : setShowLogin(true)}
                            >
                                {user ? (
                                    <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <FaUserCircle size={20} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className={`transition-all duration-300 ${scrolled ? 'h-14 sm:h-16 md:h-20' : 'h-14 sm:h-16 md:h-24'}`} />

            <MobileMenu />
            <MobileSearch />
            <BottomNav />

            {showLogin && (
                <LoginPopup
                    isOpen={showLogin}
                    onClose={() => setShowLogin(false)}
                    onSuccess={() => setShowLogin(false)}
                />
            )}
            {showMyAds && user && (
                <Ads 
                    user={user} 
                    onClose={() => setShowMyAds(false)} 
                />
            )}

            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#0f172a',
                        color: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #334155'
                    }
                }}
            />
        </>
    );
};

export default Navbar;