import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FaCommentDots, 
    FaChevronRight, 
    FaTrash, 
    FaSearch, 
    FaSpinner,
    FaArrowLeft,
    FaTimes
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://rezon.up.railway.app/api";

const DEFAULT_AD_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

const ConversationList = ({ user }) => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState(null);
    const abortControllerRef = useRef(null);

    // ✅ Back button handler
    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    // ✅ Clear search handler
    const clearSearch = useCallback(() => {
        setSearchTerm("");
    }, []);

    // ✅ Search change handler - YEH MISSING THA
    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    // Fetch conversations
    useEffect(() => {
        const fetchInbox = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            setLoading(true);
            const toastId = toast.loading("Loading conversations...");

            try {
                const res = await axios.get(
                    `${API_BASE_URL}/chat/list/${user.uid}`,
                    {
                        headers: { Authorization: `Bearer ${user.accessToken}` },
                        signal: abortControllerRef.current.signal
                    }
                );
                
                setConversations(res.data || []);
                setFilteredConversations(res.data || []);
                toast.success("Conversations loaded", { id: toastId });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Inbox load error:", err);
                    const errorMsg = err.response?.status === 401 
                        ? "Session expired. Please login again."
                        : "Failed to load conversations.";
                    toast.error(errorMsg, { id: toastId });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchInbox();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [user]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            const filtered = conversations.filter(conv => 
                conv.otherUserName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                conv.adDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredConversations(filtered);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, conversations]);

    // Delete handler
    const handleDeleteChat = useCallback(async (e, chatId) => {
        e.stopPropagation();
        
        const confirmed = await new Promise((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-medium">Delete this conversation?</p>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                    <div className="flex gap-2 justify-end">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-3 py-1 text-sm bg-slate-200 rounded-lg hover:bg-slate-300"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-3 py-1 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ), { duration: 10000 });
        });

        if (!confirmed) return;

        setDeletingId(chatId);
        try {
            await axios.delete(`${API_BASE_URL}/chat/${chatId}`, {
                headers: { Authorization: `Bearer ${user.accessToken}` }
            });
            
            setConversations(prev => prev.filter(c => c._id !== chatId));
            setFilteredConversations(prev => prev.filter(c => c._id !== chatId));
            toast.success("Conversation deleted");
        } catch (err) {
            console.error("Delete error:", err);
            toast.error(err.response?.data?.message || "Failed to delete conversation");
        } finally {
            setDeletingId(null);
        }
    }, [user]);

    // Loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="animate-spin text-4xl text-emerald-600" />
                    <p className="text-slate-500 text-sm font-medium">Loading messages...</p>
                </div>
            </div>
        );
    }

    // ✅ MAIN RETURN - YEHAN HONA CHAHIYE
    return (
        <div className="min-h-screen bg-slate-50 p-0 md:p-6">
            <div className="max-w-3xl mx-auto bg-white md:rounded-2xl md:shadow-xl overflow-hidden md:border md:border-slate-100 h-screen md:h-auto flex flex-col">
                
                {/* Header with Back Button */}
                <div className="flex-none p-4 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center shadow-md">
                    <button 
                        onClick={handleBack}
                        className="mr-3 p-2 rounded-full hover:bg-white/20 transition-colors active:scale-95"
                    >
                        <FaArrowLeft className="text-xl" />
                    </button>
                    <FaCommentDots className="mr-3 text-2xl"/>
                    <h1 className="font-black text-xl tracking-tight">Messages</h1>
                    <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                        {conversations.length}
                    </span>
                </div>

                {/* Search Bar with Clear Button */}
                <div className="flex-none p-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search by name or item..." 
                            className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-sm text-slate-700 placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        
                        {searchTerm && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 transition-colors active:scale-95"
                            >
                                <FaTimes size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200">
                    {filteredConversations.length > 0 ? (
                        filteredConversations.map((conv) => (
                            <div 
                                key={conv._id}
                                onClick={() => navigate(`/chat/${conv._id}`)} 
                                className="flex items-center p-4 border-b border-slate-100 cursor-pointer hover:bg-emerald-50/30 transition-all duration-200 group relative active:bg-emerald-100/50"
                            >
                                {/* Ad Image */}
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-slate-100">
                                    <img 
                                        src={conv.adDetails?.images?.[0] || DEFAULT_AD_IMAGE} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        alt={conv.adDetails?.title || "Ad"}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.src = DEFAULT_AD_IMAGE;
                                        }}
                                    />
                                </div>

                                <div className="flex-1 ml-3 md:ml-4 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-slate-900 truncate text-sm md:text-base">
                                            {conv.otherUserName || "Unknown User"}
                                        </p>
                                        <span className="text-[10px] text-slate-400 font-medium ml-2 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                            {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                            }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-emerald-600 truncate mt-0.5">
                                        {conv.adDetails?.title || "Product Details"}
                                    </p>
                                    <p className="text-xs md:text-sm text-slate-500 truncate mt-1">
                                        {conv.lastMessage || "Click to view messages..."}
                                    </p>
                                </div>

                                <div className="flex items-center ml-2 gap-1">
                                    <button 
                                        onClick={(e) => handleDeleteChat(e, conv._id)}
                                        disabled={deletingId === conv._id}
                                        className="p-2 md:p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all disabled:opacity-50 active:scale-95"
                                        aria-label="Delete conversation"
                                    >
                                        {deletingId === conv._id ? (
                                            <FaSpinner className="animate-spin text-rose-500" size={16} />
                                        ) : (
                                            <FaTrash size={16} />
                                        )}
                                    </button>
                                    <div className="text-slate-300 group-hover:text-emerald-600 transition-colors">
                                        <FaChevronRight size={14} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 text-center">
                            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FaCommentDots className="text-2xl md:text-3xl text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium text-sm md:text-base">
                                {searchTerm ? "No matching conversations" : "No conversations yet"}
                            </p>
                            <p className="text-slate-400 text-xs md:text-sm mt-1">
                                {searchTerm ? "Try a different search term" : "Start chatting with sellers!"}
                            </p>
                            
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm hover:bg-emerald-200 transition-colors"
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConversationList;