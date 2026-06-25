import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Calendar,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Banknote,
    Plus,
    Eye,
    X,
    User,
    Mail,
    Phone
} from 'lucide-react';
import { getAllBookings, updateBookingStatus, createBooking, type Booking, type CreateBookingData } from '../../services/bookingService';
import { getAllRoomsForAdmin } from '../../services/roomService';
import { exportToCsv } from '../../utils/csv';
import { SkeletonTableRow } from '../../components/common/Skeleton';

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
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusLoading, setStatusLoading] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewingBooking, setViewingBooking] = useState<AdminBooking | null>(null);
    const [rooms, setRooms] = useState<{ id: string; name: string; price_per_night: number }[]>([]);
    const [createForm, setCreateForm] = useState({
        guest_name: '', guest_email: '', guest_phone: '',
        room_id: '', check_in: '', check_out: '',
        total_price: 0, advance_amount: 0, payment_status: 'pay_at_property' as string
    });
    const [createSaving, setCreateSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            getAllBookings(),
            getAllRoomsForAdmin(),
        ]).then(([bookingsRes, roomsRes]) => {
            if (bookingsRes.data) setBookings(bookingsRes.data);
            if (roomsRes.data) setRooms(roomsRes.data.map((r: { id: string; name: string; price_per_night: number }) => ({ id: r.id, name: r.name, price_per_night: r.price_per_night })));
            setLoading(false);
        }).catch((err) => {
            setLoading(false);
            setLoadError('Failed to load bookings. Please try again.');
            console.error('Failed to load bookings:', err);
        });
    }, []);

    const retryLoad = () => {
        setLoading(true);
        setLoadError('');
        Promise.all([
            getAllBookings(),
            getAllRoomsForAdmin(),
        ]).then(([bookingsRes, roomsRes]) => {
            if (bookingsRes.data) setBookings(bookingsRes.data);
            if (roomsRes.data) setRooms(roomsRes.data.map((r: { id: string; name: string; price_per_night: number }) => ({ id: r.id, name: r.name, price_per_night: r.price_per_night })));
            setLoading(false);
        }).catch((err) => {
            setLoading(false);
            setLoadError('Failed to load bookings. Please try again.');
            console.error('Failed to load bookings:', err);
        });
    };

    const filteredBookings = useMemo(() => {
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
        return result;
    }, [bookings, searchTerm, statusFilter]);

    useEffect(() => {
        setTimeout(() => setCurrentPage(1), 0);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
    const paginatedBookings = filteredBookings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const refreshBookings = () => {
        getAllBookings().then(({ data }) => {
            if (data) setBookings(data);
        }).catch((err) => console.error('Failed to refresh bookings:', err));
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

    const calcNights = (ci: string, co: string) => {
        if (!ci || !co) return 0;
        const start = new Date(ci);
        const end = new Date(co);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    };

    const handleCreateFormChange = (field: string, value: string) => {
        const updated = { ...createForm, [field]: value };
        if (field === 'room_id' || field === 'check_in' || field === 'check_out') {
            const room = rooms.find(r => r.id === updated.room_id);
            const nights = calcNights(updated.check_in, updated.check_out);
            if (room && nights > 0) {
                updated.total_price = room.price_per_night * nights;
                updated.advance_amount = Math.round(updated.total_price * 60 / 100);
            }
        }
        setCreateForm(updated);
    };

    const handleCreateBooking = async () => {
        if (!createForm.guest_name || !createForm.room_id || !createForm.check_in || !createForm.check_out) {
            setToastMessage('Please fill all required fields');
            setTimeout(() => setToastMessage(''), 5000);
            return;
        }
        setCreateSaving(true);
        const { error } = await createBooking({
            room_id: createForm.room_id,
            guest_name: createForm.guest_name,
            guest_email: createForm.guest_email,
            guest_phone: createForm.guest_phone,
            check_in: createForm.check_in,
            check_out: createForm.check_out,
            payment_status: createForm.payment_status as CreateBookingData['payment_status'],
            advance_amount: createForm.advance_amount || undefined,
        } as CreateBookingData);
        setCreateSaving(false);
        if (error) {
            setToastMessage('Failed to create booking: ' + error);
        } else {
            setShowCreateModal(false);
            setCreateForm({
                guest_name: '', guest_email: '', guest_phone: '',
                room_id: '', check_in: '', check_out: '',
                total_price: 0, advance_amount: 0, payment_status: 'pay_at_property'
            });
            refreshBookings();
            setToastMessage('Booking created successfully!');
        }
        setTimeout(() => setToastMessage(''), 5000);
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
            <Helmet><title>Bookings | Highlands Cafe & Motel Inn</title></Helmet>
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
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus size={18} />
                        <span>New Booking</span>
                    </button>
                    <button
                        className="btn-secondary flex items-center space-x-2"
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
                                    'Total (NPR)': (b.total_price ?? 0),
                                    'Advance Paid (NPR)': b.advance_amount != null ? b.advance_amount : (b.payment_status === 'pay_at_property' ? Math.round(b.total_price * 0.6) : b.total_price),
                                    'Balance at Property (NPR)': b.balance_amount != null ? b.balance_amount : 0,
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

            {loadError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 flex items-center justify-between">
                    <span>{loadError}</span>
                    <button onClick={retryLoad} className="text-red-700 font-medium hover:underline">Retry</button>
                </div>
            )}

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
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <SkeletonTableRow key={i} cols={9} />
                                    ))
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
                                            NPR {(booking.total_price ?? 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-amber-700">
                                            {booking.advance_amount != null
                                                ? `NPR ${(booking.advance_amount ?? 0).toLocaleString()}`
                                                : booking.payment_status === 'pay_at_property'
                                                    ? `NPR ${Math.round((booking.total_price ?? 0) * 60 / 100).toLocaleString()}`
                                                    : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-green-700">
                                            {booking.balance_amount != null
                                                ? `NPR ${(booking.balance_amount ?? 0).toLocaleString()}`
                                                : booking.payment_status === 'pay_at_property'
                                                    ? `NPR ${Math.round((booking.total_price ?? 0) * 40 / 100).toLocaleString()}`
                                                    : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {booking.booking_status === 'confirmed' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusUpdate(booking.id, 'checked_in')}
                                                            disabled={statusLoading === booking.id}
                                                            className={`p-1 rounded ${statusLoading === booking.id ? 'text-gray-300 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'}`}
                                                            title="Check In"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                                            disabled={statusLoading === booking.id}
                                                            className={`p-1 rounded ${statusLoading === booking.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                                                            title="Cancel"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {booking.booking_status === 'checked_in' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(booking.id, 'checked_out')}
                                                        disabled={statusLoading === booking.id}
                                                        className={`p-1 rounded ${statusLoading === booking.id ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                                                        title="Check Out"
                                                    >
                                                        <LogOut size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setViewingBooking(booking)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
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

            {/* Create Booking Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold font-heading flex items-center">
                                <Plus className="mr-2 text-primary" size={20} />
                                New Booking
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Guest Name <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text" value={createForm.guest_name}
                                        onChange={(e) => handleCreateFormChange('guest_name', e.target.value)}
                                        className="input w-full pl-10" placeholder="Full name"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="email" value={createForm.guest_email}
                                            onChange={(e) => handleCreateFormChange('guest_email', e.target.value)}
                                            className="input w-full pl-10" placeholder="guest@email.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Phone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="tel" value={createForm.guest_phone}
                                            onChange={(e) => handleCreateFormChange('guest_phone', e.target.value)}
                                            className="input w-full pl-10" placeholder="+977 9xxxxxxxx"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Room <span className="text-red-400">*</span></label>
                                <select
                                    value={createForm.room_id}
                                    onChange={(e) => handleCreateFormChange('room_id', e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">Select a room...</option>
                                    {rooms.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name} — NPR {(r.price_per_night ?? 0).toLocaleString()}/night</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Check-in <span className="text-red-400">*</span></label>
                                    <input
                                        type="date" value={createForm.check_in}
                                        onChange={(e) => handleCreateFormChange('check_in', e.target.value)}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700">Check-out <span className="text-red-400">*</span></label>
                                    <input
                                        type="date" value={createForm.check_out}
                                        onChange={(e) => handleCreateFormChange('check_out', e.target.value)}
                                        className="input w-full"
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Nights:</span>
                                    <span className="font-semibold">{calcNights(createForm.check_in, createForm.check_out)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total:</span>
                                    <span className="font-semibold">NPR {(createForm.total_price ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Advance (60%):</span>
                                    <span className="font-semibold text-amber-700">NPR {(createForm.advance_amount ?? 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Payment Method</label>
                                <select
                                    value={createForm.payment_status}
                                    onChange={(e) => handleCreateFormChange('payment_status', e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="pay_at_property">Pay at Property</option>
                                    <option value="paid">Already Paid</option>
                                    <option value="pending">Pending Payment</option>
                                </select>
                            </div>
                            <div className="flex space-x-4 pt-4 border-t">
                                <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button
                                    onClick={handleCreateBooking}
                                    disabled={createSaving}
                                    className="btn-primary flex-1"
                                >
                                    {createSaving ? 'Creating...' : 'Create Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Booking Detail Modal */}
            {viewingBooking && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold font-heading flex items-center">
                                <Eye className="mr-2 text-primary" size={20} />
                                Booking Details
                            </h2>
                            <button onClick={() => setViewingBooking(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center space-x-3">
                                    <User size={18} className="text-gray-400" />
                                    <div>
                                        <p className="font-semibold text-gray-900">{viewingBooking.guest_name}</p>
                                        <p className="text-sm text-gray-500">{viewingBooking.guest_email}</p>
                                        <p className="text-sm text-gray-500">{viewingBooking.guest_phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Room</p>
                                    <p className="font-semibold text-gray-900">{viewingBooking.rooms?.name || 'Unknown'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                                    <p className="font-semibold text-gray-900 text-xs break-all">{viewingBooking.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Check-in</p>
                                    <p className="font-semibold text-gray-900">{new Date(viewingBooking.check_in).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Check-out</p>
                                    <p className="font-semibold text-gray-900">{new Date(viewingBooking.check_out).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Status</p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingBooking.booking_status)}`}>
                                        {viewingBooking.booking_status.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">Payment</p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(viewingBooking.payment_status)}`}>
                                        {getPaymentLabel(viewingBooking.payment_status)}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Total Price</span>
                                    <span className="font-bold text-gray-900">NPR {(viewingBooking.total_price ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Advance Paid</span>
                                    <span className="font-semibold text-amber-700">
                                        {viewingBooking.advance_amount != null
                                            ? `NPR ${(viewingBooking.advance_amount ?? 0).toLocaleString()}`
                                            : viewingBooking.payment_status === 'pay_at_property'
                                                ? `NPR ${Math.round((viewingBooking.total_price ?? 0) * 60 / 100).toLocaleString()}`
                                                : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Balance Due</span>
                                    <span className="font-semibold text-green-700">
                                        {viewingBooking.balance_amount != null
                                            ? `NPR ${(viewingBooking.balance_amount ?? 0).toLocaleString()}`
                                            : viewingBooking.payment_status === 'pay_at_property'
                                                ? `NPR ${Math.round((viewingBooking.total_price ?? 0) * 40 / 100).toLocaleString()}`
                                                : '—'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setViewingBooking(null)}
                                className="btn-primary w-full"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default Bookings;
