import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText } from 'lucide-react';
import { getSiteImagesByType, getSiteContentMap } from '../services/contentService';

const FALLBACK_TERMS = `
<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  Introduction
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  Welcome to Highlands Cafe & Motel Inn. These Terms of Service govern your use of our website, booking services, and facilities. By accessing our services, you agree to be bound by these Terms.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  Booking & Reservations
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  Valid government-issued ID required at check-in. Guests must be 18 years or older to book independently. Full payment due upon check-in for standard bookings. To secure a reservation, guests choosing "Pay at Property" must pay 60% of the total booking amount in advance through the online payment gateway. The remaining 40% is payable at the property.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  Payment Terms
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We accept Credit Cards (Visa, MasterCard, American Express), Debit Cards, Cash (NPR and USD), Mobile Payment Options, and Bank Transfer. All rates include applicable taxes with no hidden fees.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
  Cancellation & Refund Policy
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  Guests may cancel and receive a refund of the advance payment if cancellation is requested at least 12 hours before the scheduled check-in time. For Pay at Property bookings, the 60% advance payment will be refunded if cancelled 12+ hours before check-in. If cancellation is requested less than 12 hours before check-in, the advance payment becomes non-refundable. No-shows are not eligible for any refund.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  Guest Conduct & Responsibilities
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  Quiet hours: 10:00 PM to 7:00 AM. No smoking in non-designated areas. No illegal substances on premises. Respect other guests and staff. No parties or events without prior approval. Guests responsible for damages to property. Management reserves the right to refuse service.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  Liability & Limitations
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  Not responsible for lost or stolen items. Safe deposit boxes available for valuables. Guests use facilities at their own risk. Travel insurance recommended.
</p>
`;

const Terms = () => {
  const [heroBg, setHeroBg] = useState('https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1200');
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const C = (key: string, fallback: string) => content[key] || fallback;

  useEffect(() => {
    Promise.all([
      getSiteImagesByType('hero'),
      getSiteContentMap(),
    ]).then(([imgRes, contentRes]) => {
      if (imgRes.data && imgRes.data.length > 0) setHeroBg(imgRes.data[0].image_url);
      if (contentRes.data) {
        setContent(contentRes.data);
        if (contentRes.data.terms_content) {
          setHtmlContent(contentRes.data.terms_content);
        }
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>{C('terms_meta_title', 'Terms of Service | Highlands Motel & Cafe')}</title>
        <meta name="description" content={C('terms_meta_desc', 'Read the Terms of Service. Learn about booking policies, cancellation, payment terms, and guest responsibilities.')} />
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
          <img src={heroBg} alt="Terms of Service" className="w-full h-full object-cover opacity-30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <FileText size={48} className="mx-auto mb-4" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">Please read these terms carefully before booking your stay</p>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-4xl">
        <div className="bg-amber-50 rounded-xl p-6 mb-12 text-center">
          <p className="text-gray-700">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          {htmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: FALLBACK_TERMS }} />
          )}
        </div>

        <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8 text-center">
          <h3 className="font-heading text-xl font-bold mb-4">Your Agreement</h3>
          <p className="mb-6">
            By making a reservation or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="/booking" className="inline-flex items-center px-6 py-3 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">Book Your Stay</a>
            <a href="/contact" className="inline-flex items-center px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
