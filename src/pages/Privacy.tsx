import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';
import { getPageBySlug } from '../services/pageService';

const Privacy = () => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPageBySlug('privacy').then(({ data }) => {
      if (data && data.status === 'published' && data.page_content) {
        setHtmlContent(data.page_content);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>Privacy Policy | Highlands Motel & Cafe</title>
        <meta name="description" content="Read our Privacy Policy. Learn how we collect, use, and protect your personal information." />
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900 flex items-center justify-center">
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
          {notFound ? (
            <p className="text-gray-500 text-center py-8">Privacy policy content is being updated. Please check back later.</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
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
