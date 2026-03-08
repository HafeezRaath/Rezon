import React from 'react';
import { FaShieldAlt, FaFlag } from 'react-icons/fa';
import ReportsManagement from './ReportsManagement';

const AdminReports = () => {
    return (
        <div className="p-6 min-h-screen">
            {/* 🔥 Header Section */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                        <FaShieldAlt className="text-2xl text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">
                            Reports Center
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-2">
                            <FaFlag className="text-rose-500" />
                            Review user violations & maintain community standards
                        </p>
                    </div>
                </div>
                
                {/* 🔥 Quick Stats Bar */}
                <div className="flex gap-4 mt-4">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-slate-400 text-xs font-bold uppercase">Pending Review</span>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-slate-400 text-xs font-bold uppercase">System Active</span>
                    </div>
                </div>
            </div>
            
            {/* 🔥 Reports Management Container */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <ReportsManagement />
            </div>
        </div>
    );
};

export default AdminReports;