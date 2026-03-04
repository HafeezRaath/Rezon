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
    FaEnvelope
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
            color: "yellow",
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
            color: "red",
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
                `WARNING: This will PERMANENTLY ban ${report?.reportedUserId?.name || 'this user'}.\n\nThis action cannot be undone. Are you absolutely sure?`
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

    const colorClasses = {
        yellow: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            icon: 'text-yellow-600',
            button: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200',
            text: 'text-yellow-900'
        },
        purple: {
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            icon: 'text-purple-600',
            button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
            text: 'text-purple-900'
        },
        red: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-200',
            text: 'text-red-900'
        },
        orange: {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            icon: 'text-orange-600',
            button: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200',
            text: 'text-orange-900'
        }
    };

    const theme = colorClasses[config.color];

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-2 ${theme.border} relative`}>
                {/* Close Button */}
                <button 
                    onClick={() => !loading && onClose()}
                    disabled={loading}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                    <FaTimes />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-2xl ${theme.bg} ${theme.icon}`}>
                        {config.icon}
                    </div>
                    <div>
                        <h3 id="modal-title" className={`text-xl font-bold ${theme.text}`}>
                            {config.title}
                        </h3>
                        <p className="text-gray-500 text-sm mt-0.5">{config.desc}</p>
                    </div>
                </div>

                {/* Error Display */}
                {errors.submit && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                        <FaExclamationTriangle />
                        {errors.submit}
                    </div>
                )}

                {/* Duration Selector */}
                {config.showDuration && (
                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Suspension Duration
                        </label>
                        <select 
                            value={duration} 
                            onChange={(e) => {
                                setDuration(e.target.value);
                                setErrors(prev => ({ ...prev, duration: null }));
                            }}
                            disabled={loading}
                            className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all font-medium ${
                                errors.duration ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-purple-500'
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
                            <p className="text-red-500 text-xs mt-1">{errors.duration}</p>
                        )}
                    </div>
                )}

                {/* Reason Input */}
                <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Reason / Message
                            {config.requiresReason && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <span className={`text-xs ${reason.length < config.minReasonLength ? 'text-gray-400' : 'text-green-500'}`}>
                            {reason.length}/{config.minReasonLength} chars
                        </span>
                    </div>
                    <textarea
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setErrors(prev => ({ ...prev, reason: null }));
                        }}
                        disabled={loading}
                        className={`w-full p-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all resize-none ${
                            errors.reason ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                        rows="3"
                        placeholder={config.requiresReason ? "Explain why this action is being taken..." : "Optional message to user..."}
                    />
                    {errors.reason && (
                        <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
                    )}
                </div>

                {/* Notify Checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input 
                            type="checkbox" 
                            checked={notifyUser} 
                            onChange={(e) => setNotifyUser(e.target.checked)}
                            disabled={loading}
                            className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                        {notifyUser && (
                            <FaCheckCircle className="absolute inset-0 m-auto text-blue-600 text-xs pointer-events-none" />
                        )}
                    </div>
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors flex items-center gap-2">
                            <FaEnvelope className="text-gray-400" />
                            Notify user via Email/App
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                            User will receive notification about this action
                        </p>
                    </div>
                </label>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className="flex-1 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`flex-1 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${theme.button}`}
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
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            Report ID: <span className="font-mono">{report._id?.slice(-8)}</span>
                            {report.createdAt && (
                                <> • Submitted: {new Date(report.createdAt).toLocaleDateString()}</>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ActionModal;