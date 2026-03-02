import mongoose from 'mongoose'; // Change 'require' to 'import'

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad'
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
        ]
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['Pending', 'Resolved', 'Dismissed'],
        default: 'Pending'
    },
    evidenceImage: {
        type: String 
    }
}, { timestamps: true });

// Change module.exports to export default
const Report = mongoose.model('Report', reportSchema);
export default Report;