import { useEffect, useState, useRef } from 'react';
import { ExternalLink, Music, Loader2 } from 'lucide-react';

interface TikTokVideo {
  id: string;
  url: string;
  cover: string;
  title: string;
}

interface TikTokFeedProps {
  username?: string;
  maxVideos?: number;
}

declare global {
  interface Window {
    tiktok?: { render: () => void };
  }
}

const TIKTOK_USERNAME = 'highlandscafe1';
const EDGE_FN_URL = `${import.meta.env.VITE_INSFORGE_BASE_URL}/functions/v1/tiktok-feed`;

function TikTokCard({ video, onReady }: { video: TikTokVideo; onReady: () => void }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoaded(true);

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'tiktok-embed';
    blockquote.setAttribute('cite', video.url);
    blockquote.setAttribute('data-video-id', video.id);
    blockquote.style.cssText = 'width:100%;min-width:auto !important;max-width:100%;';

    const section = document.createElement('section');
    const link = document.createElement('a');
    link.href = video.url;
    link.textContent = video.title || 'View on TikTok';
    section.appendChild(link);
    blockquote.appendChild(section);

    blockRef.current?.appendChild(blockquote);

    const check = setInterval(() => {
      if (window.tiktok?.render) {
        window.tiktok.render();
        clearInterval(check);
        setEmbedReady(true);
        onReady();
      }
    }, 300);

    setTimeout(() => {
      clearInterval(check);
      setEmbedReady(true);
      onReady();
    }, 8000);

    return () => clearInterval(check);
  }, [video, loaded, onReady]);

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div ref={blockRef} className="tiktok-embed-wrapper" />
      {!embedReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
          {video.cover ? (
            <img
              src={video.cover}
              alt={video.title || 'TikTok video'}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              loading="lazy"
            />
          ) : null}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
            <p className="text-xs text-gray-400 font-medium">Loading video...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TikTokFeed({ username = TIKTOK_USERNAME, maxVideos = 6 }: TikTokFeedProps) {
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [readyCount, setReadyCount] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${EDGE_FN_URL}?t=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.videos?.length > 0) {
          setVideos(data.videos.slice(0, maxVideos));
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [maxVideos]);

  useEffect(() => {
    if (videos.length === 0 || loadedRef.current) return;
    loadedRef.current = true;

    if (!document.getElementById('tiktok-embed-script')) {
      const script = document.createElement('script');
      script.id = 'tiktok-embed-script';
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [videos]);

  const allReady = readyCount >= videos.length;

  if (error) {
    return (
      <section className="py-16 bg-gray-50/50">
        <div className="container-custom">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-4">
              <Music size={28} className="text-primary" />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Latest from TikTok</h2>
            <p className="text-gray-500 mb-6">
              Follow us on TikTok for behind-the-scenes content and updates!
            </p>
            <a
              href={`https://www.tiktok.com/@${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center space-x-2"
              aria-label={`Follow ${username} on TikTok`}
            >
              <Music size={18} />
              <span>View on TikTok</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50/50" aria-label="Latest TikTok videos">
      <div className="container-custom">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/5 mb-4">
            <Music size={28} className="text-primary" />
          </div>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-3">Latest from TikTok</h2>
          <p className="text-gray-500 text-lg">
            Follow <span className="font-semibold text-gray-700">@{username}</span> for more updates
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] bg-white rounded-2xl animate-pulse border border-gray-100">
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={24} className="text-gray-300 animate-spin" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? null : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <TikTokCard
                  key={video.id}
                  video={video}
                  onReady={() => setReadyCount(c => c + 1)}
                />
              ))}
            </div>

            {allReady && (
              <div className="text-center mt-10">
                <a
                  href={`https://www.tiktok.com/@${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  aria-label={`View all TikTok videos from ${username}`}
                >
                  <span>View all on TikTok</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
