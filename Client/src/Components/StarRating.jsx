import React, { useState } from "react";
import { FaStar } from "react-icons/fa";

const StarRating = ({ totalStars = 5, onRatingSelect, initialRating = 0, readOnly = false }) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleRating = (value) => {
    if (readOnly) return; // Agar readOnly hai toh click kaam nahi karega
    setRating(value);
    if (onRatingSelect) {
      onRatingSelect(value); // Ye logic AdDetails ya Review modal ko data bhejega
    }
  };

  return (
    <div className={`flex items-center gap-1 ${readOnly ? "cursor-default" : "cursor-pointer"}`}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <label key={starValue} className={`relative transition-transform ${!readOnly && "hover:scale-110 cursor-pointer"}`}>
            {!readOnly && (
              <input
                type="radio"
                name="rating"
                className="hidden"
                value={starValue}
                onClick={() => handleRating(starValue)}
              />
            )}
            <FaStar
              className={`transition-colors duration-200 ${
                starValue <= (hover || rating || initialRating) ? "text-yellow-400" : "text-gray-300"
              } ${readOnly ? "text-lg" : "text-2xl"}`}
              onMouseEnter={() => !readOnly && setHover(starValue)}
              onMouseLeave={() => !readOnly && setHover(0)}
            />
          </label>
        );
      })}
      
      {/* Label logic: Edit mode mein (e.g. 4/5) aur readOnly mein sirf number */}
      {!readOnly && rating > 0 && (
        <span className="ml-2 text-sm font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
          {rating} / {totalStars}
        </span>
      )}
      
      {readOnly && initialRating > 0 && (
        <span className="ml-1 text-xs font-black text-gray-500 uppercase tracking-tighter">
          ({initialRating})
        </span>
      )}
    </div>
  );
};

export default StarRating;