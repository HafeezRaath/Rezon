import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

const StarRating = ({ totalStars = 5, onRatingSelect }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleRating = (value) => {
    setRating(value);
    if (onRatingSelect) {
      onRatingSelect(value); // Ye function parent component (AdDetails) ko rating pass karega
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <label key={starValue} className="relative cursor-pointer transition-transform hover:scale-110">
            <input
              type="radio"
              name="rating"
              className="hidden"
              value={starValue}
              onClick={() => handleRating(starValue)}
            />
            <FaStar
              className={`text-2xl transition-colors duration-200 ${
                starValue <= (hover || rating) ? "text-yellow-400" : "text-gray-300"
              }`}
              onMouseEnter={() => setHover(starValue)}
              onMouseLeave={() => setHover(0)}
            />
          </label>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm font-semibold text-gray-600">
          {rating} / {totalStars}
        </span>
      )}
    </div>
  );
};

export default StarRating;