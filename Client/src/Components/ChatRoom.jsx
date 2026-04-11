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

    // 🔥 SMART SCROLL TO BOTTOM (WhatsApp Style)
    const scrollToBottom = useCallback((behavior = "smooth") => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    }, []);

    // 🔥 KEYBOARD DETECTION & VIEWPORT FIX (For Mobile)
    useEffect(() => {
        const handleViewportChange = () => {
            const vh = window.visualViewport?.height || window.innerHeight;
            const screenHeight = window.screen.height;
            const isKeyboardOpen = vh < screenHeight * 0.75;
            setKeyboardOpen(isKeyboardOpen);

            if (isKeyboardOpen) {
                // Jab keyboard khule to page top par lock rahe aur chat bottom par scroll ho
                window.scrollTo(0, 0);
                setTimeout(() => scrollToBottom("auto"), 100);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }
        
        return () => {
            window.visualViewport?.removeEventListener('resize', handleViewportChange);
            window.visualViewport?.removeEventListener('scroll', handleViewportChange);
        };
    }, [scrollToBottom]);

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

    // Auto Scroll
    useEffect(() => {
        scrollToBottom("smooth");
    }, [allMessages, scrollToBottom]);

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

    const handleViewAd = useCallback(() => {
        if (ad?._id) {
            navigate(`/ad/${ad._id}`);
        }
    }, [ad, navigate]);

    if (isConnecting) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50">
                <FaSpinner className="animate-spin text-4xl text-emerald-600" />
                <p className="font-medium text-slate-600">Connecting...</p>
            </div>
        );
    }

    if (connectionError) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50">
                <div className="text-6xl mb-4">😕</div>
                <p className="font-medium text-slate-600">Connection failed</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-emerald-600 text-white rounded-lg">Retry</button>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 bg-slate-50 flex justify-center overflow-hidden"
            style={{ height: '100dvh' }}
        >
            <div className="w-full bg-white flex flex-col h-full shadow-2xl relative lg:max-w-4xl lg:h-[95vh] lg:my-auto lg:rounded-2xl lg:border lg:border-slate-200">
                
                {/* HEADER */}
                <div className="flex-none p-3 md:p-4 border-b border-slate-100 flex items-center justify-between bg-white z-20 shadow-sm">
                    <div className="flex items-center min-w-0 flex-1">
                        <button onClick={() => navigate(-1)} className="mr-3 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                            <FaArrowLeft className="text-lg" />
                        </button>
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase shadow-md">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>}
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                            <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">{otherUser?.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">
                                {isOnline ? <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Online</span> : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <button onClick={() => setShowAdDetails(!showAdDetails)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><FaInfoCircle className="text-lg" /></button>
                        <button onClick={() => setShowReviewModal(true)} className="hidden sm:flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-yellow-200">Rate</button>
                        <button onClick={() => setShowReportModal(true)} className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2 md:px-3 py-1.5 rounded-full text-xs font-semibold border border-rose-200"><FaFlag size={12} /><span className="hidden sm:inline">Report</span></button>
                    </div>
                </div>

                {/* AD STRIP */}
                {ad && (
                    <div className={`flex-none bg-emerald-50/30 border-b border-slate-100 overflow-hidden transition-all duration-300 ${showAdDetails ? 'max-h-32 p-3' : 'max-h-0 md:max-h-20 md:p-3'}`}>
                        <div className="flex items-center justify-between px-1 md:px-4">
                            <div className="flex items-center min-w-0 flex-1">
                                <img src={ad.images?.[0] || DEFAULT_AD_IMAGE} className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover border border-slate-200 shadow-sm" alt="Ad" />
                                <div className="ml-3 min-w-0 flex-1">
                                    <h4 className="font-semibold text-xs md:text-sm text-slate-700 truncate">{ad.title}</h4>
                                    <p className="text-emerald-600 font-bold text-sm md:text-base">Rs {ad.price?.toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={handleViewAd} className="bg-emerald-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-1.5 ml-2"><FaEye size={12} /> View</button>
                        </div>
                    </div>
                )}

                {/* MESSAGES AREA */}
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-slate-50/30 scroll-smooth" style={{ overscrollBehavior: 'contain' }}>
                    {allMessages.length > 0 ? (
                        allMessages.map((m, i) => {
                            const isMe = m.senderId === user?.uid;
                            const showAvatar = i === 0 || allMessages[i - 1].senderId !== m.senderId;
                            return (
                                <div key={m._id || m.tempId || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isMe && showAvatar ? (
                                            <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {otherUser?.name?.charAt(0) || "U"}
                                            </div>
                                        ) : !isMe && <div className="w-8 flex-shrink-0" />}
                                        
                                        <div className={`px-3 py-2 rounded-2xl text-sm md:text-base shadow-sm relative ${isMe ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'} ${m.pending ? 'opacity-70' : ''} ${m.failed ? 'bg-red-500 text-white' : ''}`}>
                                            <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className={`text-[10px] ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                    {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                                </span>
                                                {isMe && (
                                                    <>
                                                        {m.pending && <FaSpinner className="animate-spin text-[10px]" />}
                                                        {!m.pending && !m.failed && (m.read ? <FaCheckDouble className="text-[10px]" /> : <FaCheck className="text-[10px]" />)}
                                                    </>
                                                )}
                                            </div>
                                            {m.failed && <button onClick={() => retryMessage(m.tempId)} className="absolute -bottom-5 right-0 text-[10px] text-red-500">Retry</button>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400"><FaPaperPlane className="text-4xl text-slate-200 mb-2" /><p>No messages yet</p></div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* INPUT AREA */}
                <div className={`flex-none bg-white border-t border-slate-100 p-2 md:p-4 ${keyboardOpen ? 'pb-2' : 'pb-safe'}`}>
                    <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea 
                                ref={inputRef}
                                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm md:text-base outline-none bg-slate-50 focus:border-emerald-500 focus:bg-white transition-all resize-none max-h-32"
                                placeholder="Type a message..." 
                                value={message} 
                                onChange={handleInputChange}
                                rows={1}
                                onFocus={() => setTimeout(() => scrollToBottom("auto"), 300)}
                            />
                        </div>
                        <button 
                            onClick={handleSend} 
                            disabled={!message.trim() || isSending}
                            className={`p-3 md:p-4 rounded-2xl shadow-lg transition-all active:scale-95 ${message.trim() && !isSending ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                        >
                            {isSending ? <FaSpinner className="animate-spin" size={18} /> : <FaPaperPlane size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;