import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Check, QrCode, ExternalLink, Wifi, WifiOff, Smartphone, Clock, Loader } from 'lucide-react';
import QRCode from 'qrcode';
import { getAvailableRooms, Room } from '../services/roomService';
import { createBooking, calculateTotalPrice } from '../services/bookingService';
import { generateQrPayment, generateWebPayment, verifyQrPayment } from '../services/fonepayService';
import { bookingSchema, BookingFormData } from './bookingSchema';

const Booking = () => {
    const location = useLocation();
    const navigate = useNavigate();
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
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            paymentMethod: 'pay_at_property'
        }
    });

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

    // Auto-poll for QR payment confirmation
    useEffect(() => {
        if (!pollingActive || !paymentPrn || step !== 3) return;
        const interval = setInterval(async () => {
            const { data } = await verifyQrPayment(paymentPrn);
            if (data?.success) {
                setPollingActive(false);
                setQrCodeDataUrl(null);
                setPaymentPrn('');
                setStep(4);
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [pollingActive, paymentPrn, step]);

    const handleRoomSelect = (room: Room) => {
        setSelectedRoom(room);
        setStep(2);
    };

    const onPaymentReceived = useCallback(async (prn: string) => {
        setPollingActive(false);
        setWsStatus('disconnected');
        const { data } = await verifyQrPayment(prn);
        if (data?.success) {
            setQrCodeDataUrl(null);
            setPaymentPrn('');
            setStep(4);
        } else {
            setPollingActive(true);
        }
    }, []);

    const connectWebSocket = useCallback((url: string, prn: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setWsStatus('connecting');
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setWsStatus('connected');
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.status === 'success' || msg.paymentStatus === 'success' || msg.response_code === 'successful') {
                        onPaymentReceived(prn);
                    }
                } catch {
                    if (typeof event.data === 'string' && (event.data.includes('success') || event.data.includes('SUCCESS'))) {
                        onPaymentReceived(prn);
                    }
                }
            };

            ws.onerror = () => {
                setWsStatus('disconnected');
            };

            ws.onclose = () => {
                setWsStatus('disconnected');
                wsRef.current = null;
            };
        } catch {
            setWsStatus('disconnected');
        }
    }, [onPaymentReceived]);

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    const processPayment = async (bookingId: string, method: string) => {
        if (method === 'fonepay_qr') {
            setPaymentLoading(true);
            const { data: qrResult, error: qrError } = await generateQrPayment(
                bookingId,
                'Room Booking',
                `Booking ${bookingId}`
            );
            setPaymentLoading(false);

            if (qrResult?.qrMessage) {
                try {
                    const dataUrl = await QRCode.toDataURL(qrResult.qrMessage, {
                        width: 300,
                        margin: 2,
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
                setToastMessage(qrError || 'Failed to generate QR code. Your booking is saved, pay at property.');
                setTimeout(() => setToastMessage(''), 8000);
                setStep(4);
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
                setToastMessage(webError || 'Failed to generate payment link. Your booking is saved, pay at property.');
                setTimeout(() => setToastMessage(''), 8000);
                setStep(4);
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
            payment_status
        });

        setLoading(false);

        if (bookingData) {
            setBookingId(bookingData.id);
            setConfirmedEmail(data.guest_email);
            await processPayment(bookingData.id, data.paymentMethod);
        } else {
            setToastMessage(error || 'Booking failed. Please try again.');
            setTimeout(() => setToastMessage(''), 5000);
        }
    };

    const calculateNights = () => {
        if (!checkIn || !checkOut) return 0;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getTotalPrice = () => {
        if (!selectedRoom) return 0;
        return calculateTotalPrice(selectedRoom.price_per_night, checkIn, checkOut);
    };

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Booking | Highlands Motel & Cafe</title>
                <meta name="description" content="Book your stay at Highlands Motel & Cafe. Select your dates and reserve a comfortable room today." />
            </Helmet>
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-red-50 text-red-700 border border-red-200"
                    role="alert"
                >
                    {toastMessage}
                </div>
            )}

            <div className="container-custom max-w-4xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-center mb-12">
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                1
                            </div>
                            <span className="ml-2 font-medium hidden sm:inline">Dates</span>
                        </div>
                        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
                        <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                2
                            </div>
                            <span className="ml-2 font-medium hidden sm:inline">Details</span>
                        </div>
                        <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />
                        <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                3
                            </div>
                            <span className="ml-2 font-medium hidden sm:inline">Payment</span>
                        </div>
                        <div className={`w-12 h-0.5 ${step >= 4 ? 'bg-primary' : 'bg-gray-300'}`} />
                        <div className={`flex items-center ${step >= 4 ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${step >= 4 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                4
                            </div>
                            <span className="ml-2 font-medium hidden sm:inline">Confirmed</span>
                        </div>
                    </div>
                </div>

                {/* Step 1: Date Selection */}
                {step === 1 && (
                    <div className="card">
                        <h2 className="font-heading text-3xl font-bold mb-6">Select Your Dates</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label htmlFor="check_in" className="block text-sm font-medium mb-2">Check-in Date</label>
                                <input
                                    id="check_in"
                                    type="date"
                                    min={today}
                                    value={checkIn}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="check_out" className="block text-sm font-medium mb-2">Check-out Date</label>
                                <input
                                    id="check_out"
                                    type="date"
                                    min={checkIn || tomorrow}
                                    value={checkOut}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="guests" className="block text-sm font-medium mb-2">Guests</label>
                                <select
                                    id="guests"
                                    value={guests}
                                    onChange={(e) => setGuests(Number(e.target.value))}
                                    className="input w-full"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {checkIn && checkOut && checkIn < checkOut && (
                            <>
                                <h3 className="font-heading text-2xl font-semibold mb-4">
                                    Available Rooms ({calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'})
                                </h3>

                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="spinner" />
                                    </div>
                                ) : availableRooms.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <p className="text-gray-500">No rooms available for selected dates.</p>
                                        <p className="text-sm text-gray-400 mt-2">Please try different dates.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {availableRooms.map((room) => (
                                            <button
                                                key={room.id}
                                                type="button"
                                                className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                onClick={() => handleRoomSelect(room)}
                                            >
                                                <div className="flex items-start space-x-4">
                                                    <img
                                                        src={room.room_images?.[0]?.image_url}
                                                        alt={room.name}
                                                        className="w-32 h-24 object-cover rounded-lg"
                                                    />
                                                    <div className="flex-1">
                                                        <h4 className="font-heading text-xl font-semibold mb-1">
                                                            {room.name}
                                                            {room.room_number && <span className="text-gray-400 text-sm font-normal ml-1">#{room.room_number}</span>}
                                                        </h4>
                                                        <p className="text-gray-600 text-sm mb-2">{room.description}</p>
                                                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                                                            <div className="flex items-center">
                                                                <Users size={16} className="mr-1" />
                                                                Up to {room.max_guests} guests
                                                            </div>
                                                            {room.has_ac !== undefined && (
                                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${room.has_ac ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                                    {room.has_ac ? 'AC' : 'Non-AC'}
                                                                </span>
                                                            )}
                                                            {room.floor_number && (
                                                                <span className="text-gray-400">Floor {room.floor_number}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-primary">
                                                            NPR {calculateTotalPrice(room.price_per_night, checkIn, checkOut).toLocaleString()}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            NPR {room.price_per_night.toLocaleString()}/night
                                                        </div>
                                                        <span className="btn-primary mt-2 text-sm px-4 py-2 inline-block">
                                                            Select Room
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: Guest Information */}
                {step === 2 && selectedRoom && (
                    <div className="card">
                        <h2 className="font-heading text-3xl font-bold mb-6">Guest Information</h2>

                        {/* Booking Summary */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold mb-2">{selectedRoom.name}</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p>Check-in: {new Date(checkIn).toLocaleDateString()}</p>
                                <p>Check-out: {new Date(checkOut).toLocaleDateString()}</p>
                                <p>Guests: {guests}</p>
                                <p className="font-semibold text-primary text-lg mt-2">
                                    Total: NPR {getTotalPrice().toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div>
                                <label htmlFor="guest_name" className="block text-sm font-medium mb-2">Full Name *</label>
                                <input
                                    id="guest_name"
                                    type="text"
                                    {...register('guest_name')}
                                    className="input w-full"
                                    placeholder="John Doe"
                                    aria-invalid={errors.guest_name ? "true" : "false"}
                                />
                                {errors.guest_name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.guest_name.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="guest_email" className="block text-sm font-medium mb-2">Email *</label>
                                <input
                                    id="guest_email"
                                    type="email"
                                    {...register('guest_email')}
                                    className="input w-full"
                                    placeholder="john@example.com"
                                    aria-invalid={errors.guest_email ? "true" : "false"}
                                />
                                {errors.guest_email && (
                                    <p className="text-red-500 text-sm mt-1">{errors.guest_email.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="guest_phone" className="block text-sm font-medium mb-2">Phone *</label>
                                <input
                                    id="guest_phone"
                                    type="tel"
                                    {...register('guest_phone')}
                                    className="input w-full"
                                    placeholder="98XXXXXXXX"
                                    aria-invalid={errors.guest_phone ? "true" : "false"}
                                />
                                {errors.guest_phone && (
                                    <p className="text-red-500 text-sm mt-1">{errors.guest_phone.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Payment Method</label>
                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="pay_at_property"
                                            {...register('paymentMethod')}
                                            className="w-4 h-4"
                                        />
                                        <span>Pay at Property</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="fonepay_qr"
                                            {...register('paymentMethod')}
                                            className="w-4 h-4"
                                        />
                                        <QrCode size={18} />
                                        <span>Fonepay QR</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="radio"
                                            value="fonepay_web"
                                            {...register('paymentMethod')}
                                            className="w-4 h-4"
                                        />
                                        <ExternalLink size={18} />
                                        <span>Fonepay Web Payment</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="btn-secondary flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || isSubmitting}
                                    className="btn-primary flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                >
                                    {loading || isSubmitting ? 'Processing...' : 'Confirm Booking'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 3: Payment Screen (QR or Processing) */}
                {step === 3 && paymentLoading && (
                    <div className="card text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
                        <h2 className="font-heading text-2xl font-bold mb-2">Processing Payment</h2>
                        <p className="text-gray-600">Please wait while we generate your payment...</p>
                    </div>
                )}

                {/* Step 3: QR Payment Display */}
                {step === 3 && !paymentLoading && qrCodeDataUrl !== null && (
                    <div className="card text-center">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <QrCode className="text-amber-600" size={40} />
                        </div>
                        <h2 className="font-heading text-3xl font-bold mb-2">Scan to Pay</h2>
                        <p className="text-gray-600 mb-6">
                            Open your <strong>Fonepay</strong> app and scan the QR code below to complete payment.
                        </p>

                        {/* QR Code with animated border */}
                        <div className="relative inline-block mb-4">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-xl opacity-75 animate-pulse" />
                            <div className="relative bg-white rounded-lg p-4">
                                {qrCodeDataUrl ? (
                                    <img
                                        src={qrCodeDataUrl}
                                        alt="Fonepay QR Code"
                                        className="w-64 h-64 object-contain"
                                    />
                                ) : (
                                    <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                                        <Smartphone size={48} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amount & Reference */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-bold text-lg text-gray-900">NPR {getTotalPrice().toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Reference</span>
                                <span className="font-mono text-xs text-gray-700">{paymentPrn}</span>
                            </div>
                        </div>

                        {/* WebSocket Status */}
                        <div className="flex items-center justify-center space-x-2 mb-3">
                            {wsStatus === 'connected' ? (
                                <>
                                    <Wifi size={14} className="text-green-500" />
                                    <span className="text-xs text-green-600">Real-time monitoring active</span>
                                </>
                            ) : wsStatus === 'connecting' ? (
                                <>
                                    <Loader size={14} className="text-amber-500 animate-spin" />
                                    <span className="text-xs text-amber-600">Connecting to payment monitor...</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={14} className="text-gray-400" />
                                    <span className="text-xs text-gray-500">Using periodic verification</span>
                                </>
                            )}
                        </div>

                        {pollingActive && wsStatus !== 'connected' && (
                            <div className="flex items-center justify-center space-x-2 mb-6">
                                <Clock size={14} className="text-amber-500" />
                                <span className="text-xs text-amber-600 animate-pulse">
                                    Auto-checking every 8 seconds...
                                </span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={async () => {
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
                                }}
                                disabled={paymentLoading}
                                className="btn-primary w-full flex items-center justify-center space-x-2"
                            >
                                {paymentLoading ? (
                                    <><Loader size={18} className="animate-spin" /><span>Verifying...</span></>
                                ) : (
                                    <><Check size={18} /><span>I've Paid - Verify</span></>
                                )}
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="btn-secondary w-full"
                            >
                                Cancel & Return Home
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && !paymentLoading && (
                    <div className="card text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                            <Check className="text-green-600" size={40} />
                        </div>
                        <h2 className="font-heading text-3xl font-bold mb-4">Booking Confirmed!</h2>
                        <p className="text-gray-600 mb-6">
                            Your booking has been successfully confirmed. We've sent a confirmation email to {confirmedEmail}.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                            <p className="text-sm text-amber-700 mb-2">Booking Reference</p>
                            <p className="font-mono text-xl font-bold text-primary">{bookingId}</p>
                        </div>
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate('/')}
                                className="btn-primary w-full"
                            >
                                Return to Home
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="btn-secondary w-full"
                            >
                                Print Confirmation
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Booking;
