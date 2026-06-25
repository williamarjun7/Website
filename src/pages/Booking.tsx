import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import QRCode from 'qrcode';
import { getAvailableRooms, checkRoomAvailability, Room } from '../services/roomService';
import { createBooking, calculateTotalPrice, getEffectivePricePerNight } from '../services/bookingService';
import { getSiteContentMap } from '../services/contentService';
import { generateQrPayment, generateWebPayment, verifyQrPayment, sendBookingConfirmation } from '../services/fonepayService';
import { bookingSchema, BookingFormData } from './bookingSchema';
import { useWebSocket } from '../hooks/useWebSocket';
import ProgressSteps from '../components/booking/ProgressSteps';
import DateSelectionStep from '../components/booking/DateSelectionStep';
import GuestInfoStep from '../components/booking/GuestInfoStep';
import PaymentStep from '../components/booking/PaymentStep';
import ConfirmationStep from '../components/booking/ConfirmationStep';

const POLLING_TIMEOUT_MS = 15 * 60 * 1000;
const POLLING_INTERVAL_MS = 8000;

const Booking = () => {
    const location = useLocation();

    // ── Entry snapshot (immutable after mount) ──────────────────────────
    const entryRoom = (() => {
        const fromState = (location.state as { selectedRoom?: Room } | null)?.selectedRoom;
        if (fromState) {
            sessionStorage.setItem('preselectedRoom', JSON.stringify(fromState));
            sessionStorage.setItem('bookingFromRooms', 'true');
            return fromState;
        }
        if (sessionStorage.getItem('bookingFromRooms') !== 'true') {
            sessionStorage.removeItem('preselectedRoom');
            return null;
        }
        const stored = sessionStorage.getItem('preselectedRoom');
        if (stored) {
            try { return JSON.parse(stored) as Room; } catch { /* ignore */ }
        }
        return null;
    })();

    const entryMode = entryRoom ? 'room_card' : 'search';

    const [content, setContent] = useState<Record<string, string>>({});
    const C = (key: string, fallback: string) => { const v = content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };
    useEffect(() => { getSiteContentMap().then(({ data }) => { if (data) setContent(data); }).catch(() => {}); }, []);

    // ── Single source of truth for room selection ──────────────────────
    const [activeRoom, setActiveRoom] = useState<Room | null>(entryRoom || null);

    // ── Booking parameters ──────────────────────────────────────────────
    const [step, setStep] = useState(1);
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [guests, setGuests] = useState(entryRoom?.max_guests || 1);

    // ── Availability search state ───────────────────────────────────────
    const [showAvailabilitySearch, setShowAvailabilitySearch] = useState(false);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);
    const [roomAvailable, setRoomAvailable] = useState(false);
    const [unavailableError, setUnavailableError] = useState('');

    // ── Payment state ──────────────────────────────────────────────────
    const [bookingId, setBookingId] = useState('');
    const [confirmedEmail, setConfirmedEmail] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [paymentPrn, setPaymentPrn] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [pollingActive, setPollingActive] = useState(false);
    const [qrError, setQrError] = useState('');
    const fetchIdRef = useRef(0);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: { paymentMethod: 'pay_at_property' }
    });

    const selectedPaymentMethod = watch('paymentMethod');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];

    const datesValid = checkIn && checkOut && checkIn < checkOut;

    // ── Availability fetch ──────────────────────────────────────────────
    useEffect(() => {
        const id = ++fetchIdRef.current;

        if (!datesValid) {
            setRoomAvailable(false);
            return;
        }

        const run = async () => {
            setLoading(true);
            setUnavailableError('');
            setRoomAvailable(false);

            if (entryMode === 'room_card' && !showAvailabilitySearch) {
                const roomId = activeRoom?.id;
                if (!roomId) {
                    setLoading(false);
                    return;
                }
                const { data } = await checkRoomAvailability(roomId, checkIn, checkOut);
                if (id !== fetchIdRef.current) return;
                setLoading(false);
                if (data?.isAvailable) {
                    setRoomAvailable(true);
                    return;
                }
                setUnavailableError(`${activeRoom!.name} is not available for the selected dates. Please try different dates or choose another room.`);
                setAvailableRooms([]);
                return;
            }

            const { data, error } = await getAvailableRooms(checkIn, checkOut);
            if (id !== fetchIdRef.current) return;
            setLoading(false);
            if (error) {
                setToastMessage(error || 'Failed to load rooms. Please try again.');
                setTimeout(() => setToastMessage(''), 5000);
                setAvailableRooms([]);
            } else if (data) {
                setAvailableRooms(data);
            }
        };

        run();
    }, [checkIn, checkOut, showAvailabilitySearch, datesValid, entryMode, activeRoom]);

    const confirmPaymentAndAdvance = useCallback(async (prn: string) => {
        const { data } = await verifyQrPayment(prn);
        if (data?.success) {
            setPollingActive(false);
            setQrCodeDataUrl(null);
            setPaymentPrn('');
            setStep(4);
        }
    }, []);

    const onPaymentReceived = useCallback((prn: string) => {
        setPollingActive(false);
        confirmPaymentAndAdvance(prn);
    }, [confirmPaymentAndAdvance]);

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
        }, POLLING_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [pollingActive, paymentPrn, step]);

    const clearBookingSession = () => {
        sessionStorage.removeItem('preselectedRoom');
        sessionStorage.removeItem('bookingFromRooms');
    };

    const handleRoomSelect = (room: Room) => {
        setActiveRoom(room);
        setShowAvailabilitySearch(false);
        setUnavailableError('');
        setRoomAvailable(true);
        setStep(2);
    };

    const handleProceedToDetails = () => {
        setStep(2);
    };

    const processPayment = async (bookingId: string, method: string) => {
        setQrError('');
        if (method === 'fonepay_qr') {
            setPaymentLoading(true);
            const shortId = bookingId.replace(/-/g, '').slice(0, 8);
            const { data: qrResult, error: qrErr } = await generateQrPayment(
                bookingId,
                'Room Booking',
                `BK-${shortId}`
            );
            setPaymentLoading(false);

            if (qrResult?.qrMessage) {
                try {
                    const dataUrl = await QRCode.toDataURL(qrResult.qrMessage, {
                        width: 300, margin: 2,
                        color: { dark: '#1a1a1a', light: '#ffffff' },
                        errorCorrectionLevel: 'H',
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
            const shortId = bookingId.replace(/-/g, '').slice(0, 8);
            const { data: webResult, error: webError } = await generateWebPayment(
                bookingId,
                'Room Booking',
                `BK-${shortId}`
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
            // Trigger confirmation email for pay-at-property
            sendBookingConfirmation(bookingId);
        }
    };

    const onSubmit = async (data: BookingFormData) => {
        if (!activeRoom) return;

        setLoading(true);
        const payment_status = data.paymentMethod === 'pay_at_property' ? 'pay_at_property' : 'pending';

        const { data: bookingData, error } = await createBooking({
            room_id: activeRoom.id,
            guest_name: data.guest_name,
            guest_email: data.guest_email,
            guest_phone: data.guest_phone,
            check_in: checkIn,
            check_out: checkOut,
            guests,
            special_requests: data.special_requests || undefined,
            payment_status
        });

        setLoading(false);

        if (bookingData) {
            setBookingId(bookingData.id);
            setConfirmedEmail(data.guest_email);
            setGuestName(data.guest_name);
            setGuestPhone(data.guest_phone);
            sessionStorage.setItem('pendingBookingData', JSON.stringify({
                total_price: bookingData.total_price,
                advance_amount: bookingData.advance_amount,
                balance_amount: bookingData.balance_amount,
                guest_name: data.guest_name,
                guest_email: data.guest_email,
                guest_phone: data.guest_phone,
                check_in: checkIn,
                check_out: checkOut,
                guests,
                room: activeRoom ? { id: activeRoom.id, name: activeRoom.name, room_number: activeRoom.room_number, room_type: activeRoom.room_type } : null,
            }));
            await processPayment(bookingData.id, data.paymentMethod);
        } else {
            setToastMessage(error || 'Booking failed. Please try again.');
            setTimeout(() => setToastMessage(''), 5000);
        }
    };

    const getTotalPrice = () => {
        if (!activeRoom) return 0;
        return calculateTotalPrice(getEffectivePricePerNight(activeRoom), checkIn, checkOut);
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

    useEffect(() => {
        if (step === 4) {
            clearBookingSession();
        }
    }, [step]);

    useEffect(() => {
        return () => {
            cleanupWs();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── UI mode derivation ──────────────────────────────────────────────
    const isRoomLocked = entryMode === 'room_card';
    const showDateSelection = entryMode === 'search' || showAvailabilitySearch;

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>{C('booking_meta_title', 'Booking | Highlands Cafe & Motel Inn')}</title>
                <meta name="description" content={C('booking_meta_desc', 'Book your stay. Select your dates and reserve a comfortable room today.')} />
            </Helmet>

            {toastMessage && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-red-50 text-red-700 border border-red-200" role="alert">
                    {toastMessage}
                </div>
            )}

            <div className="container-custom max-w-4xl">
                <ProgressSteps step={step} steps={steps} />

                {step === 1 && (
                    <>
                        {isRoomLocked && !showAvailabilitySearch && activeRoom && (
                            <div className="card mb-6">
                                <h2 className="font-heading text-3xl font-bold mb-6">Select Your Dates</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div>
                                        <label htmlFor="check_in" className="block text-sm font-medium mb-2">Check-in Date</label>
                                        <input id="check_in" type="date" min={today} value={checkIn}
                                            onChange={(e) => setCheckIn(e.target.value)} className="input w-full" />
                                    </div>
                                    <div>
                                        <label htmlFor="check_out" className="block text-sm font-medium mb-2">Check-out Date</label>
                                        <input id="check_out" type="date" min={checkIn || tomorrow} value={checkOut}
                                            onChange={(e) => setCheckOut(e.target.value)} className="input w-full" />
                                    </div>
                                    <div>
                                        <label htmlFor="guests_locked" className="block text-sm font-medium mb-2">Guests</label>
                                        <select id="guests_locked" value={guests}
                                            onChange={(e) => setGuests(Number(e.target.value))} className="input w-full">
                                            {Array.from({ length: (activeRoom.max_guests || 6) }, (_, i) => i + 1).map(num => (
                                                <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-heading text-xl font-bold text-gray-900">{activeRoom.name}</h3>
                                            {activeRoom.room_number && (
                                                <p className="text-sm text-gray-500">Room #{activeRoom.room_number}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                                                <span className="font-medium text-primary uppercase text-xs">{activeRoom.room_type || 'Standard Room'}</span>
                                                <span>Up to {activeRoom.max_guests} guests</span>
                                                <span className="font-semibold text-primary">NPR {getEffectivePricePerNight(activeRoom).toLocaleString()}/night{activeRoom.discount_percent != null && activeRoom.discount_percent > 0 && <span className="text-[10px] text-red-500 ml-1 font-bold">({activeRoom.discount_percent}% OFF)</span>}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowAvailabilitySearch(true)}
                                            className="text-sm text-primary font-medium hover:underline whitespace-nowrap ml-4">
                                            Change Room
                                        </button>
                                    </div>
                                </div>

                                {loading && datesValid && (
                                    <div className="flex items-center justify-center py-8 space-x-2">
                                        <div className="spinner" />
                                        <span className="text-gray-500">Checking availability...</span>
                                    </div>
                                )}

                                {roomAvailable && !loading && (
                                    <div className="mt-6">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                            <p className="text-green-700 text-sm font-medium">
                                                {activeRoom.name} is available for your selected dates.
                                            </p>
                                            {checkIn && checkOut && (
                                                <p className="text-green-600 text-sm mt-1">
                                                    Total: NPR {calculateTotalPrice(getEffectivePricePerNight(activeRoom), checkIn, checkOut).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={handleProceedToDetails}
                                            className="btn-primary w-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                                            Continue to Details
                                        </button>
                                    </div>
                                )}

                                {unavailableError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                                        <p className="text-red-700 text-sm">{unavailableError}</p>
                                        <button onClick={() => setShowAvailabilitySearch(true)}
                                            className="mt-2 text-sm text-primary font-medium hover:underline">
                                            Show Available Rooms
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showDateSelection && (
                            <DateSelectionStep
                                checkIn={checkIn} checkOut={checkOut} guests={guests}
                                today={today} tomorrow={tomorrow}
                                loading={loading} availableRooms={availableRooms}
                                onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut}
                                onGuestsChange={setGuests} onRoomSelect={handleRoomSelect}
                            />
                        )}
                    </>
                )}

                {step === 2 && activeRoom && (
                    <GuestInfoStep
                        selectedRoom={activeRoom} checkIn={checkIn} checkOut={checkOut}
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
                        selectedRoom={activeRoom}
                        guestName={guestName}
                        guestPhone={guestPhone}
                        checkIn={checkIn}
                        checkOut={checkOut}
                        guests={guests}
                        paymentMethod={selectedPaymentMethod}
                    />
                )}
            </div>
        </div>
    );
};

export default Booking;
