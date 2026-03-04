import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Buyer ID is required'],
        index: true // Atlas search optimization ke liye
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
    }
}, {
    timestamps: true
});

// ✅ Seller profile par reviews fast load karne ke liye index
reviewSchema.index({ sellerId: 1, createdAt: -1 });

// ✅ Prevent Duplicate Reviews: Aik buyer aik ad par aik hi review de sakay
reviewSchema.index({ buyerId: 1, adId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;