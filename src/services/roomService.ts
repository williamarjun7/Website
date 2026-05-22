import { insforge, handleInsforgeError } from './insforge';

export interface Room {
    id: string;
    name: string;
    description: string;
    price_per_night: number;
    max_guests: number;
    is_active: boolean;
    room_type?: string;
    amenities?: string[];
    room_size?: string;
    bed_type?: string;
    policies?: string;
    room_number?: string;
    has_ac?: boolean;
    floor_number?: number;
    availability_status?: string;
    featured?: boolean;
    discount_percent?: number;
    maintenance?: boolean;
    seasonal_pricing?: Record<string, any>;
    created_at: string;
    room_images?: RoomImage[];
}

export interface RoomImage {
    id: string;
    room_id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
}

// Get all active rooms (public)
export const getRooms = async () => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('room_number', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Failed to fetch rooms:', error);
        return handleInsforgeError(error);
    }
};

// Admin: Get all rooms (including inactive/hidden)
export const getAllRoomsForAdmin = async () => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .select('*')
            .order('room_number', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Failed to fetch all rooms for admin:', error);
        return handleInsforgeError(error);
    }
};

// Get single room by ID
export const getRoomById = async (id: string) => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Failed to fetch room by ID:', error);
        return handleInsforgeError(error);
    }
};

// Check room availability for date range
export const checkRoomAvailability = async (
    roomId: string,
    checkIn: string,
    checkOut: string
) => {
    try {
        // Check for conflicting bookings
        const { data: bookings, error: bookingError } = await insforge.database
            .from('bookings')
            .select('*')
            .eq('room_id', roomId)
            .in('booking_status', ['confirmed', 'checked_in'])
            .lt('check_in', checkOut)
            .gt('check_out', checkIn);

        if (bookingError) throw bookingError;

        // Check for blocked dates
        const { data: blockedDates, error: blockedError } = await insforge.database
            .from('blocked_dates')
            .select('*')
            .eq('room_id', roomId)
            .lt('start_date', checkOut)
            .gt('end_date', checkIn);

        if (blockedError) throw blockedError;

        const isAvailable = (!bookings || bookings.length === 0) &&
            (!blockedDates || blockedDates.length === 0);

        return { data: { isAvailable }, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get available rooms for date range (single query batch instead of N+1)
export const getAvailableRooms = async (checkIn: string, checkOut: string) => {
    try {
        // Fetch all rooms, conflicting bookings, and blocked dates in parallel
        const [roomsResult, bookingsResult, blockedResult] = await Promise.all([
            getRooms(),
            insforge.database
                .from('bookings')
                .select('room_id')
                .in('booking_status', ['confirmed', 'checked_in'])
                .lt('check_in', checkOut)
                .gt('check_out', checkIn),
            insforge.database
                .from('blocked_dates')
                .select('room_id')
                .lt('start_date', checkOut)
                .gt('end_date', checkIn),
        ]);

        if (roomsResult.error) throw roomsResult.error;
        if (bookingsResult.error) throw bookingsResult.error;
        if (blockedResult.error) throw blockedResult.error;

        // Collect room IDs that are unavailable
        const unavailableRoomIds = new Set<string>();
        for (const booking of bookingsResult.data || []) {
            unavailableRoomIds.add(booking.room_id);
        }
        for (const blocked of blockedResult.data || []) {
            unavailableRoomIds.add(blocked.room_id);
        }

        // Filter to only available rooms
        const availableRooms = (roomsResult.data || []).filter(
            (room) => !unavailableRoomIds.has(room.id)
        );

        return { data: availableRooms, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Create room
export const createRoom = async (room: Partial<Room>) => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .insert(room)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Update room
export const updateRoom = async (id: string, updates: Partial<Room>) => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Delete room
export const deleteRoom = async (id: string) => {
    try {
        const { error } = await insforge.database
            .from('rooms')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Add room image
export const addRoomImage = async (roomImage: Partial<RoomImage>) => {
    try {
        const { data, error } = await insforge.database
            .from('room_images')
            .insert(roomImage)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Delete room image
export const deleteRoomImage = async (id: string) => {
    try {
        const { error } = await insforge.database
            .from('room_images')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Update room image sort order
export const updateRoomImageSortOrder = async (id: string, sortOrder: number) => {
    try {
        const { data, error } = await insforge.database
            .from('room_images')
            .update({ sort_order: sortOrder })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
