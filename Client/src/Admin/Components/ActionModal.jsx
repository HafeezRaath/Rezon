import React, { useState } from 'react';

const ActionModal = ({ type, report, onClose, onConfirm }) => {
    const [duration, setDuration] = useState('3');
    const [reason, setReason] = useState('');
    const [notifyUser, setNotifyUser] = useState(true);

    if (!type) return null;

    const actionConfig = {
        WARN: {
            title: "⚠️ Send Warning",
            desc: `${report.reportedUserId?.name} ko warning message bhejo`,
            showDuration: false,
            color: "yellow"
        },
        SUSPEND: {
            title: "⏸️ Suspend User",
            desc: "Kitne din ke liye account suspend karna hai?",
            showDuration: true,
            color: "purple"
        },
        DELETE_AD: {
            title: "🗑️ Delete Advertisement",
            desc: "Yeh ad permanently delete ho jayegi",
            showDuration: false,
            color: "red"
        },
        BAN: {
            title: "🚫 Permanent Ban",
            desc: `${report.reportedUserId?.name} ko permanently ban karna hai?`,
            showDuration: false,
            color: "red"
        },
        HIDE_AD: {
            title: "🙈 Hide Ad Temporarily",
            desc: "Ad ko temporarily hide karo (baad mein unhide ho sakti hai)",
            showDuration: false,
            color: "orange"
        }
    };

    const config = actionConfig[type];

    const handleConfirm = () => {
        onConfirm({
            actionType: type,
            duration: config.showDuration ? parseInt(duration) : null,
            reason,
            notifyUser
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-2 text-gray-800">{config.title}</h3>
                <p className="text-gray-600 mb-4">{config.desc}</p>
                
                {config.showDuration && (
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-gray-700">
                            Duration:
                        </label>
                        <select 
                            value={duration} 
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="1">1 Day</option>
                            <option value="3">3 Days</option>
                            <option value="7">7 Days</option>
                            <option value="15">15 Days</option>
                            <option value="30">30 Days</option>
                        </select>
                    </div>
                )}
                
                <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-700">
                        Reason/Message:
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows="3"
                        placeholder="User ko kya batana hai..."
                    />
                </div>
                
                <label className="flex items-center gap-2 mb-6 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={notifyUser}
                        onChange={(e) => setNotifyUser(e.target.checked)}
                        className="w-4 h-4"
                    />
                    <span className="text-gray-700">User ko email/app notification bhejo</span>
                </label>
                
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold text-white ${
                            config.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
                            config.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                            config.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                            'bg-orange-600 hover:bg-orange-700'
                        }`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionModal;