import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { calculateAdvanceAmount, calculateBalanceAmount } from '../../services/bookingService';
import { Room } from '../../services/roomService';

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
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
    confirmedEmail, bookingId, getTotalPrice,
    selectedRoom, guestName, guestPhone, checkIn, checkOut, guests
}) => {
    const navigate = useNavigate();
    const total = getTotalPrice();
    const advance = calculateAdvanceAmount(total);
    const balance = calculateBalanceAmount(total);

    const printContent = () => {
        window.print();
    };

    return (
        <div className="card text-center print:shadow-none print:border-none print:p-0">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 print:hidden">
                <Check className="text-green-600" size={40} />
            </div>
            <h2 className="font-heading text-3xl font-bold mb-4">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6 print:text-sm">
                Your booking has been successfully confirmed. We've sent a confirmation email to {confirmedEmail}.
            </p>

            {/* Booking Reference */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 print:bg-gray-50 print:border-gray-300">
                <p className="text-sm text-amber-700 mb-1">Booking Reference</p>
                <p className="font-mono text-xl font-bold text-primary">{bookingId}</p>
            </div>

            {/* Guest & Room Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-left text-sm space-y-3 print:border-gray-300">
                <p className="font-semibold text-gray-900 text-base">Booking Details</p>
                {selectedRoom && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Room</span>
                        <span className="font-medium">{selectedRoom.name}{selectedRoom.room_number ? ` (#${selectedRoom.room_number})` : ''}</span>
                    </div>
                )}
                {guestName && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Guest</span>
                        <span className="font-medium">{guestName}</span>
                    </div>
                )}
                {guestPhone && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-medium">{guestPhone}</span>
                    </div>
                )}
                {checkIn && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Check-in</span>
                        <span className="font-medium">{new Date(checkIn).toLocaleDateString()}</span>
                    </div>
                )}
                {checkOut && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Check-out</span>
                        <span className="font-medium">{new Date(checkOut).toLocaleDateString()}</span>
                    </div>
                )}
                {guests && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">Guests</span>
                        <span className="font-medium">{guests}</span>
                    </div>
                )}
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm space-y-2 print:bg-gray-50 print:border print:border-gray-300">
                <p className="font-semibold text-gray-900 mb-2">Payment Summary</p>
                <div className="flex justify-between text-gray-700">
                    <span>Total Booking Amount</span>
                    <span className="font-medium">NPR {total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                    <span>Advance Payment (60%)</span>
                    <span className="font-medium">NPR {advance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700 border-t border-gray-200 pt-2">
                    <span>Balance at Property (40%)</span>
                    <span className="font-medium">NPR {balance.toLocaleString()}</span>
                </div>
            </div>

            {/* Hotel Contact Info (always visible, especially for print) */}
            <div className="text-xs text-gray-400 mb-6 leading-relaxed print:text-gray-600 print:border-t print:border-gray-300 print:pt-4 print:mt-4">
                <p className="font-semibold text-gray-500">Highlands Motel & Cafe</p>
                <p>Surkhet, Nepal</p>
                <p>Phone: +977-98XXXXXXXX</p>
                <p>Email: info@highlands-motel.com</p>
            </div>

            <div className="space-y-4 print:hidden">
                <button onClick={() => navigate('/')} className="btn-primary w-full">Return to Home</button>
                <button onClick={printContent} className="btn-secondary w-full">Print Confirmation</button>
            </div>
        </div>
    );
};

export default ConfirmationStep;
