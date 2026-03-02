import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperPlane, FaArrowLeft, FaStar, FaFlag, FaTimes } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import toast from 'react-hot-toast';

const socket = io.connect("http://localhost:8000");

const ChatRoom = ({ user }) => {
    const { conversationId } = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [allMessages, setAllMessages] = useState([]);
    const [chatData, setChatData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [lastSeen, setLastSeen] = useState(null);
    const scrollRef = useRef();

    // Modals Visibility
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Form States
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [reportReason, setReportReason] = useState("Scam/Fraud");
    const [reportDesc, setReportDesc] = useState("");

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
                const res = await axios.get(`http://localhost:8000/api/chat/history/${conversationId}`, {
                    headers: { Authorization: `Bearer ${user?.accessToken}` }
                });
                setChatData(res.data);
                setAllMessages(res.data.chat.messages || []);
                socket.emit("join_chat", conversationId);
                socket.emit("user_online", user.uid);
                socket.emit("message_seen", { chatId: conversationId, userId: user.uid });
                const other = res.data.users?.find(u => u.uid !== user?.uid);
                if (other) { setIsOnline(other.isOnline); setLastSeen(other.lastSeen); }
            } catch (err) { console.error("Chat Error:", err); }
        };
        if (user) fetchHistory();
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
                setIsOnline(data.isOnline); setLastSeen(data.lastSeen);
            }
        });
        return () => { socket.off("receive_message"); socket.off("status_change"); };
    }, [conversationId, chatData, user]);

    useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [allMessages]);

    const handleSend = () => {
        if (!message.trim()) return;
        socket.emit("send_message", { chatId: conversationId, senderId: user.uid, message, timestamp: new Date(), isRead: false });
        setMessage("");
    };

    // ⭐ SAFE SUBMIT REVIEW
    const submitReview = async () => {
        if (!comment.trim()) return toast.error("Kuch likh toh dein!");
        
        const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
        // Safety check for Ad ID
        const adIdToSubmit = chatData?.chat?.adId?._id || chatData?.chat?.adId;

        if (!adIdToSubmit) return toast.error("Is chat ke saath koi valid Ad link nahi hai.");

        try {
            await axios.post(`http://localhost:8000/api/reviews`, {
                sellerId: otherUser.uid, 
                adId: adIdToSubmit, 
                rating, 
                comment
            }, { headers: { Authorization: `Bearer ${user.accessToken}` } });
            
            toast.success("Review post ho gaya!");
            setShowReviewModal(false);
            setComment("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Review save nahi ho saka.");
        }
    };

    // 🚩 SAFE SUBMIT REPORT
    const submitReport = async () => {
        if (!reportDesc.trim()) return toast.error("Wajah likhein!");
        
        const otherUser = chatData?.users?.find(u => u.uid !== user?.uid);
        const adIdToSubmit = chatData?.chat?.adId?._id || chatData?.chat?.adId;

        if (!adIdToSubmit) return toast.error("Ad ID missing hai.");

        try {
            await axios.post(`http://localhost:8000/api/reports`, {
                reportedUserId: otherUser.uid, 
                adId: adIdToSubmit, 
                reason: reportReason, 
                description: reportDesc
            }, { headers: { Authorization: `Bearer ${user.accessToken}` } });
            
            toast.success("Report bhej di gayi.");
            setShowReportModal(false);
            setReportDesc("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Report fail ho gayi.");
        }
    };

    if (!chatData) return <div className="h-screen flex items-center justify-center font-bold text-pink-600">Loading...</div>;

    const otherUser = chatData.users?.find(u => u.uid !== user?.uid);
    const ad = chatData.chat?.adId;

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center md:p-4">
            <div className="w-full max-w-4xl bg-white flex flex-col h-screen md:h-[90vh] border shadow-2xl relative md:rounded-3xl overflow-hidden">
                {/* Header Section */}
                <div className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
                    <div className="flex items-center min-w-0">
                        <FaArrowLeft className="mr-4 cursor-pointer text-gray-500 hover:text-pink-600 transition-all" onClick={() => navigate(-1)}/>
                        <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-full flex items-center justify-center text-white font-black shadow-md">
                                {otherUser?.name?.charAt(0).toUpperCase()}
                            </div>
                            {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                        </div>
                        <div className="ml-3 truncate">
                            <h3 className="font-bold text-gray-800 text-sm leading-tight truncate">{otherUser?.name}</h3>
                            <p className="text-[10px] text-gray-500 font-medium">
                                {isOnline ? "Online Now" : formatLastSeen(lastSeen)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowReviewModal(true)} className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full border border-yellow-200 text-[10px] font-black uppercase hover:bg-yellow-100 transition-all">
                            <FaStar /> <span className="hidden sm:inline">Rate</span>
                        </button>
                        <button onClick={() => setShowReportModal(true)} className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full border border-red-100 text-[10px] font-black uppercase hover:bg-red-100 transition-all">
                            <FaFlag /> <span className="hidden sm:inline">Report</span>
                        </button>
                    </div>
                </div>

                {/* Ad Strip Section */}
                {ad && (
                    <div className="p-2 border-b bg-gray-50 flex items-center justify-between px-4">
                        <div className="flex items-center min-w-0">
                            <img src={ad.images?.[0]} className="w-12 h-12 rounded-lg object-cover border" alt="" />
                            <div className="ml-3 overflow-hidden">
                                <h4 className="font-bold text-[11px] text-gray-700 truncate">{ad.title}</h4>
                                <p className="text-pink-600 font-black text-xs">Rs {ad.price?.toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => navigate(`/`, { state: { openAdId: ad._id } })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all">
                            View Ad
                        </button>
                    </div>
                )}

                {/* Messages Area Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {allMessages.map((m, i) => (
                        <div key={i} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 px-4 rounded-2xl max-w-[80%] text-sm shadow-sm ${m.senderId === user?.uid ? 'bg-pink-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                                <p className="leading-relaxed font-medium">{m.message}</p>
                                <p className={`text-[8px] mt-1 text-right opacity-70`}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
                
                {/* Input Area Section */}
                <div className="p-4 bg-white border-t flex items-center gap-3">
                    <input className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 text-sm outline-none bg-gray-50 focus:border-pink-500 transition-all" placeholder="Message likhein..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} />
                    <button onClick={handleSend} className="bg-pink-600 text-white p-4 rounded-2xl shadow-lg active:scale-90">
                        <FaPaperPlane className="text-sm" />
                    </button>
                </div>

                {/* ⭐ REVIEW MODAL */}
                {showReviewModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
                            <button onClick={() => setShowReviewModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-red-500"><FaTimes size={20}/></button>
                            <h3 className="text-2xl font-black text-gray-800 mb-1">Rate Dealer</h3>
                            <div className="flex justify-center gap-3 my-6">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <FaStar key={s} onClick={() => setRating(s)} className={`text-4xl cursor-pointer transition-all ${rating >= s ? "text-yellow-400" : "text-gray-200"}`} />
                                ))}
                            </div>
                            <textarea className="w-full border rounded-2xl p-4 text-sm outline-none focus:border-pink-500 bg-gray-50 h-28 mb-6" placeholder="Bataein kaisa raha experience..." value={comment} onChange={(e) => setComment(e.target.value)} />
                            <button onClick={submitReview} className="w-full bg-pink-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">SUBMIT FEEDBACK</button>
                        </div>
                    </div>
                )}

                {/* 🚩 REPORT MODAL */}
                {showReportModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                        <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
                            <button onClick={() => setShowReportModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-red-500"><FaTimes size={20}/></button>
                            <h3 className="text-2xl font-black text-gray-800 mb-1">Report User</h3>
                            <select className="w-full border rounded-2xl p-4 mt-4 text-sm bg-gray-50 outline-none focus:border-red-500 mb-4" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                                <option value="Scam/Fraud">Scam/Fraud</option>
                                <option value="Abusive Behavior">Abusive Behavior</option>
                                <option value="Fake Product">Fake Product</option>
                                <option value="Inappropriate Content">Inappropriate Content</option>
                                <option value="Other">Other</option>
                            </select>
                            <textarea className="w-full border rounded-2xl p-4 text-sm outline-none focus:border-red-500 bg-gray-50 h-28 mb-6" placeholder="Wajah batayein..." value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} />
                            <button onClick={submitReport} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">SUBMIT REPORT</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;