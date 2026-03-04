import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaComments,
    FaRegBell,
    FaUserCircle,
    FaTrash,
    FaPlus,
    FaMapMarkerAlt
} from "react-icons/fa";
import axios from "axios"; 
import LocationDropdown from "./LocationDropdown";
import LoginPopup from "./Loginpopup";
import Ads from "../CRUD/ads";
import { auth } from "../firebase.config";
import { signOut, onAuthStateChanged } from "firebase/auth";
import toast, { Toaster } from "react-hot-toast"; 

// ✅ Naya Component Import
import VerificationFlow from "../loginsetup/VerificationFlow";

const Navbar = () => {
    const navigate = useNavigate();
    const [selectedLocation, setSelectedLocation] = useState("Pakistan");
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAds, setShowAds] = useState(false);
    
    // ✅ Naya State Verification Modal ke liye
    const [showVerification, setShowVerification] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // ✅ Dynamic API URL for Local and Live (rezon.raathdeveloper.com)
    const API_URL = window.location.hostname === "localhost" 
        ? "http://localhost:8000/api" 
        : "https://api.raathdeveloper.com/api"; 

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const token = await currentUser.getIdToken();
                localStorage.setItem('firebaseIdToken', token);

                const photo = currentUser.photoURL || currentUser.providerData[0]?.photoURL || "/default-avatar.png";
                setUser({
                    ...currentUser,
                    photoURL: photo,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    uid: currentUser.uid 
                });
            } else {
                setUser(null);
                localStorage.removeItem('firebaseIdToken');
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // ✅ SELL Button Logic
    const handleSellClick = async () => {
        if (!user) {
            setShowLogin(true);
            return;
        }

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.data.isVerified) {
                setShowVerification(true);
            } else {
                setShowAds(true);
            }
        } catch (err) {
            console.error("Verification check failed");
            setShowVerification(true);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await axios.get(`${API_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const notifs = res.data?.notifications || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (err) {
            console.log("Notification API check: Pending or Backend off.");
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { console.error("Failed to mark as read"); }
    };

    const markAllAsRead = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            await axios.put(`${API_URL}/notifications/read-all`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (err) { toast.error("Failed to mark all as read"); }
    };

    const deleteNotification = async (notificationId, e) => {
        e.stopPropagation();
        try {
            const token = await auth.currentUser?.getIdToken();
            await axios.delete(`${API_URL}/notifications/${notificationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n._id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - (notifications.find(n => n._id === notificationId)?.read ? 0 : 1)));
        } catch (err) { toast.error("Failed to delete notification"); }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setShowDropdown(false);
            setNotifications([]); 
            setUnreadCount(0);
            localStorage.removeItem('firebaseIdToken');
        } catch (error) { console.error("Logout error:", error); }
    };

    const getNotificationIcon = (type) => {
        switch(type) {
            case 'WARNING': return '⚠️';
            case 'AD_DELETED': return '🗑️';
            case 'AD_REJECTED': return '❌';
            case 'ACCOUNT_SUSPENDED': return '⏸️';
            case 'ACCOUNT_BANNED': return '🚫';
            case 'REPORT_RESOLVED': return '✅';
            default: return '📢';
        }
    };

    return (
        <nav className="bg-[#0F172A] border-b border-slate-800 shadow-lg py-2 px-3 md:px-12 flex items-center justify-between sticky top-0 z-50">
            <Toaster position="bottom-right" />
            
            {/* Left Section: Logo & Location */}
            <div className="flex items-center gap-2 md:gap-6">
                <Link to="/" className="text-xl md:text-2xl font-black text-white tracking-tighter">
                    RE<span className="text-blue-500">ZON</span>
                </Link>
                
                {/* Mobile: Simple Marker Icon | Desktop: Full Dropdown */}
                <div className="flex items-center">
                    <div className="md:hidden text-slate-300 p-2">
                        <FaMapMarkerAlt size={18} />
                    </div>
                    <div className="hidden sm:block">
                        <LocationDropdown
                            selected={selectedLocation}
                            onChange={(location) => {
                                setSelectedLocation(location);
                                navigate(`/?city=${location}`);
                            }}
                            variant="navbar"
                        />
                    </div>
                </div>
            </div>

            {/* Right Section: Icons & Buttons */}
            <div className="flex items-center gap-2 md:gap-5 text-white">
                {user && (
                    <Link to="/conversations" className="relative p-2 text-slate-300 hover:text-blue-400 transition-colors">
                        <FaComments className="text-xl md:text-2xl" />
                        <span className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0F172A]">2</span>
                    </Link>
                )}

                {/* Notifications */}
                <div className="relative">
                    <div className="relative p-2 cursor-pointer text-slate-300 hover:text-blue-400 transition-colors" onClick={() => setShowNotifications(!showNotifications)}>
                        <FaRegBell className="text-xl md:text-2xl" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0F172A]">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {showNotifications && (
                        <div className="absolute right-[-50px] md:right-0 mt-3 w-72 md:w-80 bg-white text-black rounded-xl shadow-2xl py-2 z-50 border border-gray-100 max-h-96 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
                                <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-[10px] text-blue-600 font-bold hover:underline uppercase tracking-wide">Mark all read</button>}
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500"><FaRegBell className="mx-auto mb-2 text-3xl text-gray-300" /><p className="text-xs">No notifications</p></div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div key={notif._id} onClick={() => { if (!notif.read) markAsRead(notif._id); if (notif.link) navigate(notif.link); setShowNotifications(false); }} className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                    <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-xs text-gray-800">{notif.title}</p>
                                                        <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                                        <p className="text-[9px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => deleteNotification(notif._id, e)} className="text-gray-300 hover:text-red-500 p-1"><FaTrash size={10} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative ml-1">
                    {user ? (
                        <div className="flex items-center">
                            <img 
                                src={user.photoURL} 
                                alt="profile" 
                                onClick={() => setShowDropdown(!showDropdown)} 
                                className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 cursor-pointer transition-all hover:scale-105 ${showDropdown ? "border-blue-500" : "border-slate-500"}`} 
                            />
                        </div>
                    ) : (
                        <FaUserCircle onClick={() => setShowLogin(true)} className="text-2xl md:text-3xl cursor-pointer text-slate-300 hover:text-white" />
                    )}

                    {showDropdown && user && (
                        <div className="absolute right-0 mt-3 w-52 bg-white text-black rounded-lg shadow-2xl py-1 z-50 border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b bg-slate-50">
                                <p className="text-xs font-bold truncate text-slate-800">{user.displayName || "User"}</p>
                                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                            </div>
                            <button onClick={() => { navigate("/profile"); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50">My Profile</button>
                            <button onClick={() => { setShowAds(true); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50">My Ads</button>
                            <hr className="border-gray-100" />
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50">Logout</button>
                        </div>
                    )}
                </div>

                {/* SELL Button: Professional Blue Style */}
                <button
                    onClick={handleSellClick}
                    className="flex items-center gap-1 bg-blue-600 text-white font-bold text-xs md:text-sm px-4 py-1.5 md:px-6 md:py-2 rounded-full hover:bg-blue-700 transition-all duration-300 shadow-md active:scale-95 border border-blue-500"
                >
                    <FaPlus size={12} /> <span className="hidden xs:inline">SELL</span>
                </button>
            </div>

            {/* Modals Logic */}
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