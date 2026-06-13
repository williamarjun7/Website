import { Helmet } from 'react-helmet-async';
import { Shield, Eye, Database, Lock, User, Globe, Cookie } from 'lucide-react';

const Privacy = () => {
    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Privacy Policy | Highlands Motel & Cafe</title>
                <meta name="description" content="Read the Privacy Policy of Highlands Motel & Cafe. Learn how we collect, use, and protect your personal information." />
            </Helmet>
            {/* Hero Section */}
            <section className="relative h-64 mb-16">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
                    <img
                        src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200"
                        alt="Privacy Policy"
                        className="w-full h-full object-cover opacity-30"
                    />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <Shield size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            Privacy Policy
                        </h1>
                        <p className="text-xl text-white/90 max-w-2xl mx-auto">
                            Your privacy is important to us. Learn how we protect your information.
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

                {/* Privacy Content */}
                <div className="prose prose-lg max-w-none">
                    {/* Introduction */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-4 text-amber-900 flex items-center">
                            <Shield size={24} className="mr-3 text-amber-700" />
                            Introduction
                        </h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            At Highlands Cafe & Motel Inn, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our website and services.
                        </p>
                    </section>

                    {/* Information We Collect */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Database size={24} className="mr-3 text-amber-700" />
                            Information We Collect
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Personal Information</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Name and contact details</li>
                                    <li>• Address and billing information</li>
                                    <li>• Phone number and email address</li>
                                    <li>• Government ID details</li>
                                    <li>• Check-in/check-out dates</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Booking Information</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Room preferences</li>
                                    <li>• Number of guests</li>
                                    <li>• Special requests</li>
                                    <li>• Payment method</li>
                                    <li>• Stay history</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Technical Information</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• IP address and device information</li>
                                    <li>• Browser type and version</li>
                                    <li>• Operating system</li>
                                    <li>• Cookies and similar technologies</li>
                                    <li>• Usage patterns and preferences</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* How We Use Your Information */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Eye size={24} className="mr-3 text-amber-700" />
                            How We Use Your Information
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Service Provision</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Process bookings and reservations</li>
                                    <li>• Communicate about your stay</li>
                                    <li>• Provide customer service</li>
                                    <li>• Manage your account</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Service Improvement</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Analyze usage patterns</li>
                                    <li>• Improve website functionality</li>
                                    <li>• Develop new services</li>
                                    <li>• Personalize your experience</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Communication</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Send booking confirmations</li>
                                    <li>• Provide important updates</li>
                                    <li>• Marketing communications (with consent)</li>
                                    <li>• Respond to inquiries</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Data Sharing & Third Parties */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Globe size={24} className="mr-3 text-amber-700" />
                            Data Sharing & Third Parties
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">When We Share Information</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Payment processors for transactions</li>
                                    <li>• Government authorities when required by law</li>
                                    <li>• Service providers for operational support</li>
                                    <li>• Emergency services when necessary</li>
                                    <li>• Business partners with your consent</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Third-Party Services</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Payment gateways (secure transactions)</li>
                                    <li>• Email service providers</li>
                                    <li>• Website analytics tools</li>
                                    <li>• Booking platforms</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Data Security */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Lock size={24} className="mr-3 text-amber-700" />
                            Data Security Measures
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <ul className="space-y-2 text-gray-700">
                                <li>• SSL encryption for all data transmissions</li>
                                <li>• Secure payment processing systems</li>
                                <li>• Regular security audits and updates</li>
                                <li>• Access controls and authentication</li>
                                <li>• Data backup and recovery systems</li>
                                <li>• Staff training on privacy protection</li>
                                <li>• Compliance with data protection regulations</li>
                            </ul>
                        </div>
                    </section>

                    {/* Your Rights */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <User size={24} className="mr-3 text-amber-700" />
                            Your Privacy Rights
                        </h2>

                        <div className="space-y-4">
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Access & Correction</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Request access to your personal data</li>
                                    <li>• Correct inaccurate information</li>
                                    <li>• Update contact details</li>
                                    <li>• Delete your account and data</li>
                                </ul>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-lg mb-3">Communication Preferences</h3>
                                <ul className="space-y-2 text-gray-700">
                                    <li>• Opt out of marketing communications</li>
                                    <li>• Choose communication channels</li>
                                    <li>• Update notification preferences</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Cookies */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900 flex items-center">
                            <Cookie size={24} className="mr-3 text-amber-700" />
                            Cookies & Tracking Technologies
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <ul className="space-y-2 text-gray-700">
                                <li>• Essential cookies for website functionality</li>
                                <li>• Analytics cookies to improve services</li>
                                <li>• Preference cookies for personalization</li>
                                <li>• Marketing cookies for relevant advertising</li>
                                <li>• You can control cookie settings in your browser</li>
                            </ul>
                        </div>
                    </section>

                    {/* Contact for Privacy Concerns */}
                    <section className="mb-12">
                        <h2 className="font-heading text-2xl font-bold mb-6 text-amber-900">
                            Privacy Concerns & Contact
                        </h2>

                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8">
                            <p className="text-gray-700 mb-6">
                                If you have questions about this Privacy Policy or concerns about how we handle your personal information, please contact our Privacy Officer:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-lg mb-3">Contact Information</h3>
                                    <ul className="space-y-2 text-gray-700">
                                        <li><strong>Email:</strong> highlandscafemotelinn@gmail.com</li>
                                        <li><strong>Phone:</strong> <a href="https://wa.me/9779763215874" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors cursor-pointer">+977 9763215874</a></li>
                                        <li><strong>Address:</strong> Birendranagar-07, Khajura, Surkhet, Nepal</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-3">Response Time</h3>
                                    <ul className="space-y-2 text-gray-700">
                                        <li>• Acknowledgment within 24 hours</li>
                                        <li>• Response within 7 business days</li>
                                        <li>• Resolution within 30 days</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Agreement */}
                <div className="mt-16 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-8 text-center">
                    <h3 className="font-heading text-xl font-bold mb-4">
                        Your Privacy Matters
                    </h3>
                    <p className="mb-6">
                        By using our website and services, you acknowledge that you have read and understood this Privacy Policy. We are committed to protecting your privacy and will update this policy as needed to reflect our practices.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <a href="/booking" className="inline-flex items-center px-6 py-3 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                            Book Your Stay
                        </a>
                        <a href="/contact" className="inline-flex items-center px-6 py-3 bg-amber-800 hover:bg-amber-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                            Contact Privacy Officer
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Privacy;