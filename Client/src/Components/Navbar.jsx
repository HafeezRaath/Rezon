import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaComments,
    FaRegBell,
    FaUserCircle,
    FaTrash,
    FaPlus,
    FaMapMarkerAlt,
    FaSpinner
} from "react-icons/fa";
import axios from "axios"; 
import LocationDropdown from "./LocationDropdown";
import LoginPopup from "./Loginpopup";
import Ads from "../CRUD/ads";
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast"; 
import VerificationFlow from "../loginsetup/VerificationFlow";

const Navbar = () => {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    
    const [selectedLocation, setSelectedLocation] = useState("Pakistan");
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAds, setShowAds] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    // 🔧 FIXED: Removed trailing space from production URL
    const API_URL = window.location.hostname === "localhost" 
        ? "http://localhost:8000/api" 
        : "https://api.raathdeveloper.com/api";

    // 🔒 Click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
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
                    const token = await currentUser.getIdToken(true); // Force refresh
                    localStorage.setItem('firebaseIdToken', token);
                    
                    // Update token every 55 minutes (before 1 hour expiry)
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
            // Clear interval on cleanup
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

    // 🎯 SELL Button Logic - Fixed race condition
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
                setShowVerification(true);
            } else {
                setShowAds(true);
            }
        } catch (err) {
            console.error("Verification check failed:", err);
            // If API fails, assume not verified for safety
            setShowVerification(true);
        } finally {
            setIsVerifying(false);
        }
    }, [user, API_URL]);

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
            // Silent fail for notifications
            console.log("Notifications fetch failed");
        }
    }, [API_URL]);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            const token = localStorage.getItem('firebaseIdToken');
            await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setNotifications(prev => prev.map(n => 
                n._id === notificationId ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { 
            toast.error("Failed to mark as read");
        }
    }, [API_URL]);

    const markAllAsRead = useCallback(async () => {
        try {
            const token = localStorage.getItem('firebaseIdToken');
            await axios.put(`${API_URL}/notifications/read-all`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (err) { 
            toast.error("Failed to mark all as read");
        }
    }, [API_URL]);

    const deleteNotification = useCallback(async (notificationId, e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('firebaseIdToken');
            await axios.delete(`${API_URL}/notifications/${notificationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const deletedNotif = notifications.find(n => n._id === notificationId);
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            
            if (deletedNotif && !deletedNotif.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) { 
            toast.error("Failed to delete notification");
        }
    }, [API_URL, notifications]);

    const handleLogout = useCallback(async () => {
        try {
            // Clear intervals first
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
            console.error("Logout error:", error);
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

    // Close dropdowns on route change
    useEffect(() => {
        setShowDropdown(false);
        setShowNotifications(false);
    }, [navigate]);

    return (
        <nav className="bg-[#0F172A] border-b border-slate-800 shadow-lg py-2 px-3 md:px-12 flex items-center justify-between sticky top-0 z-50">
            <Toaster position="bottom-right" />
            
            {/* Left Section: Logo & Location */}
            <div className="flex items-center gap-2 md:gap-6">
                <Link to="/" className="text-xl md:text-2xl font-black text-white tracking-tighter hover:opacity-90 transition-opacity">
                    RE<span className="text-blue-500">ZON</span>
                </Link>
                
                <div className="flex items-center">
                    <div className="md:hidden text-slate-300 p-2 hover:text-white transition-colors cursor-pointer">
                        <FaMapMarkerAlt size={18} />
                    </div>
                    <div className="hidden sm:block">
                        <LocationDropdown
                            selected={selectedLocation}
                            onChange={(location) => {
                                setSelectedLocation(location);
                                navigate(`/?city=${encodeURIComponent(location)}`);
                            }}
                            variant="navbar"
                        />
                    </div>
                </div>
            </div>

            {/* Right Section: Icons & Buttons */}
            <div className="flex items-center gap-2 md:gap-5 text-white">
                {user && (
                    <Link 
                        to="/conversations" 
                        className="relative p-2 text-slate-300 hover:text-blue-400 transition-colors"
                        aria-label="Messages"
                    >
                        <FaComments className="text-xl md:text-2xl" />
                        {/* Hardcoded badge - should be dynamic */}
                        <span className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0F172A]">
                            2
                        </span>
                    </Link>
                )}

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        className="relative p-2 text-slate-300 hover:text-blue-400 transition-colors"
                        onClick={() => setShowNotifications(!showNotifications)}
                        aria-label="Notifications"
                    >
                        <FaRegBell className="text-xl md:text-2xl" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0F172A] animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-[-50px] md:right-0 mt-3 w-72 md:w-80 bg-white text-black rounded-xl shadow-2xl py-2 z-50 border border-gray-100 max-h-96 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
                                <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllAsRead} 
                                        className="text-[10px] text-blue-600 font-bold hover:underline uppercase tracking-wide"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <FaRegBell className="mx-auto mb-2 text-3xl text-gray-300" />
                                        <p className="text-xs">No notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div 
                                            key={notif._id} 
                                            onClick={() => { 
                                                if (!notif.read) markAsRead(notif._id); 
                                                if (notif.link) navigate(notif.link); 
                                                setShowNotifications(false); 
                                            }} 
                                            className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                    <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-xs text-gray-800 truncate">{notif.title}</p>
                                                        <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                                        <p className="text-[9px] text-gray-400 mt-1">
                                                            {new Date(notif.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => deleteNotification(notif._id, e)} 
                                                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative ml-1" ref={dropdownRef}>
                    {user ? (
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center focus:outline-none"
                            aria-label="Profile menu"
                        >
                            <img 
                                src={user.photoURL} 
                                alt="profile" 
                                className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 cursor-pointer transition-all hover:scale-105 object-cover ${showDropdown ? "border-blue-500" : "border-slate-500"}`} 
                                onError={(e) => {
                                    e.target.src = "/default-avatar.png";
                                }}
                            />
                        </button>
                    ) : (
                        <button 
                            onClick={() => setShowLogin(true)} 
                            className="focus:outline-none"
                            aria-label="Login"
                        >
                            <FaUserCircle className="text-2xl md:text-3xl cursor-pointer text-slate-300 hover:text-white transition-colors" />
                        </button>
                    )}

                    {showDropdown && user && (
                        <div className="absolute right-0 mt-3 w-52 bg-white text-black rounded-lg shadow-2xl py-1 z-50 border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-3 border-b bg-slate-50">
                                <p className="text-xs font-bold truncate text-slate-800">{user.displayName}</p>
                                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                            </div>
                            <button 
                                onClick={() => { navigate("/profile"); setShowDropdown(false); }} 
                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                            >
                                My Profile
                            </button>
                            <button 
                                onClick={() => { setShowAds(true); setShowDropdown(false); }} 
                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors"
                            >
                                My Ads
                            </button>
                            <hr className="border-gray-100" />
                            <button 
                                onClick={handleLogout} 
                                className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>

                {/* SELL Button */}
                <button
                    onClick={handleSellClick}
                    disabled={isVerifying}
                    className="flex items-center gap-1 bg-blue-600 text-white font-bold text-xs md:text-sm px-4 py-1.5 md:px-6 md:py-2 rounded-full hover:bg-blue-700 transition-all duration-300 shadow-md active:scale-95 border border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isVerifying ? (
                        <FaSpinner className="animate-spin" size={12} />
                    ) : (
                        <FaPlus size={12} />
                    )}
                    <span className="hidden xs:inline">
                        {isVerifying ? "Checking..." : "SELL"}
                    </span>
                </button>
            </div>

            {/* Modals */}
            {showVerification && (
                <VerificationFlow 
                    user={user} 
                    onClose={() => setShowVerification(false)} 
                    onComplete={() => {
                        setShowVerification(false);
                        setShowAds(true);
                    }}
                />
            )}
            {showAds && <Ads onClose={() => setShowAds(false)} user={user} />}
            {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
        </nav>
    );
};

export default Navbar;