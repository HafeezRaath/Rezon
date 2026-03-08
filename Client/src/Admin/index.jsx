import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import Dashboard from './Components/Dashboard';
import AdsManagement from './Components/AdsManagement';
import ReportsManagement from './Components/ReportsManagement';
import UsersManagement from './Components/UsersManagement';

// 🔥 NEW: Analytics Component (placeholder - baad mein bana lena)
const Analytics = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📊</span>
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">Analytics Module</h3>
        <p className="text-slate-500 text-sm mt-2">Coming soon...</p>
    </div>
);

// 🔥 NEW: Settings Component (placeholder)
const Settings = () => (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚙️</span>
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-tight">System Settings</h3>
        <p className="text-slate-500 text-sm mt-2">Configuration panel coming soon...</p>
    </div>
);

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);
    const navigate = useNavigate();

    // ✅ SECURE: Backend se admin verify karo, hardcoded nahi!
    const API_BASE_URL = "https://rezon.up.railway.app/api/admin";

    useEffect(() => {
        const verifyAdmin = async () => {
            const token = localStorage.getItem('firebaseIdToken');
            
            if (!token) {
                toast.error("❌ Please login first!");
                navigate('/login');
                return;
            }

            try {
                // 🔥 Backend se verify karo - yeh secure hai!
                const res = await axios.get(`${API_BASE_URL}/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    timeout: 5000
                });

                if (res.status === 200) {
                    setIsAdmin(true);
                    setChecking(false);
                }
            } catch (err) {
                console.error("Admin verify error:", err);
                
                if (err.response?.status === 403 || err.response?.status === 401) {
                    toast.error("🚫 Admin access denied!");
                } else {
                    toast.error("⚠️ Connection failed. Retrying...");
                    // 3 second mein retry
                    setTimeout(() => verifyAdmin(), 3000);
                    return;
                }
                
                localStorage.removeItem('firebaseIdToken');
                localStorage.removeItem('user');
                navigate('/');
            }
        };

        verifyAdmin();
    }, [navigate]);

    // 🔥 Loading state jab tak verify ho raha
    if (checking) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                        Verifying Admin Access...
                    </p>
                </div>
            </div>
        );
    }

    // 🔥 Agar admin nahi toh kuch mat dikhayo (already redirect ho chuka hoga)
    if (!isAdmin) return null;

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            <div className="animate-in fade-in duration-500">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'ads' && <AdsManagement />}
                {activeTab === 'reports' && <ReportsManagement />}
                {activeTab === 'users' && <UsersManagement />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'settings' && <Settings />}
            </div>
        </AdminLayout>
    );
};

export default AdminPanel;