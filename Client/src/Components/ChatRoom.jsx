import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaArrowLeft, FaStar, FaFlag, FaEye, FaSpinner } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify'; // 🔧 ADDED: XSS protection

// 🔧 FIXED: API URL without space
const SOCKET_URL = "https://rezon.up.railway.app";
const API_BASE_URL = `${SOCKET_URL}/api`;

// Default placeholder
const DEFAULT_AD_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

const ChatRoom = ({ user }) => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    
    // State
    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    
    // Modals
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Refs
    const scrollRef = useRef();
    const socketRef = useRef(null);

    // 🔧 FIXED: Memoized time formatter
    const formatLastSeen = useCallback((date) => {
        if (!date) return "Offline";
        const seenDate = new Date(date);
        if (isNaN(seenDate.getTime())) return "Offline";
        
        const now = new Date();
        const diffMs = now - seenDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return seenDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, []);

    // 🔧 FIXED: Socket initialization per component
    useEffect(() => {
        if (!user || !conversationId) return;

        // Create new socket instance for this component
        socketRef.current = io(SOCKET_URL, {
            path: "/socket.io/",
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            secure: true,
            query: { userId: user.uid }
        });

        const socket = socketRef.current;

        socket.on("connect", () => {
            setIsConnecting(false);
            socket.emit("setup", user.uid);
            socket.emit("join_chat", conversationId);
            socket.emit("user_online", user.uid);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            toast.error("Connection unstable. Retrying...");
        });

        // Cleanup
        return () => {
            socket.emit("leave_chat", conversationId);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, conversationId]);

    // Fetch History
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !conversationId) return;

            try {
                const token = await user.getIdToken();
                const res = await axios.get(
                    `${API_BASE_URL}/chat/history/${conversationId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 10000
                    }
                );

                if (res.data) {
                    setChatData(res.data);
                    setAllMessages(res.data.chat?.messages || []);
                    
                    const other = res.data.users?.find(u => u.uid !== user.uid);
                    if (other) {
                        setIsOnline(other.isOnline);
                        setLastSeen(other.lastSeen);
                    }
                }
            } catch (err) {
                console.error("Chat History Error:", err);
                toast.error(err.response?.data?.message || "Failed to load chat");
            }
        };

        fetchHistory();
    }, [conversationId, user]);

    // Socket Listeners
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            if (data.chatId === conversationId) {
                setAllMessages(prev => {
                    // Prevent duplicates
                    if (prev.some(m => m.tempId === data.tempId || m._id === data._id)) {
                        return prev;
                    }
                    return [...prev, data];
                });
            }
        };

        const handleStatusChange = (data) => {
            const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
            if (otherUser && data.userId === otherUser.uid) {
                setIsOnline(data.isOnline);
                setLastSeen(data.lastSeen);
            }
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("status_change", handleStatusChange);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("status_change", handleStatusChange);
        };
    }, [conversationId, chatData, user]);

    // Auto Scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages]);

    // 🔧 FIXED: Stable send handler with loading state
    const handleSend = useCallback(async () => {
        if (!message.trim() || isSending) return;

        const trimmedMessage = message.trim();
        const tempId = Date.now().toString();
        
        // Sanitize message
        const cleanMessage = DOMPurify.sanitize(trimmedMessage);

        const messageData = {
            chatId: conversationId,
            senderId: user?.uid,
            message: cleanMessage,
            timestamp: new Date().toISOString(),
            tempId: tempId
        };

        // Optimistic update
        setAllMessages(prev => [...prev, { ...messageData, _id: tempId, pending: true }]);
        setMessage("");
        setIsSending(true);

        try {
            socketRef.current?.emit("send_message", messageData);
            
            // Wait for acknowledgment (optional, based on your backend)
            // For now, remove pending status after short delay
            setTimeout(() => {
                setAllMessages(prev => prev.map(m => 
                    m.tempId === tempId ? { ...m, pending: false } : m
                ));
            }, 500);
        } catch (err) {
            toast.error("Failed to send message");
            // Rollback optimistic update
            setAllMessages(prev => prev.filter(m => m.tempId !== tempId));
        } finally {
            setIsSending(false);
        }
    }, [message, isSending, conversationId, user]);

    // 🔧 FIXED: Stable input handler
    const handleInputChange = useCallback((e) => {
        setMessage(e.target.value);
    }, []);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    // Memoized values
    const otherUser = useMemo(() => 
        chatData?.users?.find(u => u.uid !== user?.uid) || { name: "User" },
    [chatData, user]);

    const ad = chatData?.chat?.adId;

    // 🔧 FIXED: Emerald theme loading
    if (!chatData || isConnecting) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <FaSpinner className="animate-spin text-4xl text-emerald-600" />
            <p className="font-medium text-slate-600">Connecting to chat...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex justify-center md:p-4">
            <div className="w-full max-w-4xl bg-white flex flex-col h-screen md:h-[90vh] border border-slate-200 shadow-2xl relative md:rounded-2xl overflow-hidden">
                
                {/* Header - 🔧 FIXED: Emerald theme */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center min-w-0">
                        <button 
                            onClick={() => navigate(-1)}
                            className="mr-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors"
                            aria-label="Go back"
                        >
                            <FaArrowLeft />
                        </button>
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase shadow-md">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                            )}
                        </div>
                        <div className="ml-3 truncate">
                            <h3 className="font-bold text-slate-800 text-sm truncate">
                                {otherUser?.name}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {isOnline ? (
                                    <span className="text-emerald-600 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Online
                                    </span>
                                ) : (
                                    formatLastSeen(lastSeen)
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowReviewModal(true)} 
                            className="hidden sm:flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-yellow-200 hover:bg-yellow-100 transition-colors"
                        >
                            <FaStar size={12} /> Rate
                        </button>
                        <button 
                            onClick={() => setShowReportModal(true)} 
                            className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-xs font-semibold border border-rose-200 hover:bg-rose-100 transition-colors"
                        >
                            <FaFlag size={12} /> Report
                        </button>
                    </div>
                </div>

                {/* Ad Strip - 🔧 FIXED: Emerald theme */}
                {ad && (
                    <div className="p-3 border-b border-slate-100 bg-emerald-50/30 flex items-center justify-between px-4">
                        <div className="flex items-center min-w-0">
                            <img 
                                src={ad.images?.[0] || DEFAULT_AD_IMAGE} 
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm bg-slate-100"
                                alt={ad.title || "Ad"}
                                loading="lazy"
                                onError={(e) => { e.target.src = DEFAULT_AD_IMAGE; }}
                            />
                            <div className="ml-3 truncate">
                                <h4 className="font-semibold text-xs text-slate-700 truncate">
                                    {ad.title}
                                </h4>
                                <p className="text-emerald-600 font-bold text-sm">
                                    Rs {ad.price?.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => navigate(`/ad/${ad._id}`)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                            <FaEye size={12} /> View
                        </button>
                    </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 scrollbar-thin scrollbar-thumb-emerald-200">
                    {allMessages.length > 0 ? (
                        allMessages.map((m, i) => {
                            const isMe = m.senderId === user?.uid;
                            return (
                                <div 
                                    key={m._id || m.tempId || i} 
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`
                                        p-3 px-4 rounded-2xl max-w-[85%] text-sm shadow-sm transition-all relative
                                        ${isMe 
                                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                        }
                                        ${m.pending ? 'opacity-70' : ''}
                                    `}>
                                        {/* 🔧 FIXED: Sanitized message */}
                                        <p className="leading-relaxed" dangerouslySetInnerHTML={{ 
                                            __html: DOMPurify.sanitize(m.message).replace(/\n/g, '<br/>') 
                                        }} />
                                        
                                        <div className="flex items-center justify-end gap-1 mt-1">
                                            <span className={`text-[10px] ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                }) : ""}
                                            </span>
                                            {isMe && m.pending && (
                                                <FaSpinner className="animate-spin text-[10px]" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <FaPaperPlane className="text-2xl text-slate-300" />
                            </div>
                            <p className="font-medium">No messages yet</p>
                            <p className="text-sm">Say hello to start the conversation!</p>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
                
                {/* Footer Input Area - 🔧 FIXED: Emerald theme */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input 
                            className="w-full border border-slate-200 rounded-2xl px-5 py-3.5 text-sm outline-none bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-medium pr-12" 
                            placeholder="Type a message..." 
                            value={message} 
                            onChange={handleInputChange} 
                            onKeyPress={handleKeyPress}
                            disabled={isSending}
                            maxLength={1000}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            {message.length}/1000
                        </span>
                    </div>
                    <button 
                        onClick={handleSend} 
                        disabled={!message.trim() || isSending}
                        className={`
                            p-4 rounded-2xl shadow-lg transition-all active:scale-95
                            ${message.trim() && !isSending
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }
                        `}
                        aria-label="Send message"
                    >
                        {isSending ? (
                            <FaSpinner className="animate-spin" size={18} />
                        ) : (
                            <FaPaperPlane size={18} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;