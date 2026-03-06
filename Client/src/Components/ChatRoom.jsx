import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaArrowLeft, FaStar, FaFlag, FaEye } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ CONFIGURATION: Backend URL (Railway ya Local)
const SOCKET_URL = "https://rezon.up.railway.app"; 
const API_BASE_URL = `${SOCKET_URL}/api`;

// ✅ SOCKET INITIALIZATION (Singleton Pattern)
const socket = io(SOCKET_URL, {
    path: "/socket.io/",
    transports: ['polling', 'websocket'], 
    forceNew: true,
    reconnectionAttempts: 5,
    secure: true
});

const ChatRoom = ({ user }) => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    
    // Modals & States
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [adPreviewModal, setAdPreviewModal] = useState(null);

    const scrollRef = useRef();

    // Time Formatter
    const formatLastSeen = (date) => {
        if (!date) return "Offline";
        const now = new Date();
        const seenDate = new Date(date);
        if (isNaN(seenDate.getTime())) return "Offline";
        
        return now.toDateString() === seenDate.toDateString() 
            ? `Seen at ${seenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `Seen on ${seenDate.toLocaleDateString()}`;
    };

    // 1. Fetch History & Initial Setup
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = await user?.getIdToken() || localStorage.getItem('firebaseIdToken');
                const res = await axios.get(`${API_BASE_URL}/chat/history/${conversationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.data) {
                    setChatData(res.data);
                    setAllMessages(res.data.chat?.messages || []);
                    
                    // Socket Join & Status Setup
                    socket.emit("setup", user?.uid);
                    socket.emit("join_chat", conversationId);
                    socket.emit("user_online", user?.uid);
                    
                    const other = res.data.users?.find(u => u.uid !== user?.uid);
                    if (other) { 
                        setIsOnline(other.isOnline); 
                        setLastSeen(other.lastSeen); 
                    }
                }
            } catch (err) { 
                console.error("Chat History Error:", err);
                toast.error("Chat load nahi ho saki.");
            }
        };

        if (user && conversationId) fetchHistory();
    }, [conversationId, user]);

    // 2. Real-time Socket Listeners
    useEffect(() => {
        // Naye message ka milna
        socket.on("receive_message", (data) => {
            if (data.chatId === conversationId) {
                setAllMessages((prev) => [...prev, data]);
            }
        });

        // Online/Offline status change
        socket.on("status_change", (data) => {
            const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
            if (otherUser && data.userId === otherUser.uid) {
                setIsOnline(data.isOnline); 
                setLastSeen(data.lastSeen);
            }
        });

        // Cleanup on unmount
        return () => { 
            socket.off("receive_message"); 
            socket.off("status_change"); 
        };
    }, [conversationId, chatData, user]);

    // 3. Auto Scroll to Bottom
    useEffect(() => { 
        scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [allMessages]);

    // 4. Send Message Function
    const handleSend = () => {
        if (!message.trim()) return;

        const messageData = { 
            chatId: conversationId, 
            senderId: user?.uid, 
            message: message.trim(), 
            timestamp: new Date(), 
            tempId: Date.now().toString()
        };

        // Real-time emit
        socket.emit("send_message", messageData);
        
        // Input clear karein
        setMessage("");
    };

    // Loading State
    if (!chatData) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
            <div className="animate-spin h-10 w-10 border-4 border-pink-500 border-t-transparent rounded-full"></div>
            <p className="font-bold text-pink-600 italic">Syncing Rezon Chat...</p>
        </div>
    );
    
    const otherUser = chatData?.users?.find(u => u.uid !== user?.uid) || { name: "User" };
    const ad = chatData?.chat?.adId;

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center md:p-4">
            <div className="w-full max-w-4xl bg-white flex flex-col h-screen md:h-[90vh] border shadow-2xl relative md:rounded-3xl overflow-hidden">
                
                {/* Header Section */}
                <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center min-w-0">
                        <FaArrowLeft className="mr-4 cursor-pointer text-gray-500 hover:text-pink-600" onClick={() => navigate(-1)}/>
                        <div className="relative">
                            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-black uppercase">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>}
                        </div>
                        <div className="ml-3 truncate">
                            <h3 className="font-bold text-gray-800 text-sm truncate uppercase">{otherUser?.name}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                {isOnline ? "Online Now" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowReviewModal(true)} className="hidden sm:flex bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border border-yellow-200 items-center gap-1">
                            <FaStar /> Rate
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border border-red-100 flex items-center gap-1">
                            <FaFlag /> Report
                        </button>
                    </div>
                </div>

                {/* Ad Strip */}
                {ad && (
                    <div className="p-2 border-b bg-pink-50/30 flex items-center justify-between px-4">
                        <div className="flex items-center min-w-0">
                            <img src={ad.images?.[0] || "https://via.placeholder.com/150"} className="w-10 h-10 rounded-lg object-cover border shadow-sm" alt="ad" />
                            <div className="ml-3 truncate">
                                <h4 className="font-bold text-[10px] text-gray-700 truncate uppercase">{ad.title}</h4>
                                <p className="text-pink-600 font-black text-xs">Rs {ad.price?.toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => navigate(`/ad/${ad._id}`)} className="bg-pink-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm flex items-center gap-1">
                            <FaEye /> View Ad
                        </button>
                    </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                    {Array.isArray(allMessages) && allMessages.length > 0 ? (
                        allMessages.map((m, i) => (
                            <div key={m._id || m.tempId || i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 px-4 rounded-2xl max-w-[85%] text-sm shadow-sm transition-all ${
                                    m.senderId === user?.uid 
                                    ? 'bg-pink-600 text-white rounded-tr-none' 
                                    : 'bg-white text-gray-800 border rounded-tl-none'
                                }`}>
                                    <p className="leading-relaxed font-medium">{m.message}</p>
                                    <p className="text-[8px] mt-1 text-right opacity-70 font-bold uppercase">
                                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 italic text-sm">
                            <p>No messages yet. Say Hi!</p>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
                
                {/* Footer Input Area */}
                <div className="p-4 bg-white border-t flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input 
                            className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm outline-none bg-gray-50 focus:border-pink-500 focus:bg-white transition-all font-medium pr-12 shadow-inner" 
                            placeholder="Type your message..." 
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                        />
                    </div>
                    <button 
                        onClick={handleSend} 
                        disabled={!message.trim()}
                        className={`p-4 rounded-2xl shadow-lg transition-all active:scale-95 ${
                            message.trim() ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                    >
                        <FaPaperPlane size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;