import React from 'react';
import { QrCode, Check, Wifi, WifiOff, Smartphone, Clock, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentStepProps {
    paymentLoading: boolean;
    qrCodeDataUrl: string | null;
    qrError: string;
    paymentPrn: string;
    wsStatus: 'connecting' | 'connected' | 'disconnected';
    pollingActive: boolean;
    getTotalPrice: () => number;
    onVerifyClick: () => void;
    onBackToDetails: () => void;
}

const PaymentStep: React.FC<PaymentStepProps> = ({
    paymentLoading, qrCodeDataUrl, qrError, paymentPrn,
    wsStatus, pollingActive, getTotalPrice,
    onVerifyClick, onBackToDetails
}) => {
    const navigate = useNavigate();

    if (paymentLoading) {
        return (
            <div className="card text-center">
                <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
                <h2 className="font-heading text-2xl font-bold mb-2">Processing Payment</h2>
                <p className="text-gray-600">Please wait while we generate your payment...</p>
            </div>
        );
    }

    if (qrError && qrCodeDataUrl === null) {
        return (
            <div className="card text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="text-red-500" size={40} />
                </div>
                <h2 className="font-heading text-2xl font-bold mb-2">Payment Error</h2>
                <p className="text-gray-600 mb-6">{qrError}</p>
                <div className="space-y-3">
                    <button onClick={onBackToDetails} className="btn-primary w-full flex items-center justify-center space-x-2">
                        <span>Try Again</span>
                    </button>
                    <button onClick={() => navigate('/')} className="btn-secondary w-full">Return Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="card text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="text-amber-600" size={40} />
            </div>
            <h2 className="font-heading text-3xl font-bold mb-2">Scan to Pay</h2>
            <p className="text-gray-600 mb-6">
                Open your <strong>Fonepay</strong> app and scan the QR code below to complete payment.
            </p>

            <div className="relative inline-block mb-4">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-xl opacity-75 animate-pulse" />
                <div className="relative bg-white rounded-lg p-4">
                    {qrCodeDataUrl ? (
                        <img src={qrCodeDataUrl} alt="Fonepay QR Code" className="w-64 h-64 object-contain" />
                    ) : (
                        <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                            <Smartphone size={48} />
                        </div>
                    )}
                </div>
            </div>

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

            <div className="flex items-center justify-center space-x-2 mb-3">
                {wsStatus === 'connected' ? (
                    <><Wifi size={14} className="text-green-500" /><span className="text-xs text-green-600">Real-time monitoring active</span></>
                ) : wsStatus === 'connecting' ? (
                    <><Loader size={14} className="text-amber-500 animate-spin" /><span className="text-xs text-amber-600">Connecting to payment monitor...</span></>
                ) : (
                    <><WifiOff size={14} className="text-gray-400" /><span className="text-xs text-gray-500">Using periodic verification</span></>
                )}
            </div>

            {pollingActive && wsStatus !== 'connected' && (
                <div className="flex items-center justify-center space-x-2 mb-6">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-xs text-amber-600 animate-pulse">Auto-checking every 8 seconds...</span>
                </div>
            )}

            <div className="space-y-3">
                <button onClick={onVerifyClick} disabled={paymentLoading}
                    className="btn-primary w-full flex items-center justify-center space-x-2">
                    {paymentLoading ? (
                        <><Loader size={18} className="animate-spin" /><span>Verifying...</span></>
                    ) : (
                        <><Check size={18} /><span>I've Paid - Verify</span></>
                    )}
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary w-full">Cancel & Return Home</button>
            </div>
        </div>
    );
};

export default PaymentStep;
