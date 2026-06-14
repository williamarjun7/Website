import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { calculateAdvanceAmount, calculateBalanceAmount } from '../../services/bookingService';

interface ConfirmationStepProps {
    confirmedEmail: string;
    bookingId: string;
    getTotalPrice: () => number;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ confirmedEmail, bookingId, getTotalPrice }) => {
    const navigate = useNavigate();
    const total = getTotalPrice();
    const advance = calculateAdvanceAmount(total);
    const balance = calculateBalanceAmount(total);

    return (
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
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm space-y-2">
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
            <div className="space-y-4">
                <button onClick={() => navigate('/')} className="btn-primary w-full">Return to Home</button>
                <button onClick={() => window.print()} className="btn-secondary w-full">Print Confirmation</button>
            </div>
        </div>
    );
};

export default ConfirmationStep;
