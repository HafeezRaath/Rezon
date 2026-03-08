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
    FaHeart,
    FaHome,
    FaThLarge,
    FaArrowLeft
} from "react-icons/fa";
import axios from "axios"; 
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

// Components
import LoginPopup from "./Loginpopup";
import LocationDropdown from "./LocationDropdown";

const Navbar = ({ onSearch, onLocationChange }) => {
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
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // 🔥 FIXED: API URL without space
    const API_URL = "https://rezon.up.railway.app/api";

    const isAdmin = (uid) => uid === "btVq523cTvh4pTUS7AErSyVNER53";

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
                navigate('/post-ad');
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            navigate('/verify');
        } finally {
            setIsVerifying(false);
        }
    }, [user, navigate]);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setShowDropdown(false);
        toast.success("Logged out");
        navigate('/');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onSearch?.(searchQuery);
            navigate(`/?search=${encodeURIComponent(searchQuery)}`);
            setShowMobileSearch(false);
        }
    };

    // 🔥 MOBILE MENU COMPONENT
    const MobileMenu = () => (
        <div 
            ref={mobileMenuRef}
            className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${
                showMobileMenu ? 'visible' : 'invisible'
            }`}
        >
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity ${
                    showMobileMenu ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Menu Panel */}
            <div className={`absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${
                showMobileMenu ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3" onClick={() => setShowMobileMenu(false)}>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <span className="text-white font-black text-xl">R</span>
                        </div>
                        <span className="text-xl font-black text-white">RE<span className="text-emerald-400">ZON</span></span>
                    </Link>
                    <button 
                        onClick={() => setShowMobileMenu(false)}
                        className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* User Section */}
                {user ? (
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center gap-4 mb-4">
                            <img src={user.photoURL} alt="" className="w-14 h-14 rounded-xl border-2 border-emerald-500/30" />
                            <div>
                                <p className="font-bold text-white">{user.displayName}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        {isAdmin(user.uid) && (
                            <Link 
                                to="/admin/dashboard" 
                                onClick={() => setShowMobileMenu(false)}
                                className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold mb-2"
                            >
                                <FaUserShield /> Admin Dashboard
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="p-6 border-b border-slate-800">
                        <button 
                            onClick={() => { setShowMobileMenu(false); setShowLogin(true); }}
                            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold"
                        >
                            Login / Sign Up
                        </button>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="p-4 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Categories</p>
                    {[
                        { to: '/', icon: FaHome, label: 'Home' },
                        { to: '/mobiles', icon: FaStore, label: 'Mobiles' },
                        { to: '/vehicles', icon: FaStore, label: 'Vehicles' },
                        { to: '/electronics', icon: FaStore, label: 'Electronics' },
                        { to: '/property-for-sale', icon: FaStore, label: 'Property' },
                        { to: '/bikes', icon: FaStore, label: 'Bikes' },
                        { to: '/furniture', icon: FaStore, label: 'Furniture' },
                    ].map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowMobileMenu(false)}
                            className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-emerald-400 rounded-xl transition-all"
                        >
                            <item.icon className="text-slate-500" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* User Links */}
                {user && (
                    <div className="p-4 border-t border-slate-800 space-y-1">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Account</p>
                        <Link to="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl">
                            <FaUserCircle /> Profile
                        </Link>
                        <Link to="/my-ads" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl">
                            <FaStore /> My Ads
                        </Link>
                        <Link to="/conversations" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl">
                            <FaComments /> Messages
                        </Link>
                        <button 
                            onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                            className="w-full flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl"
                        >
                            <FaSignOutAlt /> Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // 🔥 MOBILE SEARCH OVERLAY
    const MobileSearch = () => (
        <div className={`fixed inset-0 z-[100] bg-slate-900 transform transition-transform duration-300 lg:hidden ${
            showMobileSearch ? 'translate-y-0' : '-translate-y-full'
        }`}>
            <div className="p-4 border-b border-slate-800 flex items-center gap-4">
                <button 
                    onClick={() => setShowMobileSearch(false)}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"
                >
                    <FaArrowLeft />
                </button>
                <form onSubmit={handleSearchSubmit} className="flex-1">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/50"
                        autoFocus
                    />
                </form>
                <button 
                    onClick={handleSearchSubmit}
                    className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"
                >
                    <FaSearch />
                </button>
            </div>
            
            {/* Recent Searches / Suggestions */}
            <div className="p-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Popular Searches</p>
                <div className="flex flex-wrap gap-2">
                    {['iPhone 15', 'Toyota Corolla', 'Samsung S24', 'Honda 125', 'Laptop'].map((term) => (
                        <button
                            key={term}
                            onClick={() => {
                                setSearchQuery(term);
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

    // 🔥 BOTTOM MOBILE NAV
    const BottomNav = () => (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 lg:hidden z-40 pb-safe">
            <div className="flex items-center justify-around py-2">
                <Link to="/" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <FaHome size={20} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link to="/category/all" className={`flex flex-col items-center gap-1 p-2 ${location.pathname.includes('category') ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <FaThLarge size={20} />
                    <span className="text-[10px] font-medium">Categories</span>
                </Link>
                <button 
                    onClick={handleSellClick}
                    className="flex flex-col items-center -mt-6"
                >
                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 border-4 border-slate-900">
                        <FaPlus size={24} />
                    </div>
                    <span className="text-[10px] font-medium text-emerald-400 mt-1">Sell</span>
                </button>
                <Link to="/conversations" className={`flex flex-col items-center gap-1 p-2 ${location.pathname.includes('conversation') ? 'text-emerald-400' : 'text-slate-400'}`}>
                    <FaComments size={20} />
                    <span className="text-[10px] font-medium">Chat</span>
                </Link>
                <button 
                    onClick={() => user ? setShowDropdown(true) : setShowLogin(true)}
                    className={`flex flex-col items-center gap-1 p-2 ${user ? 'text-emerald-400' : 'text-slate-400'}`}
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

    return (
        <>
            {/* 🔥 MAIN HEADER */}
            <header className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ${
                scrolled ? 'bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl' : 'bg-slate-900 py-3 md:py-5'
            } border-b border-slate-800/60`}>
                
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-12">
                    <div className="flex items-center justify-between gap-4">
                        
                        {/* LEFT: Logo & Mobile Menu */}
                        <div className="flex items-center gap-3 shrink-0">
                            <button 
                                className="lg:hidden w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"
                                onClick={() => setShowMobileMenu(true)}
                            >
                                <FaBars size={20} />
                            </button>
                            
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all">
                                    <span className="text-white font-black text-xl md:text-2xl">R</span>
                                </div>
                                <div className="hidden sm:flex flex-col leading-none">
                                    <span className="text-xl md:text-2xl font-black text-white tracking-tighter">
                                        RE<span className="text-emerald-400">ZON</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Marketplace</span>
                                </div>
                            </Link>
                        </div>

                        {/* CENTER: Search - Desktop */}
                        <div className="hidden lg:flex flex-1 max-w-2xl xl:max-w-3xl">
                            <form onSubmit={handleSearchSubmit} className="w-full relative">
                                <input
                                    type="text"
                                    placeholder="Search for Mobiles, Cars, Electronics..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                />
                                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            </form>
                        </div>

                        {/* CENTER: Search Button - Mobile */}
                        <button 
                            className="lg:hidden flex-1 max-w-[200px] bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-left text-slate-400 flex items-center gap-3"
                            onClick={() => setShowMobileSearch(true)}
                        >
                            <FaSearch size={18} />
                            <span className="text-sm truncate">Search...</span>
                        </button>

                        {/* RIGHT: Actions */}
                        <div className="flex items-center gap-2 md:gap-4">
                            
                            {/* Location - Desktop */}
                            <div className="hidden xl:block relative">
                                <button 
                                    onClick={() => setShowLocDropdown(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/30 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-slate-300 hover:text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    <FaMapMarkerAlt className="text-emerald-500" />
                                    <span className="max-w-[100px] truncate">{selectedLocation}</span>
                                    <FaChevronDown size={10} />
                                </button>
                                {showLocDropdown && (
                                    <LocationDropdown 
                                        onSelect={(loc) => { setSelectedLocation(loc); setShowLocDropdown(false); onLocationChange?.(loc); }} 
                                        onClose={() => setShowLocDropdown(false)} 
                                    />
                                )}
                            </div>

                            {/* Chat - Desktop */}
                            {user && (
                                <Link 
                                    to="/conversations" 
                                    className="hidden md:flex p-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all relative"
                                >
                                    <FaComments size={22} />
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
                                </Link>
                            )}

                            {/* Notifications */}
                            <div className="relative hidden md:block" ref={notifRef}>
                                <button 
                                    onClick={() => setShowNotifications(!showNotifications)} 
                                    className="p-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all relative"
                                >
                                    <FaRegBell size={22} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Profile */}
                            <div className="relative hidden md:block" ref={dropdownRef}>
                                <button 
                                    onClick={handleSellClick} 
                                    className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm px-4 md:px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                                >
                                    <FaPlus size={16} />
                                    <span className="hidden md:inline">SELL</span>
                                </button>
                            </div>

                            {/* Mobile Profile Button */}
                            <button 
                                className="md:hidden w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"
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

            {/* Spacer for fixed header */}
            <div className={`transition-all duration-300 ${scrolled ? 'h-16 md:h-20' : 'h-16 md:h-24'}`} />

            {/* 🔥 MOBILE COMPONENTS */}
            <MobileMenu />
            <MobileSearch />
            <BottomNav />

            {/* Modals */}
            {showLogin && (
                <LoginPopup 
                    isOpen={showLogin} 
                    onClose={() => setShowLogin(false)} 
                    onSuccess={() => setShowLogin(false)}
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