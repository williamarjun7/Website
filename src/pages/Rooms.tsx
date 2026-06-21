import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    Users,
    Bed,
    ArrowRight,
    Star,
    Wind,
    Search,
    SlidersHorizontal,
    X
} from 'lucide-react';
import { getRooms, Room } from '../services/roomService';
import { getEffectivePricePerNight } from '../services/bookingService';
import { getSiteContentMap } from '../services/contentService';
import RoomCarousel from '../components/RoomCarousel';
import { SkeletonRoomCard } from '../components/common/Skeleton';

const Rooms = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [content, setContent] = useState<Record<string, string>>({});
    const C = (key: string, fallback: string) => { const v = content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };

    const [filters, setFilters] = useState({
        acFilter: 'all',
        typeFilter: 'all',
        minPrice: '',
        maxPrice: '',
        searchQuery: ''
    });

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            getRooms(),
            getSiteContentMap(),
        ]).then(([roomsResult, contentResult]) => {
            if (!cancelled) {
                if (contentResult.data) setContent(contentResult.data);
                if (roomsResult.data) {
                    setRooms(roomsResult.data);
                }
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, []);

    const filteredRooms = useMemo(() => {
        let result = [...rooms];

        if (filters.acFilter === 'ac') {
            result = result.filter(r => r.has_ac === true);
        } else if (filters.acFilter === 'non-ac') {
            result = result.filter(r => r.has_ac === false);
        }

        if (filters.typeFilter === 'single') {
            result = result.filter(r => r.room_type?.toLowerCase().includes('single'));
        } else if (filters.typeFilter === 'double') {
            result = result.filter(r => r.room_type?.toLowerCase().includes('double'));
        }

        if (filters.minPrice) {
            result = result.filter(r => getEffectivePricePerNight(r) >= Number(filters.minPrice));
        }
        if (filters.maxPrice) {
            result = result.filter(r => getEffectivePricePerNight(r) <= Number(filters.maxPrice));
        }

        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(query) ||
                r.room_number?.toLowerCase().includes(query) ||
                r.room_type?.toLowerCase().includes(query) ||
                r.amenities?.some(a => a.toLowerCase().includes(query))
            );
        }

        return result;
    }, [rooms, filters]);

    const clearFilters = () => {
        setFilters({
            acFilter: 'all',
            typeFilter: 'all',
            minPrice: '',
            maxPrice: '',
            searchQuery: ''
        });
    };

    const hasActiveFilters = filters.acFilter !== 'all' || filters.typeFilter !== 'all' ||
        filters.minPrice !== '' || filters.maxPrice !== '';

    return (
        <div className="min-h-screen pt-24 pb-16 bg-gray-50/30">
            <Helmet>
                <title>{C('rooms_meta_title', 'Rooms | Highlands Motel & Cafe')}</title>
                <meta name="description" content={C('rooms_meta_desc', 'Browse our comfortable rooms in Surkhet, Nepal.')} />
            </Helmet>
            <section className="relative h-80 mb-16 overflow-hidden bg-gradient-to-r from-amber-900 to-orange-900">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <Bed size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            {C('rooms_hero_title', 'Experience Premium Comfort & Serenity')}
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            {C('rooms_hero_desc', 'Handpicked rooms designed for ultimate relaxation. Each space offers a unique blend of local charm and modern amenities.')}
                        </p>
                    </div>
                </div>
            </section>
            <div className="container-custom">
                {/* Search + Filter Bar */}
                <div className="mb-10">
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={filters.searchQuery}
                                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                                placeholder={C('rooms_search_placeholder', 'Search rooms by name, number, type...')}
                                className="input w-full pl-12 pr-10"
                            />
                            {filters.searchQuery && (
                                <button
                                    onClick={() => setFilters({ ...filters, searchQuery: '' })}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-secondary flex items-center space-x-2 justify-center ${showFilters ? 'bg-primary text-white border-primary' : ''}`}
                        >
                            <SlidersHorizontal size={18} />
                            <span>{C('rooms_filter_btn', 'Filters')}</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                            )}
                        </button>
                    </div>

                    {/* Expandable Filters */}
                    {showFilters && (
                        <div className="mt-4 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-sm">{C('rooms_filter_heading', 'Filter Rooms')}</h3>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="text-xs text-primary font-medium hover:underline">
                                        {C('rooms_filter_clear', 'Clear all filters')}
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{C('rooms_filter_ac_label', 'AC / Non-AC')}</label>
                                    <select
                                        value={filters.acFilter}
                                        onChange={(e) => setFilters({ ...filters, acFilter: e.target.value })}
                                        className="input w-full text-sm"
                                    >
                                        <option value="all">{C('rooms_filter_ac_all', 'All')}</option>
                                        <option value="ac">{C('rooms_filter_ac_ac', 'Air Conditioning (AC)')}</option>
                                        <option value="non-ac">{C('rooms_filter_ac_nonac', 'Non-AC')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{C('rooms_filter_type_label', 'Room Type')}</label>
                                    <select
                                        value={filters.typeFilter}
                                        onChange={(e) => setFilters({ ...filters, typeFilter: e.target.value })}
                                        className="input w-full text-sm"
                                    >
                                        <option value="all">{C('rooms_filter_type_all', 'All')}</option>
                                        <option value="single">{C('rooms_filter_type_single', 'Single Room')}</option>
                                        <option value="double">{C('rooms_filter_type_double', 'Double Room')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{C('rooms_filter_min_price', 'Min Price (NPR)')}</label>
                                    <input
                                        type="number"
                                        value={filters.minPrice}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                        placeholder="0"
                                        className="input w-full text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{C('rooms_filter_max_price', 'Max Price (NPR)')}</label>
                                    <input
                                        type="number"
                                        value={filters.maxPrice}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                        placeholder="5000"
                                        className="input w-full text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                        {[1, 2, 3, 4].map((i) => (
                            <SkeletonRoomCard key={i} />
                        ))}
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        {hasActiveFilters || filters.searchQuery ? (
                            <>
                                <p className="text-gray-500 text-lg mb-2">{C('rooms_no_results', 'No rooms match your criteria.')}</p>
                                <button onClick={clearFilters} className="text-primary font-medium hover:underline">
                                    {C('rooms_filter_clear', 'Clear all filters')}
                                </button>
                            </>
                        ) : (
                            <p className="text-gray-500 text-lg">{C('rooms_no_rooms', 'No rooms available at the moment. Please check back later.')}</p>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-400 mb-6 font-medium">{C('rooms_count_found', '{count} room(s) found').replace('{count}', String(filteredRooms.length))}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                            {filteredRooms.map((room) => (
                                <div key={room.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col">
                                    <div className="relative">
                                        <RoomCarousel
                                            images={room.room_images || []}
                                            roomName={room.name}
                                        />
                                        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                                            {room.availability_status && room.availability_status !== 'available' && (
                                                <div className="bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm border border-white/20">
                                                    <span className="text-[10px] font-bold text-white">{room.availability_status === 'limited' ? C('rooms_label_limited', 'Limited Availability') : C('rooms_label_booked', 'Booked')}</span>
                                                </div>
                                            )}
                                            {room.featured && (
                                                <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm border border-white/20">
                                                    <Star className="text-yellow-400 fill-yellow-400" size={12} />
                                                    <span className="text-[10px] font-bold text-gray-800">{C('rooms_label_featured', 'Featured')}</span>
                                                </div>
                                            )}
                                            {room.maintenance && (
                                                <div className="bg-amber-500/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm border border-white/20">
                                                    <span className="text-[10px] font-bold text-white">{C('rooms_label_maintenance', 'Under Maintenance')}</span>
                                                </div>
                                            )}
                                            {room.has_ac !== undefined && (
                                                <div className={`px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm border border-white/20 backdrop-blur-md ${room.has_ac ? 'bg-blue-100/90 text-blue-700' : 'bg-gray-100/90 text-gray-600'}`}>
                                                    <Wind size={12} />
                                                    <span className="text-[10px] font-bold">{room.has_ac ? C('rooms_label_ac', 'AC') : C('rooms_label_nonac', 'Non-AC')}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute top-4 right-4 z-10">
                                            {room.floor_number && (
                                                <div className="bg-gray-900/70 backdrop-blur-md px-2 py-1 rounded-full text-[10px] text-white font-medium shadow-sm">
                                                    {C('rooms_label_floor', 'Floor')} {room.floor_number}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-4 right-4 z-10">
                                            {room.discount_percent && room.discount_percent > 0 ? (
                                                <div className="bg-primary px-4 py-2 rounded-2xl text-white shadow-xl">
                                                    <div className="flex items-baseline space-x-1">
                                                        <span className="text-[10px] font-medium opacity-80">NPR</span>
                                                        <span className="text-xl font-bold">{getEffectivePricePerNight(room).toLocaleString()}</span>
                                                <span className="text-[10px] font-medium opacity-80">{C('rooms_label_night', '/ night')}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 mt-0.5">
                                                        <span className="text-xs line-through opacity-70">NPR {room.price_per_night.toLocaleString()}</span>
                                                        <span className="text-[9px] bg-red-500 px-1.5 py-0.5 rounded-full font-bold">{room.discount_percent}% OFF</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-primary px-4 py-2 rounded-2xl text-white shadow-xl flex items-baseline space-x-1">
                                                    <span className="text-[10px] font-medium opacity-80">NPR</span>
                                                    <span className="text-xl font-bold">{room.price_per_night.toLocaleString()}</span>
                                                    <span className="text-[10px] font-medium opacity-80">/ night</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-8 flex-grow flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h2 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-1">
                                                    {room.name}
                                                </h2>
                                                <div className="flex items-center space-x-2 flex-wrap">
                                                    <span className="text-primary text-xs font-bold uppercase tracking-wider">{room.room_type || C('rooms_type_fallback', 'Standard Room')}</span>
                                                    {room.room_size && <span className="text-gray-400 text-xs">• {room.room_size}</span>}
                                                    {room.room_number && (
                                                        <span className="text-gray-400 text-xs">• #{room.room_number}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-gray-500 mb-8 leading-relaxed line-clamp-2">
                                            {room.description}
                                        </p>

                                        {room.amenities && room.amenities.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {room.amenities.slice(0, 4).map((amenity, idx) => (
                                                    <span key={idx} className="text-[10px] bg-gray-50 px-2 py-1 rounded-full text-gray-500 font-medium border border-gray-100">
                                                        {amenity}
                                                    </span>
                                                ))}
                                                {room.amenities.length > 4 && (
                                                    <span className="text-[10px] text-gray-400 font-medium">{C('rooms_label_more', '+{count} more').replace('{count}', String(room.amenities.length - 4))}</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                                                    <Users size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{C('rooms_label_guests', 'Guests')}</span>
                                                    <span className="text-xs font-bold">{room.max_guests} {C('rooms_label_people', 'People')}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                                                    <Bed size={16} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{C('rooms_label_bed', 'Bed Type')}</span>
                                                    <span className="text-xs font-bold truncate">{room.bed_type || C('rooms_bed_fallback', 'King Size')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4 mt-auto">
                                            {room.maintenance ? (
                                                <span className="btn-primary flex-1 py-4 text-center text-sm font-bold tracking-wide shadow-lg shadow-primary/10 opacity-50 cursor-not-allowed">
                                                    {C('rooms_label_unavailable', 'Unavailable')}
                                                </span>
                                            ) : (
                                                <Link
                                                    to={`/booking`}
                                                    state={{ selectedRoom: room }}
                                                    className="btn-primary flex-1 py-4 text-center text-sm font-bold tracking-wide shadow-lg shadow-primary/10"
                                                >
                                                    {C('rooms_label_book', 'Book Now')}
                                                </Link>
                                            )}
                                            <Link
                                                to={`/rooms/${room.id}`}
                                                className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-900 hover:text-white transition-all group/arrow border border-gray-200"
                                                title={C('rooms_view_details', 'View Details')}
                                            >
                                                <ArrowRight size={20} className="group-hover/arrow:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Rooms;
