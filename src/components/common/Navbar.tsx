import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, MapPin } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { getSiteContentMap } from '../../services/contentService';
import { getSettingsMap } from '../../services/settingsService';
import { getNavigation, type NavItem } from '../../services/navigationService';

import defaultLogo from '../../assets/logo.png';

const Navbar = memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const prevPath = useRef(location.pathname);
    const [content, setContent] = useState<Record<string, string>>({});
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [navItems, setNavItems] = useState<NavItem[]>([]);


    const C = (key: string, fallback: string) => { const v = settings[key] || content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };

    const isHomePage = location.pathname === '/';
    const isTransparent = isHomePage && !isScrolled;

    useEffect(() => {
        Promise.all([
            getSiteContentMap(),
            getSettingsMap(),
            getNavigation(),
        ]).then(([contentRes, settingsRes, navRes]) => {
            if (contentRes.data) setContent(contentRes.data);
            if (settingsRes.data) setSettings(settingsRes.data);
            if (navRes.data) setNavItems(navRes.data.filter((n: { is_visible: boolean }) => n.is_visible));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const prev = prevPath.current;
        prevPath.current = location.pathname;
        if (prev !== location.pathname && isOpen) {
            setTimeout(() => setIsOpen(false), 0);
        }
    }, [location.pathname, isOpen]);

    const navLinks = useCallback(() => {
        if (navItems.length > 0) return navItems.map(n => ({ name: n.label, path: n.url }));
        return [
            { name: 'Home', path: '/' },
            { name: 'Rooms', path: '/rooms' },
            { name: 'Cafe', path: '/cafe' },
            { name: 'Gallery', path: '/gallery' },
            { name: 'Contact', path: '/contact' },
            { name: 'About', path: '/about' },
        ];
    }, [navItems]);

    const navBg = isTransparent
        ? 'bg-black/10 backdrop-blur-[2px]'
        : isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-2xl border-b border-amber-100'
            : 'bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-sm shadow-lg';

    const textColor = isTransparent ? 'text-white' : 'text-gray-700';

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="container-custom">
                <div className="flex items-center justify-between h-20">
                    <Link
                        to="/"
                        className="group flex items-center space-x-3 transform hover:scale-105 transition-all duration-300"
                    >
                        <div className="relative">
                            <img
                                src={C('logo_url', '') || defaultLogo}
                                alt={C('site_name', 'Highlands Cafe & Motel Inn')}
                                className={`h-16 w-16 rounded-full object-cover drop-shadow-md group-hover:drop-shadow-xl transition-all duration-300 opacity-100 ${isTransparent ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]' : ''}`}
                            />
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full blur-lg transition-all duration-300 opacity-0 group-hover:opacity-20"></div>
                        </div>
                    </Link>

                    <div className="hidden lg:flex flex-1 items-center justify-center">
                        <div className="flex items-center space-x-2">
                            {navLinks().map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`relative px-6 py-3 rounded-full font-body font-semibold text-sm transition-all duration-300 transform hover:scale-105 ${location.pathname === link.path
                                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                                        : `${textColor} ${isTransparent ? 'hover:bg-white/20 hover:text-white' : 'hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 hover:text-primary hover:shadow-md'}`
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

                    <Link
                        to="/booking"
                        className="relative px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-full font-heading font-bold text-sm shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group hidden lg:block"
                    >
                        <span className="relative z-10 flex items-center space-x-2">
                            <span>{C('btn_book_now', 'Book Now')}</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    </Link>

                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`lg:hidden p-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${isTransparent
                            ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                            : 'bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-primary'
                            }`}
                        aria-label="Toggle navigation menu"
                        aria-expanded={isOpen}
                        aria-controls="mobile-menu"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {isOpen && (
                    <div id="mobile-menu" aria-hidden={!isOpen} className="lg:hidden py-6 px-4 bg-gradient-to-b from-white/95 to-amber-50/95 backdrop-blur-md rounded-b-2xl shadow-2xl border-t border-amber-100">
                        <div className="flex flex-col space-y-3">
                            {navLinks().map((link) => (
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

                            <Link
                                to="/booking"
                                className="mt-4 px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-heading font-bold shadow-xl hover:shadow-2xl transform hover:scale-102 transition-all duration-300 text-center"
                            >
                                {C('btn_book_now', 'Book Now')}
                            </Link>

                            <div className="mt-6 pt-6 border-t border-amber-200 space-y-3">
                                <a href={C('contact_whatsapp_link', 'https://wa.me/9779822410877')} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-gray-600 hover:text-green-600 transition-colors cursor-pointer">
                                    <WhatsAppIcon size={18} className="text-green-600" />
                                    <span className="font-body font-medium">{C('contact_whatsapp_label', 'Chat on WhatsApp')}</span>
                                </a>
                                <a href={`tel:${C('navbar_phone', '+9779763215874').replace(/[^0-9]/g, '')}`} className="flex items-center space-x-3 text-gray-600 hover:text-primary transition-colors cursor-pointer">
                                    <Phone size={18} className="text-primary" />
                                    <span className="font-body font-medium">{C('navbar_phone', '+977 9763215874')} <span className="text-xs text-gray-400">({C('contact_phone_backup_short', 'Backup')})</span></span>
                                </a>
                                <a href={`mailto:${C('navbar_email', 'highlandsmotelinn@gmail.com')}`} className="flex items-center space-x-3 text-gray-600 hover:text-primary transition-colors cursor-pointer">
                                    <Mail size={18} className="text-primary" />
                                    <span className="font-body font-medium">{C('navbar_email', 'highlandsmotelinn@gmail.com')}</span>
                                </a>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <MapPin size={18} className="text-primary" />
                                    <span className="font-body font-medium text-sm">{C('contact_address', 'Birendranagar-8, Khajura, Surkhet, Karnali Province, Nepal')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
});

export default Navbar;
