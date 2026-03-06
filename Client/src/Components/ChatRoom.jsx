import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaArrowLeft, FaStar, FaFlag, FaTimes, FaBox, FaEye } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ LIVE RAILWAY PRODUCTION URL
const SOCKET_URL = window.location.hostname === "localhost" 
    ? "http://localhost:8000" 
    : "https://rezon.up.railway.app";

const API_BASE_URL = `${SOCKET_URL}/api`;

// Socket Initialization with Production Settings
const socket = io(SOCKET_URL, {
    path: "/socket.io/",
    transports: ['websocket', 'polling'],
    withCredentials: true
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
                setChatData(res.data);
                setAllMessages(res.data.chat.messages || []);
                
                // Socket Events
                socket.emit("join_chat", conversationId);
                socket.emit("user_online", user.uid);
                socket.emit("message_seen", { chatId: conversationId, userId: user.uid });
                
                const other = res.data.users?.find(u => u.uid !== user?.uid);
                if (other) { 
                    setIsOnline(other.isOnline); 
                    setLastSeen(other.lastSeen); 
                }
            } catch (err) { 
                console.error("Chat Error:", err);
                toast.error("Chat history load nahi ho saki.");
            }
        };
        if (user && conversationId) fetchHistory();
    }, [conversationId, user]);

    useEffect(() => {
        socket.on("receive_message", (data) => {
            if (data.chatId === conversationId) {
                setAllMessages((prev) => [...prev, data]);
                socket.emit("message_seen", { chatId: conversationId, userId: user.uid });
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
            senderId: user.uid, 
            message, 
            timestamp: new Date(), 
            isRead: false 
        });
        setMessage("");
    };

    const submitReview = async () => {
        if (!comment.trim()) return toast.error("Kuch likh toh dein!");
        const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
        const adIdToSubmit = chatData?.chat?.adId?._id || chatData?.chat?.adId;
        
        try {
            const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
            await axios.post(`${API_BASE_URL}/reviews`, 
                { sellerId: otherUser.uid, adId: adIdToSubmit, rating, comment }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Review post ho gaya!");
            setShowReviewModal(false);
            setComment("");
        } catch (err) { 
            toast.error("Review fail ho gaya."); 
        }
    };

    const submitReport = async () => {
        if (!reportDesc.trim()) return toast.error("Wajah likhein!");
        const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
        const adIdToSubmit = chatData?.chat?.adId?._id || chatData?.chat?.adId;
        
        try {
            const token = localStorage.getItem('firebaseIdToken') || user?.accessToken;
            await axios.post(`${API_BASE_URL}/reports`, 
                { reportedUserId: otherUser.uid, adId: adIdToSubmit, reason: reportReason, description: reportDesc }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Report bhej di gayi.");
            setShowReportModal(false);
            setReportDesc("");
        } catch (err) { 
            toast.error("Report fail ho gayi."); 
        }
    };

    if (!chatData) return <div className="h-screen flex items-center justify-center font-bold text-pink-600 italic">Loading Rezon Chat...</div>;
    
    const otherUser = chatData.users?.find(u => u.uid !== user?.uid);
    const ad = chatData.chat?.adId;

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center md:p-4">
            <div className="w-full max-w-4xl bg-white flex flex-col h-screen md:h-[90vh] border shadow-2xl relative md:rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center min-w-0">
                        <FaArrowLeft className="mr-4 cursor-pointer text-gray-500 hover:text-pink-600" onClick={() => navigate(-1)}/>
                        <div className="relative">
                            <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white font-black">
                                {otherUser?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                        </div>
                        <div className="ml-3 truncate">
                            <h3 className="font-bold text-gray-800 text-sm truncate">{otherUser?.name || "User"}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                {isOnline ? "Online Now" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowReviewModal(true)} className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-yellow-200 flex items-center gap-1 hover:bg-yellow-100 transition-colors">
                            <FaStar /> Rate
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border border-red-100 flex items-center gap-1 hover:bg-red-100 transition-colors">
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
                                <h4 className="font-bold text-[11px] text-gray-700 truncate">{ad.title}</h4>
                                <p className="text-pink-600 font-black text-xs">Rs {ad.price?.toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setAdPreviewModal(ad)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm flex items-center gap-1 hover:bg-blue-700 active:scale-95 transition-all">
                            <FaEye /> View Details
                        </button>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
                    {allMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 px-4 rounded-2xl max-w-[80%] text-sm shadow-sm ${m.senderId === user?.uid ? 'bg-pink-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                                <p className="leading-relaxed font-medium">{m.message}</p>
                                <p className="text-[8px] mt-1 text-right opacity-70 font-bold uppercase">
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <button 
                        onClick={handleSend} 
                        className="bg-pink-600 text-white p-4 rounded-2xl shadow-lg hover:bg-pink-700 active:scale-90 transition-all"
                    >
                        <FaPaperPlane size={18} />
                    </button>
                </div>

                {/* Modals */}
                {showReviewModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
                            <button onClick={() => setShowReviewModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors"><FaTimes size={20}/></button>
                            <h3 className="text-2xl font-black text-gray-800 mb-1 uppercase tracking-tighter">Rate Dealer</h3>
                            <div className="flex justify-center gap-3 my-6">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <FaStar key={s} onClick={() => setRating(s)} className={`text-4xl cursor-pointer transition-all hover:scale-110 ${rating >= s ? "text-yellow-400" : "text-gray-200"}`} />
                                ))}
                            </div>
                            <textarea className="w-full border rounded-2xl p-4 text-sm bg-gray-50 h-28 mb-6 outline-none focus:border-pink-500 font-medium resize-none" placeholder="Bataein kaisa raha experience..." value={comment} onChange={(e) => setComment(e.target.value)} />
                            <button onClick={submitReview} className="w-full bg-pink-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-pink-700 active:scale-[0.98] transition-all">SUBMIT FEEDBACK</button>
                        </div>
                    </div>
                )}

                {showReportModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[110] p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative animate-in zoom-in duration-300">
                            <button onClick={() => setShowReportModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors"><FaTimes size={20}/></button>
                            <h3 className="text-2xl font-black text-gray-800 mb-1 text-center uppercase tracking-tighter">Report User</h3>
                            <select className="w-full border rounded-2xl p-4 mt-4 text-sm bg-gray-50 outline-none focus:border-red-500 mb-4 font-bold" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                                <option value="Scam/Fraud">Scam/Fraud</option>
                                <option value="Abusive Behavior">Abusive Behavior</option>
                                <option value="Fake Product">Fake Product</option>
                                <option value="Inappropriate Content">Inappropriate Content</option>
                                <option value="Other">Other</option>
                            </select>
                            <textarea className="w-full border rounded-2xl p-4 text-sm outline-none focus:border-red-500 bg-gray-50 h-28 mb-6 font-medium resize-none" placeholder="Wajah batayein..." value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} />
                            <button onClick={submitReport} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-red-700 active:scale-[0.98] transition-all">SUBMIT REPORT</button>
                        </div>
                    </div>
                )}

                {adPreviewModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl relative p-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setAdPreviewModal(null)} className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-red-500 hover:text-white transition-all"><FaTimes size={20} /></button>
                            <div className="grid md:grid-cols-2 gap-8 mt-4">
                                <img src={adPreviewModal.images?.[0] || "https://via.placeholder.com/300"} className="w-full h-80 object-cover rounded-3xl shadow-lg border-4 border-gray-50" alt="ad-preview" />
                                <div className="space-y-4">
                                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">{adPreviewModal.title}</h2>
                                    <p className="text-4xl font-black text-pink-600">Rs {adPreviewModal.price?.toLocaleString()}</p>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 italic font-medium text-gray-600 leading-relaxed shadow-inner">
                                        "{adPreviewModal.description}"
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{adPreviewModal.condition}</span>
                                        <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{adPreviewModal.category}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;