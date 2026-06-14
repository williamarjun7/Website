import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'qrcode';
import { getAvailableRooms, Room } from '../services/roomService';
import { createBooking, calculateTotalPrice } from '../services/bookingService';
import { generateQrPayment, generateWebPayment, verifyQrPayment } from '../services/fonepayService';
import { bookingSchema, BookingFormData } from './bookingSchema';
import { useWebSocket } from '../hooks/useWebSocket';
import ProgressSteps from '../components/booking/ProgressSteps';
import DateSelectionStep from '../components/booking/DateSelectionStep';
import GuestInfoStep from '../components/booking/GuestInfoStep';
import PaymentStep from '../components/booking/PaymentStep';
import ConfirmationStep from '../components/booking/ConfirmationStep';

const POLLING_TIMEOUT_MS = 15 * 60 * 1000;

const Booking = () => {
    const location = useLocation();
    const preselectedRoom = location.state?.selectedRoom;

    const [step, setStep] = useState(1);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests] = useState(2);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(preselectedRoom || null);
    const [loading, setLoading] = useState(false);
    const [bookingId, setBookingId] = useState('');

    const [confirmedEmail, setConfirmedEmail] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [paymentPrn, setPaymentPrn] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [pollingActive, setPollingActive] = useState(false);
    const [qrError, setQrError] = useState('');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: { paymentMethod: 'pay_at_property' }
    });

    const selectedPaymentMethod = watch('paymentMethod'); // eslint-disable-line react-hooks/incompatible-library

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];

    useEffect(() => {
        const searchAvailableRooms = async () => {
            setLoading(true);
            const { data, error } = await getAvailableRooms(checkIn, checkOut);
            if (error) {
                setToastMessage(error || 'Failed to load rooms. Please try again.');
                setTimeout(() => setToastMessage(''), 5000);
                setAvailableRooms([]);
            } else if (data) {
                setAvailableRooms(data);
            }
            setLoading(false);
        };

        if (checkIn && checkOut && checkIn < checkOut) {
            searchAvailableRooms();
        }
    }, [checkIn, checkOut]);

    const onPaymentReceived = useCallback(async (prn: string) => {
        setPollingActive(false);
        const { data } = await verifyQrPayment(prn);
        if (data?.success) {
            setQrCodeDataUrl(null);
            setPaymentPrn('');
            setStep(4);
        } else {
            setPollingActive(true);
        }
    }, []);

    const { wsStatus, connect: connectWebSocket, cleanup: cleanupWs } = useWebSocket(onPaymentReceived);

    useEffect(() => {
        return () => {
            cleanupWs();
        };
    }, [cleanupWs]);

    const pollingStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!pollingActive || !paymentPrn || step !== 3) return;
        if (!pollingStartRef.current) pollingStartRef.current = Date.now();

        const interval = setInterval(async () => {
            if (pollingStartRef.current && Date.now() - pollingStartRef.current > POLLING_TIMEOUT_MS) {
                setPollingActive(false);
                setToastMessage('Payment session expired. Please try booking again.');
                setTimeout(() => setToastMessage(''), 8000);
                return;
            }

            const { data } = await verifyQrPayment(paymentPrn);
            if (data?.success) {
                setPollingActive(false);
                setQrCodeDataUrl(null);
                setPaymentPrn('');
                pollingStartRef.current = null;
                setStep(4);
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [pollingActive, paymentPrn, step]);

    const handleRoomSelect = (room: Room) => {
        setSelectedRoom(room);
        setStep(2);
    };

    const processPayment = async (bookingId: string, method: string) => {
        setQrError('');
        if (method === 'fonepay_qr') {
            setPaymentLoading(true);
            const { data: qrResult, error: qrErr } = await generateQrPayment(
                bookingId,
                'Room Booking',
                `Booking ${bookingId}`
            );
            setPaymentLoading(false);

            if (qrResult?.qrMessage) {
                try {
                    const dataUrl = await QRCode.toDataURL(qrResult.qrMessage, {
                        width: 300, margin: 2,
                        color: { dark: '#1a1a1a', light: '#ffffff' },
                    });
                    setQrCodeDataUrl(dataUrl);
                } catch {
                    setQrCodeDataUrl('');
                }
                setPaymentPrn(qrResult.prn);
                setPollingActive(true);
                if (qrResult.thirdpartyQrWebSocketUrl) {
                    connectWebSocket(qrResult.thirdpartyQrWebSocketUrl, qrResult.prn);
                }
                setStep(3);
            } else {
                setQrError(qrErr || 'Failed to generate QR code. Please try again or choose a different payment method.');
                setStep(3);
            }
        } else if (method === 'fonepay_web') {
            setPaymentLoading(true);
            const { data: webResult, error: webError } = await generateWebPayment(
                bookingId,
                'Room Booking',
                `Booking ${bookingId}`
            );
            setPaymentLoading(false);

            if (webResult?.paymentUrl) {
                sessionStorage.setItem('pendingBookingId', bookingId);
                window.location.href = webResult.paymentUrl;
            } else {
                setQrError(webError || 'Failed to generate payment link. Please try again.');
                setStep(3);
            }
        } else {
            setStep(4);
        }
    };

    const onSubmit = async (data: BookingFormData) => {
        if (!selectedRoom) return;

        setLoading(true);
        const payment_status = data.paymentMethod === 'pay_at_property' ? 'pay_at_property' : 'pending';

        const { data: bookingData, error } = await createBooking({
            room_id: selectedRoom.id,
            guest_name: data.guest_name,
            guest_email: data.guest_email,
            guest_phone: data.guest_phone,
            check_in: checkIn,
            check_out: checkOut,
            guests,
            payment_status
        });

        setLoading(false);

        if (bookingData) {
            setBookingId(bookingData.id);
            setConfirmedEmail(data.guest_email);
            sessionStorage.setItem('pendingBookingData', JSON.stringify({
                total_price: bookingData.total_price,
                advance_amount: bookingData.advance_amount,
                balance_amount: bookingData.balance_amount,
            }));
            await processPayment(bookingData.id, data.paymentMethod);
        } else {
            setToastMessage(error || 'Booking failed. Please try again.');
            setTimeout(() => setToastMessage(''), 5000);
        }
    };

    const getTotalPrice = () => {
        if (!selectedRoom) return 0;
        return calculateTotalPrice(selectedRoom.price_per_night, checkIn, checkOut);
    };

    const handleVerifyClick = async () => {
        setPaymentLoading(true);
        const { data, error } = await verifyQrPayment(paymentPrn);
        if (data?.success) {
            setQrCodeDataUrl(null);
            setPaymentPrn('');
            setStep(4);
        } else {
            setPollingActive(true);
            setToastMessage(error || 'Payment not confirmed yet.');
            setTimeout(() => setToastMessage(''), 8000);
        }
        setPaymentLoading(false);
    };

    const steps = ['Dates', 'Details', 'Payment', 'Confirmed'];

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Booking | Highlands Motel & Cafe</title>
                <meta name="description" content="Book your stay at Highlands Motel & Cafe. Select your dates and reserve a comfortable room today." />
            </Helmet>

            {toastMessage && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-red-50 text-red-700 border border-red-200" role="alert">
                    {toastMessage}
                </div>
            )}

            <div className="container-custom max-w-4xl">
                <ProgressSteps step={step} steps={steps} />

                {step === 1 && (
                    <DateSelectionStep
                        checkIn={checkIn} checkOut={checkOut} guests={guests}
                        today={today} tomorrow={tomorrow}
                        loading={loading} availableRooms={availableRooms}
                        onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut}
                        onGuestsChange={setGuests} onRoomSelect={handleRoomSelect}
                    />
                )}

                {step === 2 && selectedRoom && (
                    <GuestInfoStep
                        selectedRoom={selectedRoom} checkIn={checkIn} checkOut={checkOut}
                        guests={guests} selectedPaymentMethod={selectedPaymentMethod}
                        loading={loading} isSubmitting={isSubmitting}
                        register={register} errors={errors}
                        handleSubmit={handleSubmit} onSubmit={onSubmit}
                        onBack={() => setStep(1)} getTotalPrice={getTotalPrice}
                    />
                )}

                {(step === 3) && (
                    <PaymentStep
                        paymentLoading={paymentLoading}
                        qrCodeDataUrl={qrCodeDataUrl} qrError={qrError}
                        paymentPrn={paymentPrn} wsStatus={wsStatus}
                        pollingActive={pollingActive}
                        getTotalPrice={getTotalPrice}
                        onVerifyClick={handleVerifyClick}
                        onBackToDetails={() => setStep(2)}
                    />
                )}

                {step === 4 && (
                    <ConfirmationStep
                        confirmedEmail={confirmedEmail} bookingId={bookingId}
                        getTotalPrice={getTotalPrice}
                    />
                )}
            </div>
        </div>
    );
};

export default Booking;
