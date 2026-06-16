import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Printer, Home, Phone } from 'lucide-react';
import { Room } from '../../services/roomService';
import { getBookingById } from '../../services/bookingService';

export interface ConfirmedBookingData {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  room: {
    id: string;
    name: string;
    room_number?: string;
    room_type?: string;
  };
  total_price: number;
  advance_amount?: number;
  balance_amount?: number;
  payment_method: 'pay_at_property' | 'fonepay_qr' | 'fonepay_web';
  transaction_id?: string;
  payment_status: string;
  booking_status: string;
}

const STORAGE_KEY = 'confirmedBooking';

export function storeConfirmedBooking(data: ConfirmedBookingData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearConfirmedBooking() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function loadConfirmedBooking(): ConfirmedBookingData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConfirmedBookingData;
  } catch {
    return null;
  }
}

const BookingConfirmation: React.FC<{ bookingData?: ConfirmedBookingData }> = ({ bookingData: propData }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<ConfirmedBookingData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);

  useEffect(() => {
    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }

    const stored = loadConfirmedBooking();
    if (stored) {
      setData(stored);
      setLoading(false);
      return;
    }

    const pendingId = sessionStorage.getItem('pendingBookingId');
    if (pendingId) {
      getBookingById(pendingId).then((res) => {
        const b = res.data;
        if (b) {
          const d: ConfirmedBookingData = {
            id: b.id,
            guest_name: b.guest_name,
            guest_email: b.guest_email,
            guest_phone: b.guest_phone,
            check_in: b.check_in,
            check_out: b.check_out,
            guests: b.adults || 1,
            room: b.rooms || { id: '', name: 'Selected Room' },
            total_price: b.total_price,
            advance_amount: b.advance_amount,
            balance_amount: b.balance_amount,
            payment_method: b.payment_status === 'pay_at_property' ? 'pay_at_property' : 'fonepay_web',
            payment_status: b.payment_status,
            booking_status: b.booking_status,
          };
          setData(d);
          storeConfirmedBooking(d);
        }
        setLoading(false);
      });
      return;
    }

    setLoading(false);
  }, [propData]);

  const total = data?.total_price || 0;
  const advance = data?.advance_amount ?? Math.round(total * 60) / 100;
  const balance = data?.balance_amount ?? total - advance;

  if (loading) {
    return (
      <div className="card text-center">
        <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="font-heading text-2xl font-bold mb-2">Loading Confirmation</h2>
        <p className="text-gray-600">Please wait...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center">
        <h2 className="font-heading text-2xl font-bold mb-2">Booking Not Found</h2>
        <p className="text-gray-600 mb-6">We couldn't find your booking details. Please contact us for assistance.</p>
        <button onClick={() => navigate('/')} className="btn-primary w-full">Return to Home</button>
      </div>
    );
  }

  const isPayAtProperty = data.payment_method === 'pay_at_property';
  const isPaid = data.payment_status === 'paid' || data.payment_status === 'completed' || data.booking_status === 'confirmed';

  return (
    <div className="max-w-2xl mx-auto print:mx-0">
      <div className="card text-center print:shadow-none print:border print:border-gray-300 print:p-6 print:rounded-none">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 print:hidden">
          <Check className="text-green-600" size={40} />
        </div>
        <h2 className="font-heading text-3xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 mb-6 print:text-sm">
          {isPayAtProperty
            ? `Your booking has been reserved. We've sent a confirmation to ${data.guest_email}. Please pay at the property to confirm.`
            : `Your booking has been confirmed. We've sent a confirmation email to ${data.guest_email}.`
          }
        </p>

        {/* Booking Reference + Statuses */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6 print:bg-gray-50 print:border-gray-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div>
              <p className="text-xs text-amber-700 mb-0.5">Booking Reference</p>
              <p className="font-mono text-sm font-bold text-primary break-all">{data.id}</p>
            </div>
            <div>
              <p className="text-xs text-amber-700 mb-0.5">Booking Status</p>
              <p className="font-semibold text-sm capitalize">{data.booking_status.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-amber-700 mb-0.5">Payment Status</p>
              <p className={`font-semibold text-sm capitalize ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>
                {isPaid ? 'Paid' : data.payment_status.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Guest Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-left text-sm space-y-2.5 print:border-gray-300">
          <p className="font-semibold text-gray-900 text-base">Guest Information</p>
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{data.guest_name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{data.guest_email}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{data.guest_phone}</span></div>
        </div>

        {/* Stay Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-left text-sm space-y-2.5 print:border-gray-300">
          <p className="font-semibold text-gray-900 text-base">Stay Details</p>
          <div className="flex justify-between"><span className="text-gray-500">Room</span><span className="font-medium">{data.room.name}{data.room.room_number ? ` (#${data.room.room_number})` : ''}</span></div>
          {data.room.room_type && <div className="flex justify-between"><span className="text-gray-500">Room Type</span><span className="font-medium capitalize">{data.room.room_type}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Check-In</span><span className="font-medium">{new Date(data.check_in).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Check-Out</span><span className="font-medium">{new Date(data.check_out).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Guests</span><span className="font-medium">{data.guests}</span></div>
        </div>

        {/* Payment Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 text-left text-sm space-y-2.5 print:border-gray-300">
          <p className="font-semibold text-gray-900 text-base">Payment Details</p>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-medium capitalize">
              {data.payment_method === 'pay_at_property' ? 'Pay at Property' : data.payment_method === 'fonepay_qr' ? 'Fonepay QR' : 'Fonepay Web'}
            </span>
          </div>

          {data.transaction_id && (
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono text-xs font-medium">{data.transaction_id}</span>
            </div>
          )}

          {isPayAtProperty ? (
            <>
              <div className="flex justify-between text-amber-700 pt-2 border-t border-gray-100">
                <span>Advance Payment (60%) — Due Now</span>
                <span className="font-medium">NPR {advance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Balance at Property (40%)</span>
                <span className="font-medium">NPR {balance.toLocaleString()}</span>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 mt-2 text-xs text-amber-800">
                Payment is pending. Please pay the advance amount at the property to confirm your reservation.
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total Paid</span>
                <span>NPR {total.toLocaleString()}</span>
              </div>
              <div className="bg-green-50 rounded-lg p-3 mt-2 text-xs text-green-800">
                Payment successful. Your booking is fully confirmed.
              </div>
            </>
          )}
        </div>

        {/* Hotel Contact */}
        <div className="text-xs text-gray-400 mb-6 leading-relaxed print:text-gray-600 print:border-t print:border-gray-300 print:pt-4">
          <p className="font-semibold text-gray-500">Highlands Motel & Cafe</p>
          <p>Surkhet, Nepal</p>
          <p>Phone: +977-98XXXXXXXX</p>
          <p>Email: info@highlands-motel.com</p>
        </div>

        {/* Actions */}
        <div className="space-y-3 print:hidden">
          <button onClick={() => window.print()} className="btn-primary w-full flex items-center justify-center gap-2">
            <Printer size={18} /><span>Print Confirmation</span>
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Home size={18} /><span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
