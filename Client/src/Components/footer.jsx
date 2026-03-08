import React from 'react';
import { 
    FaFacebookF, 
    FaTwitter, 
    FaInstagram, 
    FaLinkedinIn, 
    FaPhoneAlt, 
    FaEnvelope,
    FaMapMarkerAlt
} from 'react-icons/fa';

// 🔧 ADDED: Config for easy updates
const CONTACT_INFO = {
    phone: "0307 7850656",
    email: "raathdeveloper@gmail.com",
    address: "Pakistan"
};

const SOCIAL_LINKS = [
    { icon: FaFacebookF, href: "#", label: "Facebook" },
    { icon: FaTwitter, href: "#", label: "Twitter" },
    { icon: FaInstagram, href: "#", label: "Instagram" },
    { icon: FaLinkedinIn, href: "#", label: "LinkedIn" },
];

const QUICK_LINKS = [
    { label: "Home", href: "/" },
    { label: "All Ads", href: "/categories/mobiles" },
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
];

const SUPPORT_LINKS = [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
];

// 🔧 FIXED: PascalCase component name
const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        // 🔧 FIXED: Emerald theme - removed red/pink chaos
        <footer className="bg-slate-900 text-white mt-10 border-t-4 border-emerald-500"> 
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                
                {/* Main Content Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 border-b border-slate-700 pb-10 mb-8">
                    
                    {/* Column 1: Logo & Mission */}
                    <div className="col-span-2 md:col-span-2">
                        {/* 🔧 FIXED: Emerald gradient */}
                        <h3 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tight mb-3">
                            REZON
                        </h3>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Pakistan's trusted AI-powered marketplace for buying and selling. Verified listings, local trust, seamless experience.
                        </p>
                        
                        {/* Social Icons - 🔧 FIXED: Emerald hover */}
                        <div className="flex space-x-4 mt-6">
                            {SOCIAL_LINKS.map((social) => (
                                <a 
                                    key={social.label}
                                    href={social.href} 
                                    aria-label={social.label}
                                    className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                                >
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>
                    
                    {/* Column 2: Quick Links */}
                    <div className="col-span-1">
                        <h4 className="text-lg font-bold mb-4 text-emerald-400">Quick Links</h4>
                        <ul className="space-y-3 text-sm">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.label}>
                                    <a 
                                        href={link.href} 
                                        className="text-slate-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 group"
                                    >
                                        <span className="w-0 group-hover:w-2 h-0.5 bg-emerald-400 transition-all duration-300"></span>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Column 3: Support */}
                    <div className="col-span-1">
                        <h4 className="text-lg font-bold mb-4 text-emerald-400">Support</h4>
                        <ul className="space-y-3 text-sm">
                            {SUPPORT_LINKS.map((link) => (
                                <li key={link.label}>
                                    <a 
                                        href={link.href} 
                                        className="text-slate-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 group"
                                    >
                                        <span className="w-0 group-hover:w-2 h-0.5 bg-emerald-400 transition-all duration-300"></span>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Contact Info */}
                    <div className="col-span-2 md:col-span-1">
                        <h4 className="text-lg font-bold mb-4 text-emerald-400">Get In Touch</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start space-x-3 group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                    <FaPhoneAlt className="text-emerald-400 group-hover:text-white text-xs transition-colors" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Phone</p>
                                    <a 
                                        href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}
                                        className="text-slate-300 hover:text-white transition-colors font-medium"
                                    >
                                        {CONTACT_INFO.phone}
                                    </a>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3 group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                    <FaEnvelope className="text-emerald-400 group-hover:text-white text-xs transition-colors" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Email</p>
                                    <a 
                                        href={`mailto:${CONTACT_INFO.email}`}
                                        className="text-slate-300 hover:text-white transition-colors font-medium break-all"
                                    >
                                        {CONTACT_INFO.email}
                                    </a>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3 group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                                    <FaMapMarkerAlt className="text-emerald-400 group-hover:text-white text-xs transition-colors" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Location</p>
                                    <span className="text-slate-300 font-medium">{CONTACT_INFO.address}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Copyright Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>&copy; {currentYear} REZON. All rights reserved.</p>
                    <p className="font-medium">
                        Developed by{" "}
                        <a 
                            href="https://raathdeveloper.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                        >
                            Hafeez Raath
                        </a> 🇵🇰
                    </p>
                </div>
                
            </div>
        </footer>
    );
};

export default Footer;