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
    payment_status: 'pending' | 'paid' | 'failed' | 'pay_at_property';
    booking_status: 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
    source: 'website' | 'pos';
    pos_booking_id?: string;
    created_at: string;
}

export interface CreateBookingData {
    room_id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    check_in: string;
    check_out: string;
    payment_status?: 'pending' | 'paid' | 'failed' | 'pay_at_property';
}

// Create a new booking
export const createBooking = async (bookingData: CreateBookingData) => {
    try {
        const { data, error } = await insforge.functions.invoke('create-booking', {
            body: {
                ...bookingData,
                booking_status: 'confirmed',
                payment_status: bookingData.payment_status || 'pending'
            }
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Booking creation failed:', error);
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

// Admin: Update booking status
export const updateBookingStatus = async (
    id: string,
    status: Booking['booking_status']
) => {
    try {
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

// Admin: Update payment status
export const updatePaymentStatus = async (
    id: string,
    status: Booking['payment_status']
) => {
    try {
        const { data, error } = await insforge.database
            .from('bookings')
            .update({ payment_status: status })
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
