import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Coffee, MapPin, Users, Star } from 'lucide-react';
import { getRooms } from '../services/roomService';
import { Room } from '../services/roomService';
import { getEffectivePricePerNight } from '../services/bookingService';
import { getFeaturedReviews, type Review } from '../services/reviewService';
import Skeleton from '../components/common/Skeleton';

import { getSiteImagesByPage, getSiteContentMap, SiteImage } from '../services/contentService';
import TikTokFeed from '../components/TikTokFeed';

const Home = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [heroSlides, setHeroSlides] = useState<{ image: string; title: string; subtitle: string }[]>([]);
    const [heroVideoUrl, setHeroVideoUrl] = useState('');
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [cafeImg, setCafeImg] = useState('');
    const [content, setContent] = useState<Record<string, string>>({});
    const [featuredReviews, setFeaturedReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const C = (key: string, fallback: string) => { const v = content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [roomsRes, heroRes, cafeRes, contentRes, reviewsRes] = await Promise.all([
                getRooms(),
                getSiteImagesByPage('home'),
                getSiteImagesByPage('cafe'),
                getSiteContentMap(),
                getFeaturedReviews(6),
            ]);
            if (contentRes.data) {
                setContent(contentRes.data);
                setHeroVideoUrl(contentRes.data.hero_video_url || '');
            }
            if (reviewsRes.data) setFeaturedReviews(reviewsRes.data);

            if (roomsRes.data) {
                const sorted = [...roomsRes.data].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                setRooms(sorted.slice(0, 3));
            }

            if (cafeRes.data && cafeRes.data.length > 0) {
                setCafeImg(cafeRes.data[0].image_url);
            }

            if (heroRes.data && heroRes.data.length > 0) {
                                setHeroSlides(heroRes.data.map((img: SiteImage) => ({
                                    image: img.image_url,
                                    title: img.title || C('hero_title', 'Welcome to Highlands'),
                                    subtitle: C('hero_subtitle', 'Experience Cozy Comfort in Heart of Highlands')
                                })));
            }
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!heroSlides || heroSlides.length === 0) return;

        intervalRef.current = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [heroSlides]);

    return (
        <div className="min-h-screen">
            <Helmet>
                <title>{C('home_meta_title', C('site_name', 'Highlands Cafe & Motel Inn') + ' | Home')}</title>
                <meta name="description" content={C('home_meta_desc', 'Experience a warm, cozy stay. Book comfortable rooms and enjoy great food.')} />
            </Helmet>
            {/* Hero Section */}
            <section className="relative min-h-screen overflow-hidden">
                {/* Video Layer */}
                <div
                    className={`absolute inset-0 transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                >
                    {heroVideoUrl && (
                        <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            onLoadedData={() => setVideoLoaded(true)}
                            className="absolute inset-0 w-full h-full object-cover"
                            src={heroVideoUrl}
                        />
                    )}
                </div>

                {/* Poster Layer */}
                <div
                    className={`absolute inset-0 transition-opacity duration-1000 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}
                >
                    {heroSlides.length > 0 ? (
                        <>
                            {heroSlides.map((slide, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 transition-opacity duration-1000 ${
                                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    <img
                                        src={slide.image}
                                        alt={slide.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-950 to-amber-900" />
                    )}
                </div>

                {/* Gradient overlay (over everything) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 pointer-events-none" />

                {/* Content Layer */}
                <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div className="container-custom text-white pt-20">
                        {heroSlides.length > 0 ? (
                            <>
                                <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                                    {heroSlides[currentSlide].title}
                                </h1>
                                <p className="text-xl md:text-2xl mb-8 text-white/90">
                                    {heroSlides[currentSlide].subtitle}
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4">
                                    {C('hero_title', 'Welcome to Highlands')}
                                </h1>
                                <p className="text-xl mb-8 text-white/90">
                                    {C('hero_subtitle', 'Experience Cozy Comfort in Heart of Highlands')}
                                </p>
                            </>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <Link to="/booking" className="btn-primary inline-block">
                                {C('btn_book_stay', 'Book Your Stay')}
                                <ArrowRight className="inline ml-2" size={20} />
                            </Link>
                            <Link
                                to="/cafe"
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-amber-900 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                <Coffee size={20} />
                                <span>{C('btn_view_menu', 'View Menu')}</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Slide Indicators */}
                {heroSlides.length > 1 && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {heroSlides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                                    index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Features */}
            <section className="py-16 bg-white">
                <div className="container-custom">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <MapPin className="text-primary" size={32} />
                            </div>
                            <h3 className="font-heading text-xl font-semibold mb-2">{C('home_feature_1_title', 'Prime Location')}</h3>
                            <p className="text-gray-600">
                                {C('home_feature_1_desc', 'Nestled in the highlands with stunning mountain views')}
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Coffee className="text-primary" size={32} />
                            </div>
                            <h3 className="font-heading text-xl font-semibold mb-2">{C('home_feature_2_title', 'On-Site Cafe')}</h3>
                            <p className="text-gray-600">
                                {C('home_feature_2_desc', 'Enjoy authentic local cuisine and fresh coffee daily')}
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                <Users className="text-primary" size={32} />
                            </div>
                            <h3 className="font-heading text-xl font-semibold mb-2">{C('home_feature_3_title', 'Warm Hospitality')}</h3>
                            <p className="text-gray-600">
                                {C('home_feature_3_desc', 'Experience genuine care and personalized service')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Room Previews */}
            <section className="py-16">
                <div className="container-custom">
                    <div className="text-center mb-12">
                        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                            {C('home_rooms_title', 'Our Rooms')}
                        </h2>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            {C('home_rooms_desc', 'Choose from our selection of comfortable and well-appointed rooms')}
                        </p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card">
                                    <Skeleton className="aspect-video w-full rounded-lg mb-4" />
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2">
                                            <Skeleton className="h-6 w-40" />
                                            <Skeleton className="h-4 w-12" />
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <div className="flex items-center justify-between pt-2">
                                            <Skeleton className="h-8 w-28" />
                                            <Skeleton className="h-10 w-24 rounded-lg" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {rooms.map((room) => (
                                <div key={room.id} className="card">
                                    <div className="aspect-video bg-gray-200 rounded-lg mb-4 overflow-hidden relative">
                                        <img
                                            src={room.room_images?.[0]?.url}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {room.has_ac !== undefined && (
                                            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm ${room.has_ac ? 'bg-blue-100/90 text-blue-700' : 'bg-gray-100/90 text-gray-600'}`}>
                                                {room.has_ac ? C('rooms_label_ac', 'AC') : C('rooms_label_nonac', 'Non-AC')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <h3 className="font-heading text-xl font-semibold">
                                            {room.name}
                                        </h3>
                                        {room.room_number && (
                                            <span className="text-gray-400 text-xs">#{room.room_number}</span>
                                        )}
                                    </div>
                                    <p className="text-gray-600 mb-4 line-clamp-2">
                                        {room.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {room.discount_percent && room.discount_percent > 0 ? (
                                                <div>
                                                    <span className="text-2xl font-bold text-primary">
                                                        NPR {getEffectivePricePerNight(room).toLocaleString()}
                                                    </span>
                                                    <span className="text-gray-500 text-sm ml-1">/night</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs text-gray-400 line-through">NPR {room.price_per_night.toLocaleString()}</span>
                                                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{room.discount_percent}% OFF</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-2xl font-bold text-primary">
                                                        NPR {room.price_per_night.toLocaleString()}
                                                    </span>
                                                    <span className="text-gray-500 text-sm ml-1">/night</span>
                                                </>
                                            )}
                                        </div>
                                        <Link to="/booking" className="btn-secondary text-sm px-4 py-2">
                                            {C('rooms_label_book', 'Book Now')}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-8">
                        <Link to="/rooms" className="btn-primary inline-block">
                            {C('btn_view_rooms', 'View All Rooms')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Cafe Highlight */}
            <section className="py-16 bg-white">
                <div className="container-custom">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                                {C('home_cafe_title', 'Highlands Cafe')}
                            </h2>
                            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                                {C('home_cafe_desc', 'Start your day with a delicious breakfast or unwind with authentic local cuisine. Our on-site cafe serves fresh, locally-sourced dishes with breathtaking mountain views.')}
                            </p>
                            <ul className="space-y-3 mb-8">
                                {(() => {
                                    const raw = C('home_cafe_bullets', 'Authentic Nepali cuisine\nFresh local ingredients\nMountain view seating');
                                    return raw.split('\n').filter(Boolean).map((item, i) => (
                                        <li key={i} className="flex items-center space-x-3">
                                            <Star className="text-amber-500" size={20} />
                                            <span>{item}</span>
                                        </li>
                                    ));
                                })()}
                            </ul>
                            <Link to="/cafe" className="btn-primary inline-block">
                                {C('btn_view_menu', 'View Menu')}
                            </Link>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-xl">
                            {cafeImg && (
                                <img
                                    src={cafeImg}
                                    alt="Highlands Cafe"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* TikTok Feed */}
            <TikTokFeed />

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-amber-900 to-amber-800 text-white">
                <div className="container-custom text-center">
                    <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                        {C('home_cta_title', 'Ready for Your Highland Escape?')}
                    </h2>
                    <p className="text-xl mb-8 text-white/90">
                        {C('home_cta_desc', 'Book your stay today and experience the warmth of the highlands')}
                    </p>
                    <Link to="/booking" className="btn-primary inline-block">
                        {C('btn_book_now', 'Book Now')}
                        <ArrowRight className="inline ml-2" size={20} />
                    </Link>
                </div>
            </section>

            {/* Featured Reviews */}
            {featuredReviews.length > 0 && (
                <section className="py-16 bg-amber-50/50">
                    <div className="container-custom">
                        <div className="text-center mb-12">
                            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
                                {C('home_reviews_title', 'What Our Guests Say')}
                            </h2>
                            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                                {C('home_reviews_subtitle', 'Real stories from real guests at Highlands')}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {featuredReviews.map((review) => (
                                <div key={review.id} className="bg-white p-6 rounded-2xl shadow-md border border-amber-100">
                                    <div className="flex items-center space-x-1 mb-4">
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <Star key={i} size={16} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                        ))}
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{review.comment}"</p>
                                    <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {review.guest_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900">{review.guest_name}</p>
                                            <p className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
};

export default Home;
