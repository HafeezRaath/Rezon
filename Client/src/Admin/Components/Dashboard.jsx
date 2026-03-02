import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaAd, FaCheckCircle, FaUsers, FaExclamationTriangle, FaChartLine } from 'react-icons/fa';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = "http://localhost:8000/api/admin";
    const getAuthHeaders = () => ({
        headers: { 'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}` }
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get(`${API_URL}/dashboard`, getAuthHeaders());
            setStats(res.data.stats);
            
            // Recent activity mock data (real mein separate API se laoge)
            setRecentActivity([
                { type: 'report', message: 'New scam report on Mobile Ad', time: '5 min ago' },
                { type: 'ad', message: 'New ad posted in Cars category', time: '12 min ago' },
                { type: 'user', message: 'New user registered', time: '1 hour ago' },
            ]);
        } catch (err) {
            toast.error("Dashboard data load nahi hua");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin h-16 w-16 border-4 border-pink-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<FaAd className="text-3xl text-blue-500" />}
                    title="Total Ads"
                    value={stats?.totalAds || 0}
                    trend={`${stats?.activeAds || 0} Active`}
                    bg="bg-blue-50"
                />
                <StatCard 
                    icon={<FaCheckCircle className="text-3xl text-green-500" />}
                    title="Sold Items"
                    value={stats?.soldAds || 0}
                    trend="Completed deals"
                    bg="bg-green-50"
                />
                <StatCard 
                    icon={<FaUsers className="text-3xl text-purple-500" />}
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    trend="Registered accounts"
                    bg="bg-purple-50"
                />
                <StatCard 
                    icon={<FaExclamationTriangle className="text-3xl text-red-500" />}
                    title="Pending Reports"
                    value={stats?.pendingReports || 0}
                    trend="Action needed"
                    bg="bg-red-50"
                    alert={stats?.pendingReports > 0}
                />
            </div>

            {/* Charts & Activity Section */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Quick Stats Chart Placeholder */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <FaChartLine /> Activity Overview
                    </h3>
                    <div className="h-64 flex items-end justify-around gap-2">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="w-full bg-pink-200 rounded-t-lg relative group" style={{height: `${h}%`}}>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                                    {h} Ads
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Mon</span><span>Tue</span><span>Wed</span>
                        <span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow p-6">
                    <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                    activity.type === 'report' ? 'bg-red-500' :
                                    activity.type === 'ad' ? 'bg-blue-500' : 'bg-green-500'
                                }`}></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{activity.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alert Banner agar zyada reports hon */}
            {stats?.pendingReports > 5 && (
                <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-xl">
                    <div className="flex items-center gap-3">
                        <FaExclamationTriangle className="text-red-500 text-xl" />
                        <div>
                            <h4 className="font-bold text-red-800">Attention Required!</h4>
                            <p className="text-red-700 text-sm">{stats.pendingReports} pending reports need immediate action.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, title, value, trend, bg, alert }) => (
    <div className={`bg-white rounded-2xl shadow p-6 border-2 ${alert ? 'border-red-500' : 'border-transparent'}`}>
        <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${bg}`}>
                {icon}
            </div>
            {alert && <span className="animate-pulse w-3 h-3 bg-red-500 rounded-full"></span>}
        </div>
        <div className="mt-4">
            <h3 className="text-3xl font-black text-gray-800">{value}</h3>
            <p className="text-gray-500 font-medium">{title}</p>
            <p className="text-xs text-green-600 mt-1 font-bold">{trend}</p>
        </div>
    </div>
);

export default Dashboard;