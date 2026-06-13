import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Calendar,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Banknote
} from 'lucide-react';
import { getAllBookings, updateBookingStatus, type Booking } from '../../services/bookingService';
import { exportToCsv } from '../../utils/csv';

interface AdminBooking {
    id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    total_price: number;
    advance_amount?: number;
    balance_amount?: number;
    booking_status: string;
    payment_status: string;
    check_in: string;
    check_out: string;
    created_at: string;
    rooms?: { name: string };
}

const ITEMS_PER_PAGE = 10;

const Bookings = () => {
    const [bookings, setBookings] = useState<AdminBooking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusLoading, setStatusLoading] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const filterAndSetBookings = useCallback(() => {
        let result = [...bookings];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(b =>
                b.guest_name.toLowerCase().includes(term) ||
                b.guest_email.toLowerCase().includes(term) ||
                b.id.toLowerCase().includes(term)
            );
        }
        if (statusFilter === 'paid' || statusFilter === 'pending' || statusFilter === 'failed' || statusFilter === 'pay_at_property') {
            result = result.filter(b => b.payment_status === statusFilter);
        } else if (statusFilter !== 'all') {
            result = result.filter(b => b.booking_status === statusFilter);
        }
        setFilteredBookings(result);
    }, [bookings, searchTerm, statusFilter]);

    useEffect(() => {
        let cancelled = false;
        getAllBookings().then(({ data }) => {
            if (!cancelled && data) {
                setBookings(data);
            }
            if (!cancelled) setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        setTimeout(() => {
            filterAndSetBookings();
            setCurrentPage(1);
        }, 0);
    }, [bookings, searchTerm, statusFilter, filterAndSetBookings]);

    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
    const paginatedBookings = filteredBookings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const refreshBookings = () => {
        getAllBookings().then(({ data }) => {
            if (data) setBookings(data);
        }).catch(() => {});
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (statusLoading) return;
        setStatusLoading(id);
        const { data, error } = await updateBookingStatus(id, newStatus as Booking['booking_status']);
        setStatusLoading(null);
        if (data) {
            refreshBookings();
        } else {
            setToastMessage('Failed to update status: ' + error);
            setTimeout(() => setToastMessage(''), 5000);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'checked_in': return 'bg-green-100 text-green-800';
            case 'checked_out': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-amber-100 text-amber-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'pay_at_property': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPaymentIcon = (status: string) => {
        switch (status) {
            case 'paid': return CheckCircle;
            case 'pending': return Clock;
            case 'failed': return XCircle;
            case 'pay_at_property': return Banknote;
            default: return Clock;
        }
    };

    const getPaymentLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'pending': return 'Pending';
            case 'failed': return 'Failed';
            case 'pay_at_property': return 'Pay at Property';
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-blue-50 text-blue-700 border border-blue-200" role="alert">
                    {toastMessage}
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Bookings</h1>
                    <p className="text-gray-500">Manage all guest reservations</p>
                </div>
                <button
                    className="btn-primary flex items-center space-x-2"
                    onClick={() => {
                        if (filteredBookings.length === 0) {
                            setToastMessage('No bookings to export.');
                            setTimeout(() => setToastMessage(''), 3000);
                            return;
                        }
                        exportToCsv(
                            filteredBookings.map(b => ({
                                'Booking ID': b.id,
                                'Guest Name': b.guest_name,
                                'Guest Email': b.guest_email,
                                'Guest Phone': b.guest_phone,
                                'Room': b.rooms?.name || 'Unknown',
                                'Check In': new Date(b.check_in).toLocaleDateString(),
                                'Check Out': new Date(b.check_out).toLocaleDateString(),
                                'Status': b.booking_status,
                                'Total (NPR)': b.total_price,
                                'Advance Paid (NPR)': b.advance_amount || (b.payment_status === 'pay_at_property' ? b.total_price * 0.6 : b.total_price),
                                'Balance at Property (NPR)': b.balance_amount || 0,
                                'Payment Status': b.payment_status,
                                'Created': new Date(b.created_at).toLocaleDateString(),
                            })),
                            `bookings-export-${new Date().toISOString().split('T')[0]}`
                        );
                    }}
                >
                    <Download size={18} />
                    <span>Export CSV</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 input w-full"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400" size={20} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input min-w-[150px]"
                    >
                        <option value="all">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                        <option disabled>── Payment ──</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="pay_at_property">Pay at Property</option>
                    </select>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-900">Guest</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Room</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Dates</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Payment</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Advance Paid</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Balance Due</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center">
                                            <div className="spinner mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                        No bookings found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{booking.guest_name}</div>
                                            <div className="text-xs text-gray-500">{booking.guest_email}</div>
                                            <div className="text-xs text-gray-500">{booking.guest_phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{booking.rooms?.name || 'Unknown Room'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Calendar size={14} className="mr-1" />
                                                {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.booking_status)}`}>
                                                {booking.booking_status === 'confirmed' && <CheckCircle size={12} className="mr-1" />}
                                                {booking.booking_status === 'cancelled' && <XCircle size={12} className="mr-1" />}
                                                {booking.booking_status === 'checked_in' && <Clock size={12} className="mr-1" />}
                                                {booking.booking_status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                                                {(() => { const Icon = getPaymentIcon(booking.payment_status); return <Icon size={12} className="mr-1" />; })()}
                                                {getPaymentLabel(booking.payment_status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            NPR {booking.total_price.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-amber-700">
                                            {booking.advance_amount
                                                ? `NPR ${booking.advance_amount.toLocaleString()}`
                                                : booking.payment_status === 'pay_at_property'
                                                    ? `NPR ${Math.round(booking.total_price * 60 / 100).toLocaleString()}`
                                                    : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-green-700">
                                            {booking.balance_amount
                                                ? `NPR ${booking.balance_amount.toLocaleString()}`
                                                : booking.payment_status === 'pay_at_property'
                                                    ? `NPR ${Math.round(booking.total_price * 40 / 100).toLocaleString()}`
                                                    : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {booking.booking_status === 'confirmed' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(booking.id, 'checked_in')}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            title="Check In"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Cancel"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {booking.booking_status === 'checked_in' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking.id, 'checked_out')}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Check Out"
                                                    >
                                                        <LogOut size={18} />
                                                    </button>
                                                )}
                                                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of{' '}
                        {filteredBookings.length} bookings
                    </p>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                    page === currentPage
                                        ? 'bg-primary text-white'
                                        : 'border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};



export default Bookings;
