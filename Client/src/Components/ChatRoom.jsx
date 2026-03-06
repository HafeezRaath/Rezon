import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaArrowLeft, FaStar, FaFlag, FaTimes, FaBox, FaEye } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ FIXED: Direct Railway URL for Production
const SOCKET_URL = "https://rezon.up.railway.app";
const API_BASE_URL = `${SOCKET_URL}/api`;

// ✅ FIXED: Socket settings for production
const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnectionAttempts: 5
});

const ChatRoom = ({ user }) => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [adPreviewModal, setAdPreviewModal] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [reportReason, setReportReason] = useState("Scam/Fraud");
    const [reportDesc, setReportDesc] = useState("");
    const scrollRef = useRef();

    const formatLastSeen = (date) => {
        if (!date || isNaN(new Date(date).getTime())) return "Offline";
        const now = new Date();
        const seenDate = new Date(date);
        return now.toDateString() === seenDate.toDateString() 
            ? `Seen at ${seenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `Seen on ${seenDate.toLocaleDateString()}`;
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
                const res = await axios.get(`${API_BASE_URL}/chat/history/${conversationId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // ✅ SAFETY CHECK: If data is empty
                if (res.data) {
                    setChatData(res.data);
                    setAllMessages(res.data.chat?.messages || []);
                    
                    socket.emit("join_chat", conversationId);
                    socket.emit("user_online", user?.uid);
                    
                    const other = res.data.users?.find(u => u.uid !== user?.uid);
                    if (other) { 
                        setIsOnline(other.isOnline); 
                        setLastSeen(other.lastSeen); 
                    }
                }
            } catch (err) { 
                console.error("Chat Error:", err);
                toast.error("Connection slow hai ya session expire ho gaya.");
            }
        };
        if (user && conversationId) fetchHistory();
    }, [conversationId, user]);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            if (data.chatId === conversationId) {
                setAllMessages((prev) => [...prev, data]);
            }
        });

        socket.on("status_change", (data) => {
            const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
            if (otherUser && data.userId === otherUser.uid) {
                setIsOnline(data.isOnline); 
                setLastSeen(data.lastSeen);
            }
        });

        return () => { 
            socket.off("receive_message"); 
            socket.off("status_change"); 
        };
    }, [conversationId, chatData, user]);

    useEffect(() => { 
        scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [allMessages]);

    const handleSend = () => {
        if (!message.trim()) return;
        socket.emit("send_message", { 
            chatId: conversationId, 
            senderId: user?.uid, 
            message, 
            timestamp: new Date(), 
            isRead: false 
        });
        setMessage("");
    };

    // Loading State
    if (!chatData) return (
        <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
            <div className="animate-spin h-10 w-10 border-4 border-pink-500 border-t-transparent rounded-full"></div>
            <p className="font-bold text-pink-600 italic">Syncing Rezon Chat...</p>
        </div>
    );
    
    // ✅ SAFETY CHECK: Find other user safely
    const otherUser = chatData?.users?.find(u => u.uid !== user?.uid) || { name: "User" };
    const ad = chatData?.chat?.adId;

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center md:p-4">
            <div className="w-full max-w-4xl bg-white flex flex-col h-screen md:h-[90vh] border shadow-2xl relative md:rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center min-w-0">
                        <FaArrowLeft className="mr-4 cursor-pointer text-gray-500 hover:text-pink-600" onClick={() => navigate(-1)}/>
                        <div className="relative">
                            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-black uppercase">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                            {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                        </div>
                        <div className="ml-3 truncate">
                            <h3 className="font-bold text-gray-800 text-sm truncate uppercase">{otherUser?.name}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                {isOnline ? "Online Now" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowReviewModal(true)} className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border border-yellow-200 flex items-center gap-1">
                            <FaStar /> Rate
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border border-red-100 flex items-center gap-1">
                            <FaFlag /> Report
                        </button>
                    </div>
                </div>

                {/* Ad Preview Strip */}
                {ad && (
                    <div className="p-2 border-b bg-gray-50 flex items-center justify-between px-4">
                        <div className="flex items-center min-w-0">
                            <img src={ad.images?.[0] || "https://via.placeholder.com/150"} className="w-12 h-12 rounded-lg object-cover border shadow-sm" alt="ad" />
                            <div className="ml-3 truncate">
                                <h4 className="font-bold text-[11px] text-gray-700 truncate uppercase">{ad.title}</h4>
                                <p className="text-pink-600 font-black text-xs">Rs {ad.price?.toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setAdPreviewModal(ad)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-sm flex items-center gap-1">
                            <FaEye /> View
                        </button>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                    {/* ✅ CRASH FIX: Ensure allMessages is an array */}
                    {Array.isArray(allMessages) && allMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 px-4 rounded-2xl max-w-[80%] text-sm shadow-sm ${m.senderId === user?.uid ? 'bg-pink-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                                <p className="leading-relaxed font-medium">{m.message}</p>
                                <p className="text-[8px] mt-1 text-right opacity-70 font-bold uppercase">
                                    {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-white border-t flex items-center gap-3">
                    <input 
                        className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 text-sm outline-none bg-gray-50 focus:border-pink-500 focus:bg-white transition-all font-medium" 
                        placeholder="Message likhein..." 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)} 
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                    />
                    <button onClick={handleSend} className="bg-pink-600 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all">
                        <FaPaperPlane size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;