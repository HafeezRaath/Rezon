import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FaTools, FaArrowLeft } from 'react-icons/fa';

const PAGE_CONTENT = {
    'about': {
        title: 'About REZON',
        subtitle: 'Pakistan\'s Trusted Marketplace',
        description: 'REZON is an AI-powered marketplace connecting buyers and sellers across Pakistan. Our mission is to create a safe, verified, and seamless trading experience for everyone.',
        features: ['AI-Powered Verification', 'Real-time Chat', 'Secure Payments', 'Local Community']
    },
    'blog': {
        title: 'REZON Blog',
        subtitle: 'Tips, News & Updates',
        description: 'Stay updated with the latest marketplace trends, selling tips, and REZON feature updates.',
        features: ['Selling Guides', 'Safety Tips', 'Market Trends', 'Success Stories']
    },
    'help': {
        title: 'Help Center',
        subtitle: 'How can we help you?',
        description: 'Find answers to common questions about buying, selling, and using REZON platform.',
        features: ['Getting Started', 'Account Issues', 'Payment Help', 'Safety Guidelines']
    },
    'contact': {
        title: 'Contact Us',
        subtitle: 'Get in Touch',
        description: 'Have questions or feedback? We\'d love to hear from you. Reach out to our support team.',
        features: ['Email Support', 'Phone Support', 'Live Chat', 'Community Forum']
    },
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'Your Data, Your Control',
        description: 'We take your privacy seriously. Learn how we collect, use, and protect your personal information.',
        features: ['Data Collection', 'Cookie Policy', 'User Rights', 'Security Measures']
    },
    'terms': {
        title: 'Terms of Use',
        subtitle: 'Platform Rules & Guidelines',
        description: 'By using REZON, you agree to these terms. Please read them carefully to understand your rights and responsibilities.',
        features: ['User Conduct', 'Listing Rules', 'Payment Terms', 'Dispute Resolution']
    }
};

const PlaceholderPage = () => {
    const location = useLocation();
    const path = location.pathname.replace('/', '') || 'about';
    const content = PAGE_CONTENT[path] || PAGE_CONTENT['about'];

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                
                {/* Back Button */}
                <a 
                    href="/" 
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors mb-8 group"
                >
                    <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Home</span>
                </a>

                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mb-6">
                        <FaTools size={28} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">
                        {content.title}
                    </h1>
                    <p className="text-xl text-emerald-600 font-semibold mb-4">
                        {content.subtitle}
                    </p>
                    <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        {content.description}
                    </p>
                </div>

                {/* Coming Soon Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 text-center mb-12">
                    <div className="inline-block px-6 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-bold mb-6">
                        🚧 Coming Soon
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">
                        This page is under construction
                    </h2>
                    <p className="text-slate-500 mb-8 max-w-lg mx-auto">
                        We're working hard to bring you this feature. Stay tuned for updates!
                    </p>
                    
                    <a 
                        href="/all-ads"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:brightness-110 transition-all active:scale-[0.98]"
                    >
                        Browse All Ads →
                    </a>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {content.features.map((feature, index) => (
                        <div 
                            key={index}
                            className="bg-white rounded-2xl p-6 border border-slate-200 text-center hover:border-emerald-300 hover:shadow-md transition-all"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 font-bold">
                                {index + 1}
                            </div>
                            <p className="font-semibold text-slate-700 text-sm">{feature}</p>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default PlaceholderPage;