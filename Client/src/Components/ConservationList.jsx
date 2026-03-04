import React, { useState, useEffect } from 'react';
import { FaCommentDots, FaChevronRight, FaTrash, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ConversationList = ({ user }) => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // API URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

    useEffect(() => {
        const fetchInbox = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/chat/list/${user.uid}`, {
                    headers: { Authorization: `Bearer ${user.accessToken}` }
                });
                setConversations(res.data);
                setFilteredConversations(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Inbox load error:", err);
                setLoading(false);
            }
        };
        fetchInbox();
    }, [user, API_BASE_URL]);

    // Search Filter
    useEffect(() => {
        const filtered = conversations.filter(conv => 
            conv.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            conv.adDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredConversations(filtered);
    }, [searchTerm, conversations]);

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!window.confirm("Bhai, kya aap waqai is chat ko delete karna chahte hain?")) return;
        try {
            await axios.delete(`${API_BASE_URL}/chat/${chatId}`, {
                headers: { Authorization: `Bearer ${user.accessToken}` }
            });
            // ✅ FIX: filteredConversations bhi update karna zaroori hai
            setConversations(prev => prev.filter(c => c._id !== chatId));
            setFilteredConversations(prev => prev.filter(c => c._id !== chatId));
        } catch (err) {
            alert("Delete karne mein masla hua.");
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-2 md:p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="p-5 border-b bg-pink-600 text-white flex items-center shadow-md">
                    <FaCommentDots className="mr-3 text-2xl"/>
                    <h1 className="font-black text-xl tracking-tighter uppercase">Messages</h1>
                </div>

                {/* Search Bar */}
                <div className="p-4 bg-gray-50/50 border-b">
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Find a person or item..." 
                            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 outline-none transition-all font-medium text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[75vh] custom-scrollbar">
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <div 
                                key={conv._id}
                                onClick={() => navigate(`/chat/${conv._id}`)} 
                                className="flex items-center p-4 border-b border-gray-50 cursor-pointer hover:bg-pink-50/30 transition-all duration-200 group relative"
                            >
                                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-gray-100">
                                    <img 
                                        src={conv.adDetails?.images?.[0] || "https://via.placeholder.com/150"} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        alt="ad"
                                    />
                                </div>

                                <div className="flex-1 ml-4 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-black text-gray-900 truncate text-base uppercase tracking-tight">
                                            {conv.otherUserName}
                                        </p>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {new Date(conv.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs font-black text-pink-600 truncate mt-0.5 uppercase tracking-wider">
                                        {conv.adDetails?.title || "Product Details"}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate mt-1 font-medium">
                                        {conv.lastMessage || "Click to view messages..."}
                                    </p>
                                </div>

                                <div className="flex items-center ml-2">
                                    <button 
                                        onClick={(e) => handleDeleteChat(e, conv._id)}
                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                    <div className="ml-1 text-gray-200 group-hover:text-pink-600 transition-colors">
                                        <FaChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-24 text-center">
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                                {searchTerm ? "No matching conversations found" : "No conversations found"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationList;