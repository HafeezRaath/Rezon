import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    reportedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
        index: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            'Scam/Fraud', 
            'Abusive Behavior', 
            'Fake Product', 
            'Inappropriate Content', 
            'Spam', 
            'Other'
        ],
        index: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['Pending', 'Resolved', 'Dismissed'],
        default: 'Pending',
        index: true
    },
    // Multiple evidence images
    evidenceImages: [{ type: String }],
    
    // Admin action tracking
    adminAction: {
        action: { 
            type: String, 
            enum: ['Warned', 'Suspended', 'Banned', 'Ad Removed', 'Dismissed', 'None'],
            default: 'None'
        },
        comment: { type: String, maxlength: 500 },
        takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        takenAt: { type: Date }
    }

}, { timestamps: true });

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUserId: 1, status: 1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;