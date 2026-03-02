import React from 'react';
import ReportsManagement from './ReportsManagement';

const AdminReports = () => {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Reports Management</h1>
                <p className="text-gray-600 mt-1">User reports ko review aur action karo</p>
            </div>
            
            <ReportsManagement />
        </div>
    );
};

export default AdminReports;