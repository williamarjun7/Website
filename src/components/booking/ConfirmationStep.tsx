import React, { useState, useEffect } from 'react';
import BookingConfirmation, { ConfirmedBookingData, storeConfirmedBooking, clearConfirmedBooking } from './BookingConfirmation';
import { Room } from '../../services/roomService';
import { getSiteContentMap } from '../../services/contentService';

interface ConfirmationStepProps {
    confirmedEmail: string;
    bookingId: string;
    getTotalPrice: () => number;
    selectedRoom?: Room | null;
    guestName?: string;
    guestPhone?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    paymentMethod?: string;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
    confirmedEmail, bookingId, getTotalPrice,
    selectedRoom, guestName, guestPhone, checkIn, checkOut, guests, paymentMethod
}) => {
    const [content, setContent] = useState<Record<string, string>>({});
    useEffect(() => {
        getSiteContentMap().then(r => { if (r.data) setContent(r.data); });
    }, []);
    const C = (key: string, fallback: string) => content[key] || fallback;
    const total = getTotalPrice();

    const bookingData: ConfirmedBookingData = {
        id: bookingId,
        guest_name: guestName || '',
        guest_email: confirmedEmail,
        guest_phone: guestPhone || '',
        check_in: checkIn || '',
        check_out: checkOut || '',
        guests: guests || 1,
        room: {
            id: selectedRoom?.id || '',
            name: selectedRoom?.name || C('confirmation_room_fallback', 'Selected Room'),
            room_number: selectedRoom?.room_number,
            room_type: selectedRoom?.room_type,
        },
        total_price: total,
        payment_method: (paymentMethod as ConfirmedBookingData['payment_method']) || 'pay_at_property',
        payment_status: paymentMethod === 'pay_at_property' ? 'pay_at_property' : 'paid',
        booking_status: 'confirmed',
    };

    clearConfirmedBooking();
    storeConfirmedBooking(bookingData);

    return <BookingConfirmation bookingData={bookingData} />;
};

export default ConfirmationStep;
