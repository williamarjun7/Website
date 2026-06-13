import { Helmet } from 'react-helmet-async';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

const Contact = () => {
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
        window.location.href = `mailto:highlandscafemotelinn@gmail.com?subject=${subject}&body=${body}`;
        setStatus('sent');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setStatus('idle'), 3000);
    };
    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Contact Us | Highlands Motel & Cafe</title>
                <meta name="description" content="Get in touch with Highlands Motel & Cafe. Call +977 9763215874, email us, or visit Birendranagar-07, Khajura, Surkhet, Nepal." />
            </Helmet>
            <div className="container-custom">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                        Contact Us
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        We're here to help make your stay unforgettable.
                        Reach out to us for any questions or special requests.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Information */}
                    <div>
                        <h2 className="font-heading text-2xl font-bold mb-6">Get in Touch</h2>

                        <div className="space-y-6">
                            {/* Phone */}
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Phone className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Phone</h3>
                                    <a
                                        href="https://wa.me/9779763215874"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-600 hover:text-primary transition-colors cursor-pointer"
                                    >
                                        +977 9763215874
                                    </a>
                                    <p className="text-sm text-gray-500 mt-1">Call & WhatsApp Available</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Mail className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Email</h3>
                                    <a
                                        href="mailto:highlandscafemotelinn@gmail.com"
                                        className="text-gray-600 hover:text-primary transition-colors cursor-pointer"
                                    >
                                        highlandscafemotelinn@gmail.com
                                    </a>
                                    <p className="text-sm text-gray-500 mt-1">Quick response within 24 hours</p>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <MapPin className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Address</h3>
                                    <p className="text-gray-600">
                                        Birendranagar-07, Khajura<br />
                                        Surkhet, Karnali Province, Nepal
                                    </p>
                                </div>
                            </div>

                            {/* Check-in/out Times */}
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Clock className="text-primary" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Check-in / Check-out</h3>
                                    <p className="text-gray-600">
                                        Check-in: 2:00 PM<br />
                                        Check-out: 12:00 PM
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Early check-in and late check-out available upon request
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Contact Form */}
                        <div className="mt-8 card">
                            <h3 className="font-heading text-xl font-semibold mb-4">Quick Message</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Your Name"
                                        value={formData.name}
                                        onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setErrors({}); }}
                                        className={`input w-full ${errors.name ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Your Email"
                                        value={formData.email}
                                        onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({}); }}
                                        className={`input w-full ${errors.email ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <textarea
                                        rows={4}
                                        placeholder="Your Message"
                                        value={formData.message}
                                        onChange={(e) => { setFormData({ ...formData, message: e.target.value }); setErrors({}); }}
                                        className={`input w-full resize-none ${errors.message ? 'border-red-400' : ''}`}
                                        required
                                    />
                                    {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {status === 'sending' ? (
                                        'Sending...'
                                    ) : status === 'sent' ? (
                                        'Message Sent!'
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Map */}
                    <div>
                        <h2 className="font-heading text-2xl font-bold mb-6">Location</h2>
                        <div className="rounded-2xl overflow-hidden shadow-lg h-[600px]">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d723.8087843630261!2d81.62689922997156!3d28.58480041587717!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a285d85625ba11%3A0x7d8a767e3791b71b!2sS.k.t%20suppliers!5e1!3m2!1sen!2snp!4v1770808330587!5m2!1sen!2snp"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Highlands Cafe & Motel Inn Location"
                            />
                        </div>
                        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
                            <h4 className="font-semibold mb-2">Getting Here</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                We're located in the scenic region of Surkhet, easily accessible
                                from the main city area. Free private parking is available for all our guests.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
