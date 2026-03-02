import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from './AdminLayout';
import Dashboard from './Components/Dashboard';
import AdsManagement from './Components/AdsManagement';
import ReportsManagement from './Components/ReportsManagement';
import UsersManagement from './Components/UsersManagement';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const navigate = useNavigate();

    // ✅ SECURITY CHECK: Agar direct /admin pe ghusne ki koshish kare non-admin
    useEffect(() => {
        const checkAdmin = () => {
            const ADMIN_UIDS = ["btVq523cTvh4pTUS7AErSyVNER53"]; // Yahan bhi UID
            
            // LocalStorage se user nikalo
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            
            if (!user || !ADMIN_UIDS.includes(user.uid)) {
                toast.error("❌ Admin access denied!");
                navigate('/'); // Home bhej do
            }
        };
        
        checkAdmin();
    }, [navigate]);

    return (
        <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'ads' && <AdsManagement />}
            {activeTab === 'reports' && <ReportsManagement />}
            {activeTab === 'users' && <UsersManagement />} {/* 🆕 Ye line add ki */}
        </AdminLayout>
    );
};

export default AdminPanel;