import React, { useState, useEffect, useCallback } from "react";
import { FaStar } from "react-icons/fa";

const StarRating = ({ 
    totalStars = 5, 
    onRatingSelect, 
    initialRating = 0, 
    readOnly = false,
    size = "md", // sm, md, lg
    showLabel = true
}) => {
    const [rating, setRating] = useState(initialRating);
    const [hover, setHover] = useState(0);

    // 🔧 FIXED: Sync with external rating changes
    useEffect(() => {
        setRating(initialRating);
    }, [initialRating]);

    const handleRating = useCallback((value) => {
        if (readOnly) return;
        setRating(value);
        onRatingSelect?.(value);
    }, [readOnly, onRatingSelect]);

    const handleKeyDown = useCallback((e, value) => {
        if (readOnly) return;
        
        let newRating = rating;
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault();
                newRating = Math.max(1, rating - 1);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault();
                newRating = Math.min(totalStars, rating + 1);
                break;
            case 'Home':
                e.preventDefault();
                newRating = 1;
                break;
            case 'End':
                e.preventDefault();
                newRating = totalStars;
                break;
            default:
                return;
        }
        
        setRating(newRating);
        onRatingSelect?.(newRating);
    }, [readOnly, rating, totalStars, onRatingSelect]);

    // Size classes
    const sizeClasses = {
        sm: "text-sm",
        md: "text-2xl",
        lg: "text-4xl"
    };

    const displayRating = hover || rating || initialRating;
    const currentSize = readOnly && size === "md" ? "text-lg" : sizeClasses[size];

    return (
        <div 
            className={`flex items-center gap-1 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
            role={readOnly ? "img" : "radiogroup"}
            aria-label={readOnly ? `Rated ${rating} out of ${totalStars} stars` : "Star rating"}
        >
            {[...Array(totalStars)].map((_, index) => {
                const starValue = index + 1;
                const isFilled = starValue <= displayRating;
                
                return (
                    <button
                        key={starValue}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleRating(starValue)}
                        onMouseEnter={() => !readOnly && setHover(starValue)}
                        onMouseLeave={() => !readOnly && setHover(0)}
                        onKeyDown={(e) => handleKeyDown(e, starValue)}
                        className={`
                            relative transition-all duration-200 focus:outline-none
                            ${!readOnly ? "hover:scale-110 focus:scale-110" : ""}
                            ${readOnly ? "cursor-default" : "cursor-pointer"}
                            ${currentSize}
                        `}
                        aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
                        aria-pressed={!readOnly && rating === starValue}
                        tabIndex={readOnly ? -1 : 0}
                    >
                        <FaStar
                            className={`
                                transition-colors duration-200
                                ${isFilled ? "text-yellow-400" : "text-slate-300"}
                                ${!readOnly && "drop-shadow-sm"}
                            `}
                        />
                        
                        {/* 🔧 FIXED: Screen reader only text */}
                        <span className="sr-only">
                            {isFilled ? "Filled star" : "Empty star"}
                        </span>
                    </button>
                );
            })}
            
            {/* Rating Label */}
            {showLabel && !readOnly && rating > 0 && (
                <span className="ml-2 text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {rating} / {totalStars}
                </span>
            )}
            
            {showLabel && readOnly && initialRating > 0 && (
                <span className="ml-1 text-xs font-black text-slate-500 uppercase tracking-tighter">
                    ({initialRating})
                </span>
            )}
        </div>
    );
};

export default StarRating;