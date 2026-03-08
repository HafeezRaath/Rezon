import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const CategoryCard = ({ title, Icon, iconColor = "text-slate-600", bgColor = "bg-white", link, disabled = false }) => {
  const navigate = useNavigate();

  // 🔧 FIXED: Stable callback
  const handleClick = useCallback(() => {
    if (link && !disabled) {
      navigate(link);
    }
  }, [link, disabled, navigate]);

  // 🔧 FIXED: Keyboard handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const isClickable = link && !disabled;

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : "presentation"}
      tabIndex={isClickable ? 0 : -1}
      aria-label={isClickable ? `Browse ${title}` : undefined}
      aria-disabled={disabled}
      className={`
        rounded-xl p-4 w-full shadow-sm transition-all duration-300 flex flex-col justify-between items-center min-h-[160px]
        ${bgColor}
        ${isClickable 
          ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-95' 
          : 'cursor-default opacity-60 grayscale'
        }
        ${disabled ? 'pointer-events-none' : ''}
      `}
    >
      {/* Icon Container */}
      <div className={`
        w-16 h-16 rounded-full flex items-center justify-center mb-3
        ${isClickable ? 'bg-white/50' : 'bg-slate-100'}
      `}>
        <Icon className={`text-4xl ${iconColor} transition-transform duration-300 ${isClickable ? 'group-hover:scale-110' : ''}`} />
      </div>
      
      {/* Title */}
      <h3 className="font-bold text-sm text-center text-slate-800 leading-tight px-2">
        {title}
      </h3>
      
      {/* 🔧 ADDED: Subtle indicator for clickable cards */}
      {isClickable && (
        <div className="mt-2 w-8 h-1 rounded-full bg-slate-200 group-hover:bg-emerald-400 transition-colors" />
      )}
    </div>
  );
};

export default CategoryCard;