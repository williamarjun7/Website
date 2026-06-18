import { useEffect, useRef } from 'react';
import { ExternalLink, Music } from 'lucide-react';

const TIKTOK_USERNAME = 'highlandscafe1';

export default function TikTokFeed() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    const old = document.getElementById('tiktok-embed-script');
    if (old) old.remove();

    const script = document.createElement('script');
    script.id = 'tiktok-embed-script';
    script.src = `https://www.tiktok.com/embed.js?r=${Date.now()}`;
    script.async = true;
    document.body.appendChild(script);
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

        <div className="flex justify-center">
          <div className="w-full max-w-[600px]">
            <blockquote
              className="tiktok-embed"
              cite={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
              data-unique-id={TIKTOK_USERNAME}
              data-embed-type="creator"
              style={{ maxWidth: '600px', minWidth: '288px', width: '100%' }}
            >
              <section>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.tiktok.com/@${TIKTOK_USERNAME}?refer=creator_embed`}
                >
                  @{TIKTOK_USERNAME}
                </a>
              </section>
            </blockquote>
          </div>
        </div>

        <div className="text-center mt-8">
          <a
            href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            aria-label={`View ${TIKTOK_USERNAME} on TikTok`}
          >
            <span>View all on TikTok</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
