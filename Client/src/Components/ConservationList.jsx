import React, { useState, useEffect } from 'react';
import { FaCommentDots, FaChevronRight, FaTrash, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ConversationList = ({ user }) => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]); // Search ke liye naya state
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchInbox = async () => {
            if (!user) return;
            try {
                const res = await axios.get(`http://localhost:8000/api/chat/list/${user.uid}`, {
                    headers: { Authorization: `Bearer ${user.accessToken}` }
                });
                setConversations(res.data);
                setFilteredConversations(res.data); // Initial data set karein
                setLoading(false);
            } catch (err) {
                console.error("Inbox load error:", err);
                setLoading(false);
            }
        };
        fetchInbox();
    }, [user]);

    // 🔍 SEARCH LOGIC: Jab bhi searchTerm ya conversations change hon
    useEffect(() => {
        const filtered = conversations.filter(conv => 
            conv.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            conv.adDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredConversations(filtered);
    }, [searchTerm, conversations]);

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!window.confirm("Kya aap ye chat delete karna chahte hain?")) return;
        try {
            await axios.delete(`http://localhost:8000/api/chat/${chatId}`, {
                headers: { Authorization: `Bearer ${user.accessToken}` }
            });
            setConversations(prev => prev.filter(c => c._id !== chatId));
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
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="p-4 border-b bg-pink-600 text-white flex items-center shadow-sm">
                    <FaCommentDots className="mr-3 text-xl"/>
                    <h1 className="font-bold text-xl tracking-wide">INBOX</h1>
                </div>

                {/* Search Bar Logic Added 👇 */}
                <div className="p-3 bg-gray-50 border-b">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search by name or product..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                    </div>
                </div>

                {/* List updated to use filteredConversations 👇 */}
                <div className="overflow-y-auto max-h-[75vh]">
                    {filteredConversations.length > 0 ? filteredConversations.map((conv) => (
                        <div 
                            key={conv._id}
                            onClick={() => navigate(`/chat/${conv._id}`)} 
                            className="flex items-center p-4 border-b cursor-pointer hover:bg-gray-50 transition-all duration-200 group relative"
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 bg-gray-100">
                                <img 
                                    src={conv.adDetails?.images?.[0] || "https://via.placeholder.com/150"} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    alt="ad"
                                />
                            </div>

                            <div className="flex-1 ml-4 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="font-extrabold text-gray-900 truncate text-base">
                                        {conv.otherUserName}
                                    </p>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase ml-2">
                                        {new Date(conv.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-pink-600 truncate mt-0.5">
                                    {conv.adDetails?.title || "Product Details"}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                    {conv.lastMessage || "Click to view messages..."}
                                </p>
                            </div>

                            <div className="flex items-center ml-2">
                                <button 
                                    onClick={(e) => handleDeleteChat(e, conv._id)}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <FaTrash size={16} />
                                </button>
                                <div className="ml-1 text-gray-300 group-hover:text-pink-600">
                                    <FaChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-20 text-center">
                            <p className="text-gray-500 font-medium italic">Koi chat nahi mili.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationList;