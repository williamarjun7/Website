import { Helmet } from 'react-helmet-async';
import { Calendar, CreditCard, Shield, Users, AlertCircle, FileText, RefreshCw } from 'lucide-react';

const Terms = () => {

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Terms of Service | Highlands Motel & Cafe</title>
                <meta name="description" content="Read the Terms of Service for Highlands Motel & Cafe. Learn about booking policies, cancellation, payment terms, and guest responsibilities." />
            </Helmet>
            {/* Hero Section */}
            <section className="relative h-64 mb-16">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
                    <img
                        src="https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1200"
                        alt="Terms of Service"
                        className="w-full h-full object-cover opacity-30"
                    />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <FileText size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            Please read these terms carefully before booking your stay
                        </p>
                    </div>
                </div>
            </section>

            <div className="container-custom max-w-4xl">
                {/* Last Updated */}
                <div className="bg-amber-50 rounded-xl p-6 mb-12 text-center">
                    <p className="text-gray-700">
                        <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Terms Content */}
                <div className="prose prose-lg max-w-none">
                    {/* Introduction */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
                            <FileText size={24} className="mr-3 text-amber-700" />
                            Introduction
                        </h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            Welcome to Highlands Cafe & Motel Inn. These Terms of Service ("Terms") govern your use of our website, booking services, and facilities. By accessing our services, you agree to be bound by these Terms.
                        </p>
                    </section>

                    {/* Booking & Reservations */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Calendar size={24} className="mr-3 text-amber-700" />
                            Booking & Reservations
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Reservation Requirements</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Valid government-issued ID required at check-in</li>
                                    <li>• Guests must be 18 years or older to book independently</li>
                                    <li>• Full payment due upon check-in for standard bookings</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Advance Payment Requirement</h3>
                                <p className="text-gray-700 mb-3">
                                    To secure and confirm a reservation, guests choosing the "Pay at Property" option must pay 60% of the total booking amount in advance through the online payment gateway. The remaining 40% shall be payable at the property.
                                </p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Reservation Confirmation</h3>
                                <p className="text-gray-700 mb-3">
                                    Bookings are confirmed only after successful receipt of the advance payment. Failure to complete the payment may result in automatic cancellation of the reservation.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Payment Terms */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <CreditCard size={24} className="mr-3 text-amber-700" />
                            Payment Terms
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Accepted Payment Methods</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Credit Cards (Visa, MasterCard, American Express)</li>
                                    <li>• Debit Cards</li>
                                    <li>• Cash (NPR and USD)</li>
                                    <li>• Mobile Payment Options</li>
                                    <li>• Bank Transfer (for advance payments)</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Pricing & Taxes</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• All rates include applicable taxes</li>
                                    <li>• No hidden fees</li>
                                    <li>• Rates subject to change without notice</li>
                                    <li>• Confirmed bookings are price-locked</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Cancellation & Refund Policy */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <RefreshCw size={24} className="mr-3 text-amber-700" />
                            Cancellation & Refund Policy
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <ul className="space-y-3 text-gray-700">
                                <li>• Guests may cancel their reservation and receive a refund of the advance payment if cancellation is requested at least <strong>12 hours before</strong> the scheduled check-in time.</li>
                                <li>• For bookings under the Pay at Property option, the <strong>60% advance payment will be refunded</strong> if cancellation is made 12 or more hours before check-in.</li>
                                <li>• The remaining 40% balance is not charged online and therefore is not subject to refund.</li>
                                <li>• If cancellation is requested <strong>less than 12 hours before</strong> check-in, the advance payment becomes <strong>non-refundable</strong>.</li>
                                <li>• No-shows are considered late cancellations and are not eligible for any refund.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Guest Conduct */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Users size={24} className="mr-3 text-amber-700" />
                            Guest Conduct & Responsibilities
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <ul className="space-y-2 text-gray-700">
                                <li>• Quiet hours: 10:00 PM to 7:00 AM</li>
                                <li>• No smoking in non-designated areas</li>
                                <li>• No illegal substances on premises</li>
                                <li>• Respect other guests and staff</li>
                                <li>• No parties or events without prior approval</li>
                                <li>• Guests responsible for damages to property</li>
                                <li>• Management reserves right to refuse service</li>
                            </ul>
                        </div>
                    </section>

                    {/* Liability & Limitations */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Shield size={24} className="mr-3 text-amber-700" />
                            Liability & Limitations
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <ul className="space-y-2 text-gray-700">
                                <li>• Not responsible for lost or stolen items</li>
                                <li>• Not responsible for personal injuries</li>
                                <li>• Safe deposit boxes available for valuables</li>
                                <li>• Guests use facilities at their own risk</li>
                                <li>• Travel insurance recommended</li>
                                <li>• Limited liability for service interruptions</li>
                            </ul>
                        </div>
                    </section>

                    {/* Important Notices */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <AlertCircle size={24} className="mr-3 text-amber-700" />
                            Important Notices
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                                <h3 className="font-bold text-lg mb-3 text-amber-900">Force Majeure</h3>
                                <p className="text-gray-700">
                                    We are not liable for failures to perform due to circumstances beyond our control, including natural disasters, government actions, strikes, or other unforeseen events.
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                <h3 className="font-bold text-lg mb-3 text-blue-900">Policy Changes</h3>
                                <p className="text-gray-700">
                                    These Terms may be updated periodically. Continued use of our services constitutes acceptance of any changes. Check back regularly for updates.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Contact Information */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900">
                            Contact Information
                        </h2>

                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-lg mb-3">For Inquiries</h3>
                                    <ul className="space-y-2 text-gray-700">
                                        <li><strong>Email:</strong> highlandscafemotelinn@gmail.com</li>
                                        <li><strong>Phone:</strong> <a href="https://wa.me/9779763215874" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors cursor-pointer">+977 9763215874</a></li>
                                        <li><strong>Availability:</strong> 24/7 Call & WhatsApp</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-3">Legal Correspondence</h3>
                                    <ul className="space-y-2 text-gray-700">
                                        <li><strong>Address:</strong> Birendranagar-07, Khajura, Surkhet, Nepal</li>
                                        <li><strong>Support:</strong> highlandscafemotelinn@gmail.com</li>
                                        <li><strong>Registration:</strong> Registered with Nepal Tourism Board</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Agreement */}
                <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8 text-center">
                    <h3 className="font-heading text-xl font-bold mb-4">
                        Your Agreement
                    </h3>
                    <p className="mb-6">
                        By making a reservation or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <a href="/booking" className="inline-flex items-center px-6 py-3 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                            Book Your Stay
                        </a>
                        <a href="/contact" className="inline-flex items-center px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                            Contact Us
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terms;