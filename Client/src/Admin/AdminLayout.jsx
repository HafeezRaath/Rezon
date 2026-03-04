import React from 'react';
import { FaHome, FaAd, FaFlag, FaUsers, FaSignOutAlt, FaChartBar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
            <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-black text-pink-500 tracking-tighter uppercase">Admin Panel</h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Super Admin Mode</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 active:scale-95 ${
                                activeTab === item.id 
                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{item.icon}</span>
                                <span className="font-bold text-sm uppercase tracking-tight">{item.label}</span>
                            </div>
                            {/* 🆕 Notification Badge */}
                            {item.badge && (
                                <span className="bg-red-500 text-[10px] font-black px-2 py-1 rounded-full min-w-[20px] text-center shadow-sm">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 text-red-400 font-bold text-sm uppercase hover:bg-red-900/20 rounded-xl transition-all active:scale-95"
                    >
                        <FaSignOutAlt />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col">
                {/* Header */}
                <header className="bg-white shadow-sm p-6 sticky top-0 z-10 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tighter uppercase">
                            {activeTab.replace('-', ' ')}
                        </h2>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400 font-bold text-xs uppercase tracking-widest hidden md:block">
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </span>
                            <div className="w-10 h-10 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 font-black shadow-sm">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;