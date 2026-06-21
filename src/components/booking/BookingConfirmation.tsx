import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Printer, Home, Phone, Mail, MapPin,
  QrCode, Globe, Wallet, Clock, CheckCircle,
  XCircle, CalendarDays, User, Receipt, Building, Info,
} from 'lucide-react';
import { getBookingById } from '../../services/bookingService';
import { getSiteContentMap } from '../../services/contentService';

export interface ConfirmedBookingData {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  room: {
    id: string;
    name: string;
    room_number?: string;
    room_type?: string;
  };
  total_price: number;
  advance_amount?: number;
  balance_amount?: number;
  payment_method: 'pay_at_property' | 'fonepay_qr' | 'fonepay_web';
  transaction_id?: string;
  payment_status: string;
  booking_status: string;
}

const STORAGE_KEY = 'confirmedBooking';

export function storeConfirmedBooking(data: ConfirmedBookingData) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearConfirmedBooking() {
  sessionStorage.removeItem(STORAGE_KEY);
}

function loadConfirmedBooking(): ConfirmedBookingData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConfirmedBookingData;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatStatusLabel(status: string, type: 'booking' | 'payment'): string {
  if (type === 'payment' && status === 'pay_at_property') return 'Pending';
  if (status === 'pending_payment') return 'Pending';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'completed') return 'Completed';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StatusBadge({ status, type }: { status: string; type: 'booking' | 'payment' }) {
  const isPositive = ['paid', 'completed', 'confirmed'].includes(status);
  const isWarning = ['pending', 'pay_at_property', 'pending_payment'].includes(status);

  const Icon = isPositive ? CheckCircle : isWarning ? Clock : XCircle;
  const bg = isPositive ? 'bg-green-100' : isWarning ? 'bg-amber-100' : 'bg-red-100';
  const text = isPositive ? 'text-green-800' : isWarning ? 'text-amber-800' : 'text-red-800';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={14} />
      {formatStatusLabel(status, type)}
    </span>
  );
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <h3 className="font-heading text-base font-semibold text-gray-900 mb-1">
      <span className="inline-flex items-center gap-2">
        <Icon size={16} className="text-amber-700" /> {label}
      </span>
    </h3>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {children}
    </div>
  );
}

function DetailItem({ label, value, mono, fullWidth }: {
  label: string;
  value: string | number;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`font-medium text-gray-900 break-words ${mono ? 'font-mono text-sm' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}

const BookingConfirmation: React.FC<{ bookingData?: ConfirmedBookingData }> = ({ bookingData: propData }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<ConfirmedBookingData | null>(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [content, setContent] = useState<Record<string, string>>({});
  const C = (key: string, fallback: string) => content[key] || fallback;

  useEffect(() => {
    getSiteContentMap().then(r => {
      if (r.data) setContent(r.data);
    });

    if (propData) {
      setData(propData);
      setLoading(false);
      return;
    }

    const stored = loadConfirmedBooking();
    if (stored) {
      setData(stored);
      setLoading(false);
      return;
    }

    const pendingId = sessionStorage.getItem('pendingBookingId');
    if (pendingId) {
      getBookingById(pendingId).then((res) => {
        const b = res.data;
        if (b) {
          const d: ConfirmedBookingData = {
            id: b.id,
            guest_name: b.guest_name,
            guest_email: b.guest_email,
            guest_phone: b.guest_phone,
            check_in: b.check_in,
            check_out: b.check_out,
            guests: b.adults || 1,
            room: b.rooms || { id: '', name: C('confirmation_room_fallback', 'Selected Room') },
            total_price: b.total_price,
            advance_amount: b.advance_amount,
            balance_amount: b.balance_amount,
            payment_method: b.payment_status === 'pay_at_property' ? 'pay_at_property' : 'fonepay_web',
            payment_status: b.payment_status,
            booking_status: b.booking_status,
          };
          setData(d);
          storeConfirmedBooking(d);
        }
        setLoading(false);
      });
      return;
    }

    setLoading(false);
  }, [propData]);

  const total = data?.total_price || 0;
  const advance = data?.advance_amount ?? Math.round(total * 60) / 100;
  const balance = data?.balance_amount ?? total - advance;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-2xl mx-auto">
        <div className="animate-spin w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4" />
        <h2 className="font-heading text-2xl font-bold mb-2">{C('confirmation_heading', 'Reservation Confirmed')}</h2>
        <p className="text-gray-600">{C('confirmation_loading_text', 'Loading your reservation details...')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-2xl mx-auto">
        <h2 className="font-heading text-2xl font-bold mb-2">{C('confirmation_not_found', 'Reservation Not Found')}</h2>
        <p className="text-gray-600 mb-6">{C('confirmation_not_found_text', "We couldn't find your reservation details. Please contact us for assistance.")}</p>
        <button onClick={() => navigate('/')} className="btn-primary w-full">{C('confirmation_return_home', 'Return Home')}</button>
      </div>
    );
  }

  const isPayAtProperty = data.payment_method === 'pay_at_property';

  const paymentConfig = {
    icon: isPayAtProperty ? Wallet : data.payment_method === 'fonepay_qr' ? QrCode : Globe,
    label: isPayAtProperty ? C('confirmation_advance_label', 'Advance Payment Reservation') : data.payment_method === 'fonepay_qr' ? C('confirmation_fonepay_qr_label', 'Fonepay QR') : C('confirmation_fonepay_web_label', 'Fonepay Web'),
    cardClass: isPayAtProperty ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200',
    iconWrapClass: isPayAtProperty ? 'bg-amber-100' : 'bg-green-100',
    iconClass: isPayAtProperty ? 'text-amber-700' : 'text-green-700',
  };
  const PayIcon = paymentConfig.icon;

  const nights = Math.max(1, Math.round(
    (new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <div className="max-w-2xl mx-auto space-y-5 print:mx-0 print:space-y-4">
      <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 border border-amber-50 print:shadow-none print:border print:border-gray-300 print:rounded-none print:p-6">
        {/* ── Success Header ── */}
        <div className="text-center mb-7 print:mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 print:hidden">
            <Check className="text-green-600" size="32" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {C('confirmation_reserved_heading', 'Reservation Confirmed')}
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto leading-relaxed">
            {isPayAtProperty
              ? C('confirmation_success_text_pay_at_property_true', 'Your reservation has been successfully created. Please review your reservation details below.')
              : C('confirmation_success_text_pay_at_property_false', 'Your payment has been received and your reservation is confirmed.')
            }
          </p>
        </div>

        {/* ── Reservation Reference ── */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl p-5 md:p-6 mb-5 print:bg-gray-50 print:border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
                {C('confirmation_ref_label', 'Reservation Reference')}
              </p>
              <p className="font-mono text-xl md:text-2xl font-bold text-primary break-all leading-tight">
                {data.id}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <StatusBadge status={data.booking_status} type="booking" />
              <StatusBadge status={data.payment_status} type="payment" />
            </div>
          </div>
        </div>

        {/* ── Reservation Details ── */}
        <SectionCard className="mb-4 print:border-gray-300">
          <SectionHeading icon={CalendarDays} label={C('confirmation_details_heading', 'Reservation Details')} />
          <DetailGrid>
            <DetailItem label={C('confirmation_room_label', 'Room')} value={data.room.name + (data.room.room_number ? ` #${data.room.room_number}` : '')} />
            {data.room.room_type && (
              <DetailItem label={C('confirmation_room_type_label', 'Room Type')} value={data.room.room_type.charAt(0).toUpperCase() + data.room.room_type.slice(1)} />
            )}
            <DetailItem label={C('confirmation_checkin_label', 'Check-In Date')} value={formatDate(data.check_in)} />
            <DetailItem label={C('confirmation_checkout_label', 'Check-Out Date')} value={formatDate(data.check_out)} />
            <DetailItem label={C('confirmation_nights_label', 'Number of Nights')} value={`${nights} ${nights !== 1 ? C('confirmation_nights', 'Nights') : C('confirmation_night', 'Night')}`} />
            <DetailItem label={C('confirmation_guests_label', 'Number of Guests')} value={`${data.guests} ${data.guests !== 1 ? C('confirmation_guests', 'Guests') : C('confirmation_guest', 'Guest')}`} />
          </DetailGrid>
        </SectionCard>

        {/* ── Guest Information ── */}
        <SectionCard className="mb-4 print:border-gray-300">
          <SectionHeading icon={User} label={C('confirmation_guest_heading', 'Guest Information')} />
          <DetailGrid>
            <DetailItem label={C('confirmation_guest_name_label', 'Guest Name')} value={data.guest_name} />
            <DetailItem label={C('confirmation_email_label', 'Email Address')} value={data.guest_email} />
            <DetailItem label={C('confirmation_phone_label', 'Phone Number')} value={data.guest_phone} />
          </DetailGrid>
        </SectionCard>

        {/* ── Payment Information ── */}
        <SectionCard className="mb-5 print:border-gray-300">
          <SectionHeading icon={Receipt} label={C('confirmation_payment_heading', 'Payment Information')} />

          <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 mt-3 ${paymentConfig.cardClass}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${paymentConfig.iconWrapClass}`}>
              <PayIcon size="20" className={paymentConfig.iconClass} />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">{paymentConfig.label}</p>
              {data.transaction_id && (
                <p className="text-xs text-gray-500 font-mono mt-0.5 break-all">{C('confirmation_transaction_id_label', 'Transaction ID:')} {data.transaction_id}</p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {isPayAtProperty ? (
              <>
                <div className="sm:col-span-2 border-b border-gray-100 pb-3">
                  <div className="grid grid-cols-2 gap-4">
                    <span className="text-gray-500 text-sm">{C('confirmation_total_label', 'Reservation Total')}</span>
                    <span className="font-semibold text-gray-900 text-sm text-right">{C('confirmation_npr_prefix', 'NPR')} {total.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">{C('confirmation_advance_label_short', 'Advance Payment Required')}</p>
                  <p className="text-xs text-amber-600 font-medium mb-1">{C('confirmation_advance_percent', '60% of reservation total')}</p>
                  <p className="font-semibold text-amber-700 text-sm">{C('confirmation_npr_prefix', 'NPR')} {advance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">{C('confirmation_balance_label_short', 'Balance Due At Check-In')}</p>
                  <p className="text-xs text-green-600 font-medium mb-1">{C('confirmation_balance_percent', '40% of reservation total')}</p>
                  <p className="font-semibold text-green-700 text-sm">{C('confirmation_npr_prefix', 'NPR')} {balance.toLocaleString()}</p>
                </div>
                <div className="sm:col-span-2 bg-amber-50 rounded-lg p-3 mt-2 text-xs text-amber-800 leading-relaxed">
                  <p className="font-medium mb-1">{C('confirmation_policy_secured', 'Your reservation has been secured.')}</p>
                  <p>{C('confirmation_policy_advance_required', 'The advance payment amount is required to confirm the booking.')}</p>
                  <p className="mt-1">{C('confirmation_policy_balance_at_property', 'The remaining balance will be paid during check-in at the property.')}</p>
                </div>
              </>
            ) : (
              <>
                <DetailItem label={C('confirmation_payment_status_label', 'Payment Status')} value={C('confirmation_paid_label', 'Paid')} />
                <DetailItem label={C('confirmation_amount_paid_label', 'Amount Paid')} value={`${C('confirmation_npr_prefix', 'NPR')} ${total.toLocaleString()}`} />
                {data.transaction_id && (
                  <DetailItem label={C('confirmation_transaction_id', 'Transaction ID')} value={data.transaction_id} mono fullWidth />
                )}
                <div className="sm:col-span-2 bg-green-50 rounded-lg p-3 mt-2 text-xs text-green-800 leading-relaxed">
                  <p className="font-medium">{C('confirmation_payment_success_text', 'Payment completed successfully via Fonepay.')}</p>
                </div>
              </>
            )}
          </div>
        </SectionCard>

        {/* ── Hotel Contact ── */}
        <SectionCard className="mb-4 print:border-gray-300 print:bg-gray-50">
          <SectionHeading icon={Building} label={C('confirmation_help_heading', 'Need Assistance?')} />
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <p className="font-semibold text-gray-900 text-sm">{C('confirmation_hotel_name', 'Highlands Motel & Cafe')}</p>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin size="14" className="mt-0.5 shrink-0 text-gray-400" />
                <span>{C('confirmation_location', 'Surkhet, Nepal')}</span>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Phone size="14" className="mt-0.5 shrink-0 text-gray-400" />
                <span>{content['contact_phone'] || C('confirmation_phone_fallback', '+977-98XXXXXXXX')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 break-all">
                <Mail size="14" className="mt-0.5 shrink-0 text-gray-400" />
                <span>{content['contact_email'] || C('confirmation_email_fallback', 'info@highlands-motel.com')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 print:hidden">
            <a
              href={`tel:${content['contact_phone'] || C('confirmation_phone_fallback', '+977-98XXXXXXXX')}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <Phone size="14" />
              {C('confirmation_call_btn', 'Call Hotel')}
            </a>
            <a
              href={`mailto:${content['contact_email'] || C('confirmation_email_fallback', 'info@highlands-motel.com')}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <Mail size="14" />
              {C('confirmation_email_btn', 'Send Email')}
            </a>
          </div>
        </SectionCard>

        {/* ── Important Information ── */}
        <SectionCard className="mb-5 print:border-gray-300">
          <SectionHeading icon={Info} label={C('confirmation_important_heading', 'Important Information')} />
          <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0" />
              <span>{C('confirmation_policy_id', 'Please bring a valid government-issued ID during check-in.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0" />
              <span>{C('footer_hours_checkin_label', 'Check-in:')} {C('checkin_time', '2:00 PM')} &nbsp;|&nbsp; {C('footer_hours_checkout_label', 'Check-out:')} {C('checkout_time', '12:00 PM')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0" />
              <span>{C('confirmation_policy_changes', 'For any reservation changes, please contact the hotel directly.')}</span>
            </li>
          </ul>
        </SectionCard>

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            <span>{C('confirmation_print_btn', 'Print Confirmation')}</span>
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Home size={18} />
            <span>{C('confirmation_return_home_btn', 'Return Home')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
