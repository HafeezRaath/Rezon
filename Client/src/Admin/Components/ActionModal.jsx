import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    FaExclamationTriangle, 
    FaBan, 
    FaEyeSlash, 
    FaTrash, 
    FaPauseCircle, 
    FaCheckCircle,
    FaTimes,
    FaSpinner,
    FaEnvelope,
    FaShieldAlt
} from 'react-icons/fa';

const ActionModal = ({ type, report, onClose, onConfirm }) => {
    const [duration, setDuration] = useState('3');
    const [reason, setReason] = useState('');
    const [notifyUser, setNotifyUser] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Reset state when modal opens
    useEffect(() => {
        if (type) {
            setDuration('3');
            setReason('');
            setNotifyUser(true);
            setErrors({});
            setLoading(false);
        }
    }, [type]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !loading) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose, loading]);

    // Click outside to close
    const handleBackdropClick = useCallback((e) => {
        if (e.target === e.currentTarget && !loading) {
            onClose();
        }
    }, [onClose, loading]);

    const actionConfig = {
        WARN: {
            title: "Send Warning",
            icon: <FaExclamationTriangle className="text-2xl" />,
            desc: `Send warning to ${report?.reportedUserId?.name || 'user'}`,
            showDuration: false,
            color: "amber",
            confirmText: "Send Warning",
            requiresReason: true,
            minReasonLength: 10
        },
        SUSPEND: {
            title: "Suspend User",
            icon: <FaPauseCircle className="text-2xl" />,
            desc: "Temporarily suspend user account",
            showDuration: true,
            color: "purple",
            confirmText: "Suspend Account",
            requiresReason: true,
            minReasonLength: 15
        },
        DELETE_AD: {
            title: "Delete Advertisement",
            icon: <FaTrash className="text-2xl" />,
            desc: "This ad will be permanently deleted",
            showDuration: false,
            color: "rose",
            confirmText: "Delete Ad",
            requiresReason: false,
            minReasonLength: 0
        },
        BAN: {
            title: "Permanent Ban",
            icon: <FaBan className="text-2xl" />,
            desc: `Permanently ban ${report?.reportedUserId?.name || 'user'}`,
            showDuration: false,
            color: "red",
            confirmText: "Ban Permanently",
            requiresReason: true,
            minReasonLength: 20,
            dangerConfirm: true
        },
        HIDE_AD: {
            title: "Hide Ad Temporarily",
            icon: <FaEyeSlash className="text-2xl" />,
            desc: "Ad will be hidden from public view",
            showDuration: false,
            color: "orange",
            confirmText: "Hide Ad",
            requiresReason: false,
            minReasonLength: 0
        }
    };

    const config = actionConfig[type];

    if (!type || !config) return null;

    const validate = () => {
        const newErrors = {};
        
        if (config.requiresReason && reason.trim().length < config.minReasonLength) {
            newErrors.reason = `Reason must be at least ${config.minReasonLength} characters`;
        }
        
        if (config.showDuration && !duration) {
            newErrors.duration = "Please select a duration";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = async () => {
        if (!validate()) return;

        // Double confirmation for dangerous actions
        if (config.dangerConfirm) {
            const confirmed = window.confirm(
                `⚠️ WARNING: This will PERMANENTLY ban ${report?.reportedUserId?.name || 'this user'}.\n\nThis action cannot be undone. Are you absolutely sure?`
            );
            if (!confirmed) return;
        }

        setLoading(true);
        
        try {
            await onConfirm({
                actionType: type,
                duration: config.showDuration ? parseInt(duration) : null,
                reason: reason.trim() || `Admin action: ${type}`,
                notifyUser,
                reportId: report?._id,
                userId: report?.reportedUserId?._id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error("Action failed:", error);
            setErrors({ submit: "Failed to execute action. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Dark theme color classes
    const colorClasses = {
        amber: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            icon: 'text-amber-400',
            button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
            text: 'text-amber-400',
            glow: 'shadow-amber-500/10'
        },
        purple: {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/30',
            icon: 'text-purple-400',
            button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20',
            text: 'text-purple-400',
            glow: 'shadow-purple-500/10'
        },
        rose: {
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            icon: 'text-rose-400',
            button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
            text: 'text-rose-400',
            glow: 'shadow-rose-500/10'
        },
        red: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            icon: 'text-red-400',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20',
            text: 'text-red-400',
            glow: 'shadow-red-500/10'
        },
        orange: {
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            icon: 'text-orange-400',
            button: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
            text: 'text-orange-400',
            glow: 'shadow-orange-500/10'
        }
    };

    const theme = colorClasses[config.color];

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`bg-slate-900 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border ${theme.border} ${theme.glow} relative`}>
                {/* Close Button */}
                <button 
                    onClick={() => !loading && onClose()}
                    disabled={loading}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    <FaTimes />
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-4 rounded-xl ${theme.bg} ${theme.icon} border ${theme.border}`}>
                        {config.icon}
                    </div>
                    <div>
                        <h3 id="modal-title" className={`text-xl font-black ${theme.text} uppercase tracking-tight`}>
                            {config.title}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">{config.desc}</p>
                    </div>
                </div>

                {/* Error Display */}
                {errors.submit && (
                    <div className="mb-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                        <FaExclamationTriangle />
                        {errors.submit}
                    </div>
                )}

                {/* Duration Selector */}
                {config.showDuration && (
                    <div className="mb-5">
                        <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">
                            Suspension Duration
                        </label>
                        <select 
                            value={duration} 
                            onChange={(e) => {
                                setDuration(e.target.value);
                                setErrors(prev => ({ ...prev, duration: null }));
                            }}
                            disabled={loading}
                            className={`w-full p-3.5 bg-slate-800 border-2 rounded-xl outline-none transition-all font-medium text-slate-200 ${
                                errors.duration ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-purple-500'
                            }`}
                        >
                            <option value="1">1 Day</option>
                            <option value="3">3 Days</option>
                            <option value="7">1 Week</option>
                            <option value="15">15 Days</option>
                            <option value="30">1 Month</option>
                            <option value="90">3 Months</option>
                        </select>
                        {errors.duration && (
                            <p className="text-rose-400 text-xs mt-2 font-medium">{errors.duration}</p>
                        )}
                    </div>
                )}

                {/* Reason Input */}
                <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                            Reason / Message
                            {config.requiresReason && <span className="text-rose-400 ml-1">*</span>}
                        </label>
                        <span className={`text-xs font-bold ${reason.length < config.minReasonLength ? 'text-slate-500' : 'text-emerald-400'}`}>
                            {reason.length}/{config.minReasonLength}
                        </span>
                    </div>
                    <textarea
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setErrors(prev => ({ ...prev, reason: null }));
                        }}
                        disabled={loading}
                        className={`w-full p-3.5 bg-slate-800 border-2 rounded-xl outline-none transition-all resize-none text-slate-200 placeholder:text-slate-600 ${
                            errors.reason ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-emerald-500'
                        }`}
                        rows="3"
                        placeholder={config.requiresReason ? "Explain why this action is being taken..." : "Optional message to user..."}
                    />
                    {errors.reason && (
                        <p className="text-rose-400 text-xs mt-2 font-medium">{errors.reason}</p>
                    )}
                </div>

                {/* Notify Checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer group p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all">
                    <div className="relative flex items-center mt-0.5">
                        <input 
                            type="checkbox" 
                            checked={notifyUser} 
                            onChange={(e) => setNotifyUser(e.target.checked)}
                            disabled={loading}
                            className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500/20 transition-all cursor-pointer"
                        />
                        {notifyUser && (
                            <FaCheckCircle className="absolute inset-0 m-auto text-emerald-500 text-xs pointer-events-none" />
                        )}
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
                            <FaEnvelope className="text-slate-500" />
                            Notify user via Email/App
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                            User will receive notification about this action
                        </p>
                    </div>
                </label>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="flex-1 py-3.5 border-2 border-slate-700 rounded-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50 uppercase tracking-wider text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider text-sm ${theme.button}`}
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" />
                                Processing...
                            </>
                        ) : (
                            config.confirmText
                        )}
                    </button>
                </div>

                {/* Report Info Footer */}
                {report && (
                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-mono">ID: {report._id?.slice(-8)}</span>
                            {report.createdAt && (
                                <span>Submitted: {new Date(report.createdAt).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ActionModal;