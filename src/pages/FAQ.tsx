import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp, Phone, Mail, Clock, Calendar, CreditCard, MapPin, Wifi, Coffee, HelpCircle } from 'lucide-react';
import { getSiteImagesByPage, getSiteContentMap } from '../services/contentService';
import { getPublishedFaqItems, type FaqItem } from '../services/faqService';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Booking & Reservations': Calendar,
  'Rooms & Facilities': Wifi,
  'Check-in & Check-out': Clock,
  'Cafe & Dining': Coffee,
  'Location & Transportation': MapPin,
  'Payment & Policies': CreditCard,
};

const FAQ = () => {
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());
    const [heroBg, setHeroBg] = useState('');
    const [content, setContent] = useState<Record<string, string>>({});
    const [faqItems, setFaqItems] = useState<FaqItem[]>([]);

    useEffect(() => {
        Promise.all([
            getSiteImagesByPage('faq'),
            getSiteContentMap(),
            getPublishedFaqItems(),
        ]).then(([imgRes, contentRes, faqRes]) => {
            if (imgRes.data && imgRes.data.length > 0) setHeroBg(imgRes.data[0].image_url);
            if (contentRes.data) setContent(contentRes.data);
            if (faqRes.data) setFaqItems(faqRes.data);
        }).catch(() => {});
    }, []);

    const C = (key: string, fallback: string) => content[key] || fallback;

    const getIconForCategory = (category: string) => CATEGORY_ICONS[category] || HelpCircle;

    const toggleItem = (id: string) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const categories = Array.from(new Set(faqItems.map((item: FaqItem) => item.category)));
    const groupedFAQs = categories.map((category: string) => ({
        category,
        items: faqItems.filter((item: FaqItem) => item.category === category)
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
                            <span>{C('faq_whatsapp_label', 'WhatsApp Us')}</span>
                        </a>
                        <a
                            href={`mailto:${C('contact_email', 'highlandsmotelinn@gmail.com')}`}
                            className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-amber-900 hover:bg-gray-50 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                        >
                            <Mail size={20} />
                            <span>{C('faq_email_label', 'Email Us')}</span>
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
                                {group.items.map((item) => {
                                    const CategoryIcon = getIconForCategory(item.category);
                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                                        >
                                            <button
                                                onClick={() => toggleItem(item.id)}
                                                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-amber-50 transition-colors"
                                            >
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <div className="p-2 bg-amber-100 rounded-lg">
                                                        <CategoryIcon size={18} className="text-amber-700" />
                                                    </div>
                                                    <span className="font-semibold text-gray-800">
                                                        {item.question}
                                                    </span>
                                                </div>
                                                {openItems.has(item.id) ? (
                                                    <ChevronUp size={20} className="text-amber-600 flex-shrink-0" />
                                                ) : (
                                                    <ChevronDown size={20} className="text-amber-600 flex-shrink-0" />
                                                )}
                                            </button>
                                            {openItems.has(item.id) && (
                                                <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
                                                    <p className="text-gray-700 leading-relaxed">
                                                        {item.answer}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Links */}
                <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8">
                    <h3 className="font-heading text-xl font-bold mb-6 text-center">
                        {C('faq_quicklinks_heading', 'Quick Links')}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a href="/booking" className="text-center hover:text-amber-200 transition-colors">{C('faq_quicklink_book', 'Book a Room')}</a>
                        <a href="/cafe" className="text-center hover:text-amber-200 transition-colors">{C('faq_quicklink_menu', 'View Menu')}</a>
                        <a href="/contact" className="text-center hover:text-amber-200 transition-colors">{C('faq_quicklink_contact', 'Contact Us')}</a>
                        <a href="/about" className="text-center hover:text-amber-200 transition-colors">{C('faq_quicklink_about', 'About Us')}</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQ;