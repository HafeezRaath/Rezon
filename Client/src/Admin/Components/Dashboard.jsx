import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaAd, 
    FaCheckCircle, 
    FaUsers, 
    FaExclamationTriangle, 
    FaChartLine,
    FaSpinner,
    FaRedo,
    FaShieldAlt,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // 🔒 Secure auth headers with validation
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('firebaseIdToken');
        if (!token) {
            toast.error("Session expired. Please login again.");
            navigate('/login');
            return null;
        }
        return {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 second timeout
        };
    }, [navigate]);

    // 📊 Fetch dashboard data with error handling
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Parallel API calls
            const [statsRes, activityRes] = await Promise.allSettled([
                axios.get(`${API_BASE_URL}/admin/dashboard`, authHeaders),
                axios.get(`${API_BASE_URL}/admin/recent-activity`, authHeaders).catch(() => null)
            ]);

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data?.stats || statsRes.value.data || {});
            } else {
                throw new Error(statsRes.reason?.response?.data?.message || "Failed to load stats");
            }

            // Use real activity data if available, else fallback
            if (activityRes.status === 'fulfilled' && activityRes.value?.data) {
                setRecentActivity(activityRes.value.data);
            } else {
                // Fallback mock data with proper structure
                setRecentActivity([
                    { 
                        type: 'report', 
                        message: 'New scam report on Mobile Ad', 
                        time: '5 min ago',
                        severity: 'high',
                        id: '1'
                    },
                    { 
                        type: 'ad', 
                        message: 'New ad posted in Cars category', 
                        time: '12 min ago',
                        severity: 'low',
                        id: '2'
                    },
                    { 
                        type: 'user', 
                        message: 'New user registered', 
                        time: '1 hour ago',
                        severity: 'low',
                        id: '3'
                    },
                ]);
            }

            setLastUpdated(new Date());
            
            if (isRefresh) {
                toast.success("Dashboard updated!");
            }
        } catch (err) {
            console.error("Dashboard Error:", err);
            setError(err.message || "Failed to load dashboard data");
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                toast.error("Access denied. Please login again.");
                navigate('/login');
            } else {
                toast.error(err.response?.data?.message || "Dashboard data load failed");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthHeaders, navigate]);

    useEffect(() => {
        fetchDashboardData();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 300000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    // 📈 Calculate trends (mock calculation - replace with real data)
    const calculateTrend = useCallback((current, previous) => {
        if (!previous || previous === 0) return { value: 0, isPositive: true };
        const change = ((current - previous) / previous) * 100;
        return {
            value: Math.abs(change).toFixed(1),
            isPositive: change >= 0
        };
    }, []);

    // 🎨 Memoized stat cards data
    const statCardsData = useMemo(() => [
        {
            icon: <FaAd className="text-2xl" />,
            title: "Total Ads",
            value: stats?.totalAds || 0,
            trend: calculateTrend(stats?.totalAds, stats?.lastWeekTotalAds),
            subtext: `${stats?.activeAds || 0} Active`,
            color: "blue",
            alert: false
        },
        {
            icon: <FaCheckCircle className="text-2xl" />,
            title: "Sold Items",
            value: stats?.soldAds || 0,
            trend: calculateTrend(stats?.soldAds, stats?.lastWeekSoldAds),
            subtext: "Completed deals",
            color: "green",
            alert: false
        },
        {
            icon: <FaUsers className="text-2xl" />,
            title: "Total Users",
            value: stats?.totalUsers || 0,
            trend: calculateTrend(stats?.totalUsers, stats?.lastWeekTotalUsers),
            subtext: "Registered accounts",
            color: "purple",
            alert: false
        },
        {
            icon: <FaExclamationTriangle className="text-2xl" />,
            title: "Pending Reports",
            value: stats?.pendingReports || 0,
            trend: null,
            subtext: "Action needed",
            color: "red",
            alert: (stats?.pendingReports || 0) > 0
        }
    ], [stats, calculateTrend]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <div className="relative">
                    <div className="animate-spin h-16 w-16 border-4 border-pink-200 border-t-pink-600 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FaShieldAlt className="text-pink-600 text-xl" />
                    </div>
                </div>
                <p className="text-gray-600 font-medium animate-pulse">Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4 p-4">
                <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center max-w-md">
                    <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-red-800 mb-2">Failed to load dashboard</h3>
                    <p className="text-red-600 text-sm mb-4">{error}</p>
                    <button 
                        onClick={() => fetchDashboardData()}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition flex items-center gap-2 mx-auto"
                    >
                        <FaRedo /> Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-6">
            {/* Header with Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {lastUpdated && `Last updated: ${lastUpdated.toLocaleTimeString()}`}
                    </p>
                </div>
                <button 
                    onClick={() => fetchDashboardData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                    <FaSpinner className={`${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {statCardsData.map((card, index) => (
                    <StatCard key={index} {...card} />
                ))}
            </div>

            {/* Charts & Activity Section */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Activity Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                            <FaChartLine className="text-pink-600" /> 
                            Activity Overview
                        </h3>
                        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-pink-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                        </select>
                    </div>
                    
                    {/* Chart */}
                    <div className="h-64 flex items-end justify-around gap-2 md:gap-4">
                        {(stats?.weeklyActivity || [40, 65, 45, 80, 55, 90, 70]).map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div 
                                    className="w-full bg-gradient-to-t from-pink-100 to-pink-500 rounded-2xl relative transition-all duration-300 hover:from-pink-200 hover:to-pink-600 cursor-pointer shadow-sm"
                                    style={{height: `${h}%`, minHeight: '20px'}}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition shadow-xl whitespace-nowrap z-10">
                                        {h} Ads
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-400">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl text-gray-900">Recent Activity</h3>
                        <button className="text-pink-600 text-sm font-semibold hover:underline">
                            View All
                        </button>
                    </div>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div 
                                    key={activity.id || Math.random()} 
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                                >
                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        activity.severity === 'high' ? 'bg-red-500 animate-pulse' :
                                        activity.type === 'ad' ? 'bg-blue-500' : 
                                        activity.type === 'user' ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                            {activity.message}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Critical Alert Banner */}
            {(stats?.pendingReports || 0) > 5 && (
                <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl shadow-sm animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-500 p-3 rounded-xl text-white shadow-lg">
                            <FaExclamationTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-red-900 text-lg">Critical Alert!</h4>
                            <p className="text-red-700 text-sm">
                                {stats.pendingReports} pending reports need immediate attention to maintain platform safety.
                            </p>
                        </div>
                        <button className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition shadow-md">
                            Review Now
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Manage Ads', color: 'blue', icon: FaAd },
                    { label: 'User Reports', color: 'red', icon: FaExclamationTriangle },
                    { label: 'Verified Users', color: 'green', icon: FaCheckCircle },
                    { label: 'Analytics', color: 'purple', icon: FaChartLine },
                ].map((action, idx) => (
                    <button 
                        key={idx}
                        className={`bg-${action.color}-50 hover:bg-${action.color}-100 border border-${action.color}-200 p-4 rounded-2xl transition-all hover:shadow-md text-left group`}
                    >
                        <action.icon className={`text-2xl text-${action.color}-500 mb-2 group-hover:scale-110 transition-transform`} />
                        <span className={`font-bold text-${action.color}-900 text-sm`}>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const StatCard = ({ icon, title, value, trend, subtext, color, alert }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-50', icon: 'text-blue-500', border: 'border-blue-200', text: 'text-blue-900' },
        green: { bg: 'bg-green-50', icon: 'text-green-500', border: 'border-green-200', text: 'text-green-900' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-500', border: 'border-purple-200', text: 'text-purple-900' },
        red: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-200', text: 'text-red-900' }
    };

    const theme = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`bg-white rounded-2xl shadow-sm p-6 border-2 transition-all hover:shadow-lg ${alert ? 'border-red-500 bg-red-50/30' : `border-transparent hover:border-${color}-200`}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${theme.bg}`}>
                    <div className={theme.icon}>{icon}</div>
                </div>
                {alert && (
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isPositive ? <FaArrowUp /> : <FaArrowDown />}
                        {trend.value}%
                    </div>
                )}
            </div>
            
            <div>
                <h3 className={`text-3xl font-black ${theme.text} tracking-tight`}>
                    {value?.toLocaleString() || 0}
                </h3>
                <p className="text-gray-500 font-medium text-xs uppercase tracking-wider mt-1">
                    {title}
                </p>
                <p className={`text-xs font-semibold mt-2 ${alert ? 'text-red-600' : 'text-gray-400'}`}>
                    {subtext}
                </p>
            </div>
        </div>
    );
};

export default Dashboard;