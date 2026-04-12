import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FaPaperPlane, 
    FaArrowLeft, 
    FaStar, 
    FaFlag, 
    FaEye, 
    FaSpinner, 
    FaCheck, 
    FaCheckDouble,
    FaPhone,
    FaInfoCircle
} from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const SOCKET_URL = "https://rezon.up.railway.app";
const API_BASE_URL = `${SOCKET_URL}/api`;

const DEFAULT_AD_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

const ChatRoom = ({ user }) => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    
    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [showAdDetails, setShowAdDetails] = useState(false);
    
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const scrollRef = useRef();
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // 🔥 KEYBOARD DETECTION for mobile
    useEffect(() => {
        const handleResize = () => {
            const vh = window.visualViewport?.height || window.innerHeight;
            const screenHeight = window.screen.height;
            const isKeyboardOpen = vh < screenHeight * 0.75;
            setKeyboardOpen(isKeyboardOpen);
            
            // Scroll to bottom when keyboard opens
            if (isKeyboardOpen) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
            }
        };

        window.visualViewport?.addEventListener('resize', handleResize);
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

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

    // Socket Connection
    useEffect(() => {
        if (!user || !conversationId) return;

        setIsConnecting(true);
        setConnectionError(false);

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
        });

        socket.on("connect_error", (err) => {
            console.error("Socket error:", err);
            setConnectionError(true);
            setIsConnecting(false);
        });

        return () => {
            socket.emit("leave_chat", conversationId);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, conversationId]);

    // Fetch Chat History
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !conversationId) return;

            try {
                const token = await user.getIdToken();
                const res = await axios.get(
                    `${API_BASE_URL}/chat/${conversationId}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        timeout: 10000
                    }
                );

                if (res.data) {
                    setChatData(res.data);
                    setAllMessages(res.data.messages || []);
                    
                    const other = res.data.otherUser;
                    if (other) {
                        setIsOnline(other.isOnline || false);
                        setLastSeen(other.lastSeen);
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
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
            if (data.chatId !== conversationId) return;
            
            setAllMessages(prev => {
                const existingIndex = prev.findIndex(m => 
                    (data.tempId && m.tempId === data.tempId) || 
                    (data._id && m._id === data._id)
                );
                
                if (existingIndex !== -1) {
                    const newMessages = [...prev];
                    newMessages[existingIndex] = { 
                        ...newMessages[existingIndex], 
                        ...data, 
                        pending: false,
                        read: data.read || false
                    };
                    return newMessages;
                }
                
                return [...prev, { ...data, pending: false }];
            });
        };

        const handleStatusChange = (data) => {
            const otherUser = chatData?.otherUser;
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

    // Auto Scroll - Adjust for keyboard
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, [allMessages, keyboardOpen]);

    // Send Message
    const handleSend = useCallback(async () => {
        if (!message.trim() || isSending) return;

        const trimmedMessage = message.trim();
        const tempId = `temp-${Date.now()}`;

        const optimisticMsg = {
            _id: tempId,
            tempId: tempId,
            senderId: user?.uid,
            message: trimmedMessage,
            timestamp: new Date().toISOString(),
            pending: true,
            read: false
        };
        
        setAllMessages(prev => [...prev, optimisticMsg]);
        setMessage("");
        setIsSending(true);

        try {
            const token = await user.getIdToken();

            await axios.post(
                `${API_BASE_URL}/chat/${conversationId}/message`,
                { 
                    message: trimmedMessage,
                    tempId: tempId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

        } catch (err) {
            toast.error("Failed to send");
            setAllMessages(prev => prev.map(m => 
                m.tempId === tempId ? { ...m, pending: false, failed: true } : m
            ));
        } finally {
            setIsSending(false);
        }
    }, [message, conversationId, user, isSending]);

    const handleInputChange = useCallback((e) => {
        setMessage(e.target.value);
    }, []);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const retryMessage = useCallback((tempId) => {
        const failedMsg = allMessages.find(m => m.tempId === tempId);
        if (failedMsg) {
            setMessage(failedMsg.message);
            setAllMessages(prev => prev.filter(m => m.tempId !== tempId));
        }
    }, [allMessages]);

    const otherUser = useMemo(() => 
        chatData?.otherUser || { name: "User" },
    [chatData]);

    const ad = chatData?.adDetails;

    // 🔥 VIEW AD - Navigate to specific ad
    const handleViewAd = useCallback(() => {
        if (ad?._id) {
            navigate(`/ad/${ad._id}`);
        }
    }, [ad, navigate]);

    // Loading State
    if (isConnecting) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50 safe-area-pb">
                <FaSpinner className="animate-spin text-4xl text-emerald-600" />
                <p className="font-medium text-slate-600 text-sm md:text-base">Connecting...</p>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50 safe-area-pb px-4">
                <div className="text-5xl md:text-6xl mb-4">😕</div>
                <p className="font-medium text-slate-600 text-center text-sm md:text-base">Connection failed</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform min-h-[44px]"
                >
                    Retry
                </button>
            </div>
        );
    }

   return (
        <div 
            ref={containerRef}
            className="fixed inset-0 bg-slate-50 flex justify-center z-[60] overflow-hidden overscroll-none"
            style={{ 
                height: '100dvh',
                // Desktop par Navbar ki jagah (75px) chori hai, mobile par 0
                top: window.innerWidth > 1024 ? '75px' : '0' 
            }}
        >
            <div className={`
                w-full bg-white flex flex-col h-full shadow-2xl overflow-hidden
                md:h-full md:max-w-none lg:max-w-4xl lg:h-[95vh] lg:rounded-2xl lg:border lg:border-slate-200
            `}>
                
                {/* 🔥 HEADER - Desktop + Mobile Optimized */}
                <div className="flex-none h-16 md:h-20 border-b border-slate-100 flex items-center justify-between bg-white z-[70] px-2.5 sm:px-6 shrink-0 shadow-sm safe-area-pt">
                    <div className="flex items-center min-w-0 flex-1 gap-2">
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                        >
                            <FaArrowLeft className="text-lg md:text-xl" />
                        </button>
                        
                        <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase shadow-md text-xs sm:text-sm md:text-base">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                            )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base md:text-lg truncate leading-tight">
                                {otherUser?.name || "Customer"}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-emerald-600 font-bold uppercase tracking-wider leading-tight mt-0.5">
                                {isOnline ? "• Online" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>
                    
                    {/* 🔥 Action Buttons (Visible on Mobile + Desktop) */}
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
                        <button 
                            onClick={() => setShowReviewModal(true)} 
                            className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-yellow-200 hover:bg-yellow-100 active:scale-95 transition-transform min-h-[36px]"
                        >
                            <FaStar size={12} /> <span className="hidden sm:inline">Rate</span>
                        </button>
                        
                        <button 
                            onClick={() => setShowReportModal(true)} 
                            className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-rose-200 hover:bg-rose-100 active:scale-95 transition-transform min-h-[36px]"
                        >
                            <FaFlag size={11} /> <span className="hidden sm:inline">Report</span>
                        </button>
                    </div>
                </div>

                {/* 🔥 AD STRIP */}
                {ad && (
                    <div className="flex-none bg-emerald-50/40 border-b border-emerald-100 p-2.5 sm:p-3 md:px-6">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center min-w-0 flex-1 gap-2 sm:gap-3">
                                <img 
                                    src={ad.images?.[0] || DEFAULT_AD_IMAGE} 
                                    className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg object-cover border-2 border-white shadow-sm bg-slate-100 flex-shrink-0" 
                                    alt="ad" 
                                />
                                <div className="min-w-0">
                                    <h4 className="font-bold text-[11px] sm:text-xs md:text-sm text-slate-700 truncate leading-tight">{ad.title}</h4>
                                    <p className="text-emerald-600 font-black text-xs sm:text-sm md:text-base leading-tight mt-0.5">Rs {ad.price?.toLocaleString()}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleViewAd} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                            >
                                <FaEye /> <span className="hidden xs:inline">View Ad</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 🔥 MESSAGES AREA */}
                <div 
                    className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#f8fafc] scroll-smooth custom-scrollbar"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {allMessages.length > 0 ? (
                        allMessages.map((m, i) => {
                            const isMe = m.senderId === user?.uid;
                            return (
                                <div key={m._id || m.tempId || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-2xl max-w-[85%] md:max-w-[70%] text-[13px] sm:text-sm md:text-base shadow-sm ${
                                        isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                    }`}>
                                        <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                        <div className="text-[9px] mt-1 opacity-70 flex items-center justify-end gap-1 font-medium">
                                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            {isMe && <FaCheckDouble className={m.read ? 'text-emerald-100' : 'text-slate-300'} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-50 py-10">
                            <FaComments size={50} />
                            <p className="font-medium text-sm">Start conversation with {otherUser?.name || 'Seller'}</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* 🔥 INPUT AREA */}
                <div className={`flex-none bg-white border-t border-slate-100 p-2 sm:p-3 md:p-4 safe-area-pb`}>
                    <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea 
                                ref={inputRef}
                                className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 text-[16px] sm:text-sm md:text-base outline-none bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-medium resize-none overflow-hidden text-slate-800 placeholder:text-slate-400"
                                placeholder="Type a message..." 
                                value={message} 
                                onChange={handleInputChange}
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '100px' }}
                            />
                        </div>
                        <button 
                            onClick={handleSend} 
                            disabled={!message.trim() || isSending}
                            className={`p-3 sm:p-3.5 md:p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                message.trim() && !isSending ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400'
                            }`}
                        >
                            {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane size={18} />}
                        </button>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .safe-area-pt { padding-top: env(safe-area-inset-top, 0px); }
                .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 0px); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                @media (max-width: 480px) { .xs\\:inline { display: inline; } }
            `}</style>
        </div>
    );
};

export default ChatRoom;