import React, { useState, useEffect } from 'react';
import { 
    FaHome, FaAd, FaFlag, FaUsers, FaSignOutAlt, FaChartBar,
    FaBell, FaSearch, FaMoon, FaSun, FaCog, FaBars, FaTimes,
    FaChevronRight, FaShieldAlt, FaDatabase, FaSync, FaExclamationTriangle
} from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminLayout = ({ children, activeTab, setActiveTab }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(3);
    const [searchQuery, setSearchQuery] = useState('');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    
    // 🔥 NEW: Real stats state with loading
    const [stats, setStats] = useState({
        totalAds: 0,
        activeUsers: 0,
        pendingReports: 0,
        loading: true,
        error: null,
        lastUpdated: null
    });

    // 🔥 API Base URL (Production ya Local)
    const API_BASE_URL = "https://rezon.up.railway.app/api/admin";
    // const API_BASE_URL = 'http://localhost:8000/api/admin'; // Local testing ke liye

    // 🔥 Fetch Dashboard Stats
    const fetchDashboardStats = async () => {
        try {
            const token = localStorage.getItem('firebaseIdToken');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await axios.get(`${API_BASE_URL}/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                const data = response.data.data || response.data;
                setStats({
                    totalAds: data.totalAds || data.adsCount || 0,
                    activeUsers: data.activeUsers || data.usersCount || 0,
                    pendingReports: data.pendingReports || data.reportsCount || 0,
                    loading: false,
                    error: null,
                    lastUpdated: new Date()
                });
            }
        } catch (error) {
            console.error('Stats fetch error:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.response?.data?.message || 'Failed to load stats'
            }));
            // Agar 401/403 aaye toh logout kar do
            if (error.response?.status === 401 || error.response?.status === 403) {
                toast.error('Session expired. Please login again.');
                handleLogout();
            }
        }
    };

    // 🔥 Initial fetch + Auto refresh every 30 seconds
    useEffect(() => {
        fetchDashboardStats();
        
        // Auto refresh interval
        const interval = setInterval(() => {
            fetchDashboardStats();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('firebaseIdToken');
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
        navigate('/');
    };

    // Menu items with badges and colors
    const menuItems = [
        { 
            id: 'dashboard', 
            label: 'Dashboard', 
            icon: FaHome,
            color: 'emerald',
            description: 'Overview & stats'
        },
        { 
            id: 'ads', 
            label: 'Ads Management', 
            icon: FaAd,
            color: 'blue',
            description: 'Manage listings'
        },
        { 
            id: 'reports', 
            label: 'Reports', 
            icon: FaFlag, 
            badge: stats.pendingReports > 0 ? stats.pendingReports : null, // 🔥 Real badge
            color: 'rose',
            description: 'User reports'
        },
        { 
            id: 'users', 
            label: 'Users', 
            icon: FaUsers,
            color: 'violet',
            description: 'User management'
        },
        { 
            id: 'analytics', 
            label: 'Analytics', 
            icon: FaChartBar,
            color: 'amber',
            description: 'Insights & data'
        },
        { 
            id: 'settings', 
            label: 'Settings', 
            icon: FaCog,
            color: 'slate',
            description: 'System config'
        },
    ];

    // 🔥 Real Quick Stats from API
    const quickStats = [
        { 
            label: 'Total Ads', 
            value: stats.loading ? '...' : stats.totalAds.toLocaleString(), 
            color: 'text-emerald-400',
            icon: FaAd
        },
        { 
            label: 'Active Users', 
            value: stats.loading ? '...' : stats.activeUsers.toLocaleString(), 
            color: 'text-blue-400',
            icon: FaUsers
        },
        { 
            label: 'Pending Reports', 
            value: stats.loading ? '...' : stats.pendingReports.toLocaleString(), 
            color: 'text-rose-400',
            icon: FaFlag
        },
    ];

    // 🔥 Loading Skeleton Component
    const StatSkeleton = () => (
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 animate-pulse">
            <div className="h-3 w-20 bg-slate-700 rounded mb-2"></div>
            <div className="h-6 w-16 bg-slate-700 rounded"></div>
        </div>
    );

    return (
        <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
            
            {/* Mobile Sidebar Overlay */}
            {!isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                />
            )}

            {/* 🔥 NEW: Modern Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 
                bg-slate-900 border-r border-slate-800
                transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 xl:w-72'}
                flex flex-col
            `}>
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && 'lg:hidden xl:flex'}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <FaShieldAlt className="text-white text-lg" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">REZON</h1>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Admin Panel</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Search Bar (expandable) */}
                <div className={`px-4 py-4 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                    <p className={`px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
                        Main Menu
                    </p>
                    
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                                    ${isActive 
                                        ? `bg-gradient-to-r from-${item.color}-500/20 to-transparent border-l-2 border-${item.color}-500 text-white` 
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                                    }
                                    ${!isSidebarOpen && 'lg:justify-center xl:justify-start'}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200
                                    ${isActive 
                                        ? `bg-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/30` 
                                        : 'bg-slate-800 group-hover:bg-slate-700'
                                    }
                                `}>
                                    <Icon className="text-lg" />
                                </div>
                                
                                <div className={`flex-1 text-left ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
                                    <p className="font-semibold text-sm">{item.label}</p>
                                    <p className="text-[10px] text-slate-500 group-hover:text-slate-400">{item.description}</p>
                                </div>

                                {/* 🔥 Real Badge from API */}
                                {item.badge > 0 && (
                                    <span className={`
                                        bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse
                                        ${!isSidebarOpen && 'lg:hidden xl:block'}
                                    `}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}

                                {/* Active Indicator */}
                                {isActive && (
                                    <FaChevronRight className={`text-emerald-500 text-xs ${!isSidebarOpen && 'lg:hidden xl:block'}`} />
                                )}
                            </button>
                        );
                    })}

                    {/* 🔥 Quick Stats with Real Data */}
                    <div className={`mt-6 pt-6 border-t border-slate-800 ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
                        <div className="flex items-center justify-between px-3 mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Quick Stats
                            </p>
                            {/* Refresh Button */}
                            <button 
                                onClick={fetchDashboardStats}
                                disabled={stats.loading}
                                className="text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                title="Refresh Stats"
                            >
                                <FaSync className={`text-xs ${stats.loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Error State */}
                        {stats.error && (
                            <div className="mx-2 mb-3 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2 text-rose-400 text-xs">
                                <FaExclamationTriangle />
                                <span>Failed to load</span>
                            </div>
                        )}

                        <div className="space-y-2 px-2">
                            {stats.loading ? (
                                // Loading Skeletons
                                <>
                                    <StatSkeleton />
                                    <StatSkeleton />
                                    <StatSkeleton />
                                </>
                            ) : (
                                // Real Data
                                quickStats.map((stat, idx) => (
                                    <div key={idx} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors group">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                                            <stat.icon className={`text-xs ${stat.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                        </div>
                                        <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Last Updated */}
                        {!stats.loading && stats.lastUpdated && (
                            <p className="px-3 mt-2 text-[10px] text-slate-600 text-center">
                                Updated {stats.lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-slate-800 space-y-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all
                            ${!isSidebarOpen && 'lg:justify-center xl:justify-start'}
                        `}
                    >
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                            {isDarkMode ? <FaSun className="text-amber-400" /> : <FaMoon className="text-indigo-400" />}
                        </div>
                        <span className={`text-sm font-medium ${!isSidebarOpen && 'lg:hidden xl:block'}`}>
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all group
                            ${!isSidebarOpen && 'lg:justify-center xl:justify-start'}
                        `}
                    >
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-all">
                            <FaSignOutAlt />
                        </div>
                        <span className={`text-sm font-medium ${!isSidebarOpen && 'lg:hidden xl:block'}`}>Logout</span>
                    </button>
                </div>
            </aside>

            {/* 🔥 NEW: Modern Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                
                {/* Header */}
                <header className={`
                    h-20 flex items-center justify-between px-6 border-b
                    ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}
                `}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`
                                w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                                ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                            `}
                        >
                            <FaBars />
                        </button>
                        
                        <div>
                            <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {menuItems.find(m => m.id === activeTab)?.label}
                            </h2>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {menuItems.find(m => m.id === activeTab)?.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <button className="relative w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                            <FaBell />
                            {notifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                                    {notifications}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        <div className="relative">
                            <button 
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                    A
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-semibold text-white">Admin User</p>
                                    <p className="text-[10px] text-emerald-400">Super Admin</p>
                                </div>
                                <FaChevronRight className={`text-slate-400 text-xs transition-transform ${userMenuOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Dropdown */}
                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 rounded-xl border border-slate-700 shadow-xl py-2 z-50">
                                    <div className="px-4 py-3 border-b border-slate-700">
                                        <p className="text-sm font-semibold text-white">Admin User</p>
                                        <p className="text-xs text-slate-400">admin@rezon.com</p>
                                    </div>
                                    <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <FaCog /> Settings
                                    </button>
                                    <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <FaDatabase /> Backup
                                    </button>
                                    <div className="border-t border-slate-700 mt-2 pt-2">
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full px-4 py-2.5 text-left text-sm text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                        >
                                            <FaSignOutAlt /> Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Breadcrumb */}
                <div className={`
                    px-6 py-3 border-b flex items-center gap-2 text-sm
                    ${isDarkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}
                `}>
                    <span className="hover:text-emerald-500 cursor-pointer transition-colors">Home</span>
                    <FaChevronRight className="text-xs" />
                    <span className="hover:text-emerald-500 cursor-pointer transition-colors">Admin</span>
                    <FaChevronRight className="text-xs" />
                    <span className="text-emerald-500 font-medium capitalize">{activeTab}</span>
                </div>

                {/* Page Content */}
                <div className={`
                    flex-1 overflow-auto p-6
                    ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}
                `}>
                    <div className={`
                        rounded-2xl border min-h-full
                        ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}
                    `}>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;