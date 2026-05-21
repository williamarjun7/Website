import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin } from 'lucide-react';

import logo from '../../assets/logo.png';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    const navLinks = [
        { name: 'Home', path: '/', icon: null },
        { name: 'Rooms', path: '/rooms', icon: null },
        { name: 'Cafe', path: '/cafe', icon: null },
        { name: 'About', path: '/about', icon: null },
        { name: 'Contact', path: '/contact', icon: null },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                ? 'bg-white/95 backdrop-blur-md shadow-2xl border-b border-amber-100'
                : 'bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-sm shadow-lg'
                }`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="container-custom">
                <div className="flex items-center justify-between h-20">
                    {/* Logo with enhanced styling */}
                    <Link
                        to="/"
                        className="group flex items-center space-x-3 transform hover:scale-105 transition-all duration-300"
                    >
                        <div className="relative">
                            <img
                                src={logo}
                                alt="Highlands Cafe & Motel Inn"
                                className="h-14 w-auto object-contain drop-shadow-md group-hover:drop-shadow-xl transition-all duration-300"
                            />
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300"></div>
                        </div>
                    </Link>

                    {/* Enhanced Desktop Navigation - Centered */}
                    <div className="hidden lg:flex flex-1 items-center justify-center">
                        <div className="flex items-center space-x-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative px-6 py-3 rounded-full font-body font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${location.pathname === link.path
                                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 hover:text-primary hover:shadow-md'
                                        }`}
                                >
                                    <span className="relative z-10">{link.name}</span>
                                    {location.pathname === link.path && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full opacity-100 blur-lg"></div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Enhanced CTA Button - Right Side */}
                    <Link
                        to="/booking"
                        className="relative px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-heading font-bold text-sm shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group hidden lg:block"
                    >
                        <span className="relative z-10 flex items-center space-x-2">
                            <span>Book Now</span>
                            <div className="w-0 h-0.5 bg-white transform group-hover:w-4 transition-all duration-300"></div>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    </Link>



                    {/* Enhanced Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden p-3 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-primary transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                        aria-label="Toggle navigation menu"
                        aria-expanded={isOpen}
                        aria-controls="mobile-menu"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Enhanced Mobile Navigation */}
                {isOpen && (
                    <div id="mobile-menu" aria-hidden={!isOpen} className="lg:hidden py-6 px-4 bg-gradient-to-b from-white/95 to-amber-50/95 backdrop-blur-md rounded-b-2xl shadow-2xl border-t border-amber-100">
                        <div className="flex flex-col space-y-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`px-6 py-4 rounded-xl font-body font-semibold text-left transition-all duration-300 transform hover:scale-102 hover:translate-x-2 ${location.pathname === link.path
                                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                                        : 'bg-white/70 text-gray-700 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 hover:text-primary hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{link.name}</span>
                                        {location.pathname === link.path && (
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        )}
                                    </div>
                                </Link>
                            ))}

                            {/* Mobile CTA Button */}
                            <Link
                                to="/booking"
                                className="mt-4 px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-heading font-bold shadow-xl hover:shadow-2xl transform hover:scale-102 transition-all duration-300 text-center"
                            >
                                Book Now
                            </Link>

                            {/* Mobile Contact Info */}
                            <div className="mt-6 pt-6 border-t border-amber-200 space-y-3">
                                <a href="https://wa.me/9779763215874" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-gray-600 hover:text-primary transition-colors cursor-pointer">
                                    <Phone size={18} className="text-primary" />
                                    <span className="font-body font-medium">+977 9763215874</span>
                                </a>
                                <a href="mailto:highlandscafemotelinn@gmail.com" className="flex items-center space-x-3 text-gray-600 hover:text-primary transition-colors cursor-pointer">
                                    <Mail size={18} className="text-primary" />
                                    <span className="font-body font-medium">highlandscafemotelinn@gmail.com</span>
                                </a>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <MapPin size={18} className="text-primary" />
                                    <span className="font-body font-medium text-sm">Birendranagar-07, Khajura, Surkhet</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
