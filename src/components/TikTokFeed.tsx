import { useEffect, useState } from 'react';
import { ExternalLink, Music, Play, Loader2 } from 'lucide-react';

interface TikTokVideo {
  id: string;
  url: string;
  cover: string;
  title: string;
}

const TIKTOK_USERNAME = 'highlandscafe1';
const EDGE_FN_URL = import.meta.env.VITE_TIKTOK_FN_URL || 'https://6aiag3ra.functions.insforge.app/tiktok-feed';

export default function TikTokFeed() {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${EDGE_FN_URL}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.videos?.length > 0) setVideos(data.videos);
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
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5 mb-4">
            <Music size={28} className="text-primary" />
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Latest from TikTok</h2>
          <p className="text-gray-500 text-lg">
            Follow <span className="font-semibold text-gray-700">@{TIKTOK_USERNAME}</span> for behind-the-scenes content and updates
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-white rounded-2xl animate-pulse border border-gray-100 flex items-center justify-center">
                <Loader2 size={24} className="text-gray-300 animate-spin" />
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <a
                  key={video.id}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300"
                  aria-label={`Watch TikTok video: ${video.title || 'TikTok video'}`}
                >
                  {video.cover ? (
                    <img
                      src={video.cover}
                      alt={video.title || 'TikTok video'}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Play size={24} className="text-gray-900 ml-1" />
                    </div>
                  </div>
                  {video.title && (
                    <p className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium line-clamp-2 leading-tight">
                      {video.title}
                    </p>
                  )}
                </a>
              ))}
            </div>
            <div className="text-center mt-10">
              <a
                href={`https://www.tiktok.com/@${TIKTOK_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center space-x-2"
                aria-label={`Follow ${TIKTOK_USERNAME} on TikTok`}
              >
                <Music size={18} />
                <span>Follow @{TIKTOK_USERNAME} on TikTok</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </>
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
            >
              <Music size={18} />
              <span>View on TikTok</span>
              <ExternalLink size={16} />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
