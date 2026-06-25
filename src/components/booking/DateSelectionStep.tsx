import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { Room } from '../../services/roomService';
import { calculateTotalPrice, getEffectivePricePerNight } from '../../services/bookingService';
import { getSiteContentMap } from '../../services/contentService';
import Skeleton from '../common/Skeleton';

interface DateSelectionStepProps {
    checkIn: string;
    checkOut: string;
    guests: number;
    today: string;
    tomorrow: string;
    loading: boolean;
    availableRooms: Room[];
    onCheckInChange: (v: string) => void;
    onCheckOutChange: (v: string) => void;
    onGuestsChange: (v: number) => void;
    onRoomSelect: (room: Room) => void;
}

const DateSelectionStep: React.FC<DateSelectionStepProps> = ({
    checkIn, checkOut, guests, today, tomorrow,
    loading, availableRooms,
    onCheckInChange, onCheckOutChange, onGuestsChange, onRoomSelect
}) => {
    const [content, setContent] = useState<Record<string, string>>({});
    useEffect(() => {
        getSiteContentMap().then(r => { if (r.data) setContent(r.data); });
    }, []);
    const C = (key: string, fallback: string) => content[key] || fallback;
    const calculateNights = () => {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const nights = calculateNights();

    return (
        <div className="card">
            <h2 className="font-heading text-3xl font-bold mb-6">{C('booking_select_dates', 'Select Your Dates')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                        <label htmlFor="check_in" className="block text-sm font-medium mb-2">{C('booking_checkin', 'Check-in Date')}</label>
                    <input id="check_in" type="date" min={today} value={checkIn}
                        onChange={(e) => onCheckInChange(e.target.value)} className="input w-full" />
                </div>
                <div>
                        <label htmlFor="check_out" className="block text-sm font-medium mb-2">{C('booking_checkout', 'Check-out Date')}</label>
                    <input id="check_out" type="date" min={checkIn || tomorrow} value={checkOut}
                        onChange={(e) => onCheckOutChange(e.target.value)} className="input w-full" />
                </div>
                <div>
                    <label htmlFor="guests" className="block text-sm font-medium mb-2">{C('booking_guests', 'Guests')}</label>
                    <select id="guests" value={guests}
                        onChange={(e) => onGuestsChange(Number(e.target.value))} className="input w-full">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                            <option key={num} value={num}>{num} {num === 1 ? C('booking_guest', 'Guest') : C('booking_guests_plural', 'Guests')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {checkIn && checkOut && checkIn < checkOut && (
                <>
                    <h3 className="font-heading text-2xl font-semibold mb-4">
                        {C('booking_available_rooms', 'Available Rooms')} ({nights} {nights === 1 ? C('booking_night', 'night') : C('booking_nights', 'nights')})
                    </h3>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start space-x-4">
                                        <Skeleton className="w-32 h-24 rounded-lg flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-6 w-48" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-3/4" />
                                            <div className="flex items-center space-x-3">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-5 w-14 rounded-full" />
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <Skeleton className="h-7 w-28" />
                                            <Skeleton className="h-4 w-20 ml-auto" />
                                            <Skeleton className="h-9 w-28 rounded-lg ml-auto" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : availableRooms.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">{C('booking_no_rooms', 'No rooms available for selected dates.')}</p>
                            <p className="text-sm text-gray-400 mt-2">{C('booking_no_rooms_sub', 'Please try different dates.')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {availableRooms.map((room) => (
                                <button key={room.id} type="button"
                                    className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    onClick={() => onRoomSelect(room)}>
                                    <div className="flex items-start space-x-4">
                                        <img src={room.room_images?.[0]?.url} alt={room.name}
                                            className="w-32 h-24 object-cover rounded-lg" />
                                        <div className="flex-1">
                                            <h4 className="font-heading text-xl font-semibold mb-1">
                                                {room.name}
                                                {room.room_number && <span className="text-gray-400 text-sm font-normal ml-1">#{room.room_number}</span>}
                                            </h4>
                                            <p className="text-gray-600 text-sm mb-2">{room.description}</p>
                                            <div className="flex items-center space-x-3 text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Users size={16} className="mr-1" /> {C('booking_up_to', 'Up to')} {room.max_guests} {C('booking_guests_suffix', 'guests')}
                                                </div>
                                                {room.has_ac !== undefined && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.has_ac ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {room.has_ac ? C('booking_ac_label', 'AC') : C('booking_nonac_label', 'Non-AC')}
                                                    </span>
                                                )}
                                                {room.floor_number && <span className="text-gray-400">{C('booking_floor_prefix', 'Floor')} {room.floor_number}</span>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">
                                                {C('booking_npr', 'NPR')} {calculateTotalPrice(getEffectivePricePerNight(room), checkIn, checkOut).toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {C('booking_npr', 'NPR')} {getEffectivePricePerNight(room).toLocaleString()}{C('booking_night_suffix', '/night')}
                                                {room.discount_percent != null && room.discount_percent > 0 && (
                                                    <span className="text-[10px] text-red-500 ml-1">({room.discount_percent}{C('booking_off_label', '% OFF')})</span>
                                                )}
                                            </div>
                                            <span className="btn-primary mt-2 text-sm px-4 py-2 inline-block">{C('booking_select_room_btn', 'Select Room')}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DateSelectionStep;
