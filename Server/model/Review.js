import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Buyer ID is required']
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller ID is required']
    },
    adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
        required: [true, 'Ad ID is required']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

reviewSchema.index({ sellerId: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;