import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    FaSearch
} from "react-icons/fa";
import axios from "axios"; 
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast";

const Navbar = ({ onSearch, onLocationChange }) => {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const mobileMenuRef = useRef(null);
    
    const [selectedLocation, setSelectedLocation] = useState("Pakistan");
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [scrolled, setScrolled] = useState(false);

    // 🔧 FIXED: Proper API URL without trailing space
    const API_URL = window.location.hostname === "localhost" 
        ? "http://localhost:8000/api" 
        : "https://rezon.up.railway.app/api";

    // 🎨 Professional Color Scheme - Emerald + Slate
    const colors = {
        primary: "emerald",      // Main brand color
        secondary: "slate",      // Dark backgrounds
        accent: "teal",          // Highlights
        danger: "rose",        // Errors/Notifications
    };

    // 📱 Handle Scroll Effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 🔒 Click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
                setShowMobileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 👤 Auth State Management
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const token = await currentUser.getIdToken(true);
                    localStorage.setItem('firebaseIdToken', token);
                    
                    const tokenRefreshInterval = setInterval(async () => {
                        const newToken = await currentUser.getIdToken(true);
                        localStorage.setItem('firebaseIdToken', newToken);
                    }, 3300000);

                    setUser({
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
                        email: currentUser.email,
                        photoURL: currentUser.photoURL || "/default-avatar.png",
                        emailVerified: currentUser.emailVerified,
                        tokenRefreshInterval
                    });
                } catch (error) {
                    console.error("Auth error:", error);
                    toast.error("Authentication failed");
                }
            } else {
                setUser(null);
                localStorage.removeItem('firebaseIdToken');
            }
        });

        return () => {
            unsubscribe();
            if (user?.tokenRefreshInterval) {
                clearInterval(user.tokenRefreshInterval);
            }
        };
    }, []);

    // 🔔 Notifications Fetching
    useEffect(() => {
        let interval;
        if (user) {
            fetchNotifications();
            interval = setInterval(fetchNotifications, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user]);

    // 🎯 SELL Button Logic
    const handleSellClick = useCallback(async () => {
        if (!user) {
            setShowLogin(true);
            return;
        }

        setIsVerifying(true);
        try {
            const token = localStorage.getItem('firebaseIdToken');
            if (!token) throw new Error("No auth token");

            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.data?.isVerified) {
                navigate('/verify');
            } else {
                navigate('/post-ad');
            }
        } catch (err) {
            console.error("Verification check failed:", err);
            navigate('/verify');
        } finally {
            setIsVerifying(false);
        }
    }, [user, API_URL, navigate]);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = localStorage.getItem('firebaseIdToken');
            if (!token) return;

            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const notifs = res.data?.notifications || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (err) {
            console.log("Notifications fetch failed");
        }
    }, [API_URL]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (onSearch && searchQuery.trim()) {
            onSearch(searchQuery);
            navigate(`/?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleLocationSelect = (location) => {
        setSelectedLocation(location);
        if (onLocationChange) onLocationChange(location);
        navigate(`/?city=${encodeURIComponent(location)}`);
        setShowMobileMenu(false);
    };

    const handleLogout = useCallback(async () => {
        try {
            if (user?.tokenRefreshInterval) {
                clearInterval(user.tokenRefreshInterval);
            }
            
            await signOut(auth);
            setUser(null);
            setShowDropdown(false);
            setNotifications([]);
            setUnreadCount(0);
            localStorage.removeItem('firebaseIdToken');
            toast.success("Logged out successfully");
            navigate('/');
        } catch (error) { 
            toast.error("Logout failed");
        }
    }, [navigate, user]);

    const getNotificationIcon = useCallback((type) => {
        const icons = {
            'WARNING': '⚠️',
            'AD_DELETED': '🗑️',
            'AD_REJECTED': '❌',
            'ACCOUNT_SUSPENDED': '⏸️',
            'ACCOUNT_BANNED': '🚫',
            'REPORT_RESOLVED': '✅',
            'MESSAGE': '💬',
            'VERIFICATION': '✔️'
        };
        return icons[type] || '📢';
    }, []);

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled 
                    ? 'bg-slate-900/95 backdrop-blur-md shadow-2xl border-b border-slate-700/50' 
                    : 'bg-slate-900 border-b border-slate-800'
            }`}>
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                    <div className="flex items-center justify-between h-14 sm:h-16">
                        
                        {/* Left: Logo & Mobile Menu Button */}
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button 
                                className="lg:hidden p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                            >
                                {showMobileMenu ? <FaTimes size={20} /> : <FaBars size={20} />}
                            </button>
                            
                            <Link to="/" className="flex items-center gap-1 group">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/25 transition-all">
                                    <span className="text-white font-black text-sm sm:text-base">R</span>
                                </div>
                                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    RE<span className="text-emerald-400 group-hover:text-emerald-300 transition-colors">ZON</span>
                                </span>
                            </Link>
                        </div>

                        {/* Center: Search Bar (Hidden on mobile, visible on sm+) */}
                        <div className="hidden sm:flex flex-1 max-w-xl mx-4 lg:mx-8">
                            <form onSubmit={handleSearch} className="w-full relative">
                                <input
                                    type="text"
                                    placeholder="Search ads..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                />
                                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                            </form>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1 sm:gap-3">
                            
                            {/* Location - Hidden on small mobile */}
                            <button 
                                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-emerald-400 transition-colors text-sm font-medium"
                                onClick={() => navigate('/locations')}
                            >
                                <FaMapMarkerAlt size={14} />
                                <span className="max-w-[80px] truncate">{selectedLocation}</span>
                            </button>

                            {/* Messages - Only if logged in */}
                            {user && (
                                <Link 
                                    to="/conversations" 
                                    className="relative p-2 text-slate-400 hover:text-emerald-400 transition-all hover:bg-slate-800 rounded-full"
                                >
                                    <FaComments className="text-lg sm:text-xl" />
                                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
                                        2
                                    </span>
                                </Link>
                            )}

                            {/* Notifications */}
                            <div className="relative" ref={notifRef}>
                                <button 
                                    className="relative p-2 text-slate-400 hover:text-emerald-400 transition-all hover:bg-slate-800 rounded-full"
                                    onClick={() => setShowNotifications(!showNotifications)}
                                >
                                    <FaRegBell className="text-lg sm:text-xl" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl py-2 z-50 border border-slate-200 max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                            <h3 className="font-bold text-slate-800">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={() => {}} 
                                                    className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto flex-1">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-slate-400">
                                                    <FaRegBell className="mx-auto mb-3 text-4xl text-slate-300" />
                                                    <p className="text-sm">No notifications yet</p>
                                                </div>
                                            ) : (
                                                notifications.map((notif) => (
                                                    <div 
                                                        key={notif._id} 
                                                        className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : ''}`}
                                                    >
                                                        <div className="flex gap-3">
                                                            <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-slate-800 truncate">{notif.title}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                                                <p className="text-[10px] text-slate-400 mt-1">
                                                                    {new Date(notif.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profile */}
                            <div className="relative" ref={dropdownRef}>
                                {user ? (
                                    <button 
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="flex items-center gap-2 p-1 pr-2 sm:pr-3 rounded-full hover:bg-slate-800 transition-all"
                                    >
                                        <img 
                                            src={user.photoURL} 
                                            alt="profile" 
                                            className="w-8 h-8 rounded-full border-2 border-slate-600 hover:border-emerald-500 transition-colors object-cover"
                                            onError={(e) => {
                                                e.target.src = "/default-avatar.png";
                                            }}
                                        />
                                        <span className="hidden sm:block text-sm font-medium text-slate-300 max-w-[80px] truncate">
                                            {user.displayName}
                                        </span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setShowLogin(true)} 
                                        className="p-2 text-slate-400 hover:text-emerald-400 transition-all hover:bg-slate-800 rounded-full"
                                    >
                                        <FaUserCircle className="text-2xl sm:text-3xl" />
                                    </button>
                                )}

                                {/* Profile Dropdown */}
                                {showDropdown && user && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl py-2 z-50 border border-slate-200 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                            <p className="font-bold text-slate-800 truncate">{user.displayName}</p>
                                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                        </div>
                                        <Link 
                                            to="/profile"
                                            onClick={() => setShowDropdown(false)}
                                            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                        >
                                            My Profile
                                        </Link>
                                        <Link 
                                            to="/my-ads"
                                            onClick={() => setShowDropdown(false)}
                                            className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                        >
                                            My Ads
                                        </Link>
                                        <button 
                                            onClick={handleLogout} 
                                            className="w-full text-left px-4 py-2.5 text-sm text-rose-600 font-semibold hover:bg-rose-50 transition-colors border-t border-slate-100 mt-1"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SELL Button */}
                            <button
                                onClick={handleSellClick}
                                disabled={isVerifying}
                                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs sm:text-sm px-3 sm:px-5 py-2 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ml-1 sm:ml-2"
                            >
                                {isVerifying ? (
                                    <FaSpinner className="animate-spin" size={12} />
                                ) : (
                                    <FaPlus size={12} />
                                )}
                                <span className="hidden xs:inline">SELL</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Search Bar */}
                    <div className="sm:hidden pb-3">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search ads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                            />
                            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        </form>
                    </div>
                </div>

                {/* Mobile Menu */}
                {showMobileMenu && (
                    <div 
                        ref={mobileMenuRef}
                        className="lg:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-slate-800 shadow-2xl animate-in slide-in-from-top-2"
                    >
                        <div className="px-4 py-4 space-y-3">
                            {/* Mobile Location */}
                            <button 
                                className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all"
                                onClick={() => navigate('/locations')}
                            >
                                <FaMapMarkerAlt size={18} />
                                <span className="font-medium">{selectedLocation}</span>
                            </button>

                            {/* Mobile Navigation Links */}
                            {user ? (
                                <>
                                    <Link 
                                        to="/profile"
                                        onClick={() => setShowMobileMenu(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all"
                                    >
                                        <FaUserCircle size={18} />
                                        <span className="font-medium">My Profile</span>
                                    </Link>
                                    <Link 
                                        to="/conversations"
                                        onClick={() => setShowMobileMenu(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all"
                                    >
                                        <FaComments size={18} />
                                        <span className="font-medium">Messages</span>
                                        <span className="ml-auto bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                                    </Link>
                                    <Link 
                                        to="/my-ads"
                                        onClick={() => setShowMobileMenu(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-all"
                                    >
                                        <FaPlus size={18} />
                                        <span className="font-medium">My Ads</span>
                                    </Link>
                                    <button 
                                        onClick={() => {
                                            handleLogout();
                                            setShowMobileMenu(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                    >
                                        <FaTimes size={18} />
                                        <span className="font-medium">Sign Out</span>
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => {
                                        setShowLogin(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                >
                                    <FaUserCircle size={18} />
                                    <span className="font-medium">Login / Register</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Spacer for fixed navbar */}
            <div className="h-[60px] sm:h-[64px]" />

            <Toaster 
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid #334155'
                    }
                }}
            />
        </>
    );
};

export default Navbar;