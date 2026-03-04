import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Admin panel search fast karne ke liye
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
    evidenceImage: {
        type: String 
    }
}, { timestamps: true });

// ✅ Composite index: Pending reports ko date ke mutabiq dekhne ke liye
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;