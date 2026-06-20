import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';
import { getSiteImagesByType, getSiteContentMap } from '../services/contentService';

const FALLBACK_PRIVACY = `
<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  Introduction
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  At Highlands Cafe & Motel Inn, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our website and services.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
  Information We Collect
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We collect personal information you provide including name, contact details, address, billing information, phone number, email, government ID details, and check-in/check-out dates. We also collect technical information such as IP address, browser type, operating system, and cookies.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  How We Use Your Information
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We use your information to process bookings and reservations, communicate about your stay, provide customer service, improve our website and services, and send marketing communications with your consent.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  Data Sharing & Third Parties
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We share information with payment processors for transactions, government authorities when required by law, service providers for operational support, and emergency services when necessary. We use third-party services including payment gateways, email service providers, and website analytics tools.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  Data Security Measures
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We implement SSL encryption for all data transmissions, secure payment processing systems, regular security audits and updates, access controls and authentication, data backup and recovery systems, and staff training on privacy protection.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  Your Privacy Rights
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  You have the right to request access to your personal data, correct inaccurate information, update contact details, delete your account and data, and opt out of marketing communications.
</p>

<h2 class="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
  <svg class="mr-3 text-amber-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 7v10"/><path d="M7 12h10"/></svg>
  Cookies & Tracking Technologies
</h2>
<p class="text-gray-700 leading-relaxed mb-4">
  We use essential cookies for website functionality, analytics cookies to improve services, preference cookies for personalization, and marketing cookies for relevant advertising. You can control cookie settings in your browser.
</p>
`;

const Privacy = () => {
  const [heroBg, setHeroBg] = useState('https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200');
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
        if (contentRes.data.privacy_content) {
          setHtmlContent(contentRes.data.privacy_content);
        }
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>{C('privacy_meta_title', 'Privacy Policy | Highlands Motel & Cafe')}</title>
        <meta name="description" content={C('privacy_meta_desc', 'Read our Privacy Policy. Learn how we collect, use, and protect your personal information.')} />
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
          <img src={heroBg} alt="Privacy Policy" className="w-full h-full object-cover opacity-30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Shield size={48} className="mx-auto mb-4" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">Your privacy is important to us. Learn how we protect your information.</p>
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
            <div dangerouslySetInnerHTML={{ __html: FALLBACK_PRIVACY }} />
          )}
        </div>

        <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8 text-center">
          <h3 className="font-heading text-xl font-bold mb-4">Your Privacy Matters</h3>
          <p className="mb-6">
            By using our website and services, you acknowledge that you have read and understood this Privacy Policy. We are committed to protecting your privacy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a href="/booking" className="inline-flex items-center px-6 py-3 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">Book Your Stay</a>
            <a href="/contact" className="inline-flex items-center px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">Contact Privacy Officer</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
