// CategoriesSection.jsx

import React from 'react';
// import { useNavigate } from 'react-router-dom'; // Agar zaroori ho to rakhein
import CategoryCard from './CategoryCard'
import {
    FaMobileAlt, FaCar, FaHome, FaBuilding, FaTv, FaMotorcycle, FaIndustry,
    FaHandsHelping, FaBriefcase, FaDog, FaCouch, FaTshirt, FaBookOpen, FaBaby
} from 'react-icons/fa';

// 🔥 CATEGORY LIST KO BACKEND CODES SE MATCH KIYA GAYA
const categories = [
    // Link mein woh code use karein jo backend enum aur CategorySelector mein hai
    { title: 'Mobiles', Icon: FaMobileAlt, iconColor: 'text-blue-500', bgColor: 'bg-blue-50', code: 'Mobile', link: '/category/mobile'},
    { title: 'Vehicles', Icon: FaCar, iconColor: 'text-red-500', bgColor: 'bg-red-50', code: 'Car', link: '/category/car' },
    { title: 'Property for Sale', Icon: FaHome, iconColor: 'text-green-500', bgColor: 'bg-green-50', code: 'PropertySale', link: '/category/propertysale' },
    { title: 'Property for Rent', Icon: FaBuilding, iconColor: 'text-purple-500', bgColor: 'bg-purple-50', code: 'PropertyRent', link: '/category/propertyrent' },
    { title: 'Electronics & Home Appliances', Icon: FaTv, iconColor: 'text-pink-500', bgColor: 'bg-pink-50', code: 'Electronics', link: '/category/electronics' },
    { title: 'Bikes', Icon: FaMotorcycle, iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50', code: 'Bikes', link: '/category/bikes' },
    { title: 'Business, Industrial & Agriculture', Icon: FaIndustry, iconColor: 'text-indigo-500', bgColor: 'bg-indigo-50', code: 'Business', link: '/category/business' },
    { title: 'Services', Icon: FaHandsHelping, iconColor: 'text-orange-500', bgColor: 'bg-orange-50', code: 'Services', link: '/category/services' },
    { title: 'Jobs', Icon: FaBriefcase, iconColor: 'text-teal-500', bgColor: 'bg-teal-50', code: 'Jobs', link: '/category/jobs' },
    { title: 'Animals', Icon: FaDog, iconColor: 'text-lime-600', bgColor: 'bg-lime-50', code: 'Animals', link: '/category/animals' },
    { title: 'Furniture & Home Decor', Icon: FaCouch, iconColor: 'text-fuchsia-500', bgColor: 'bg-fuchsia-50', code: 'Furniture', link: '/category/furniture' },
    { title: 'Fashion & Beauty', Icon: FaTshirt, iconColor: 'text-rose-500', bgColor: 'bg-rose-50', code: 'Fashion', link: '/category/fashion' },
    { title: 'Books, Sports & Hobbies', Icon: FaBookOpen, iconColor: 'text-cyan-600', bgColor: 'bg-cyan-50', code: 'Books', link: '/category/books' },
    { title: 'Kids', Icon: FaBaby, iconColor: 'text-amber-500', bgColor: 'bg-amber-50', code: 'Kids', link: '/category/kids' },
];

const CategoriesSection = () => {
  return (
    <section className="px-4 py-10 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Top Categories</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat, idx) => (
          <CategoryCard
            key={idx}
            title={cat.title}
            Icon={cat.Icon}
            iconColor={cat.iconColor}
            bgColor={cat.bgColor}
            link={cat.link} // Naya link format: /category/mobile
          />
        ))}
      </div>
    </section>
  );
};

export default CategoriesSection;