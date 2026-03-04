import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import ReportsManagement from './ReportsManagement';

const AdminReports = () => {
    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/30">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <FaShieldAlt className="text-3xl text-pink-600" />
                    <h1 className="text-3xl font-black text-gray-900">Reports Center</h1>
                </div>
                <p className="text-gray-500 text-sm ml-12">
                    Review user violations & maintain community standards
                </p>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <ReportsManagement />
            </div>
        </div>
    );
};

export default AdminReports;