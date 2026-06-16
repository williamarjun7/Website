import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { X, Loader } from 'lucide-react';
import { verifyWebPayment } from '../services/fonepayService';
import BookingConfirmation, { ConfirmedBookingData, storeConfirmedBooking } from '../components/booking/BookingConfirmation';

const paymentParamSchema = z.object({
  prn: z.string().min(1, 'Missing PRN'),
  uid: z.string().default(''),
  amount: z.string().default(''),
  pid: z.string().default(''),
  bc: z.string().default(''),
});

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');
  const [confirmedData, setConfirmedData] = useState<ConfirmedBookingData | null>(null);

  useEffect(() => {
    const verify = async () => {
      const parsed = paymentParamSchema.safeParse({
        prn: searchParams.get('PRN') || searchParams.get('orderId'),
        uid: searchParams.get('UID') || '',
        amount: searchParams.get('P_AMT') || '',
        pid: searchParams.get('PID') || '',
        bc: searchParams.get('BC') || '',
      });

      if (!parsed.success) {
        setStatus('failed');
        setMessage('Invalid payment response');
        return;
      }

      const { prn, uid, amount, pid, bc } = parsed.data;
      const { data, error } = await verifyWebPayment(prn, uid, amount, pid, bc);

      if (data?.success && (data.response_code === 'successful' || data.status === 'success')) {
        const stored = sessionStorage.getItem('pendingBookingData');
        const pendingId = sessionStorage.getItem('pendingBookingId');
        sessionStorage.removeItem('pendingBookingData');
        sessionStorage.removeItem('pendingBookingId');

        let parsedStored: Record<string, unknown> = {};
        if (stored) {
          try { parsedStored = JSON.parse(stored); } catch { /* ignore */ }
        }

        const confData: ConfirmedBookingData = {
          id: pendingId || '',
          guest_name: String(parsedStored.guest_name || ''),
          guest_email: String(parsedStored.guest_email || ''),
          guest_phone: String(parsedStored.guest_phone || ''),
          check_in: String(parsedStored.check_in || ''),
          check_out: String(parsedStored.check_out || ''),
          guests: Number(parsedStored.guests) || 1,
          room: (parsedStored.room as ConfirmedBookingData['room']) || { id: '', name: 'Selected Room' },
          total_price: Number(parsedStored.total_price) || 0,
          advance_amount: parsedStored.advance_amount ? Number(parsedStored.advance_amount) : undefined,
          balance_amount: parsedStored.balance_amount ? Number(parsedStored.balance_amount) : undefined,
          payment_method: 'fonepay_web',
          transaction_id: prn,
          payment_status: 'paid',
          booking_status: 'confirmed',
        };

        storeConfirmedBooking(confData);
        setConfirmedData(confData);
        setStatus('success');
        setMessage('Payment successful! Your booking is confirmed.');
      } else {
        setStatus('failed');
        setMessage(error || 'Payment verification failed. Please contact support.');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>Payment Status | Highlands Motel & Cafe</title>
      </Helmet>
      <div className="container-custom max-w-2xl">
        {status === 'verifying' && (
          <div className="card max-w-md mx-auto text-center">
            <Loader className="animate-spin mx-auto mb-4 text-amber-600" size={48} />
            <h2 className="font-heading text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </div>
        )}
        {status === 'success' && confirmedData && (
          <BookingConfirmation bookingData={confirmedData} />
        )}
        {status === 'failed' && (
          <div className="card max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-600" size={40} />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button onClick={() => navigate('/booking')} className="btn-primary w-full">
                Try Again
              </button>
              <button onClick={() => navigate('/')} className="btn-secondary w-full">
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
