import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { getAllSiteImages, getSiteContentMap } from '../services/contentService';

interface GalleryImage {
  id: string;
  image_url: string;
  page?: string;
  title?: string;
}

const GALLERY_PAGES = ['gallery', 'cafe', 'rooms', 'about', 'other'] as const;

const PAGE_LABELS: Record<string, string> = {
  gallery: 'Gallery',
  cafe: 'Cafe',
  rooms: 'Rooms',
  about: 'About',
  other: 'Other',
};

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [content, setContent] = useState<Record<string, string>>({});
  const C = (key: string, fallback: string) => content[key] || fallback;

  useEffect(() => {
    Promise.all([
      getAllSiteImages(),
      getSiteContentMap(),
    ]).then(([imgRes, contentRes]) => {
      if (contentRes.data) setContent(contentRes.data);
      if (imgRes.data) {
        const filtered = imgRes.data.filter(
          (img) => GALLERY_PAGES.includes(img.page as typeof GALLERY_PAGES[number]) && img.is_active !== false
        );
        setImages(filtered);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getFiltered = useCallback(() => {
    if (activeType === 'all') return images;
    return images.filter((img) => img.page === activeType);
  }, [images, activeType]);

  const filtered = getFiltered();

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === 0 ? filtered.length - 1 : lightboxIndex - 1);
    }
  };
  const nextLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex === filtered.length - 1 ? 0 : lightboxIndex + 1);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>{C('gallery_meta_title', 'Gallery | Highlands Motel & Cafe')}</title>
        <meta name="description" content={C('gallery_meta_desc', 'Explore our photo gallery showcasing rooms, cafe, exterior views, and the beautiful surroundings.')} />
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
          {images.length > 0 && (
            <img
              src={images[0].image_url}
              alt="Gallery"
              className="w-full h-full object-cover opacity-40"
            />
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Camera size={48} className="mx-auto mb-4" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">{C('gallery_heading', 'Gallery')}</h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              {C('gallery_subtitle', 'A visual journey through Highlands Cafe & Motel Inn')}
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-6xl">
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl shadow-md p-1.5 inline-flex flex-wrap gap-1">
            <button
              onClick={() => setActiveType('all')}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeType === 'all'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              {C('gallery_filter_all', 'All Photos')}
            </button>
            {GALLERY_PAGES.map((page) => (
              <button
                key={page}
                onClick={() => setActiveType(page)}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeType === page
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                {C(`gallery_filter_${page}`, PAGE_LABELS[page] || page)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">{C('gallery_empty_heading', 'No photos yet')}</h3>
            <p className="text-gray-400">{C('gallery_empty_text', 'Gallery photos will appear here once added.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((img, index) => (
              <button
                key={img.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <img
                  src={img.image_url}
                  alt={img.title || PAGE_LABELS[img.page || ''] || C('gallery_img_fallback', 'Gallery image')}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                {img.title && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium truncate">{img.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          {filtered.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[85vh] p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={filtered[lightboxIndex].image_url}
              alt={filtered[lightboxIndex].title || C('gallery_img_fallback', 'Gallery image')}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            {filtered[lightboxIndex].title && (
              <p className="text-white text-center mt-4 text-lg font-medium">
                {filtered[lightboxIndex].title}
              </p>
            )}
          </div>

          <div className="absolute bottom-6 text-white/60 text-sm">
            {lightboxIndex + 1} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
