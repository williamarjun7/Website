import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Coffee, Clock, Menu as MenuIcon } from 'lucide-react';
import { getFullMenu } from '../services/menuService';
import { getSiteImagesByPage, getSiteContentMap, getMenuPages } from '../services/contentService';
import menuImgFallback from '../assets/menu.png';
import MenuViewer from '../components/cafe/MenuViewer';
import Skeleton, { SkeletonMenuItem } from '../components/common/Skeleton';

interface MenuCategory {
    id: string;
    name: string;
    sort_order: number;
    items: MenuItem[];
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    available: boolean;
}

const Cafe = () => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [heroImg, setHeroImg] = useState('');
    const [content, setContent] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [menuImages, setMenuImages] = useState<{ id: string; image_url: string; title?: string }[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const C = (key: string, fallback: string) => content[key] || fallback;

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getFullMenu(),
            getSiteImagesByPage('cafe'),
            getSiteContentMap(),
            getMenuPages(),
        ]).then(([menuRes, cafeRes, contentRes, menuPagesRes]) => {
            if (!cancelled) {
                if (menuRes.data && menuRes.data.length > 0) {
                    setMenu(menuRes.data);
                }
                if (cafeRes.data && cafeRes.data.length > 0) {
                    setHeroImg(cafeRes.data[0].image_url);
                }
                if (contentRes.data) setContent(contentRes.data);
                if (menuPagesRes.data && menuPagesRes.data.length > 0) {
                    setMenuImages(menuPagesRes.data.map(p => ({ id: p.id, image_url: p.image_url, title: p.title })));
                }
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const getFeaturedItems = () => {
        if (!menu.length) return [];
        const featuredCategories = menu.slice(0, 2);
        return featuredCategories.map(category => ({
            ...category,
            items: category.items.slice(0, 2)
        })).filter(category => category.items.length > 0);
    };

    const featuredItems = getFeaturedItems();

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>{C('cafe_meta_title', 'Cafe Menu | Highlands Motel & Cafe')}</title>
                <meta name="description" content={C('cafe_meta_desc', 'Savor authentic local cuisine at our cafe in Surkhet.')} />
            </Helmet>

            <section className="relative h-80 mb-16 overflow-hidden bg-gradient-to-br from-amber-800 to-amber-900">
                {heroImg && (
                    <img
                        src={heroImg}
                        alt="Highlands Cafe"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div className="container-custom text-white">
                        <Coffee size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            {C('cafe_hero_title', 'Highlands Cafe')}
                        </h1>
                        <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8">
                            {C('cafe_hero_subtitle', 'Savor authentic local cuisine with breathtaking mountain views')}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a
                                href="tel:+9779763215874"
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                <span>{C('cafe_hero_btn_reserve', 'Call to Reserve')}</span>
                            </a>
                            <button
                                onClick={() => setIsMenuOpen(true)}
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-amber-900 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                <span>{C('cafe_hero_btn_menu', 'View Menu')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container-custom">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <p className="text-lg text-gray-600 leading-relaxed mb-6">
                        {C('cafe_description', 'Our on-site cafe serves fresh, locally-sourced dishes prepared with love. Start your day with a hearty breakfast or enjoy a relaxing meal while taking in the stunning highland scenery.')}
                    </p>
                    <div className="flex items-center justify-center space-x-8 text-gray-700">
                        <div className="flex items-center space-x-2">
                            <Clock size={20} />
                            <span>{C('cafe_hours', 'Open Daily')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold">{C('cafe_hours_text', '7:00 AM - 8:00 PM')}</span>
                        </div>
                    </div>
                </div>

                <div id="menu-section">
                    {loading ? (
                        <div className="max-w-4xl mx-auto">
                            <Skeleton className="h-8 w-48 mx-auto mb-8" />
                            <div className="space-y-8">
                                <div>
                                    <Skeleton className="h-6 w-32 mx-auto mb-4" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[1, 2, 3, 4].map((i) => (
                                            <SkeletonMenuItem key={i} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <Skeleton className="h-7 w-32 mx-auto mt-16 mb-8" />
                            <div className="space-y-6">
                                {[1, 2, 3].map((cat) => (
                                    <div key={cat}>
                                        <Skeleton className="h-5 w-40 mb-4" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[1, 2].map((item) => (
                                                <div key={item} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                                                    <div className="space-y-1 flex-1 mr-3">
                                                        <Skeleton className="h-5 w-36" />
                                                        <Skeleton className="h-4 w-20" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-12">
                            {menu.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 mb-8">{C('cafe_menu_empty', 'Menu coming soon!')}</p>
                                </div>
                            ) : (
                                <>
                                    <h2 className="font-heading text-3xl font-bold mb-8 text-center">
                                        {C('cafe_featured_heading', 'Featured Dishes')}
                                    </h2>
                                    <div className="space-y-12 max-w-4xl mx-auto">
                                        {featuredItems.length > 0 ? (
                                            featuredItems.map((category) => (
                                                <div key={category.id}>
                                                    <h3 className="font-heading text-xl font-semibold mb-4 text-center text-amber-800">
                                                        {category.name}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {category.items.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-start space-x-4 p-4 rounded-lg bg-amber-50/50 border border-amber-100"
                                                            >
                                                                {item.image && (
                                                                    <img
                                                                        src={item.image}
                                                                        alt={item.name}
                                                                        className="w-24 h-24 object-cover rounded-lg"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <h4 className="font-heading text-lg font-semibold">
                                                                            {item.name}
                                                                        </h4>
                                                                        <span className="font-bold text-primary ml-4 whitespace-nowrap">
                                                                            NPR {item.price.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    {item.description && (
                                                                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                                                            {item.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-600">
                                                <p>{C('cafe_featured_empty', 'Featured dishes will be displayed here')}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {menu.length > 0 && (
                                <>
                                    <h2 className="font-heading text-2xl font-bold mt-16 mb-8 text-center">
                                        {C('cafe_full_menu_heading', 'Full Menu')}
                                    </h2>
                                    <div className="space-y-8 max-w-4xl mx-auto">
                                        {menu.map((category) => (
                                            <div key={category.id}>
                                                <h3 className="font-heading text-lg font-semibold mb-4 text-amber-800">
                                                    {category.name}
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {category.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                                                        >
                                                            <div className="min-w-0 flex-1 mr-3">
                                                                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                                                <div className="text-sm text-gray-500">NPR {item.price.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="text-center mt-12">
                                <button
                                    onClick={() => setIsMenuOpen(true)}
                                    className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
                                >
                                    <MenuIcon size={24} />
                                    <span>{C('cafe_view_full_menu_btn', 'View Full Menu')}</span>
                                </button>
                                <p className="mt-3 text-amber-700 font-medium">
                                    {C('cafe_menu_card_text', 'Click to view our detailed menu card')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center bg-gradient-to-r from-amber-900 to-amber-800 text-white rounded-2xl p-12">
<h3 className="font-heading text-3xl font-bold mb-4">
                                        {C('cafe_cta_heading', 'Visit Us Today')}
                                    </h3>
<p className="text-xl mb-6 text-white/90">
                                        {C('cafe_cta_text', 'Experience the warmth of highland hospitality and authentic flavors')}
                                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <a
                            href="tel:+9779763215874"
                            className="btn-primary"
                        >
                            {C('cafe_cta_btn_reserve', 'Call to Reserve')}
                        </a>
                        <a href="/booking" className="btn-secondary bg-white text-amber-900 hover:bg-gray-100">
                            {C('cafe_cta_btn_room', 'Book a Room')}
                        </a>
                    </div>
                </div>
            </div>

            <MenuViewer
                images={menuImages}
                menu={menu}
                pdfUrl={content['view_full_menu_image']?.endsWith('.pdf') ? content['view_full_menu_image'] : null}
                fallbackImage={!menuImages.length && content['view_full_menu_image'] && !content['view_full_menu_image'].endsWith('.pdf') ? content['view_full_menu_image'] : !menuImages.length ? menuImgFallback : undefined}
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </div>
    );
};

export default Cafe;
