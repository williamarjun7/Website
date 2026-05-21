import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Users, Bed, ArrowRight, Star } from 'lucide-react';
import { getRooms, Room } from '../services/roomService';
import RoomCarousel from '../components/RoomCarousel';

const Rooms = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const { data } = await getRooms();
        if (data) {
            setRooms(data);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen pt-24 pb-16 bg-gray-50/30">
            <Helmet>
                <title>Rooms | Highlands Motel & Cafe</title>
                <meta name="description" content="Browse our comfortable rooms in Surkhet, Nepal." />
            </Helmet>
            <div className="container-custom">
                {/* Header */}
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <span className="text-primary font-bold text-sm uppercase tracking-widest mb-4 block">Our Accommodations</span>
                    <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
                        Experience Premium Comfort & Serenity
                    </h1>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        Handpicked rooms designed for ultimate relaxation. Each space offers a unique blend of local charm and modern amenities.
                    </p>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="spinner mb-4" />
                        <p className="text-gray-400 font-medium">Finding the best rooms for you...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-lg">No rooms available at the moment. Please check back later.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
                        {rooms.map((room) => (
                            <div key={room.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col">
                                {/* Room Carousel / Image */}
                                <div className="relative">
                                    <RoomCarousel
                                        images={room.room_images || []}
                                        roomName={room.name}
                                    />
                                    <div className="absolute top-4 left-4 z-10">
                                        <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center space-x-1 shadow-sm border border-white/20">
                                            <Star className="text-yellow-400 fill-yellow-400" size={12} />
                                            <span className="text-[10px] font-bold text-gray-800">New & Popular</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-4 right-4 z-10">
                                        <div className="bg-primary px-4 py-2 rounded-2xl text-white shadow-xl flex items-baseline space-x-1">
                                            <span className="text-[10px] font-medium opacity-80">NPR</span>
                                            <span className="text-xl font-bold">{room.price_per_night.toLocaleString()}</span>
                                            <span className="text-[10px] font-medium opacity-80">/ night</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Room Content */}
                                <div className="p-8 flex-grow flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-1">
                                                {room.name}
                                            </h2>
                                            <div className="text-primary text-xs font-bold uppercase tracking-wider">{room.room_type || 'Deluxe Room'}</div>
                                        </div>
                                    </div>

                                    <p className="text-gray-500 mb-8 leading-relaxed line-clamp-2">
                                        {room.description}
                                    </p>

                                    {/* Features Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                                                <Users size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">Guests</span>
                                                <span className="text-xs font-bold">{room.max_guests} People</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                                                <Bed size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">Bed Type</span>
                                                <span className="text-xs font-bold truncate">{room.bed_type || 'King Size'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center space-x-4 mt-auto">
                                        <Link
                                            to={`/booking`}
                                            state={{ selectedRoom: room }}
                                            className="btn-primary flex-1 py-4 text-center text-sm font-bold tracking-wide shadow-lg shadow-primary/10"
                                        >
                                            Book Now
                                        </Link>
                                        <Link
                                            to={`/rooms/${room.id}`}
                                            className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-900 hover:text-white transition-all group/arrow border border-gray-200"
                                            title="View Details"
                                        >
                                            <ArrowRight size={20} className="group-hover/arrow:translate-x-1 transition-transform" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Rooms;
