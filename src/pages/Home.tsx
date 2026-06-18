import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Coffee, MapPin, Users, Star } from 'lucide-react';
import { getRooms } from '../services/roomService';
import { Room } from '../services/roomService';
import { getEffectivePricePerNight } from '../services/bookingService';
import Skeleton from '../components/common/Skeleton';

import { getSiteImagesByType, getSiteContentMap, SiteImage } from '../services/contentService';
import TikTokFeed from '../components/TikTokFeed';

const Home = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [heroSlides, setHeroSlides] = useState<{ image: string; title: string; subtitle: string }[]>([]);
    const [cafeImg, setCafeImg] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800');
    const [content, setContent] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const C = (key: string, fallback: string) => content[key] || fallback;
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [roomsRes, heroRes, cafeRes, contentRes] = await Promise.all([
                getRooms(),
                getSiteImagesByType('hero'),
                getSiteImagesByType('cafe'),
                getSiteContentMap(),
            ]);
            if (contentRes.data) setContent(contentRes.data);

            if (roomsRes.data) {
                const sorted = [...roomsRes.data].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                setRooms(sorted.slice(0, 3));
            }

            if (heroRes.data && heroRes.data.length > 0) {
                                setHeroSlides(heroRes.data.map((img: SiteImage) => ({
                                    image: img.image_url,
                                    title: img.title || C('hero_title', 'Welcome to Highlands'),
                                    subtitle: C('hero_subtitle', 'Experience Cozy Comfort in Heart of Highlands')
                                })));
            } else {
                // Add sample hero slides for demonstration
                setHeroSlides([
                    {
                        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200',
                        title: C('hero_title', 'Welcome to Highlands'),
                        subtitle: C('hero_subtitle', 'Experience Cozy Comfort in Heart of Highlands')
                    },
                    {
                        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
                        title: 'Luxury Mountain Views',
                        subtitle: 'Wake Up to Breathtaking Himalayan Scenery'
                    },
                    {
                        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200',
                        title: 'Authentic Nepali Hospitality',
                        subtitle: 'Warm Service & Traditional Highland Charm'
                    }
                ]);
            }
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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
                <title>Highlands Motel & Cafe | Home</title>
                <meta name="description" content="Experience a warm, cozy stay at Highlands Motel & Cafe. Book comfortable rooms and enjoy great food." />
            </Helmet>
            {/* Hero Section */}
            <section className="relative h-[600px] md:h-[700px] overflow-hidden">
                {heroSlides.length > 0 ? (
                    <>
                        {heroSlides.map((slide, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                                    }`}
                            >
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
                                <div className="absolute inset-0 flex items-center justify-center text-center">
                                    <div className="container-custom text-white">
                                        <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
                                            {slide.title}
                                        </h1>
                                        <p className="text-xl md:text-2xl mb-8 text-white/90">
                                            {slide.subtitle}
                                        </p>

                                        {/* CTA Buttons */}
                                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                                            <Link to="/booking" className="btn-primary inline-block">
                                                Book Your Stay
                                                <ArrowRight className="inline ml-2" size={20} />
                                            </Link>
                                            <Link
                                                to="/cafe"
                                                className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-amber-900 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                                            >
                                                <Coffee size={20} />
                                                <span>View Menu</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Slide Indicators */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
                            {heroSlides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`w-3 h-3 rounded-full transition-all cursor-pointer ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                                        }`}
                                    aria-label={`Go to slide ${index + 1}`}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0">
                        {/* Fallback Hero Image */}
                        <img
                            src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200"
                            alt="Highlands Cafe & Motel Inn"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
                        <div className="absolute inset-0 flex items-center justify-center text-center">
                            <div className="text-center">
                                <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4">{C('hero_title', 'Welcome to Highlands')}</h1>
                                <p className="text-xl mb-8">{C('hero_subtitle', 'Experience Cozy Comfort')}</p>

                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                                    <Link to="/booking" className="btn-primary inline-block">
                                        Book Your Stay
                                        <ArrowRight className="inline ml-2" size={20} />
                                    </Link>
                                    <Link
                                        to="/cafe"
                                        className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-amber-900 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                                    >
                                        <Coffee size={20} />
                                        <span>View Menu</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
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
                                            src={room.room_images?.[0]?.image_url}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {room.has_ac !== undefined && (
                                            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm ${room.has_ac ? 'bg-blue-100/90 text-blue-700' : 'bg-gray-100/90 text-gray-600'}`}>
                                                {room.has_ac ? 'AC' : 'Non-AC'}
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
                                            Book Now
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="text-center mt-8">
                        <Link to="/rooms" className="btn-primary inline-block">
                            View All Rooms
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
                                <li className="flex items-center space-x-3">
                                    <Star className="text-amber-500" size={20} />
                                    <span>Authentic Nepali cuisine</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <Star className="text-amber-500" size={20} />
                                    <span>Fresh local ingredients</span>
                                </li>
                                <li className="flex items-center space-x-3">
                                    <Star className="text-amber-500" size={20} />
                                    <span>Mountain view seating</span>
                                </li>
                            </ul>
                            <Link to="/cafe" className="btn-primary inline-block">
                                View Menu
                            </Link>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-xl">
                            <img
                                src={cafeImg}
                                alt="Highlands Cafe"
                                className="w-full h-full object-cover"
                            />
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
                        Book Now
                        <ArrowRight className="inline ml-2" size={20} />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
