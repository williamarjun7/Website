import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, FileQuestion } from 'lucide-react';
import { getPageBySlug, type SitePage } from '../services/pageService';
import { sanitizeHtml } from '../utils/sanitize';

const DynamicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotFound(false);

      const timeout = setTimeout(() => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }, 8000);

      try {
        const { data, error } = await getPageBySlug(slug);
        clearTimeout(timeout);
        if (cancelled) return;
        if (error || !data) {
          setNotFound(true);
        } else {
          setPage(data);
        }
        setLoading(false);
      } catch {
        clearTimeout(timeout);
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">Loading page...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page || page.status !== 'published') {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Helmet>
          <title>Page Not Found | Highlands Cafe & Motel Inn</title>
          <meta name="description" content="The page you are looking for does not exist." />
        </Helmet>
        <div className="text-center max-w-md">
          <FileQuestion size={64} className="text-gray-300 mx-auto mb-6" />
          <h1 className="font-heading text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-500 mb-8">The page you are looking for does not exist or is no longer available.</p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>{page.seo_title || page.title} | Highlands Cafe & Motel Inn</title>
        {page.seo_description && <meta name="description" content={page.seo_description} />}
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
          {page.featured_image && (
            <img src={page.featured_image} alt={page.title} className="w-full h-full object-cover opacity-30" />
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">{page.title}</h1>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-4xl">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.page_content) }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicPage;
