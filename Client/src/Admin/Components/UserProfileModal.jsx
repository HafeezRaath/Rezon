import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBox, FaHistory, FaFlag } from 'react-icons/fa';
import toast from 'react-hot-toast';

const UserProfileModal = ({ user, onClose }) => {
    const [userAds, setUserAds] = useState([]);
    const [userReports, setUserReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = "http://localhost:8000/api/admin";
    const getAuthHeaders = () => ({
        headers: { 'Authorization': `Bearer ${localStorage.getItem('firebaseIdToken')}` }
    });

    useEffect(() => {
        fetchUserDetails();
    }, [user._id]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            // User ki ads
            const adsRes = await axios.get(`${API_URL}/users/${user._id}/ads`, getAuthHeaders());
            setUserAds(adsRes.data?.ads || []);
            
            // User ki report history
            const reportsRes = await axios.get(`${API_URL}/users/${user._id}/report-history`, getAuthHeaders());
            setUserReports(reportsRes.data?.reports || []);
        } catch (err) {
            console.error("Failed to fetch user details");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">User Profile</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center text-3xl">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold">{user.name}</h3>
                            <p className="text-gray-500 flex items-center gap-2">
                                <FaEnvelope size={14} /> {user.email}
                            </p>
                            {user.phone && (
                                <p className="text-gray-500 flex items-center gap-2">
                                    <FaPhone size={14} /> {user.phone}
                                </p>
                            )}
                            {user.location && (
                                <p className="text-gray-500 flex items-center gap-2">
                                    <FaMapMarkerAlt size={14} /> {user.location}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <FaBox className="mx-auto mb-2 text-blue-600" />
                            <p className="text-2xl font-bold">{userAds.length}</p>
                            <p className="text-sm text-gray-600">Total Ads</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                            <FaFlag className="mx-auto mb-2 text-red-600" />
                            <p className="text-2xl font-bold">{userReports.length}</p>
                            <p className="text-sm text-gray-600">Reports Against</p>
                        </div>
                    </div>

                    {/* Report History */}
                    {userReports.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <FaHistory className="text-orange-600" /> Report History
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {userReports.map(report => (
                                    <div key={report._id} className="bg-gray-50 p-3 rounded text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-red-600">{report.reason}</span>
                                            <span className={`text-xs px-2 py-1 rounded ${report.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-xs mt-1">{report.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User's Ads */}
                    {userAds.length > 0 && (
                        <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2">
                                <FaBox className="text-pink-600" /> User's Ads ({userAds.length})
                            </h4>
                            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                                {userAds.map(ad => (
                                    <div key={ad._id} className="border rounded-lg p-2 flex gap-2">
                                        <img src={ad.images?.[0] || '/placeholder.jpg'} alt="" className="w-16 h-16 rounded object-cover" />
                                        <div className="overflow-hidden">
                                            <p className="font-bold text-sm truncate">{ad.title}</p>
                                            <p className="text-pink-600 text-sm">Rs {ad.price}</p>
                                            <span className={`text-xs px-2 py-1 rounded ${ad.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                                {ad.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && <p className="text-center text-gray-500">Loading...</p>}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;