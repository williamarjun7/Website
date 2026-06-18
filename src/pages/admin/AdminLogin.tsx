import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AtSign, ArrowLeft, Mail } from 'lucide-react';
import { adminLogin, resetPassword } from '../../services/authService';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await resetPassword(resetEmail);
        if (error) {
            setError(error);
            setLoading(false);
        } else {
            setResetSent(true);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await adminLogin(email, password);

            if (error) {
                throw new Error(error);
            }

            if (data) {
                navigate('/admin/dashboard');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Invalid email or password';
            setError(msg);

            // If verification is required, give them a way to go to the verify page
            if (msg.toLowerCase().includes('verification')) {
                localStorage.setItem('pending_verify_email', email);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-primary/5 p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        {showReset ? <Mail className="text-primary" size={32} /> : <Lock className="text-primary" size={32} />}
                    </div>
                    <h2 className="text-2xl font-bold font-heading text-primary">{showReset ? 'Reset Password' : 'Admin Access'}</h2>
                    <p className="text-gray-500 mt-2">{showReset ? 'Enter your email to receive a reset link' : 'Log in to manage Highlands Motel & Cafe'}</p>
                </div>

                {/* Form */}
                {showReset ? (
                    <form onSubmit={handleResetPassword} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100">
                                {error}
                            </div>
                        )}
                        {resetSent ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Mail className="text-green-600" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Check Your Email</h3>
                                <p className="text-gray-600 text-sm">
                                    If an account exists for <strong>{resetEmail}</strong>, you'll receive a password reset link shortly.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); setError(''); }}
                                    className="text-primary font-medium hover:underline text-sm"
                                >
                                    Back to Login
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowReset(false); setError(''); }}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                                >
                                    <ArrowLeft size={16} /> Back to Login
                                </button>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <div className="relative">
                                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email"
                                            required
                                            value={resetEmail}
                                            onChange={(e) => setResetEmail(e.target.value)}
                                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                            placeholder="admin@example.com"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-70"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <span>Send Reset Link</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 animate-fade-in flex flex-col items-center">
                            <span>{error}</span>
                            {error.toLowerCase().includes('verification') && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/verify', { state: { email } })}
                                    className="mt-2 text-primary font-bold hover:underline"
                                >
                                    Verify Now →
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                    placeholder="admin@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Signing In...</span>
                            </>
                        ) : (
                            <span>Sign In</span>
                        )}
                    </button>
                    </form>
                    )}

                {/* Footer */}
                {!showReset && (
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                        Forgot password?{' '}
                        <button
                            type="button"
                            onClick={() => setShowReset(true)}
                            className="text-primary hover:underline font-medium"
                        >
                            Reset it here
                        </button>
                    </p>
                </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
