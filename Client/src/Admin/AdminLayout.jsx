import React from 'react';
import { FaHome, FaAd, FaFlag, FaUsers, FaSignOutAlt, FaChartBar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const AdminLayout = ({ children, activeTab, setActiveTab }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('firebaseIdToken');
        localStorage.removeItem('user');
        toast.success("Logged out successfully");
        navigate('/');
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaHome /> },
        { id: 'ads', label: 'Ads Management', icon: <FaAd /> },
        { id: 'reports', label: 'Reports', icon: <FaFlag />, badge: 5 }, // 🆕 Badge for pending reports
        { id: 'users', label: 'Users', icon: <FaUsers /> },
        { id: 'analytics', label: 'Analytics', icon: <FaChartBar /> },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white flex flex-col">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-bold text-pink-500">Admin Panel</h1>
                    <p className="text-xs text-gray-400 mt-1">Super Admin</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                                activeTab === item.id 
                                    ? 'bg-pink-600 text-white shadow-lg' 
                                    : 'text-gray-300 hover:bg-gray-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </div>
                            {/* 🆕 Notification Badge */}
                            {item.badge && (
                                <span className="bg-red-500 text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/30 rounded-xl transition"
                    >
                        <FaSignOutAlt />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white shadow-sm p-6 sticky top-0 z-10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800 capitalize">
                            {activeTab.replace('-', ' ')}
                        </h2>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500">
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </span>
                            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;