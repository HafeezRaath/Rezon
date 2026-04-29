import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FaCommentDots, 
    FaChevronRight, 
    FaTrash, 
    FaSearch, 
    FaSpinner,
    FaArrowLeft,
    FaTimes,
    FaExclamationTriangle
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
    const [isMobile, setIsMobile] = useState(false);
    const abortControllerRef = useRef(null);
    const listRef = useRef(null);

    // 🔥 DETECT MOBILE
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ✅ Back button handler
    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    // ✅ Clear search handler
    const clearSearch = useCallback(() => {
        setSearchTerm("");
    }, []);

    // ✅ Search change handler
    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    // 🔥 FETCH CONVERSATIONS - Uses auth token, not URL param
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

            try {
                // 🔥 FIXED: Use getIdToken() instead of accessToken
                const token = await user.getIdToken();
                
                // 🔥 FIXED: Route is /chat/list (no userId in URL)
                const res = await axios.get(
                    `${API_BASE_URL}/chat/list`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: abortControllerRef.current.signal
                    }
                );
                
                const data = res.data?.conversations || res.data || [];
                setConversations(data);
                setFilteredConversations(data);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Inbox load error:", err);
                    const errorMsg = err.response?.status === 401 
                        ? "Session expired. Please login again."
                        : err.response?.status === 404
                        ? "No conversations found."
                        : "Failed to load conversations.";
                    toast.error(errorMsg);
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
                conv.adDetails?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredConversations(filtered);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, conversations]);

    // 🔥 DELETE HANDLER
    const handleDeleteChat = useCallback(async (e, chatId) => {
        e.stopPropagation();
        
        const confirmed = await new Promise((resolve) => {
            toast((t) => (
                <div className="flex flex-col gap-3 min-w-[280px]">
                    <div className="flex items-center gap-2 text-rose-600">
                        <FaExclamationTriangle />
                        <p className="font-bold">Delete Conversation?</p>
                    </div>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                    <div className="flex gap-2 justify-end mt-1">
                        <button 
                            onClick={() => { resolve(false); toast.dismiss(t.id); }}
                            className="px-4 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => { resolve(true); toast.dismiss(t.id); }}
                            className="px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-medium transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ), { duration: 10000, position: 'top-center' });
        });

        if (!confirmed) return;

        setDeletingId(chatId);
        try {
            const token = await user.getIdToken();
            await axios.delete(`${API_BASE_URL}/chat/${chatId}`, {
                headers: { Authorization: `Bearer ${token}` }
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

    // 🔥 FORMAT TIME
    const formatTime = useCallback((date) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const diffMins = Math.floor(diff / 60000);
        const diffHours = Math.floor(diff / 3600000);
        const diffDays = Math.floor(diff / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, []);

    // 🔥 FORMAT LAST MESSAGE (truncate)
    const formatLastMessage = useCallback((msg) => {
        if (!msg) return 'Click to view messages...';
        return msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
    }, []);

    // 🔥 NAVIGATE TO CHAT
    const handleNavigateToChat = useCallback((chatId) => {
        navigate(`/chat/${chatId}`);
    }, [navigate]);

    // Loading state
    if (loading) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="flex flex-col items-center gap-3">
                    <FaSpinner className="animate-spin text-4xl text-emerald-600" />
                    <p className="text-slate-500 text-sm font-medium">Loading messages...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50"
            style={{ 
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}
        >
            <div className={`
                mx-auto bg-white overflow-hidden flex flex-col
                ${isMobile ? 'h-[100dvh] max-w-none rounded-none shadow-none' : 'max-w-2xl md:rounded-2xl md:shadow-xl md:border md:border-slate-100 md:my-6 md:h-auto md:min-h-[600px]'}
            `}>
                
                {/* 🔥 HEADER - Sticky on mobile */}
                <div className={`
                    flex-none bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center shadow-md z-50
                    ${isMobile ? 'sticky top-0' : ''}
                `}
                    style={{ paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0' }}
                >
                    <div className="flex items-center w-full p-4">
                        <button 
                            onClick={handleBack}
                            className="mr-3 p-2 rounded-full hover:bg-white/20 transition-colors active:scale-95 flex-shrink-0"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="text-xl" />
                        </button>
                        <FaCommentDots className="mr-3 text-2xl flex-shrink-0"/>
                        <h1 className="font-black text-xl tracking-tight truncate">Messages</h1>
                        <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm font-medium flex-shrink-0">
                            {conversations.length}
                        </span>
                    </div>
                </div>

                {/* 🔥 SEARCH BAR */}
                <div className="flex-none p-3 sm:p-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative group">
                        <input 
                            type="text" 
                            placeholder="Search by name or item..." 
                            className="w-full pl-11 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-sm text-slate-700 placeholder:text-slate-400 bg-white"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        
                        {searchTerm && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 transition-colors active:scale-95"
                                aria-label="Clear search"
                            >
                                <FaTimes size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 🔥 CONVERSATIONS LIST - Scrollable */}
                <div 
                    ref={listRef}
                    className="flex-1 overflow-y-auto"
                    style={{ 
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain'
                    }}
                >
                    {filteredConversations.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {filteredConversations.map((conv) => (
                                <div 
                                    key={conv._id}
                                    onClick={() => handleNavigateToChat(conv._id)}
                                    className="flex items-center p-3 sm:p-4 cursor-pointer hover:bg-emerald-50/30 transition-all duration-200 group relative active:bg-emerald-100/50"
                                >
                                    {/* Ad Image / Avatar */}
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-slate-100 relative">
                                        <img 
                                            src={conv.adDetails?.images?.[0] || conv.otherUserPhoto || DEFAULT_AD_IMAGE} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            alt={conv.adDetails?.title || "Ad"}
                                            loading="lazy"
                                            onError={(e) => {
                                                e.target.src = DEFAULT_AD_IMAGE;
                                            }}
                                        />
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 ml-3 sm:ml-4 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="font-bold text-slate-900 truncate text-sm sm:text-base">
                                                {conv.otherUserName || "Unknown User"}
                                            </p>
                                            <span className="text-[10px] sm:text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                                {formatTime(conv.updatedAt || conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs font-semibold text-emerald-600 truncate mt-0.5">
                                            {conv.adDetails?.title || "Product Details"}
                                        </p>
                                        <p className="text-xs sm:text-sm text-slate-500 truncate mt-1">
                                            {formatLastMessage(conv.lastMessage)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center ml-2 gap-1 flex-shrink-0">
                                        <button 
                                            onClick={(e) => handleDeleteChat(e, conv._id)}
                                            disabled={deletingId === conv._id}
                                            className="p-2 sm:p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all disabled:opacity-50 active:scale-95"
                                            aria-label="Delete conversation"
                                        >
                                            {deletingId === conv._id ? (
                                                <FaSpinner className="animate-spin text-rose-500" size={16} />
                                            ) : (
                                                <FaTrash size={16} />
                                            )}
                                        </button>
                                        <div className="text-slate-300 group-hover:text-emerald-600 transition-colors hidden sm:block">
                                            <FaChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <FaCommentDots className="text-2xl sm:text-3xl text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium text-sm sm:text-base">
                                {searchTerm ? "No matching conversations" : "No conversations yet"}
                            </p>
                            <p className="text-slate-400 text-xs sm:text-sm mt-1">
                                {searchTerm ? "Try a different search term" : "Start chatting with sellers!"}
                            </p>
                            
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm hover:bg-emerald-200 transition-colors active:scale-95"
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