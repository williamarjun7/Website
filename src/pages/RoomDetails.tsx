import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Users,
    Bed,
    Maximize,
    CheckCircle2,
    ArrowLeft,
    Star,
    ShieldCheck,
    Clock,
    MapPin,
    Wifi,
    Tv,
    Wind,
    Coffee,
    Hash,
    Layers
} from 'lucide-react';
import { getRoomById, getRooms, Room } from '../services/roomService';
import RoomCarousel from '../components/RoomCarousel';

const RoomDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [room, setRoom] = useState<Room | null>(null);
    const [relatedRooms, setRelatedRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        const load = async () => {
            const { data: roomData } = await getRoomById(id);
            if (!cancelled) {
                if (roomData) {
                    setRoom(roomData);
                    const { data: allRooms } = await getRooms();
                    if (!cancelled && allRooms) {
                        setRelatedRooms(allRooms.filter(r => r.id !== id).slice(0, 3));
                    }
                } else {
                    navigate('/rooms');
                }
                setLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!room) return null;

    const amenityIcons: Record<string, React.ReactNode> = {
        'wifi': <Wifi size={18} />,
        'ac': <Wind size={18} />,
        'tv': <Tv size={18} />,
        'coffee': <Coffee size={18} />,
        'default': <CheckCircle2 size={18} />
    };

    const getIconForAmenity = (amenity: string) => {
        const lower = amenity.toLowerCase();
        if (lower.includes('wifi')) return amenityIcons.wifi;
        if (lower.includes('ac') || lower.includes('air')) return amenityIcons.ac;
        if (lower.includes('tv') || lower.includes('television')) return amenityIcons.tv;
        if (lower.includes('coffee') || lower.includes('tea')) return amenityIcons.coffee;
        return amenityIcons.default;
    };

    return (
        <div className="min-h-screen pt-24 pb-16 bg-gray-50/50">
            <Helmet>
                <title>{room.name} | Highlands Motel & Cafe</title>
                <meta name="description" content={`Book ${room.name} at Highlands Motel & Cafe in Surkhet. ${room.description?.substring(0, 120)}`} />
            </Helmet>
            <div className="container-custom">
                {/* Back Button */}
                <Link
                    to="/rooms"
                    className="inline-flex items-center text-gray-500 hover:text-primary mb-8 transition-colors group"
                >
                    <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to All Rooms</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Carousel */}
                        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
                            <RoomCarousel
                                images={room.room_images || []}
                                roomName={room.name}
                            />
                        </div>

                        {/* Room Info */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                                            {room.room_type || 'Classic Room'}
                                        </span>
                                        {room.has_ac !== undefined && (
                                            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${room.has_ac ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                <Wind size={12} />
                                                <span>{room.has_ac ? 'AC' : 'Non-AC'}</span>
                                            </span>
                                        )}
                                        {room.featured && (
                                            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                                <Star size={12} />
                                                <span>Featured</span>
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-bold font-heading text-gray-900">
                                        {room.name}
                                    </h1>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                                        {room.room_number && (
                                            <span className="flex items-center space-x-1">
                                                <Hash size={14} />
                                                <span>Room #{room.room_number}</span>
                                            </span>
                                        )}
                                        {room.floor_number && (
                                            <span className="flex items-center space-x-1">
                                                <Layers size={14} />
                                                <span>Floor {room.floor_number}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-primary">NPR {room.price_per_night.toLocaleString()}</div>
                                    <div className="text-gray-400 text-sm">per night</div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl mb-8 border border-gray-100 shadow-inner">
                                <div className="flex flex-col items-center text-center p-2 border-r border-gray-200 last:border-0 md:last:border-0 lg:border-r">
                                    <Users className="text-primary mb-2" size={24} />
                                    <span className="text-xs text-gray-500 font-medium">CAPACITY</span>
                                    <span className="text-sm font-bold text-gray-900">{room.max_guests} Guests</span>
                                </div>
                                <div className="flex flex-col items-center text-center p-2 border-r border-gray-200 last:border-0 md:last:border-r">
                                    <Maximize className="text-primary mb-2" size={24} />
                                    <span className="text-xs text-gray-500 font-medium">SIZE</span>
                                    <span className="text-sm font-bold text-gray-900">{room.room_size || '350 sq.ft'}</span>
                                </div>
                                <div className="flex flex-col items-center text-center p-2 border-r border-gray-200 last:border-0">
                                    <Bed className="text-primary mb-2" size={24} />
                                    <span className="text-xs text-gray-500 font-medium">BED TYPE</span>
                                    <span className="text-sm font-bold text-gray-900">{room.bed_type || 'King Size'}</span>
                                </div>
                                <div className="flex flex-col items-center text-center p-2 last:border-0">
                                    <ShieldCheck className="text-primary mb-2" size={24} />
                                    <span className="text-xs text-gray-500 font-medium">AVAILABILITY</span>
                                    <span className={`text-sm font-bold ${room.availability_status === 'available' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {room.availability_status === 'available' ? 'Available' : room.availability_status || 'Available'}
                                    </span>
                                </div>
                            </div>

                            <div className="prose prose-blue max-w-none">
                                <h3 className="text-xl font-bold font-heading mb-4 text-gray-900">Description</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {room.description}
                                </p>
                            </div>

                            {/* Amenities */}
                            <div className="mt-10 pt-10 border-t border-gray-100">
                                <h3 className="text-xl font-bold font-heading mb-6 text-gray-900">Room Amenities</h3>
                                <div className="mb-6 flex flex-wrap gap-2">
                                    {room.has_ac !== undefined && (
                                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${room.has_ac ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                                            <Wind size={16} />
                                            <span>{room.has_ac ? 'Air Conditioning (AC)' : 'Non-AC (Standard Room)'}</span>
                                        </span>
                                    )}
                                    {room.floor_number && (
                                        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                            <Layers size={16} />
                                            <span>Floor {room.floor_number}</span>
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                    {room.amenities && room.amenities.length > 0 ? (
                                        room.amenities.map((amenity, idx) => (
                                            <div key={idx} className="flex items-center space-x-3 text-gray-600 group">
                                                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                    {getIconForAmenity(amenity)}
                                                </div>
                                                <span className="text-sm font-medium">{amenity}</span>
                                            </div>
                                        ))
                                    ) : (
                                        ['High speed WiFi', 'Air Conditioning', 'Smart TV', 'Room Service', 'Mini Bar', 'Daily Housekeeping'].map((amenity, idx) => (
                                            <div key={idx} className="flex items-center space-x-3 text-gray-600">
                                                <CheckCircle2 className="text-green-500" size={18} />
                                                <span className="text-sm font-medium">{amenity}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Policies */}
                            <div className="mt-10 pt-10 border-t border-gray-100">
                                <h3 className="text-xl font-bold font-heading mb-4 text-gray-900">Policies & Notes</h3>
                                <div className="bg-yellow-50/50 p-6 rounded-2xl border border-yellow-100/50 space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <Clock className="text-yellow-600 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-sm font-bold text-yellow-800">Check-in / Check-out</p>
                                            <p className="text-xs text-yellow-700">Check-in: 02:00 PM | Check-out: 11:00 AM</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <Clock className="text-yellow-600 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-sm font-bold text-yellow-800">Cancellation Policy</p>
                                            <p className="text-xs text-yellow-700">Free cancellation up to 48 hours before check-in.</p>
                                        </div>
                                    </div>
                                    {room.policies && (
                                        <div className="pt-2 border-t border-yellow-100/50 mt-2">
                                            <p className="text-sm text-yellow-800 italic whitespace-pre-line">
                                                {room.policies}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reviews Section (Mock) */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold font-heading text-gray-900">Reviews & Ratings</h3>
                                <div className="flex items-center space-x-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                    <Star className="text-amber-400 fill-amber-400" size={16} />
                                    <span className="font-bold text-amber-700">New</span>
                                </div>
                            </div>

                            <div className="text-center py-12 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <Star className="mx-auto mb-4 text-gray-300" size={40} />
                                <h4 className="font-bold text-gray-900 mb-2">No reviews yet</h4>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                    Be one of our first guests to share your experience at Highlands Cafe & Motel Inn!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Booking */}
                    <div className="space-y-8">
                        {/* Booking Card */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 sticky top-28">
                            <h3 className="text-xl font-bold font-heading mb-6 text-gray-900">Reserve Your Stay</h3>
                            <div className="space-y-4 mb-8 text-gray-600">
                                <div className="flex items-center space-x-3 text-sm">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                    <span>Instant confirmation</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                    <span>Safe and secure payments</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                    <span>Best price guaranteed</span>
                                </div>
                            </div>

                            <Link
                                to="/booking"
                                state={{ selectedRoom: room }}
                                className="btn-primary w-full py-4 text-center text-lg font-bold shadow-lg shadow-primary/20 block"
                            >
                                Book This Room
                            </Link>

                            <p className="text-[10px] text-gray-400 text-center mt-4 uppercase font-bold tracking-widest">
                                No credit card required now
                            </p>
                        </div>

                        {/* Location Mini-map (Mock) */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                                <MapPin size={18} className="mr-2 text-primary" />
                                Location
                            </h4>
                            <div className="aspect-square bg-gray-100 rounded-xl mb-4 overflow-hidden relative">
                                <img
                                    src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=400"
                                    alt="Map"
                                    className="w-full h-full object-cover grayscale opacity-50"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                                    <div className="absolute w-3 h-3 bg-primary rounded-full border-2 border-white" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">Birendranagar-07, Khajura, Surkhet</p>
                        </div>
                    </div>
                </div>

                {/* Related Rooms */}
                <div className="mt-20">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading mb-10 text-gray-900 text-center">
                        Discover Other Rooms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {relatedRooms.map((r) => (
                            <Link
                                key={r.id}
                                to={`/rooms/${r.id}`}
                                className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="aspect-video relative overflow-hidden">
                                    <img
                                        src={r.room_images?.[0]?.image_url}
                                        alt={r.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                                        NPR {r.price_per_night.toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{r.name}</h4>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{r.description}</p>
                                    <div className="mt-4 flex items-center space-x-4 text-xs text-gray-400 font-medium">
                                        <div className="flex items-center space-x-1">
                                            <Users size={14} />
                                            <span>{r.max_guests} Guests</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Bed size={14} />
                                            <span>{r.bed_type || 'King'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomDetails;
