import React, { useState, useEffect } from 'react';
import { UseFormRegister, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { QrCode, ExternalLink } from 'lucide-react';
import { Room } from '../../services/roomService';
import { calculateAdvanceAmount, calculateBalanceAmount } from '../../services/bookingService';
import { getSiteContentMap } from '../../services/contentService';
import { BookingFormData } from '../../pages/bookingSchema';

interface GuestInfoStepProps {
    selectedRoom: Room;
    checkIn: string;
    checkOut: string;
    guests: number;
    selectedPaymentMethod: string;
    loading: boolean;
    isSubmitting: boolean;
    register: UseFormRegister<BookingFormData>;
    errors: FieldErrors<BookingFormData>;
    handleSubmit: UseFormHandleSubmit<BookingFormData>;
    onSubmit: (data: BookingFormData) => Promise<void>;
    onBack: () => void;
    getTotalPrice: () => number;
}

const GuestInfoStep: React.FC<GuestInfoStepProps> = ({
    selectedRoom, checkIn, checkOut, guests, selectedPaymentMethod,
    loading, isSubmitting, register, errors, handleSubmit, onSubmit, onBack, getTotalPrice
}) => {
    const [content, setContent] = useState<Record<string, string>>({});
    useEffect(() => {
        getSiteContentMap().then(r => { if (r.data) setContent(r.data); });
    }, []);
    const C = (key: string, fallback: string) => content[key] || fallback;
    return (
    <div className="card">
        <h2 className="font-heading text-3xl font-bold mb-6">{C('booking_guest_heading', 'Guest Information')}</h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">{selectedRoom.name}</h3>
            <div className="text-sm text-gray-600 space-y-1">
                <p>{C('booking_checkin_label', 'Check-in:')} {new Date(checkIn).toLocaleDateString()}</p>
                <p>{C('booking_checkout_label', 'Check-out:')} {new Date(checkOut).toLocaleDateString()}</p>
                <p>{C('booking_guests_label', 'Guests:')} {guests}</p>
                <p className="font-semibold text-primary text-lg mt-2">{C('booking_total_label', 'Total:')} {C('booking_npr', 'NPR')} {getTotalPrice().toLocaleString()}</p>
            </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <label htmlFor="guest_name" className="block text-sm font-medium mb-2">{C('booking_name_label', 'Full Name *')}</label>
                <input id="guest_name" type="text" {...register('guest_name')}
                    className="input w-full" placeholder={C('booking_name_placeholder', 'John Doe')} aria-invalid={errors.guest_name ? "true" : "false"} />
                {errors.guest_name && <p className="text-red-500 text-sm mt-1">{errors.guest_name.message}</p>}
            </div>

            <div>
                <label htmlFor="guest_email" className="block text-sm font-medium mb-2">{C('booking_email_label', 'Email *')}</label>
                <input id="guest_email" type="email" {...register('guest_email')}
                    className="input w-full" placeholder={C('booking_email_placeholder', 'john@example.com')} aria-invalid={errors.guest_email ? "true" : "false"} />
                {errors.guest_email && <p className="text-red-500 text-sm mt-1">{errors.guest_email.message}</p>}
            </div>

            <div>
                <label htmlFor="guest_phone" className="block text-sm font-medium mb-2">{C('booking_phone_label', 'Phone *')}</label>
                <input id="guest_phone" type="tel" {...register('guest_phone')}
                    className="input w-full" placeholder={C('booking_phone_placeholder', '98XXXXXXXX')} aria-invalid={errors.guest_phone ? "true" : "false"} />
                {errors.guest_phone && <p className="text-red-500 text-sm mt-1">{errors.guest_phone.message}</p>}
            </div>

            <div>
                <label htmlFor="special_requests" className="block text-sm font-medium mb-2">{C('booking_special_requests_label', 'Special Requests or Notes')} <span className="text-gray-400 font-normal">({C('booking_optional', 'optional')})</span></label>
                <textarea id="special_requests" {...register('special_requests')}
                    rows={3}
                    className="input w-full resize-none"
                    placeholder={C('booking_special_requests_placeholder', 'e.g., early check-in, ground floor room, extra pillows...')}
                    aria-invalid={errors.special_requests ? "true" : "false"} />
                {errors.special_requests && <p className="text-red-500 text-sm mt-1">{errors.special_requests.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium mb-3">{C('booking_payment_method_label', 'Payment Method')}</label>
                <div className="grid gap-3">
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedPaymentMethod === 'pay_at_property' ? 'border-amber-900 bg-amber-50 shadow-sm' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
                        <input type="radio" value="pay_at_property" {...register('paymentMethod')} className="mt-1 w-4 h-4 accent-amber-900" />
                        <div className="flex-1">
                            <span className="font-heading font-bold text-gray-900">{C('booking_pay_at_property', 'Pay at Property')}</span>
                            <p className="text-sm text-gray-500 mt-0.5">{C('booking_pay_at_property_desc', 'Pay 60% advance now, remaining 40% at the property')}</p>
                        </div>
                    </label>
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedPaymentMethod === 'fonepay_qr' ? 'border-amber-900 bg-amber-50 shadow-sm' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
                        <input type="radio" value="fonepay_qr" {...register('paymentMethod')} className="mt-1 w-4 h-4 accent-amber-900" />
                        <QrCode size={20} className="mt-0.5 text-amber-700 shrink-0" />
                        <div className="flex-1">
                            <span className="font-heading font-bold text-gray-900">{C('booking_fonepay_qr', 'Fonepay QR')}</span>
                            <p className="text-sm text-gray-500 mt-0.5">{C('booking_fonepay_qr_desc', 'Pay instantly by scanning a QR code with Fonepay app')}</p>
                        </div>
                    </label>
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${selectedPaymentMethod === 'fonepay_web' ? 'border-amber-900 bg-amber-50 shadow-sm' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
                        <input type="radio" value="fonepay_web" {...register('paymentMethod')} className="mt-1 w-4 h-4 accent-amber-900" />
                        <ExternalLink size={20} className="mt-0.5 text-amber-700 shrink-0" />
                        <div className="flex-1">
                            <span className="font-heading font-bold text-gray-900">{C('booking_fonepay_web', 'Fonepay Web Payment')}</span>
                            <p className="text-sm text-gray-500 mt-0.5">{C('booking_fonepay_web_desc', 'Pay online via Fonepay web payment gateway')}</p>
                        </div>
                    </label>
                </div>
            </div>

            {selectedPaymentMethod === 'pay_at_property' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-amber-900">{C('booking_breakdown_heading', 'Payment Breakdown')}</h4>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between text-gray-700">
                            <span>{C('booking_total_amount', 'Total Booking Amount')}</span>
                            <span className="font-medium">{C('booking_npr', 'NPR')} {getTotalPrice().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>{C('booking_advance_required', 'Advance Payment Required Now (60%)')}</span>
                            <span className="font-medium text-amber-700">{C('booking_npr', 'NPR')} {calculateAdvanceAmount(getTotalPrice()).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-700 border-t border-amber-200 pt-2">
                            <span>{C('booking_balance_due', 'Remaining Balance at Property (40%)')}</span>
                            <span className="font-medium text-green-700">{C('booking_npr', 'NPR')} {calculateBalanceAmount(getTotalPrice()).toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="bg-amber-100 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                        <p className="font-semibold">{C('booking_policy_heading', 'Pay at Property Policy')}</p>
                        <p>{C('booking_policy_line1', '• 60% advance payment is required to confirm your reservation.')}</p>
                        <p>{C('booking_policy_line2', '• Remaining 40% can be paid at the property.')}</p>
                        <p>{C('booking_policy_line3', '• Reservations are not guaranteed until the advance payment is successfully completed.')}</p>
                        <p className="mt-2 pt-2 border-t border-amber-200 text-amber-700">
                            {C('booking_policy_disclaimer', 'By proceeding with this booking, you agree to pay a non-refundable 60% advance deposit if cancellation occurs within 12 hours of check-in. Cancellations made at least 12 hours before check-in are eligible for a refund of the advance payment.')}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex space-x-4">
                <button type="button" onClick={onBack}
                    className="btn-secondary flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                    {C('booking_back_btn', 'Back')}
                </button>
                <button type="submit" disabled={loading || isSubmitting}
                    className="btn-primary flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                    {loading || isSubmitting ? C('booking_processing', 'Processing...') : C('booking_confirm_btn', 'Confirm Booking')}
                </button>
            </div>
        </form>
    </div>
    );
};

export default GuestInfoStep;
