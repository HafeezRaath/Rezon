import React from 'react';
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

const footer = () => {
  return (
    // 🔥 Background ko dark grey rakha, lekin top border mein navbar ka gradient use kiya
    <footer className="bg-gray-900 text-white mt-10 border-t-4 border-red-500"> 
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        
        {/* === 1. MAIN CONTENT GRID (Links, Contact) === */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 border-b border-gray-700 pb-10 mb-8">
          
          {/* Column 1: Logo & Mission */}
          <div className="col-span-2 md:col-span-2">
            {/* Logo color ko Pink/Yellow accent diya */}
            <h3 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-300 tracking-wider mb-3">
              REZON
            </h3>
            <p className="text-sm text-gray-400">
              Your trusted marketplace for buying and selling anything, easily and locally.
            </p>
            {/* Social Icons ko Pink/Yellow Hover Effect diya */}
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><FaFacebookF /></a>
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><FaTwitter /></a>
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><FaInstagram /></a>
              <a href="#" className="text-gray-400 hover:text-red-500 transition-colors"><FaLinkedinIn /></a>
            </div>
          </div>
          
          {/* Column 2: Quick Links */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-pink-500">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Home</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">All Ads</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Blog</a></li>
            </ul>
          </div>
          
          {/* Column 3: Support */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-pink-500">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-pink-300 transition-colors">Terms of Use</a></li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-pink-500">Get In Touch</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <FaPhoneAlt className="text-red-500 text-xs" /> {/* Red Accent */}
                <span className="text-gray-400 hover:text-white transition-colors">+92 3XX XXXX XXX</span>
              </li>
              <li className="flex items-center space-x-2">
                <FaEnvelope className="text-red-500 text-xs" /> {/* Red Accent */}
                <span className="text-gray-400 hover:text-white transition-colors">support@rezon.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* === 2. COPYRIGHT BAR === */}
        <div className="text-center md:flex md:justify-between md:items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} REZON. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Made with ❤️ in Pakistan</p>
        </div>
        
      </div>
    </footer>
  );
}

export default footer;