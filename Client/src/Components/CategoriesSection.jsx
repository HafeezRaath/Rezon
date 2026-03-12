import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaMobileAlt, FaCar, FaHome, FaBuilding, FaTv, FaMotorcycle, 
    FaIndustry, FaHandshake, FaBriefcase, FaPaw, FaChair, 
    FaTshirt, FaBookOpen, FaChild, FaArrowRight, FaFire, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

// 🔥 REDESIGNED: Modern category data with unified Emerald accents
const categories = [
    { 
        title: 'Mobiles', 
        Icon: FaMobileAlt, 
        code: 'Mobile', 
        link: '/category/mobile',
        description: 'Smartphones & Tablets',
        gradient: 'from-emerald-400 to-teal-500',
        shadow: 'shadow-emerald-200'
    },
    { 
        title: 'Vehicles', 
        Icon: FaCar, 
        code: 'Car', 
        link: '/category/car',
        description: 'Cars & Buses',
        gradient: 'from-blue-400 to-cyan-500',
        shadow: 'shadow-blue-200'
    },
    { 
        title: 'Property Sale', 
        Icon: FaHome, 
        code: 'PropertySale', 
        link: '/category/propertysale',
        description: 'Houses & Plots',
        gradient: 'from-violet-400 to-purple-500',
        shadow: 'shadow-violet-200'
    },
    { 
        title: 'Property Rent', 
        Icon: FaBuilding, 
        code: 'PropertyRent', 
        link: '/category/propertyrent',
        description: 'Rentals & Offices',
        gradient: 'from-fuchsia-400 to-pink-500',
        shadow: 'shadow-fuchsia-200'
    },
    { 
        title: 'Electronics', 
        Icon: FaTv, 
        code: 'Electronics', 
        link: '/category/electronics',
        description: 'TV, Laptops & More',
        gradient: 'from-amber-400 to-orange-500',
        shadow: 'shadow-amber-200'
    },
    { 
        title: 'Bikes', 
        Icon: FaMotorcycle, 
        code: 'Bikes', 
        link: '/category/bikes',
        description: 'Motorcycles & Scooters',
        gradient: 'from-rose-400 to-red-500',
        shadow: 'shadow-rose-200'
    },
    { 
        title: 'Business', 
        Icon: FaIndustry, 
        code: 'Business', 
        link: '/category/business',
        description: 'Industrial & Commercial',
        gradient: 'from-slate-400 to-gray-500',
        shadow: 'shadow-slate-200'
    },
    { 
        title: 'Services', 
        Icon: FaHandshake, 
        code: 'Services', 
        link: '/category/services',
        description: 'Plumbing, Design, etc.',
        gradient: 'from-cyan-400 to-sky-500',
        shadow: 'shadow-cyan-200'
    },
    { 
        title: 'Jobs', 
        Icon: FaBriefcase, 
        code: 'Jobs', 
        link: '/category/jobs',
        description: 'Full-time & Part-time',
        gradient: 'from-indigo-400 to-blue-500',
        shadow: 'shadow-indigo-200'
    },
    { 
        title: 'Animals', 
        Icon: FaPaw, 
        code: 'Animals', 
        link: '/category/animals',
        description: 'Pets & Livestock',
        gradient: 'from-lime-400 to-green-500',
        shadow: 'shadow-lime-200'
    },
    { 
        title: 'Furniture', 
        Icon: FaChair, 
        code: 'Furniture', 
        link: '/category/furniture',
        description: 'Home & Office',
        gradient: 'from-yellow-400 to-amber-500',
        shadow: 'shadow-yellow-200'
    },
    { 
        title: 'Fashion', 
        Icon: FaTshirt, 
        code: 'Fashion', 
        link: '/category/fashion',
        description: 'Clothing & Beauty',
        gradient: 'from-pink-400 to-rose-500',
        shadow: 'shadow-pink-200'
    },
    { 
        title: 'Books', 
        Icon: FaBookOpen, 
        code: 'Books', 
        link: '/category/books',
        description: 'Sports & Hobbies',
        gradient: 'from-teal-400 to-emerald-500',
        shadow: 'shadow-teal-200'
    },
    { 
        title: 'Kids', 
        Icon: FaChild, 
        code: 'Kids', 
        link: '/category/kids',
        description: 'Toys & Essentials',
        gradient: 'from-orange-400 to-red-400',
        shadow: 'shadow-orange-200'
    },
];

// 🔥 NEW: Individual Category Card Component - IMPROVED MOBILE SIZES
const ModernCategoryCard = ({ category, index, isMobile = false }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const cardRef = useRef(null);

    const handleClick = () => {
        navigate(category.link);
    };

    const IconComponent = category.Icon;

    // Mobile-specific compact styles
    const mobileStyles = isMobile ? {
        padding: 'p-4',
        iconSize: 'w-12 h-12',
        iconText: 'text-lg',
        titleSize: 'text-sm',
        descSize: 'text-[10px]',
        gradientBlob: 'w-24 h-24'
    } : {
        padding: 'p-6',
        iconSize: 'w-16 h-16',
        iconText: 'text-2xl',
        titleSize: 'text-lg',
        descSize: 'text-xs',
        gradientBlob: 'w-32 h-32'
    };

    return (
        <div
            ref={cardRef}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            className={`
                relative group cursor-pointer overflow-hidden
                bg-white rounded-2xl md:rounded-3xl ${mobileStyles.padding}
                border border-slate-100
                transition-all duration-300 ease-out
                hover:shadow-2xl hover:-translate-y-2
                active:scale-95 touch-manipulation
                ${category.shadow} hover:shadow-lg
                ${isPressed ? 'scale-95' : ''}
            `}
            style={{
                animationDelay: `${index * 50}ms`,
                WebkitTapHighlightColor: 'transparent'
            }}
        >
            {/* Background Gradient Blob */}
            <div 
                className={`
                    absolute -top-10 -right-10 ${mobileStyles.gradientBlob} rounded-full 
                    bg-gradient-to-br ${category.gradient}
                    opacity-0 group-hover:opacity-10 group-active:opacity-20
                    transition-opacity duration-500 blur-2xl
                `}
            />

            {/* Icon Container */}
            <div className={`
                relative ${mobileStyles.iconSize} mb-3 md:mb-4 rounded-xl md:rounded-2xl
                bg-gradient-to-br ${category.gradient}
                flex items-center justify-center
                shadow-lg ${category.shadow}
                transform transition-transform duration-500
                group-hover:scale-110 group-hover:rotate-3
            `}>
                <IconComponent className={`${mobileStyles.iconText} text-white`} />
                
                {/* Shine Effect */}
                <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-tr from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                <h3 className={`font-bold text-slate-800 ${mobileStyles.titleSize} mb-1 group-hover:text-emerald-700 transition-colors line-clamp-1`}>
                    {category.title}
                </h3>
                <p className={`text-slate-400 ${mobileStyles.descSize} font-medium leading-relaxed line-clamp-2`}>
                    {category.description}
                </p>
            </div>

            {/* Arrow Indicator - Hidden on very small mobile */}
            <div className={`
                absolute bottom-3 right-3 md:bottom-4 md:right-4
                w-6 h-6 md:w-8 md:h-8 rounded-full
                bg-slate-100 flex items-center justify-center
                transform transition-all duration-300
                ${isHovered ? 'translate-x-0 opacity-100 bg-emerald-500' : 'translate-x-2 opacity-0'}
                hidden sm:flex
            `}>
                <FaArrowRight className={`text-xs md:text-sm ${isHovered ? 'text-white' : 'text-slate-400'}`} />
            </div>

            {/* Bottom Border Animation */}
            <div className={`
                absolute bottom-0 left-0 right-0 h-0.5 md:h-1
                bg-gradient-to-r ${category.gradient}
                transform origin-left transition-transform duration-500
                ${isHovered ? 'scale-x-100' : 'scale-x-0'}
            `} />
        </div>
    );
};

// 🔥 NEW: Mobile-Optimized Horizontal Scroll
const MobileScrollRow = () => {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [showIndicators, setShowIndicators] = useState(true);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (el) {
            const hasScroll = el.scrollWidth > el.clientWidth;
            setShowIndicators(hasScroll);
            setCanScrollLeft(el.scrollLeft > 0);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            // Initial check
            checkScroll();
            
            // Add scroll listener
            el.addEventListener('scroll', checkScroll, { passive: true });
            
            // Check on resize
            window.addEventListener('resize', checkScroll);
            
            return () => {
                el.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
            };
        }
    }, []);

    const scroll = (direction) => {
        const el = scrollRef.current;
        if (el) {
            const cardWidth = el.querySelector('.snap-start')?.offsetWidth || 280;
            const gap = 16; // 4 * 4px (gap-4)
            const scrollAmount = cardWidth + gap;
            
            el.scrollBy({ 
                left: direction === 'left' ? -scrollAmount : scrollAmount, 
                behavior: 'smooth' 
            });
        }
    };

    return (
        <div className="relative md:hidden">
            {/* Scroll Buttons - Only show if scrollable */}
            {showIndicators && canScrollLeft && (
                <button 
                    onClick={() => scroll('left')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"
                    aria-label="Scroll left"
                >
                    <FaChevronLeft className="text-sm" />
                </button>
            )}
            {showIndicators && canScrollRight && (
                <button 
                    onClick={() => scroll('right')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/95 backdrop-blur shadow-lg rounded-full flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"
                    aria-label="Scroll right"
                >
                    <FaChevronRight className="text-sm" />
                </button>
            )}

            {/* Scroll Container */}
            <div 
                ref={scrollRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 -mx-4 snap-x snap-mandatory touch-pan-x"
                style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {categories.map((cat, idx) => (
                    <div 
                        key={cat.code} 
                        className="snap-start shrink-0 w-[160px] sm:w-[200px] first:pl-4 last:pr-4"
                    >
                        <ModernCategoryCard category={cat} index={idx} isMobile={true} />
                    </div>
                ))}
            </div>

            {/* Pagination Dots Indicator */}
            <div className="flex justify-center gap-1.5 mt-2">
                {categories.map((_, idx) => (
                    <div 
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full bg-slate-300 transition-colors"
                    />
                ))}
            </div>
        </div>
    );
};

// 🔥 MAIN COMPONENT - IMPROVED RESPONSIVE
const CategoriesSection = () => {
    return (
        <section className="py-10 sm:py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* 🔥 NEW: Modern Header - Mobile Optimized */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12 lg:mb-16 gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <FaFire className="text-white text-lg md:text-xl" />
                            </div>
                            <span className="text-emerald-600 font-bold text-xs md:text-sm uppercase tracking-widest">
                                Browse Collection
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight">
                            Explore by <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">Category</span>
                        </h2>
                    </div>
                    
                    <p className="text-slate-500 max-w-md text-sm md:text-base leading-relaxed">
                        Discover thousands of listings across Pakistan's most trusted marketplace categories
                    </p>
                </div>

                {/* 🔥 NEW: Responsive Grid - Desktop */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 lg:gap-5 animate-in fade-in duration-700">
                    {categories.map((cat, idx) => (
                        <ModernCategoryCard key={cat.code} category={cat} index={idx} isMobile={false} />
                    ))}
                </div>

                {/* 🔥 NEW: Mobile Horizontal Scroll */}
                <MobileScrollRow />

                {/* 🔥 NEW: Bottom CTA - Mobile Optimized */}
                <div className="mt-8 md:mt-12 lg:mt-16 text-center">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-white rounded-full shadow-lg border border-slate-100 hover:shadow-xl active:scale-95 transition-all cursor-pointer group">
                        <span className="text-slate-600 font-medium text-sm md:text-base">View all categories</span>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                            <FaArrowRight className="text-emerald-600 group-hover:text-white text-xs md:text-sm transition-colors" />
                        </div>
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CategoriesSection;