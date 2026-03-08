import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Buyer ID is required'],
        index: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller ID is required'],
        index: true
    },
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
        required: [true, 'Ad ID is required'],
        index: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5,
        index: true
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    // Optional: Anonymous review
    isAnonymous: {
        type: Boolean,
        default: false
    },
    // Optional: Seller reply
    sellerReply: {
        comment: { type: String, maxlength: 500 },
        repliedAt: { type: Date }
    }
}, {
    timestamps: true
});

// Indexes
reviewSchema.index({ sellerId: 1, createdAt: -1 });
reviewSchema.index({ buyerId: 1, adId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;