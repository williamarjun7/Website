import { insforge, handleInsforgeError } from './insforge';

export interface StuckBooking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  total_price: number;
  payment_status: string;
  booking_status: string;
  hold_expires_at: string;
  active_prn: string | null;
  created_at: string;
  rooms: { name: string } | null;
}

export interface PaymentRecord {
  id: string;
  booking_id: string;
  prn: string;
  amount: number;
  status: string;
  fonepay_trace_id: string | null;
  created_at: string;
  verified_at: string | null;
  bookings?: {
    id: string;
    guest_name: string;
    guest_email: string;
    total_price: number;
  } | null;
}

export interface SearchResult {
  bookings: StuckBooking[];
  payments: PaymentRecord[];
}

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await insforge.functions.invoke('admin-recover-payment', { body });
    if (error) throw error;
    return { data: data as T, error: null };
  } catch (err) {
    // 401 auth errors are expected when edge function rejects our session token
    if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 401) {
      return { data: null, error: 'Authentication required for admin recovery operations' };
    }
    return handleInsforgeError(err);
  }
}

export const listStuckPayments = async (): Promise<{ data: StuckBooking[] | null; error: string | null }> => {
  const result = await invokeAdmin<{ bookings: StuckBooking[] }>({ action: 'list-stuck' });
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.bookings || [], error: null };
};

export const searchBookingsAndPayments = async (query: string): Promise<{ data: SearchResult | null; error: string | null }> => {
  const result = await invokeAdmin<SearchResult>({ action: 'search', query });
  if (result.error) return { data: null, error: result.error };
  return { data: result.data || { bookings: [], payments: [] }, error: null };
};

export const forceConfirmPayment = async (bookingId: string, note?: string): Promise<{ data: { message: string; code: string } | null; error: string | null }> => {
  const result = await invokeAdmin<{ message: string; code: string }>({ action: 'force-confirm', booking_id: bookingId, note: note || '' });
  if (result.error) return { data: null, error: result.error };
  return { data: result.data || null, error: null };
};

export const forceExpireBooking = async (bookingId: string, reason?: string): Promise<{ data: { message: string } | null; error: string | null }> => {
  const result = await invokeAdmin<{ message: string }>({ action: 'force-expire', booking_id: bookingId, reason: reason || '' });
  if (result.error) return { data: null, error: result.error };
  return { data: result.data || null, error: null };
};
