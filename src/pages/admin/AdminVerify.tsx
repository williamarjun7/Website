import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { verifyEmail, resendVerification } from '../../services/authService';

const AdminVerify = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        // Get email from navigation state or local storage
        const stateEmail = location.state?.email || localStorage.getItem('pending_verify_email');
        if (stateEmail) {
            setEmail(stateEmail);
        } else {
            // If no email found, redirect to signup
            navigate('/admin/signup');
        }
    }, [location, navigate]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { data, error } = await verifyEmail(email, code);

            if (error) {
                throw new Error(error);
            }

            if (data) {
                setSuccess('Email verified successfully! Redirecting to dashboard...');
                localStorage.removeItem('pending_verify_email');
                setTimeout(() => {
                    navigate('/admin/dashboard');
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || 'Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await resendVerification(email);
            if (error) throw new Error(error);
            setSuccess('Verification code resent! Please check your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code. Please try again.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-primary/5 p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="text-primary" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold font-heading text-primary">Verify Your Email</h2>
                    <p className="text-gray-500 mt-2">We've sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span></p>
                </div>

                {/* Form */}
                <form onSubmit={handleVerify} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 animate-fade-in">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm border border-green-100 animate-fade-in">
                            {success}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Enter Verification Code</label>
                        <input
                            type="text"
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full text-center text-3xl tracking-[1em] font-bold py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                            placeholder="000000"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length < 6}
                        className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <span>Verify Code</span>
                        )}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            className="text-primary hover:text-primary-dark text-sm font-medium flex items-center justify-center mx-auto space-x-1 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                            <span>{resending ? 'Resending...' : 'Resend Code'}</span>
                        </button>
                    </div>
                </form>

                {/* Footer */}
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100 flex justify-between items-center">
                    <button
                        onClick={() => navigate('/admin/signup')}
                        className="text-gray-500 hover:text-gray-700 text-sm flex items-center space-x-1"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Signup</span>
                    </button>
                    <p className="text-xs text-gray-400">Highlands Motel Admin</p>
                </div>
            </div>
        </div>
    );
};

export default AdminVerify;
