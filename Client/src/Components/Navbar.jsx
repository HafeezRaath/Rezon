import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaComments,
    FaRegBell,
    FaUserCircle,
    FaTrash,
    FaCheck
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

    const API_URL = "http://localhost:5000/api";

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

    // ✅ SELL Button Logic: Pehle check karega user verified hai ya nahi
    const handleSellClick = async () => {
        if (!user) {
            setShowLogin(true);
            return;
        }

        try {
            const token = await auth.currentUser?.getIdToken();
            // Backend se user ki latest status mangwaein
            const res = await axios.get(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Agar DB mein isVerified false hai to modal khulega
            if (!res.data.isVerified) {
                setShowVerification(true);
            } else {
                setShowAds(true);
            }
        } catch (err) {
            console.error("Verification check failed");
            // Fallback: Agar API fail ho tab bhi safety ke liye verify karwaein
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
        <nav className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 shadow-md py-3 px-4 md:px-12 flex items-center justify-between sticky top-0 z-50">
            <Toaster />
            {/* Left Section: Logo & Location */}
            <div className="flex items-center gap-6">
                <Link to="/" className="text-2xl font-extrabold text-white tracking-tighter drop-shadow-md">REZON</Link>
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

            {/* Right Section: Icons & Buttons */}
            <div className="flex items-center gap-5 text-white">
                {user && (
                    <Link to="/conversations" className="relative hover:text-yellow-200 transition-colors">
                        <FaComments className="text-2xl" />
                        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-red-500">2</span>
                    </Link>
                )}

                <div className="relative">
                    <div className="relative cursor-pointer hover:text-yellow-200 transition-colors" onClick={() => setShowNotifications(!showNotifications)}>
                        <FaRegBell className="text-2xl" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border border-red-500 animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {showNotifications && (
                        <div className="absolute right-0 mt-3 w-80 bg-white text-black rounded-xl shadow-2xl py-2 z-50 border border-gray-100 max-h-96 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50">
                                <h3 className="font-bold text-gray-800">Notifications</h3>
                                {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500"><FaRegBell className="mx-auto mb-2 text-3xl text-gray-300" /><p className="text-sm">No notifications</p></div>
                                ) : (
                                    notifications.map((notif) => (
                                        <div key={notif._id} onClick={() => { if (!notif.read) markAsRead(notif._id); if (notif.link) navigate(notif.link); setShowNotifications(false); }} className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                    <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-sm text-gray-800">{notif.title}</p>
                                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notif.message}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => deleteNotification(notif._id, e)} className="text-gray-400 hover:text-red-500 p-1"><FaTrash size={12} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <img src={user.photoURL} alt="profile" onClick={() => setShowDropdown(!showDropdown)} className={`w-9 h-9 rounded-full border-2 cursor-pointer transition-all hover:scale-105 ${showDropdown ? "border-yellow-300" : "border-white"}`} />
                        </div>
                    ) : (
                        <FaUserCircle onClick={() => setShowLogin(true)} className="text-3xl cursor-pointer hover:text-yellow-200" />
                    )}

                    {showDropdown && user && (
                        <div className="absolute right-0 mt-3 w-56 bg-white text-black rounded-xl shadow-2xl py-2 z-50 border border-gray-100">
                            <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl"><p className="text-sm font-bold truncate">{user.displayName || "User"}</p><p className="text-[11px] text-gray-500 truncate">{user.email}</p></div>
                            <button onClick={() => { navigate("/profile"); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">My Profile</button>
                            <button onClick={() => { setShowAds(true); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">My Ads</button>
                            <button className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">Settings</button>
                            <hr className="my-1" />
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 font-semibold hover:bg-red-50">Logout</button>
                        </div>
                    )}
                </div>

                {/* + SELL Button with Logic Integration */}
                <button
                    onClick={handleSellClick}
                    className="bg-white text-orange-600 font-bold text-sm px-6 py-2 rounded-full hover:bg-yellow-300 hover:text-orange-700 transition-all duration-300 shadow-md"
                >
                    + SELL
                </button>
            </div>

            {/* Verification Flow Modal */}
            {showVerification && (
                <VerificationFlow 
                    user={user} 
                    onClose={() => setShowVerification(false)} 
                    onComplete={() => {
                        setShowVerification(false);
                        setShowAds(true); // Verification ke baad ad post karne ka mauka dein
                    }}
                />
            )}

            {/* Modals */}
            {showAds && <Ads onClose={() => setShowAds(false)} user={user} />}
            {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
        </nav>
    );
};

export default Navbar;