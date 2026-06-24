import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { getSiteContentMap } from '../services/contentService';
import { getSettingsMap } from '../services/settingsService';
import { getPageBySlug } from '../services/pageService';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

const Contact = () => {
    const [content, setContent] = useState<Record<string, string>>({});
    const [settings, setSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        Promise.all([
            getSiteContentMap(),
            getSettingsMap(),
            getPageBySlug('contact'),
        ]).then(([contentRes, settingsRes, _pageRes]) => {
            if (contentRes.data) setContent(contentRes.data);
            if (settingsRes.data) setSettings(settingsRes.data);
        }).catch(() => {});
    }, []);

    const C = (key: string, fallback: string) => { const v = settings[key] || content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };

    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        const result = contactSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of result.error.issues) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
          setErrors(fieldErrors);
          return;
        }

        setStatus('sending');
        const subject = encodeURIComponent(`Contact from ${formData.name}`);
        const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
        window.location.href = `mailto:highlandsmotelinn@gmail.com?subject=${subject}&body=${body}`;
        setStatus('sent');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setStatus('idle'), 4000);
    };

    const buttonLabel = status === 'sending' ? (
        'Opening email client...'
    ) : status === 'sent' ? (
        <span className="flex items-center gap-2"><CheckCircle size={18} /> Email Client Opened</span>
    ) : (
        <span className="flex items-center gap-2"><Send size={18} /> Send Message</span>
    );

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>{C('contact_meta_title', C('site_name', 'Highlands Cafe & Motel Inn') + ' | Contact')}</title>
                <meta name="description" content={C('contact_meta_desc', 'Get in touch. Call, email, or visit us in Surkhet, Nepal.')} />
            </Helmet>
            <section className="relative h-80 mb-16 overflow-hidden bg-gradient-to-r from-amber-900 to-orange-900">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <Phone size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            {C('contact_heading', 'Contact Us')}
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            {C('contact_subtitle', "We're here to help make your stay unforgettable. Reach out to us for any questions or special requests.")}
                        </p>
                    </div>
                </div>
            </section>
            <div className="container-custom">
                {/* Primary: Contact Info + Form (2-col on lg) */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mb-16">
                    {/* Left: Contact Information — 2/5 width on desktop */}
                    <div className="lg:col-span-2 order-2 lg:order-1">
                        <h2 className="font-heading text-2xl font-bold mb-6">{C('contact_heading', 'Get in Touch')}</h2>
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Phone className="text-primary" size={22} />
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">{C('contact_phone_label', 'Phone & WhatsApp')}</h3>
                                    <a
                                        href={`https://wa.me/${C('contact_phone', '+9779763215874').replace(/[^0-9]/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-primary transition-colors"
                                    >
                                        {C('contact_phone', '+977 9763215874')}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Mail className="text-primary" size={22} />
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">{C('contact_email_label', 'Email')}</h3>
                                    <a
                                        href={`mailto:${C('contact_email', 'highlandsmotelinn@gmail.com')}`}
                                        className="text-gray-600 hover:text-primary transition-colors break-all"
                                    >
                                        {C('contact_email', 'highlandsmotelinn@gmail.com')}
                                    </a>
                                    <p className="text-sm text-gray-400 mt-0.5">{C('contact_email_note', 'Quick response within 24 hours')}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <MapPin className="text-primary" size={22} />
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">{C('contact_address_label', 'Address')}</h3>
                                    <p className="text-gray-600">
                                        {C('contact_address', 'Birendranagar-8, Khajura, Surkhet, Karnali Province, Nepal')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                    <Clock className="text-primary" size={22} />
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">{C('contact_checkinout_label', 'Check-in / Check-out')}</h3>
                    <p className="text-gray-600">
                        {C('footer_hours_checkin_label', 'Check-in:')} {C('checkin_time', '2:00 PM')} &nbsp;|&nbsp; {C('footer_hours_checkout_label', 'Check-out:')} {C('checkout_time', '12:00 PM')}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        {C('contact_checkinout_note', 'Early check-in and late check-out available upon request')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Message Form — 3/5 width on desktop, first on mobile */}
                    <div className="lg:col-span-3 order-1 lg:order-2">
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-amber-100">
                            <h2 className="font-heading text-2xl font-bold mb-2">{C('contact_form_heading', 'Send Us a Message')}</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {C('contact_form_text', "Fill in the form below and we'll get back to you shortly.")}
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                <div>
                                    <input
                                        type="text"
                                        placeholder={C('contact_form_name_placeholder', 'Your Name')}
                                        value={formData.name}
                                        onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({}); }}
                                        className={`input w-full ${errors.name ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>}
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        placeholder={C('contact_form_email_placeholder', 'Your Email')}
                                        value={formData.email}
                                        onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({}); }}
                                        className={`input w-full ${errors.email ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email}</p>}
                                </div>
                                <div>
                                    <textarea
                                        rows={5}
                                        placeholder={C('contact_form_message_placeholder', 'Your Message')}
                                        value={formData.message}
                                        onChange={(e) => { setFormData({ ...formData, message: e.target.value }); setErrors({}); }}
                                        className={`input w-full resize-none ${errors.message ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.message && <p className="text-red-500 text-xs mt-1.5">{errors.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="btn-primary w-full disabled:opacity-50"
                                >
                                    {buttonLabel}
                                </button>
                                {status === 'sent' && (
                                    <p className="text-center text-sm text-green-600 flex items-center justify-center gap-1.5">
                                        <ExternalLink size={14} />
                                        {C('contact_form_thank_you_note', 'Your email client should open. If not, please email us directly.')}
                                    </p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                {/* Secondary: Map Section */}
                <div className="mb-8">
                    <h2 className="font-heading text-2xl font-bold mb-6">{C('contact_location_heading', 'Location')}</h2>
                    <div className="rounded-2xl overflow-hidden shadow-lg h-[280px] md:h-[400px]">
                        <iframe
                            src={C('google_maps_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30327.168373915127!2d81.58876419067386!3d28.58478551046912!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a285b5b738260f%3A0xb0fb170f840c8984!2sHighlands%20Cafe%20%26%20Motel%20Inn!5e1!3m2!1sen!2snp!4v1781772223538!5m2!1sen!2snp')}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Highlands Cafe & Motel Inn Location"
                        />
                    </div>
                    <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <div className="flex items-start gap-3">
                            <MapPin size={20} className="text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-gray-900 mb-1">{C('contact_getting_here_title', 'Getting Here')}</p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {C('contact_getting_here_text', "We're located in the scenic region of Surkhet, easily accessible from the main city area. Free private parking is available for all our guests.")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tertiary: Location Assistance */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-amber-100">
                    <h2 className="font-heading text-2xl font-bold mb-2">
                        {C('contact_location_assistance_heading', 'Location Assistance')}
                    </h2>
                    <p className="text-gray-600 mb-4 max-w-3xl">
                        {C('contact_location_assistance_text', "Having trouble locating us? The Google Maps pin above is accurate. Simply open it on your phone and follow the navigation. If you need additional assistance, feel free to call or WhatsApp us.")}
                    </p>
                    <div className="rounded-xl overflow-hidden shadow-lg bg-black max-w-sm mx-auto">
                        <div className="relative" style={{ paddingBottom: '177.78%' }}>
                            <iframe
                                src={C('tiktok_embed_url', 'https://www.tiktok.com/embed/v2/7636374767192263956')}
                                className="absolute inset-0 w-full h-full"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                title="Highlands Cafe & Motel Inn Location Video"
                            />
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="mt-12 text-center">
                    <p className="text-gray-500 text-sm mb-4">
                        {C('contact_cta_text', 'Prefer to talk? Call or WhatsApp us anytime.')}
                    </p>
                    <a
                        href={`https://wa.me/${C('contact_phone', '+9779763215874').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary inline-flex gap-2"
                    >
                        <Phone size={18} />
                        {C('contact_phone', '+977 9763215874')}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Contact;
