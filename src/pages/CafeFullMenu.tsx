import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { getMenuPages } from '../services/contentService';
import Skeleton from '../components/common/Skeleton';

interface MenuPageImage {
    id: string;
    image_url: string;
    title?: string;
}

const CafeFullMenu = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState<MenuPageImage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getMenuPages().then(({ data }) => {
            if (!cancelled && data) {
                setImages(data.map(p => ({ id: p.id, image_url: p.image_url, title: p.title })));
            }
            if (!cancelled) setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-16">
            <Helmet>
                <title>Full Menu | Highlands Cafe & Motel Inn</title>
            </Helmet>

            <div className="container-custom">
                <button
                    onClick={() => navigate('/cafe')}
                    className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Cafe</span>
                </button>

                <div className="text-center mb-10">
                    <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        Full Menu
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Browse our complete menu card
                    </p>
                </div>

                {loading ? (
                    <div className="max-w-2xl mx-auto space-y-8">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />
                        ))}
                    </div>
                ) : images.length === 0 ? (
                    <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl border border-gray-200">
                        <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">No menu images yet</h2>
                        <p className="text-gray-500">Menu card images will appear here once uploaded.</p>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-8">
                        {images.map((page, index) => (
                            <div
                                key={page.id}
                                className="bg-white rounded-2xl shadow-lg overflow-hidden"
                            >
                                <img
                                    src={page.image_url}
                                    alt={page.title || `Menu page ${index + 1}`}
                                    className="w-full h-auto object-contain"
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                />
                                {page.title && (
                                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                                        <p className="text-sm text-gray-600 font-medium">{page.title}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CafeFullMenu;
