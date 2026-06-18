import { useEffect, useState, useRef } from 'react';
import { ExternalLink, Music, Loader2 } from 'lucide-react';

const TIKTOK_USERNAME = 'highlandscafe1';
const EDGE_FN_URL = import.meta.env.VITE_TIKTOK_FN_URL || 'https://6aiag3ra.functions.insforge.app/tiktok-feed';

export default function TikTokFeed() {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${EDGE_FN_URL}?url=${encodeURIComponent(`https://www.tiktok.com/@${TIKTOK_USERNAME}`)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.html) setHtml(data.html);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-16 bg-gray-50/50" aria-label="Latest from TikTok">
      <div className="container-custom">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5 mb-4">
            <Music size={28} className="text-primary" />
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Latest from TikTok</h2>
          <p className="text-gray-500 text-lg">
            Follow <span className="font-semibold text-gray-700">@{TIKTOK_USERNAME}</span> for behind-the-scenes content and updates
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="w-full max-w-[600px] aspect-[3/4] bg-white rounded-2xl animate-pulse border border-gray-100 flex items-center justify-center">
              <Loader2 size={24} className="text-gray-300 animate-spin" />
            </div>
          </div>
        ) : html ? (
          <div className="flex justify-center">
            <div className="w-full max-w-[600px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <iframe
                ref={iframeRef}
                srcDoc={html}
                className="w-full"
                style={{ height: '750px' }}
                title="TikTok embed"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-4">
              <Music size={28} className="text-primary" />
            </div>
            <p className="text-gray-500 mb-6">
              Follow us on TikTok for behind-the-scenes content and updates!
            </p>
            <a
              href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center space-x-2"
              aria-label={`Follow ${TIKTOK_USERNAME} on TikTok`}
            >
              <Music size={18} />
              <span>View on TikTok</span>
              <ExternalLink size={16} />
            </a>
          </div>
        )}

        {!loading && html && (
          <div className="text-center mt-8">
            <a
              href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <span>View all on TikTok</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
