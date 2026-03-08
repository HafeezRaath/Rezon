import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaAd, FaCheckCircle, FaUsers, FaExclamationTriangle, FaChartLine,
    FaSpinner, FaRedo, FaShieldAlt, FaArrowUp, FaArrowDown,
    FaSync, FaDatabase
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ✅ FIXED: Space removed from URL
const API_BASE_URL = "https://rezon.up.railway.app/api/admin";

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // 🔒 Secure auth headers
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
            timeout: 15000 
        };
    }, [navigate]);

    // 📊 Fetch dashboard data
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Parallel API calls
            const [statsRes, activityRes] = await Promise.allSettled([
                axios.get(`${API_BASE_URL}/dashboard`, authHeaders),
                axios.get(`${API_BASE_URL}/reports?limit=5`, authHeaders).catch(() => null)
            ]);

            if (statsRes.status === 'fulfilled') {
                const data = statsRes.value.data?.stats || statsRes.value.data || {};
                setStats(data);
            } else {
                throw new Error(statsRes.reason?.response?.data?.message || "Server not responding");
            }

            if (activityRes.status === 'fulfilled' && activityRes.value?.data) {
                // Transform reports to activity format
                const reports = activityRes.value.data.reports || activityRes.value.data || [];
                const activity = reports.slice(0, 5).map((report, idx) => ({
                    type: 'report',
                    message: `New ${report.reason} report on ${report.adId?.title || 'Ad'}`,
                    time: new Date(report.createdAt).toLocaleTimeString(),
                    severity: report.status === 'Pending' ? 'high' : 'low',
                    id: report._id || idx
                }));
                setRecentActivity(activity);
            } else {
                // Fallback data
                setRecentActivity([
                    { type: 'report', message: 'New scam report received', time: '5 min ago', severity: 'high', id: '1' },
                    { type: 'ad', message: 'New ad posted in Cars category', time: '12 min ago', severity: 'low', id: '2' },
                    { type: 'user', message: 'New user registered', time: '1 hour ago', severity: 'low', id: '3' },
                ]);
            }

            setLastUpdated(new Date());
            if (isRefresh) toast.success("Dashboard refreshed!");
        } catch (err) {
            console.error("Dashboard Error:", err);
            setError(err.message || "Failed to load data");
            
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthHeaders, navigate]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(() => fetchDashboardData(true), 300000); // 5 min auto-refresh
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const calculateTrend = useCallback((current, previous) => {
        if (!previous || previous === 0) return { value: 0, isPositive: true };
        const change = ((current - previous) / previous) * 100;
        return { value: Math.abs(change).toFixed(1), isPositive: change >= 0 };
    }, []);

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
            color: "emerald",
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
            color: "rose",
            alert: (stats?.pendingReports || 0) > 0
        }
    ], [stats, calculateTrend]);

    // 🔥 Loading Skeleton
    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="h-8 w-48 bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
                <div className="grid lg:grid-cols-3 gap-6 h-96">
                    <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl animate-pulse"></div>
                    <div className="bg-slate-800/50 rounded-2xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    // 🔥 Error State
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4 p-4 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-2">
                    <FaDatabase className="text-3xl text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Connection Failed</h3>
                <p className="text-rose-400 text-sm max-w-xs">{error}</p>
                <button 
                    onClick={() => fetchDashboardData()} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <FaRedo /> Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6">
            {/* 🔥 Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <FaShieldAlt className="text-emerald-500" />
                        Command Center
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        {lastUpdated && `Last Sync: ${lastUpdated.toLocaleTimeString()}`}
                    </p>
                </div>
                <button 
                    onClick={() => fetchDashboardData(true)} 
                    disabled={refreshing} 
                    className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Syncing...' : 'Refresh Data'}
                </button>
            </div>

            {/* 🔥 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCardsData.map((card, index) => (
                    <StatCard key={index} {...card} />
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* 🔥 Activity Chart */}
                <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <FaChartLine className="text-emerald-500" /> Platform Activity
                        </h3>
                        <div className="flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Live</span>
                        </div>
                    </div>
                    <div className="h-64 flex items-end justify-around gap-4">
                        {(stats?.weeklyActivity || [40, 65, 45, 80, 55, 90, 70]).map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="w-full bg-slate-800/50 rounded-xl relative transition-all duration-500 hover:bg-slate-700/50 h-full flex items-end">
                                    <div 
                                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:from-emerald-500 group-hover:to-emerald-300 transition-all duration-500" 
                                        style={{height: `${h}%`}}
                                    ></div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 border border-slate-700">
                                        {h} Ads
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 🔥 Real-time Activity Stream */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 flex flex-col">
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                        Real-time Stream
                    </h3>
                    <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                        {recentActivity.map((activity) => (
                            <div 
                                key={activity.id || Math.random()} 
                                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group"
                            >
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    activity.severity === 'high' 
                                    ? 'bg-rose-500 animate-pulse' 
                                    : activity.type === 'ad' 
                                    ? 'bg-blue-500' 
                                    : 'bg-emerald-500'
                                }`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-300 leading-tight group-hover:text-white transition-colors">
                                        {activity.message}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                        {activity.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🔥 Stat Card Component
const StatCard = ({ icon, title, value, trend, subtext, color, alert }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', text: 'text-blue-400', border: 'border-blue-500/20' },
        emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20' },
        purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', text: 'text-purple-400', border: 'border-purple-500/20' },
        rose: { bg: 'bg-rose-500/10', icon: 'text-rose-400', text: 'text-rose-400', border: 'border-rose-500/20' }
    };
    const theme = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`bg-slate-800/50 rounded-2xl p-6 border transition-all hover:border-slate-600 ${alert ? 'border-rose-500/50 shadow-lg shadow-rose-500/10' : theme.border}`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${theme.bg} ${theme.icon} border ${theme.border}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${
                        trend.isPositive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                        {trend.isPositive ? <FaArrowUp /> : <FaArrowDown />} {trend.value}%
                    </div>
                )}
            </div>
            <h3 className={`text-4xl font-black text-white tracking-tighter`}>
                {value?.toLocaleString()}
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {title}
            </p>
            <p className={`text-[10px] font-bold mt-3 ${alert ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
                {subtext}
            </p>
        </div>
    );
};

export default Dashboard;