import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const ReviewCard = ({ review }) => {
  // Agar review data na ho to empty return karein
  if (!review) return null;

  // Stars generate karne ka function
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {/* Buyer ka Initial ya Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            {review.reviewerName?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm leading-tight">
              {review.reviewerName || "Anonymous Buyer"}
            </h4>
            <div className="flex mt-1 text-xs">
              {renderStars(review.rating)}
            </div>
          </div>
        </div>
        
        {/* Date (Optional) */}
        <span className="text-[10px] text-gray-400 font-medium">
          {review.date || "2 days ago"}
        </span>
      </div>

      {/* Review Text */}
      <p className="text-gray-600 text-sm italic leading-relaxed pl-1">
        "{review.comment}"
      </p>
    </div>
  );
};

export default ReviewCard;