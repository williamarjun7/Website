import { insforge, handleInsforgeError } from './insforge';

export interface Booking {
    id: string;
    room_id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    check_in: string;
    check_out: string;
    total_price: number;
    advance_amount?: number;
    balance_amount?: number;
    payment_status: 'pending' | 'paid' | 'failed' | 'pay_at_property';
    booking_status: 'pending_payment' | 'confirmed' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'checked_in' | 'checked_out';
    source: 'website' | 'pos';
    pos_booking_id?: string;
    created_at: string;
    hold_expires_at?: string;
    active_prn?: string;
}

export interface CreateBookingData {
    room_id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    check_in: string;
    check_out: string;
    guests?: number;
    payment_status?: 'pending' | 'paid' | 'failed' | 'pay_at_property';
    advance_amount?: number;
    balance_amount?: number;
}

export const calculateAdvanceAmount = (total: number): number => Math.round(total * 60) / 100;
export const calculateBalanceAmount = (total: number): number => total - calculateAdvanceAmount(total);

// Create a new booking
export const createBooking = async (bookingData: CreateBookingData) => {
    try {
        const { data, error } = await insforge.functions.invoke('create-booking', {
            body: {
                ...bookingData,
                payment_status: bookingData.payment_status || 'pending'
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get booking by ID
export const getBookingById = async (id: string) => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .select('*, rooms(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get booking by email (for guest lookup)
export const getBookingsByEmail = async (email: string) => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .select('*, rooms(*)')
            .eq('guest_email', email)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Get all bookings
export const getAllBookings = async () => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .select('*, rooms(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        return handleInsforgeError(error);
    }
};

const VALID_TRANSITIONS: Record<string, string[]> = {
    pending_payment: ['confirmed', 'cancelled', 'expired', 'failed'],
    confirmed: ['paid', 'checked_in', 'cancelled'],
    paid: ['checked_in', 'cancelled'],
    checked_in: ['checked_out'],
    checked_out: [],
    cancelled: [],
    expired: [],
    failed: [],
};

// Admin: Update booking status with state machine validation
export const updateBookingStatus = async (
    id: string,
    status: Booking['booking_status']
) => {
    try {
        const { data: current, error: fetchError } = await insforge.database
            .from('bookings')
            .select('booking_status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!current) throw new Error('Booking not found');

        const allowed = VALID_TRANSITIONS[current.booking_status];
        if (!allowed || !allowed.includes(status)) {
            throw new Error(`Cannot transition from "${current.booking_status}" to "${status}"`);
        }

        const { data, error } = await insforge.database
            .from('bookings')
            .update({ booking_status: status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Cancel booking
export const cancelBooking = async (id: string) => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .update({ booking_status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Get bookings by date range
export const getBookingsByDateRange = async (startDate: string, endDate: string) => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .select('*, rooms(*)')
            .gte('check_in', startDate)
            .lte('check_out', endDate)
            .order('check_in', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Get upcoming check-ins
export const getUpcomingCheckIns = async (days: number = 7) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const { data, error } = await insforge.database
            .from('bookings')
            .select('*, rooms(*)')
            .gte('check_in', today)
            .lte('check_in', futureDateStr)
            .eq('booking_status', 'confirmed')
            .order('check_in', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get effective price per night considering discount
export const getEffectivePricePerNight = (room: { price_per_night: number; discount_percent?: number }): number => {
    if (room.discount_percent && room.discount_percent > 0) {
        return Math.round(room.price_per_night * (1 - room.discount_percent / 100));
    }
    return room.price_per_night;
};

// Calculate total price based on nights
export const calculateTotalPrice = (
    pricePerNight: number,
    checkIn: string,
    checkOut: string
): number => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights * pricePerNight;
};
