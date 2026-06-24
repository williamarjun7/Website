import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader,
  User,
  Mail,
  Calendar,
  Zap,
  Ban,
} from 'lucide-react';
import {
  listStuckPayments,
  searchBookingsAndPayments,
  forceConfirmPayment,
  forceExpireBooking,
  StuckBooking,
  PaymentRecord,
} from '../../services/adminRecoveryService';
import { SkeletonTableRow } from '../../components/common/Skeleton';

const PaymentRecovery = () => {
  const [stuckBookings, setStuckBookings] = useState<StuckBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ bookings: StuckBooking[]; payments: PaymentRecord[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ booking: StuckBooking; action: 'confirm' | 'expire' } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const loadStuck = useCallback(async () => {
    setLoading(true);
    const { data, error } = await listStuckPayments();
    if (error) showToast('error', error);
    else setStuckBookings(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadStuck(); }, [loadStuck]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setTimeout(() => setSearchResults(null), 0); return }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data, error } = await searchBookingsAndPayments(searchQuery);
      if (error) showToast('error', error);
      else setSearchResults(data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  const handleForceConfirm = async (booking: StuckBooking) => {
    setConfirmDialog(null);
    setActionLoading(booking.id);
    const { error } = await forceConfirmPayment(booking.id, 'Admin recovery from Payment Recovery page');
    setActionLoading(null);
    if (error) showToast('error', error);
    else {
      showToast('success', `Booking ${booking.id.slice(0, 8)}… confirmed successfully`);
      loadStuck();
    }
  };

  const handleForceExpire = async (booking: StuckBooking) => {
    setConfirmDialog(null);
    setActionLoading(booking.id);
    const { error } = await forceExpireBooking(booking.id, 'Expired from Payment Recovery page');
    setActionLoading(null);
    if (error) showToast('error', error);
    else {
      showToast('info', `Booking ${booking.id.slice(0, 8)}… expired, room released`);
      loadStuck();
    }
  };

  const getHoldAge = (holdExpiresAt: string, now: number) => {
    const holdTime = new Date(holdExpiresAt).getTime();
    if (isNaN(holdTime)) return 'N/A';
    const diff = now - holdTime;
    if (diff < 0) return 'Not yet expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Payment Recovery | Highlands Cafe & Motel Inn</title></Helmet>
      {toast && (
        <div className={`fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`} role="alert">
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                confirmDialog.action === 'confirm' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {confirmDialog.action === 'confirm'
                  ? <CheckCircle className="text-green-600" size={28} />
                  : <Ban className="text-red-600" size={28} />}
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {confirmDialog.action === 'confirm' ? 'Confirm Payment' : 'Expire Booking'}
                </h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <p><span className="text-gray-500">Guest:</span> <strong>{confirmDialog.booking.guest_name}</strong></p>
              <p><span className="text-gray-500">Room:</span> <strong>{confirmDialog.booking.rooms?.name || 'Unknown'}</strong></p>
              <p><span className="text-gray-500">Amount:</span> <strong>NPR {confirmDialog.booking.total_price.toLocaleString()}</strong></p>
              <p><span className="text-gray-500">Hold expired:</span> <strong className="text-red-600">{getHoldAge(confirmDialog.booking.hold_expires_at, now)}</strong></p>
            </div>

            {confirmDialog.action === 'confirm' && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4">
                <AlertTriangle size={16} className="inline mr-1" />
                Only use this if you have verified the customer paid via Fonepay or bank statement.
              </p>
            )}

            <div className="flex space-x-3">
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => confirmDialog.action === 'confirm'
                  ? handleForceConfirm(confirmDialog.booking)
                  : handleForceExpire(confirmDialog.booking)}
                className={`flex-1 ${confirmDialog.action === 'confirm' ? 'btn-primary' : 'bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors'}`}
              >
                {confirmDialog.action === 'confirm' ? 'Confirm Payment' : 'Expire Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Payment Recovery</h1>
          <p className="text-gray-500">Recover stuck payments and release inventory</p>
        </div>
        <button onClick={loadStuck} className="btn-secondary flex items-center space-x-2" disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stuck Payments</p>
              <p className="text-3xl font-bold text-amber-600">{stuckBookings.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Held Value</p>
              <p className="text-3xl font-bold text-gray-900">
                NPR {(stuckBookings.reduce((s, b) => s + (b.total_price || 0), 0)).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recoverable</p>
              <p className="text-3xl font-bold text-green-600">
                {stuckBookings.filter(b => b.active_prn).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          {searching ? (
            <Loader className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={20} />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          )}
          <input
            type="text"
            placeholder="Search by booking ID, guest name, email, or PRN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input w-full"
          />
        </div>

        {/* Search Results */}
        {searchResults && searchQuery.trim() && (
          <div className="mt-4 space-y-3">
            {searchResults.bookings.length === 0 && searchResults.payments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No results found</p>
            )}

            {searchResults.bookings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Bookings ({searchResults.bookings.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.bookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span className="font-medium truncate">{b.guest_name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            b.booking_status === 'pending_payment' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                          }`}>{b.booking_status}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center"><Mail size={12} className="mr-1" />{b.guest_email}</span>
                          <span className="flex items-center"><Calendar size={12} className="mr-1" />{b.check_in}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="font-medium">NPR {b.total_price.toLocaleString()}</div>
                        {b.booking_status === 'pending_payment' ? (
                          <div className="flex space-x-1 mt-1">
                            <button onClick={() => setConfirmDialog({ booking: b, action: 'confirm' })}
                              className="p-1 text-green-600 hover:bg-green-50 rounded" title="Force Confirm">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => setConfirmDialog({ booking: b, action: 'expire' })}
                              className="p-1 text-red-600 hover:bg-red-50 rounded" title="Force Expire">
                              <XCircle size={16} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.payments.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Payments ({searchResults.payments.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-gray-500">{p.prn.slice(0, 24)}…</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            p.status === 'completed' ? 'bg-green-100 text-green-700' :
                            p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{p.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Booking: {p.booking_id.slice(0, 8)}… &middot; {p.bookings?.guest_name || 'N/A'}
                        </div>
                      </div>
                      <div className="font-medium shrink-0 ml-4">NPR {p.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stuck Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Stuck Payments (hold expired)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-gray-900">Guest</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Room</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Dates</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Hold Expired</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-4 font-semibold text-gray-900">PRN</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={7} />
                ))
              ) : stuckBookings.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No stuck payments found.</td></tr>
              ) : (
                stuckBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{booking.guest_name}</div>
                          <div className="text-xs text-gray-500 flex items-center">
                            <Mail size={12} className="mr-1" />{booking.guest_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{booking.rooms?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        <Calendar size={14} className="inline mr-1" />
                        {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <Clock size={12} className="mr-1" />
                        {getHoldAge(booking.hold_expires_at, now)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      NPR {booking.total_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {booking.active_prn ? booking.active_prn.slice(0, 16) + '…' : '—'}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {actionLoading === booking.id ? (
                        <div className="spinner w-5 h-5 mx-auto" />
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setConfirmDialog({ booking, action: 'confirm' })}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Force Confirm Payment"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            onClick={() => setConfirmDialog({ booking, action: 'expire' })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Force Expire Booking"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start space-x-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 space-y-1">
            <p className="font-medium">When to use each action:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li><strong>Confirm Payment</strong> — Only when the customer has paid (bank statement/Fonepay app proof). This marks the booking as <code>confirmed</code> and releases the hold.</li>
              <li><strong>Expire Booking</strong> — When the customer did not pay and the hold has expired. This releases the room for other customers.</li>
              <li>The reconciliation service automatically handles most cases. Use this page for manual overrides only.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecovery;
