import { useEffect, useState, type ComponentType } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp, Phone, Mail, Clock, Calendar, CreditCard, MapPin, Wifi, Car, Coffee } from 'lucide-react';
import { getSiteImagesByType, getSiteContentMap } from '../services/contentService';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
    icon?: ComponentType<{ size?: number; className?: string }>;
}

const FAQ = () => {
    const [openItems, setOpenItems] = useState<string[]>([]);
    const [heroBg, setHeroBg] = useState('https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200');
    const [content, setContent] = useState<Record<string, string>>({});

    useEffect(() => {
        Promise.all([
            getSiteImagesByType('hero'),
            getSiteContentMap(),
        ]).then(([imgRes, contentRes]) => {
            if (imgRes.data && imgRes.data.length > 0) setHeroBg(imgRes.data[0].image_url);
            if (contentRes.data) setContent(contentRes.data);
        }).catch(() => {});
    }, []);

    const C = (key: string, fallback: string) => content[key] || fallback;

    const getFAQ = (): FAQItem[] => {
        try {
            const raw = C('faq_questions', '');
            if (raw.trim()) {
                const parsed = JSON.parse(raw) as Array<{ question: string; answer: string; category?: string }>;
                return parsed.map((item) => ({
                    question: item.question,
                    answer: item.answer,
                    category: item.category || 'General',
                }));
            }
        } catch {}
        return defaultFAQ;
    };

    const defaultFAQ: FAQItem[] = [
        // Booking & Reservations
        {
            question: 'How do I make a reservation?',
            answer: 'You can book your stay through our website using the "Book Now" button, message us on WhatsApp at +977 9763215874, or email us at highlandscafemotelinn@gmail.com.',
            category: 'Booking & Reservations',
            icon: Calendar
        },
        {
            question: 'What is your cancellation and refund policy?',
            answer: 'You may cancel your reservation and receive a full refund of your advance payment if you cancel at least 12 hours before your scheduled check-in time. For Pay at Property bookings, the 60% advance payment is refundable if cancelled 12+ hours before check-in. Cancellations made less than 12 hours before check-in are non-refundable. No-shows are not eligible for any refund.',
            category: 'Booking & Reservations',
            icon: CreditCard
        },
        {
            question: 'Do I need to pay a deposit?',
            answer: 'Yes, when choosing the Pay at Property option, we require a 60% advance payment online to confirm your reservation. The remaining 40% balance is due at the property during check-in or check-out. You can also choose to pay the full amount online via Fonepay QR or Fonepay Web Payment.',
            category: 'Booking & Reservations',
            icon: CreditCard
        },

        // Rooms & Facilities
        {
            question: 'What amenities are included in the room?',
            answer: 'All rooms include free WiFi, private bathroom, hot water, heating, daily housekeeping, and mountain views from select rooms.',
            category: 'Rooms & Facilities',
            icon: Wifi
        },
        {
            question: 'Is parking available?',
            answer: 'Yes, we offer free secure parking for all our guests. No reservation is required for parking spaces.',
            category: 'Rooms & Facilities',
            icon: Car
        },
        {
            question: 'Do you have WiFi?',
            answer: 'Free high-speed WiFi is available throughout the property, including all rooms and common areas.',
            category: 'Rooms & Facilities',
            icon: Wifi
        },

        // Check-in & Check-out
        {
            question: 'What are the check-in and check-out times?',
            answer: 'Check-in time is 2:00 PM and check-out time is 12:00 PM. Early check-in and late check-out may be available upon request, subject to availability.',
            category: 'Check-in & Check-out',
            icon: Clock
        },
        {
            question: 'Can I store my luggage before check-in or after check-out?',
            answer: 'Yes, we provide complimentary luggage storage. You can leave your luggage with us before check-in or after check-out while you explore the area.',
            category: 'Check-in & Check-out',
            icon: MapPin
        },

        // Cafe & Dining
        {
            question: 'What are the cafe hours?',
            answer: 'Our on-site cafe is open daily from 7:00 AM to 8:00 PM. Room service is available during cafe hours.',
            category: 'Cafe & Dining',
            icon: Coffee
        },

        {
            question: 'Do you accommodate dietary restrictions?',
            answer: 'Yes, our cafe can accommodate various dietary restrictions including vegetarian, vegan, and gluten-free options. Please inform us in advance about any special dietary needs.',
            category: 'Cafe & Dining',
            icon: Coffee
        },

        // Location & Transportation
        {
            question: 'How do I get to Highlands Cafe & Motel Inn?',
            answer: 'We are located at Birendranagar-07, Khajura, Surkhet. Local taxis and ride-sharing services are also available to reach us from the main bus park or airport.',
            category: 'Location & Transportation',
            icon: MapPin
        },
        {
            question: 'How far are you from the city center?',
            answer: 'We are situated in Khajura, Birendranagar, the heart of Surkhet. We are easily accessible from all major points in the city.',
            category: 'Location & Transportation',
            icon: Car
        },

        // Payment & Policies
        {
            question: 'What payment methods do you accept?',
            answer: 'We accept credit cards (Visa, MasterCard), debit cards, cash (NPR and USD), and mobile payment options. All prices are listed in Nepali Rupees.',
            category: 'Payment & Policies',
            icon: CreditCard
        },
        {
            question: 'Are taxes included in the room rate?',
            answer: 'All our rates are inclusive of taxes and service charges. No additional taxes will be applied upon check-out.',
            category: 'Payment & Policies',
            icon: CreditCard
        }
    ];

    const toggleItem = (question: string) => {
        setOpenItems(prev =>
            prev.includes(question)
                ? prev.filter(item => item !== question)
                : [...prev, question]
        );
    };

    const FAQ_ITEMS = getFAQ();
    const categories = Array.from(new Set(FAQ_ITEMS.map((item: FAQItem) => item.category)));
    const groupedFAQs = categories.map((category: string) => ({
        category,
        items: FAQ_ITEMS.filter((item: FAQItem) => item.category === category)
    }));

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>{C('faq_meta_title', C('site_name', 'Highlands Motel & Cafe') + ' | FAQ')}</title>
                <meta name="description" content={C('faq_meta_desc', 'Find answers to frequently asked questions about booking, rooms, amenities, check-in/out, payments, and more.')} />
            </Helmet>
            {/* Hero Section */}
            <section className="relative h-80 mb-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
                    <img
                        src={heroBg}
                        alt="FAQ"
                        className="w-full h-full object-cover opacity-30"
                    />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            {C('faq_hero_title', 'Frequently Asked Questions')}
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            {C('faq_hero_subtitle', 'Find answers to common questions about your stay')}
                        </p>
                    </div>
                </div>
            </section>

            <div className="container-custom max-w-4xl">
                {/* Contact Info */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 mb-12 text-center">
                    <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900">
                        {C('faq_default_fallback', 'Still Have Questions?')}
                    </h2>
                    <p className="text-gray-700 mb-6">
                        {C('faq_cta_text', 'Our team is here to help you with any inquiries or special requests')}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <a
                            href={`https://wa.me/${(() => { const p = C('contact_phone', '+977 9763215874'); return p.replace(/[^0-9]/g, '') })()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-amber-900 hover:bg-gray-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            <Phone size={20} />
                            <span>WhatsApp Us</span>
                        </a>
                        <a
                            href={`mailto:${C('contact_email', 'highlandscafemotelinn@gmail.com')}`}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-amber-900 hover:bg-gray-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            <Mail size={20} />
                            <span>Email Us</span>
                        </a>
                    </div>
                </div>

                {/* FAQ Items */}
                <div className="space-y-8">
                    {groupedFAQs.map((group) => (
                        <div key={group.category}>
                            <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900">
                                {group.category}
                            </h2>
                            <div className="space-y-4">
                                {group.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggleItem(item.question)}
                                            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-amber-50 transition-colors"
                                        >
                                            <div className="flex items-center space-x-3 flex-1">
                                                {item.icon && (
                                                    <div className="p-2 bg-amber-100 rounded-lg">
                                                        <item.icon size={18} className="text-amber-700" />
                                                    </div>
                                                )}
                                                <span className="font-semibold text-gray-800">
                                                    {item.question}
                                                </span>
                                            </div>
                                            {openItems.includes(item.question) ? (
                                                <ChevronUp size={20} className="text-amber-600 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown size={20} className="text-amber-600 flex-shrink-0" />
                                            )}
                                        </button>
                                        {openItems.includes(item.question) && (
                                            <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
                                                <p className="text-gray-700 leading-relaxed">
                                                    {item.answer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Links */}
                <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8">
                    <h3 className="font-heading text-xl font-bold mb-6 text-center">
                        Quick Links
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="/booking" className="text-center hover:text-amber-200 transition-colors">{C('btn_book_stay', 'Book a Room')}</a>
                        <a href="/cafe" className="text-center hover:text-amber-200 transition-colors">{C('btn_view_menu', 'View Menu')}</a>
                        <a href="/contact" className="text-center hover:text-amber-200 transition-colors">Contact Us</a>
                        <a href="/about" className="text-center hover:text-amber-200 transition-colors">About Us</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQ;