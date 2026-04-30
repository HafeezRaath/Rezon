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
    FaInfoCircle,
    FaExclamationTriangle,
    FaRedo,
    FaLock
} from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const SOCKET_URL = "https://rezon.up.railway.app";
const API_BASE_URL = `${SOCKET_URL}/api`;

const DEFAULT_AD_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

// 🔥 SOCKET INSTANCE - Single instance outside component to prevent re-creation
const socket = io(SOCKET_URL, {
    path: "/socket.io/",
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    secure: true,
    autoConnect: false,
});

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
    const [showAdDetails, setShowAdDetails] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);

    // 🔥 REVIEW STATES
    const [canReviewStatus, setCanReviewStatus] = useState(null);
    const [checkingReviewEligibility, setCheckingReviewEligibility] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');

    // 🔥 REPORT STATES
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const textareaRef = useRef(null);

    // 🔥 DETECT MOBILE
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 🔥 KEYBOARD HANDLING - Mobile responsive
    useEffect(() => {
        const handleVisualResize = () => {
            if (!window.visualViewport) return;
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 100);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleVisualResize);
            }
        };
    }, []);

    // 🔥 AUTO-RESIZE TEXTAREA
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

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

    // 🔥 FETCH CHAT HISTORY
    const fetchHistory = useCallback(async () => {
        if (!user || !conversationId) return;
        setIsLoadingHistory(true);

        try {
            const token = await user.getIdToken();
            const res = await axios.get(
                `${API_BASE_URL}/chat/${conversationId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 15000
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

                // 🔥 CHECK REVIEW ELIGIBILITY
                if (res.data.adDetails?._id) {
                    checkReviewEligibility(res.data.adDetails._id);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            toast.error(err.response?.data?.message || "Failed to load chat");
        } finally {
            setIsLoadingHistory(false);
            setIsConnecting(false);
        }
    }, [conversationId, user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // 🔥 CHECK REVIEW ELIGIBILITY
    const checkReviewEligibility = useCallback(async (adId) => {
        if (!adId || !user) return;

        setCheckingReviewEligibility(true);
        try {
            const token = await user.getIdToken();
            const res = await axios.get(
                `${API_BASE_URL}/can-review/${adId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 10000
                }
            );

            setCanReviewStatus(res.data);
        } catch (err) {
            console.error("Review eligibility check failed:", err);
            setCanReviewStatus({ canReview: false });
        } finally {
            setCheckingReviewEligibility(false);
        }
    }, [user]);

    // 🔥 SOCKET CONNECTION
    useEffect(() => {
        if (!user || !conversationId) return;

        setConnectionError(false);
        setIsConnecting(true);

        socket.auth = { userId: user.uid };
        socket.connect();

        const onConnect = () => {
            setSocketConnected(true);
            setIsConnecting(false);
            setConnectionError(false);
            socket.emit("setup", user.uid);
            socket.emit("join_chat", conversationId);
        };

        const onDisconnect = (reason) => {
            setSocketConnected(false);
            console.log("Socket disconnected:", reason);
        };

        const onConnectError = (err) => {
            console.error("Socket connect error:", err);
            setConnectionError(true);
            setIsConnecting(false);
        };

        const onReconnect = (attempt) => {
            console.log("Socket reconnected after", attempt, "attempts");
            setConnectionError(false);
            socket.emit("join_chat", conversationId);
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);
        socket.on("reconnect", onReconnect);

        return () => {
            socket.emit("leave_chat", conversationId);
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
            socket.off("reconnect", onReconnect);
            socket.disconnect();
        };
    }, [user, conversationId]);

    // 🔥 SOCKET MESSAGE LISTENERS
    useEffect(() => {
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
                        failed: false,
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

        const handleMessageRead = (data) => {
            if (data.chatId !== conversationId) return;
            setAllMessages(prev => prev.map(m => 
                m.senderId !== user?.uid ? { ...m, read: true } : m
            ));
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("status_change", handleStatusChange);
        socket.on("message_read", handleMessageRead);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("status_change", handleStatusChange);
            socket.off("message_read", handleMessageRead);
        };
    }, [conversationId, chatData, user]);

    // 🔥 AUTO SCROLL
    useEffect(() => {
        const timer = setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
        return () => clearTimeout(timer);
    }, [allMessages]);

    // 🔥 SEND MESSAGE
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
            failed: false,
            read: false
        };

        setAllMessages(prev => [...prev, optimisticMsg]);
        setMessage("");
        setIsSending(true);

        try {
            const token = await user.getIdToken();

            const res = await axios.post(
                `${API_BASE_URL}/chat/${conversationId}/message`,
                { 
                    message: trimmedMessage,
                    tempId: tempId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data) {
                setAllMessages(prev => prev.map(m => 
                    m.tempId === tempId ? { ...m, ...res.data, pending: false, failed: false } : m
                ));
            }

        } catch (err) {
            toast.error("Failed to send message");
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

    const handleKeyDown = useCallback((e) => {
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
            inputRef.current?.focus();
        }
    }, [allMessages]);

    const otherUser = useMemo(() => 
        chatData?.otherUser || { name: "User" },
    [chatData]);

    const ad = chatData?.adDetails;

    // 🔥 VIEW AD
    const handleViewAd = useCallback(() => {
        if (ad?._id) {
            navigate(`/ad/${ad._id}`);
        }
    }, [ad, navigate]);

    // 🔥 HANDLE REPORT
    const handleReport = useCallback(async () => {
        if (!reportReason.trim()) {
            toast.error("Please enter a reason");
            return;
        }

        if (!ad?._id) {
            toast.error("Ad information not available");
            return;
        }

        setReportSubmitting(true);
        try {
            const token = await user.getIdToken();
            await axios.post(`${API_BASE_URL}/reports`, {
                reportedUserId: otherUser?.uid,
                adId: ad?._id,
                reason: reportReason,
                description: reportReason
            }, { 
                headers: { Authorization: `Bearer ${token}` } 
            });

            toast.success("Report submitted to admin");
            setShowReportModal(false);
            setReportReason('');

        } catch (err) {
            console.error("Report error:", err);
            toast.error(err.response?.data?.message || "Failed to submit report");
        } finally {
            setReportSubmitting(false);
        }
    }, [reportReason, otherUser, ad, user]);

    // 🔥 HANDLE REVIEW
    const handleReview = useCallback(async () => {
        if (reviewRating === 0) {
            toast.error("Please select a rating");
            return;
        }

        if (!canReviewStatus?.canReview) {
            toast.error("You are not eligible to review this seller");
            setShowReviewModal(false);
            return;
        }

        try {
            const token = await user.getIdToken();
            await axios.post(`${API_BASE_URL}/reviews`, {
                sellerId: otherUser?.uid,
                adId: ad?._id,
                rating: reviewRating,
                comment: reviewComment
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Review submitted successfully!");
            setShowReviewModal(false);
            setReviewRating(0);
            setReviewComment('');

            // Update status to hide button
            setCanReviewStatus(prev => ({ ...prev, canReview: false, alreadyReviewed: true }));

        } catch (err) {
            console.error("Review error:", err);
            toast.error(err.response?.data?.message || "Failed to submit review");
        }
    }, [reviewRating, reviewComment, otherUser, ad, user, canReviewStatus]);

    // 🔥 HANDLE REVIEW CLICK
    const handleReviewClick = useCallback(() => {
        if (!canReviewStatus?.canReview) {
            if (canReviewStatus?.alreadyReviewed) {
                toast.error("You have already reviewed this seller");
            } else if (canReviewStatus?.expired) {
                toast.error("Review period expired (30 days)");
            } else {
                toast.error("Only selected buyer can leave review");
            }
            return;
        }
        setShowReviewModal(true);
    }, [canReviewStatus]);

    // 🔥 GO BACK
    const handleGoBack = useCallback(() => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/chat/list');
        }
    }, [navigate]);

    // Loading State
    if (isConnecting && isLoadingHistory) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <FaSpinner className="animate-spin text-4xl text-emerald-600" />
                <p className="font-medium text-slate-600 text-sm md:text-base">Connecting...</p>
            </div>
        );
    }

    if (connectionError && !socketConnected) {
        return (
            <div className="h-[100dvh] flex flex-col items-center justify-center gap-4 bg-slate-50 px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="text-5xl md:text-6xl mb-4">😕</div>
                <p className="font-medium text-slate-600 text-center text-sm md:text-base">Connection failed</p>
                <button 
                    onClick={() => {
                        setConnectionError(false);
                        setIsConnecting(true);
                        socket.connect();
                    }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold active:scale-95 transition-transform min-h-[44px] flex items-center gap-2"
                >
                    <FaRedo /> Retry
                </button>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 bg-slate-50 flex justify-center z-[60] overflow-hidden"
            style={{ 
                height: '100dvh',
                top: 0,
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
        >
            <div className="
                w-full bg-white flex flex-col h-full shadow-2xl overflow-hidden
                md:w-full md:max-w-none 
                lg:max-w-4xl lg:h-[calc(100dvh-20px)] lg:mt-[10px] lg:rounded-2xl lg:border lg:border-slate-200
            ">

                {/* 🔥 HEADER */}
                <div className="flex-none h-14 sm:h-16 md:h-18 border-b border-slate-100 flex items-center justify-between bg-white z-[70] px-3 sm:px-4 md:px-6 shrink-0 shadow-sm"
                    style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                >
                    <div className="flex items-center min-w-0 flex-1 gap-2">
                        <button 
                            onClick={handleGoBack}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                        >
                            <FaArrowLeft className="text-lg md:text-xl" />
                        </button>

                        <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold uppercase shadow-md text-sm">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                            )}
                        </div>

                        <div className="min-w-0 flex-1 ml-2">
                            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate leading-tight">
                                {otherUser?.name || "Customer"}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-emerald-600 font-bold uppercase tracking-wider leading-tight">
                                {isOnline ? "● Online" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* 🔥 REVIEW BUTTON - ELIGIBLE */}
                        {canReviewStatus?.canReview && (
                            <button 
                                onClick={handleReviewClick} 
                                className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-yellow-200 hover:bg-yellow-100 active:scale-95 transition-transform min-h-[36px]"
                            >
                                <FaStar size={12} /> <span className="hidden sm:inline">Rate</span>
                            </button>
                        )}

                        {/* 🔥 REVIEW BUTTON - NOT ELIGIBLE */}
                        {canReviewStatus && !canReviewStatus?.canReview && !checkingReviewEligibility && (
                            <button 
                                onClick={handleReviewClick}
                                className="flex items-center gap-1 bg-slate-100 text-slate-400 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-slate-200 cursor-not-allowed min-h-[36px]"
                                title={canReviewStatus?.alreadyReviewed ? "Already reviewed" : canReviewStatus?.expired ? "Review expired" : "Not eligible"}
                            >
                                <FaLock size={10} /> <span className="hidden sm:inline">Rate</span>
                            </button>
                        )}

                        {/* 🔥 REVIEW CHECKING */}
                        {checkingReviewEligibility && (
                            <button 
                                disabled
                                className="flex items-center gap-1 bg-slate-100 text-slate-400 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-slate-200 cursor-wait min-h-[36px]"
                            >
                                <FaSpinner className="animate-spin" size={10} />
                            </button>
                        )}

                        {/* 🔥 REPORT BUTTON */}
                        <button 
                            onClick={() => setShowReportModal(true)} 
                            className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 sm:px-3 py-2 rounded-full text-[11px] sm:text-xs font-bold border border-rose-200 hover:bg-rose-100 active:scale-95 transition-transform min-h-[36px]"
                        >
                            <FaFlag size={11} /> <span className="hidden sm:inline">Report</span>
                        </button>
                    </div>
                </div>

                {/* 🔥 AD STRIP */}
                {ad && (
                    <div 
                        onClick={handleViewAd}
                        className="flex-none bg-emerald-50/40 border-b border-emerald-100 p-2.5 sm:p-3 cursor-pointer hover:bg-emerald-50/80 transition-colors"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center min-w-0 flex-1 gap-2 sm:gap-3">
                                <img 
                                    src={ad.images?.[0] || DEFAULT_AD_IMAGE} 
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border-2 border-white shadow-sm bg-slate-100 flex-shrink-0" 
                                    alt="ad" 
                                />
                                <div className="min-w-0">
                                    <h4 className="font-bold text-[11px] sm:text-xs md:text-sm text-slate-700 truncate leading-tight">{ad.title}</h4>
                                    <p className="text-emerald-600 font-black text-xs sm:text-sm leading-tight mt-0.5">Rs {ad.price?.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md transition-all active:scale-95">
                                <FaEye size={12} /> <span className="hidden xs:inline">View</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🔥 MESSAGES AREA */}
                <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 bg-[#f8fafc] scroll-smooth min-h-0"
                    style={{ 
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain'
                    }}
                >
                    {isLoadingHistory ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3">
                            <FaSpinner className="animate-spin text-2xl text-emerald-500" />
                            <p className="text-slate-400 text-sm">Loading messages...</p>
                        </div>
                    ) : allMessages.length > 0 ? (
                        allMessages.map((m, i) => {
                            const isMe = m.senderId === user?.uid;
                            const showFailed = m.failed;
                            return (
                                <div key={m._id || m.tempId || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                                    <div className={`relative px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl max-w-[85%] sm:max-w-[75%] md:max-w-[65%] text-[13px] sm:text-sm shadow-sm ${
                                        isMe 
                                            ? 'bg-emerald-600 text-white rounded-tr-none' 
                                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                                    } ${m.pending ? 'opacity-70' : ''} ${showFailed ? 'border-rose-300 bg-rose-50 text-rose-900' : ''}`}>
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{m.message}</p>
                                        <div className="text-[9px] mt-1 opacity-70 flex items-center justify-end gap-1 font-medium">
                                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                            {isMe && !showFailed && (
                                                m.pending 
                                                    ? <FaSpinner className="animate-spin text-[10px]" />
                                                    : <FaCheckDouble className={m.read ? 'text-emerald-100' : 'text-slate-300'} />
                                            )}
                                            {showFailed && (
                                                <button 
                                                    onClick={() => retryMessage(m.tempId)}
                                                    className="text-rose-500 hover:text-rose-700 ml-1 flex items-center gap-0.5"
                                                >
                                                    <FaRedo size={8} /> Retry
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 opacity-60 py-10">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                <FaPaperPlane size={24} className="text-slate-300" />
                            </div>
                            <p className="font-medium text-sm text-center">Start conversation with<br/><span className="text-emerald-600">{otherUser?.name || 'Seller'}</span></p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 🔥 INPUT AREA */}
                <div 
                    className="flex-none bg-white border-t border-slate-100 p-2 sm:p-3 md:p-4"
                    style={{ 
                        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)'
                    }}
                >
                    <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                        <div className="flex-1 relative">
                            <textarea 
                                ref={textareaRef}
                                className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-[16px] sm:text-sm outline-none bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-medium resize-none overflow-hidden text-slate-800 placeholder:text-slate-400"
                                placeholder="Type a message..." 
                                value={message} 
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                        </div>
                        <button 
                            onClick={handleSend} 
                            disabled={!message.trim() || isSending}
                            className={`p-3 sm:p-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                message.trim() && !isSending ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400'
                            }`}
                        >
                            {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔥 REPORT MODAL */}
            {showReportModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-2 mb-4 text-rose-600">
                            <FaExclamationTriangle />
                            <h3 className="font-bold text-lg">Report User</h3>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 mb-4">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reporting</p>
                            <p className="font-bold text-slate-700 text-sm">{otherUser?.name || "User"}</p>
                            {ad?.title && (
                                <p className="text-xs text-slate-500 mt-1 truncate">Ad: {ad.title}</p>
                            )}
                        </div>

                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Describe the issue in detail (e.g. Fake listing, Scam, Harassment, etc.)"
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                            rows={4}
                        />
                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason('');
                                }}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReport}
                                disabled={!reportReason.trim() || !ad?._id || reportSubmitting}
                                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {reportSubmitting ? <FaSpinner className="animate-spin" /> : <FaFlag />}
                                {reportSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 REVIEW MODAL */}
            {showReviewModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-2 mb-4 text-yellow-600">
                            <FaStar />
                            <h3 className="font-bold text-lg">Rate Seller</h3>
                        </div>

                        <div className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-100">
                            <p className="text-xs text-yellow-600 uppercase tracking-wider mb-1">Rating</p>
                            <p className="font-bold text-slate-700 text-sm">{otherUser?.name || "Seller"}</p>
                            {ad?.title && (
                                <p className="text-xs text-slate-500 mt-1 truncate">For: {ad.title}</p>
                            )}
                        </div>

                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setReviewRating(star)}
                                    className={`text-2xl transition-transform active:scale-110 ${star <= reviewRating ? 'text-yellow-400' : 'text-slate-200'}`}
                                >
                                    <FaStar />
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Write your review (optional)..."
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 resize-none"
                            rows={3}
                        />
                        <div className="flex gap-3 mt-4">
                            <button 
                                onClick={() => {
                                    setShowReviewModal(false);
                                    setReviewRating(0);
                                    setReviewComment('');
                                }}
                                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReview}
                                disabled={reviewRating === 0}
                                className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Submit Review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatRoom;