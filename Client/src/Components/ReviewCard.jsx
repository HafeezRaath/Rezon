import React, { useMemo } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const ReviewCard = ({ review }) => {
  // Agar review data na ho to empty return karein
  if (!review) return null;

  // 🔧 FIXED: useMemo for stars calculation
  const stars = useMemo(() => {
    const starElements = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= review.rating;
      starElements.push(
        <span 
          key={i} 
          className={isFilled ? "text-yellow-400" : "text-slate-300"}
          aria-label={isFilled ? "Filled star" : "Empty star"}
        >
          {isFilled ? <FaStar /> : <FaRegStar />}
        </span>
      );
    }
    return starElements;
  }, [review.rating]);

  // Buyer ka naam handle karna
  const displayName = review.buyerId?.name || review.reviewerName || "Anonymous Buyer";
  const itemTitle = review.adId?.title || null;
  
  // 🔧 FIXED: Consistent date formatting
  const formattedDate = useMemo(() => {
    if (!review.createdAt && !review.date) return "Recent";
    
    const date = review.createdAt ? new Date(review.createdAt) : new Date(review.date);
    
    // Consistent format: "Jan 15, 2024"
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [review.createdAt, review.date]);

  // Initials calculation
  const initial = useMemo(() => {
    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          {/* 🔧 FIXED: Emerald gradient instead of orange-pink */}
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-sm"
            aria-hidden="true"
          >
            {initial}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm leading-tight">
              {displayName}
            </h4>
            {/* 🔧 FIXED: Stars with aria-label */}
            <div 
              className="flex gap-0.5 mt-1 text-xs"
              role="img" 
              aria-label={`Rated ${review.rating} out of 5 stars`}
            >
              {stars}
            </div>
          </div>
        </div>
        
        {/* Date */}
        <time 
          className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter"
          dateTime={review.createdAt || review.date}
        >
          {formattedDate}
        </time>
      </div>

      {/* Review Text */}
      <blockquote className="text-slate-600 text-sm italic leading-relaxed pl-1 border-l-2 border-emerald-200 ml-1">
        "{review.comment}"
      </blockquote>

      {/* Item Title */}
      {itemTitle && (
        <p className="text-[10px] text-emerald-600 font-bold mt-3 uppercase tracking-tight flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Bought: {itemTitle}
        </p>
      )}
    </div>
  );
};

export default ReviewCard;