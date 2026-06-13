import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageCircle, Clock, Star, Heart, Wifi, Car, Coffee } from 'lucide-react';

const Footer = memo(() => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 text-white mt-20 overflow-hidden">
            {/* Decorative Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-repeat" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '60px 60px'
                }}></div>
            </div>

            <div className="relative container-custom py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
                    {/* Enhanced About Section */}
                    <div className="md:col-span-2 lg:col-span-2">
                        <div className="relative mb-6">
                            <h3 className="font-heading text-2xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-orange-200 bg-clip-text text-transparent">
                                Highlands Cafe & Motel Inn
                            </h3>
                            <div className="flex items-center space-x-1 mb-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={16} className="fill-amber-300 text-amber-300 animate-pulse" />
                                ))}
                                <span className="ml-2 text-amber-200 text-sm">Premium Hospitality</span>
                            </div>
                        </div>

                        <p className="text-amber-100 text-sm leading-relaxed mb-6">
                            Experience cozy comfort in the heart of the highlands. Your perfect retreat with breathtaking views, warm hospitality, and unforgettable memories waiting to be created.
                        </p>

                        {/* Enhanced Amenities */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center space-x-2 text-amber-200 hover:text-white transition-colors">
                                <Wifi size={18} className="text-amber-300" />
                                <span className="text-sm font-medium">Free WiFi</span>
                            </div>
                            <div className="flex items-center space-x-2 text-amber-200 hover:text-white transition-colors">
                                <Car size={18} className="text-amber-300" />
                                <span className="text-sm font-medium">Free Parking</span>
                            </div>
                            <div className="flex items-center space-x-2 text-amber-200 hover:text-white transition-colors">
                                <Coffee size={18} className="text-amber-300" />
                                <span className="text-sm font-medium">24/7 Motel</span>
                            </div>
                            <div className="flex items-center space-x-2 text-amber-200 hover:text-white transition-colors">
                                <Heart size={18} className="text-amber-300" />
                                <span className="text-sm font-medium">Premium Care</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <Link
                            to="/booking"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-heading font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            <span>Book Your Stay</span>
                            <Heart size={18} className="animate-pulse" />
                        </Link>
                    </div>

                    {/* Enhanced Quick Links */}
                    <div>
                        <div className="relative mb-6">
                            <h4 className="font-heading text-lg font-bold mb-6 relative">
                                Quick Links
                                <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400"></div>
                            </h4>
                        </div>
                        <ul className="space-y-3">
                            {[
                                { to: '/rooms', label: 'Our Rooms', icon: '🏨' },
                                { to: '/cafe', label: 'Cafe Menu', icon: '☕' },
                                { to: '/about', label: 'About Us', icon: '❤️' },
                                { to: '/booking', label: 'Book Now', icon: '📅' },
                                { to: '/contact', label: 'Contact Us', icon: '📞' },
                            ].map((item) => (
                                <li key={item.to}>
                                    <Link
                                        to={item.to}
                                        className="flex items-center space-x-3 text-amber-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-300 transform hover:translate-x-2"
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Enhanced Contact Info */}
                    <div>
                        <div className="relative mb-6">
                            <h4 className="font-heading text-lg font-bold mb-6 relative">
                                Get in Touch
                                <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400"></div>
                            </h4>
                        </div>
                        <ul className="space-y-4">
                            <li className="group">
                                <a
                                    href="https://wa.me/9779763215874"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-3 text-amber-100 hover:text-white transition-all duration-300 transform hover:translate-x-2"
                                >
                                    <div className="p-2 bg-amber-700/50 rounded-lg group-hover:bg-amber-600/50 transition-colors">
                                        <Phone size={18} className="text-amber-300" />
                                    </div>
                                    <div>
                                        <div className="font-medium">+977 9763215874</div>
                                        <div className="text-xs text-amber-200">Call & WhatsApp</div>
                                    </div>
                                </a>
                            </li>
                            <li className="group">
                                <a
                                    href="mailto:highlandscafemotelinn@gmail.com"
                                    className="flex items-center space-x-3 text-amber-100 hover:text-white transition-all duration-300 transform hover:translate-x-2"
                                >
                                    <div className="p-2 bg-amber-700/50 rounded-lg group-hover:bg-amber-600/50 transition-colors">
                                        <Mail size={18} className="text-amber-300" />
                                    </div>
                                    <div>
                                        <div className="font-medium break-all">highlandscafemotelinn@gmail.com</div>
                                        <div className="text-xs text-amber-200">Quick Response</div>
                                    </div>
                                </a>
                            </li>
                            <li className="group">
                                <div className="flex items-center space-x-3 text-amber-100 hover:text-white transition-all duration-300 transform hover:translate-x-2">
                                    <div className="p-2 bg-amber-700/50 rounded-lg group-hover:bg-amber-600/50 transition-colors">
                                        <MapPin size={18} className="text-amber-300" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Birendranagar-07, Khajura</div>
                                        <div className="text-xs text-amber-200">Surkhet, Karnali Province, Nepal</div>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Enhanced Social & Hours */}
                    <div>
                        <div className="relative mb-6">
                            <h4 className="font-heading text-lg font-bold mb-6 relative">
                                Connect & Hours
                                <div className="absolute -bottom-2 left-0 w-12 h-0.5 bg-gradient-to-r from-amber-400 to-orange-400"></div>
                            </h4>
                        </div>

                        {/* Enhanced Social Links */}
                        <div className="flex space-x-3 mb-6">
                            {[
                                { href: 'https://www.facebook.com/profile.php?id=61587029831121', icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-600' },
                                { href: 'https://www.instagram.com/highlandscafemotel?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-600' },
                                { href: 'https://wa.me/9779763215874', icon: MessageCircle, label: 'WhatsApp', color: 'hover:bg-green-600' },
                            ].map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-3 bg-white/10 rounded-xl hover:bg-white/20 ${social.color} transition-all duration-300 transform hover:scale-110 hover:rotate-3 cursor-pointer`}
                                    aria-label={social.label}
                                >
                                    <social.icon size={20} />
                                </a>
                            ))}
                        </div>

                        {/* Enhanced Hours */}
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <Clock size={18} className="text-amber-300" />
                                <span className="font-semibold text-amber-200">Operating Hours</span>
                            </div>
                            <div className="space-y-2 text-sm text-amber-100">
                                <div className="flex justify-between">
                                    <span>Check-in:</span>
                                    <span className="font-medium text-white">2:00 PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Check-out:</span>
                                    <span className="font-medium text-white">12:00 PM</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-amber-700/50">
                                    <span>Cafe Service:</span>
                                    <span className="font-medium text-green-300">24/7</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Bottom Bar */}
                <div className="relative mt-16 pt-8 border-t border-amber-700/50">
                    <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                        <div className="text-center md:text-left">
                            <p className="text-amber-200 text-sm">
                                © {currentYear} Highlands Cafe & Motel Inn. All rights reserved.
                            </p>
                            <p className="text-amber-300 text-xs mt-1">
                                Made with <Heart size={12} className="inline text-red-400 animate-pulse" /> in Nepal
                            </p>
                        </div>

                        {/* Bottom Links */}
                        <div className="flex space-x-6 text-xs text-amber-200">
                            <Link to="/faq" className="hover:text-white transition-colors">FAQ</Link>
                            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
});

export default Footer;
