import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Calendar,
    DollarSign,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    BarChart3
} from 'lucide-react';
import { getAllBookings, getUpcomingCheckIns, updateBookingStatus, type Booking } from '../../services/bookingService';
import { getAllRoomsForAdmin } from '../../services/roomService';
import Skeleton from '../../components/common/Skeleton';

interface DashboardBooking {
    id: string;
    guest_name: string;
    guest_email: string;
    total_price: number;
    booking_status: string;
    payment_status: string;
    advance_amount?: number;
    created_at: string;
    check_in: string;
    rooms?: { name: string };
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: ComponentType<{ size?: number; className?: string }>;
    color: string;
    prefix?: string;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalBookings: 0,
        activeRooms: 0,
        revenue: 0,
        occupancyRate: 0
    });
    const [recentBookings, setRecentBookings] = useState<DashboardBooking[]>([]);
    const [upcomingCheckIns, setUpcomingCheckIns] = useState<DashboardBooking[]>([]);
    const [bookingStatusCounts, setBookingStatusCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [bookingsRes, roomsRes, checkInsRes] = await Promise.all([
                getAllBookings(),
                getAllRoomsForAdmin(),
                getUpcomingCheckIns()
            ]);

            const bookings = bookingsRes.data || [];
            const rooms = roomsRes.data || [];
            const checkIns = checkInsRes.data || [];

            const totalRevenue = bookings
                .filter((b: DashboardBooking) =>
                    b.payment_status === 'paid' || b.payment_status === 'pay_at_property'
                )
                .reduce((sum: number, b: DashboardBooking) => {
                    if (b.payment_status === 'pay_at_property') {
                        const advance = b.advance_amount != null ? b.advance_amount : Math.round(Number(b.total_price) * 60) / 100;
                        return sum + Number(advance);
                    }
                    return sum + Number(b.total_price);
                }, 0);

            const activeBookings = bookings.filter((b: DashboardBooking) =>
                ['confirmed', 'checked_in'].includes(b.booking_status)
            ).length;

            const occupancy = rooms.length > 0
                ? Math.round((activeBookings / rooms.length) * 100)
                : 0;

            setStats({
                totalBookings: bookings.length,
                activeRooms: rooms.length,
                revenue: totalRevenue,
                occupancyRate: occupancy
            });

            const counts: Record<string, number> = {};
            for (const b of bookings) {
                const status = b.booking_status || 'unknown';
                counts[status] = (counts[status] || 0) + 1;
            }
            setBookingStatusCounts(counts);

            setRecentBookings(bookings.slice(0, 5));
            setUpcomingCheckIns(checkIns.slice(0, 5));
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = async (id: string, status: string) => {
        await updateBookingStatus(id, status as Booking['booking_status']);
        loadDashboardData();
    };

    const StatCard = ({ title, value, icon: Icon, color, prefix = '' }: StatCardProps) => (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                    <Icon size={20} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                </span>
            </div>
        </div>
    );

    const statusColors: Record<string, string> = {
        confirmed: 'bg-green-500',
        checked_in: 'bg-blue-500',
        checked_out: 'bg-gray-500',
        cancelled: 'bg-red-500',
        pending_payment: 'bg-amber-500',
        paid: 'bg-teal-500',
        failed: 'bg-rose-500',
        expired: 'bg-purple-500',
    };
    const statusLabels: Record<string, string> = {
        confirmed: 'Confirmed',
        checked_in: 'Checked In',
        checked_out: 'Checked Out',
        cancelled: 'Cancelled',
        pending_payment: 'Pending Payment',
        paid: 'Paid',
        failed: 'Failed',
        expired: 'Expired',
    };
    const maxCount = Math.max(...Object.values(bookingStatusCounts), 1);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-80 mt-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-10 rounded-lg" />
                            </div>
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-5 w-32 mb-6" />
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="mb-4">
                                <div className="flex justify-between mb-1">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-4 w-8" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-16 ml-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <Skeleton className="h-5 w-36" />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-heading">Dashboard Overview</h1>
                <p className="text-gray-500">Welcome back, here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Bookings" value={stats.totalBookings} icon={Calendar} color="bg-blue-500" />
                <StatCard title="Total Revenue" value={stats.revenue} prefix="NPR " icon={DollarSign} color="bg-green-500" />
                <StatCard title="Total Rooms" value={stats.activeRooms} icon={Users} color="bg-purple-500" />
                <StatCard title="Occupancy Rate" value={`${stats.occupancyRate}%`} icon={TrendingUp} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Booking Status Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <BarChart3 size={20} className="text-gray-500" />
                        <h2 className="font-bold text-gray-900">Booking Status</h2>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(statusLabels).map(([key, label]) => {
                            const count = bookingStatusCounts[key] || 0;
                            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                            return (
                                <div key={key}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">{label}</span>
                                        <span className="font-medium text-gray-900">{count}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${statusColors[key] || 'bg-gray-400'}`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Bookings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Recent Bookings</h2>
                        <button onClick={() => navigate('/admin/bookings')} className="text-sm text-primary hover:text-primary/80 font-medium">
                            View All
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {recentBookings.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No recent bookings</div>
                        ) : (
                            recentBookings.map((booking) => (
                                <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                            {booking.guest_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{booking.guest_name}</p>
                                            <p className="text-xs text-gray-500">{new Date(booking.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">NPR {booking.total_price.toLocaleString()}</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${booking.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                            }`}>
                                            {booking.booking_status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Check-ins */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900">Upcoming Check-ins</h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {upcomingCheckIns.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No upcoming check-ins</div>
                        ) : (
                            upcomingCheckIns.map((booking) => (
                                <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <Clock size={20} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{booking.rooms?.name || 'Unknown Room'}</p>
                                            <p className="text-sm text-gray-500">In: {new Date(booking.check_in).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleQuickAction(booking.id, 'checked_in')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                                            title="Check In"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleQuickAction(booking.id, 'cancelled')}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                                            title="Cancel"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
