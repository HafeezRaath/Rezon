import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    FaAd, FaCheckCircle, FaUsers, FaExclamationTriangle, FaChartLine,
    FaSpinner, FaRedo, FaShieldAlt, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ✅ UPDATED: RAILWAY LIVE API URL
const API_BASE_URL = "https://rezon.up.railway.app/api";

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
            timeout: 15000 
        };
    }, [navigate]);

    // 📊 Fetch dashboard data from Railway
    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        const authHeaders = getAuthHeaders();
        if (!authHeaders) return;

        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Parallel API calls to Railway backend
            const [statsRes, activityRes] = await Promise.allSettled([
                axios.get(`${API_BASE_URL}/admin/dashboard`, authHeaders),
                axios.get(`${API_BASE_URL}/admin/recent-activity`, authHeaders).catch(() => null)
            ]);

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value.data?.stats || statsRes.value.data || {});
            } else {
                throw new Error(statsRes.reason?.response?.data?.message || "Railway server not responding");
            }

            if (activityRes.status === 'fulfilled' && activityRes.value?.data) {
                setRecentActivity(activityRes.value.data);
            } else {
                // Fallback placeholder data
                setRecentActivity([
                    { type: 'report', message: 'New scam report on Mobile Ad', time: '5 min ago', severity: 'high', id: '1' },
                    { type: 'ad', message: 'New ad posted in Cars category', time: '12 min ago', severity: 'low', id: '2' },
                    { type: 'user', message: 'New user registered', time: '1 hour ago', severity: 'low', id: '3' },
                ]);
            }

            setLastUpdated(new Date());
            if (isRefresh) toast.success("Dashboard synced with Railway!");
        } catch (err) {
            console.error("Dashboard Error:", err);
            setError(err.message || "Failed to load Railway data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(() => fetchDashboardData(true), 300000);
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
                <div className="animate-spin h-16 w-16 border-4 border-pink-200 border-t-pink-600 rounded-full"></div>
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Syncing with Railway...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4 p-4 text-center">
                <FaExclamationTriangle className="text-5xl text-red-500 mb-2" />
                <h3 className="text-xl font-black text-gray-900 uppercase">Railway Connection Failed</h3>
                <p className="text-red-600 text-sm max-w-xs">{error}</p>
                <button onClick={() => fetchDashboardData()} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
                    <FaRedo /> Try Sync Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Command Center</h1>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                        {lastUpdated && `Last Sync: ${lastUpdated.toLocaleTimeString()}`}
                    </p>
                </div>
                <button onClick={() => fetchDashboardData(true)} disabled={refreshing} className="bg-white border-2 border-gray-100 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-600 hover:border-pink-500 transition-all flex items-center gap-2">
                    <FaSpinner className={`${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Syncing...' : 'Sync Data'}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCardsData.map((card, index) => (
                    <StatCard key={index} {...card} />
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                            <FaChartLine className="text-pink-600" /> Platform Velocity
                        </h3>
                    </div>
                    <div className="h-64 flex items-end justify-around gap-4">
                        {(stats?.weeklyActivity || [40, 65, 45, 80, 55, 90, 70]).map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="w-full bg-gray-50 rounded-2xl relative transition-all duration-500 hover:bg-pink-50 cursor-crosshair h-full flex items-end">
                                    <div className="w-full bg-gradient-to-t from-pink-500 to-rose-400 rounded-2xl shadow-lg group-hover:from-pink-600 transition-all duration-500" style={{height: `${h}%`}}></div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">{h} Ads</div>
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 mb-6">Real-time Stream</h3>
                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {recentActivity.map((activity) => (
                            <div key={activity.id || Math.random()} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-gray-200 transition-all cursor-pointer">
                                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activity.severity === 'high' ? 'bg-red-500 animate-ping' : activity.type === 'ad' ? 'bg-blue-500' : 'bg-green-500'}`} />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 leading-tight">{activity.message}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, title, value, trend, subtext, color, alert }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-50', icon: 'text-blue-500', text: 'text-blue-900' },
        green: { bg: 'bg-green-50', icon: 'text-green-500', text: 'text-green-900' },
        purple: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-900' },
        red: { bg: 'bg-red-50', icon: 'text-red-500', text: 'text-red-900' }
    };
    const theme = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`bg-white rounded-[2rem] shadow-sm p-7 border-2 transition-all hover:shadow-xl ${alert ? 'border-red-500' : 'border-transparent hover:border-gray-100'}`}>
            <div className="flex items-start justify-between mb-5">
                <div className={`p-3 rounded-2xl ${theme.bg} ${theme.icon}`}>{icon}</div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {trend.isPositive ? <FaArrowUp /> : <FaArrowDown />} {trend.value}%
                    </div>
                )}
            </div>
            <h3 className={`text-4xl font-black ${theme.text} tracking-tighter`}>{value?.toLocaleString()}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{title}</p>
            <p className={`text-[10px] font-bold mt-3 ${alert ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>{subtext}</p>
        </div>
    );
};

export default Dashboard;