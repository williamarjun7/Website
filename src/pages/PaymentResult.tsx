import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, X, Loader } from 'lucide-react';
import { verifyWebPayment } from '../services/fonepayService';

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      const prn = searchParams.get('PRN') || searchParams.get('orderId');
      const uid = searchParams.get('UID') || '';
      const amount = searchParams.get('P_AMT') || '';
      const pid = searchParams.get('PID') || '';
      const bc = searchParams.get('BC') || '';

      if (!prn) {
        setStatus('failed');
        setMessage('Invalid payment response');
        return;
      }

      const { data, error } = await verifyWebPayment(prn, uid, amount, pid, bc);

      if (data?.success && (data.response_code === 'successful' || data.status === 'success')) {
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
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
      <Helmet>
        <title>Payment Status | Highlands Motel & Cafe</title>
      </Helmet>
      <div className="card max-w-md mx-auto text-center">
        {status === 'verifying' && (
          <>
            <Loader className="animate-spin mx-auto mb-4 text-amber-600" size={48} />
            <h2 className="font-heading text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={40} />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">Payment Successful</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/booking')} className="btn-primary w-full">
              View My Booking
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-600" size={40} />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/booking')} className="btn-primary w-full">
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;
