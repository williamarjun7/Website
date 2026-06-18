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
    seasonal_pricing?: Record<string, unknown>;
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
            .select('*, room_images(*)')
            .eq('is_active', true)
            .order('room_number', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Failed to fetch rooms:', error);
        return handleInsforgeError(error);
    }
};

// Fix stale floor_number values (e.g. 30, 40 from old data)
export const fixFloorNumbers = async () => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .select('id, room_number, floor_number');

        if (error) throw error;
        if (!data) return { error: null };

        const updates: { id: string; floor_number: number }[] = [];

        for (const room of data) {
            if (room.room_number && room.room_number.length > 0) {
                const correctFloor = parseInt(room.room_number.charAt(0));
                if (!isNaN(correctFloor) && correctFloor !== room.floor_number) {
                    updates.push({ id: room.id, floor_number: correctFloor });
                }
            } else if (room.floor_number && room.floor_number > 9) {
                updates.push({ id: room.id, floor_number: 1 });
            }
        }

        if (updates.length === 0) return { error: null };

        for (const update of updates) {
            await insforge.database
                .from('rooms')
                .update({ floor_number: update.floor_number })
                .eq('id', update.id);
        }

        return { data: updates, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Get all rooms (including inactive/hidden)
export const getAllRoomsForAdmin = async () => {
    try {
        const { data, error } = await insforge.database
            .from('rooms')
            .select('*, room_images(*)')
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
            .select('*, room_images(*)')
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
        const { data: conflicts, error } = await insforge.database
            .from('booking_conflicts')
            .select('room_id')
            .eq('room_id', roomId)
            .lt('check_in', checkOut)
            .gt('check_out', checkIn);

        if (error) throw error;

        const isAvailable = (!conflicts || conflicts.length === 0);

        return { data: { isAvailable }, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get available rooms for date range (single query batch instead of N+1)
export const getAvailableRooms = async (checkIn: string, checkOut: string) => {
    try {
        const [roomsResult, conflictsResult] = await Promise.all([
            getRooms(),
            insforge.database
                .from('booking_conflicts')
                .select('room_id')
                .lt('check_in', checkOut)
                .gt('check_out', checkIn),
        ]);

        if (roomsResult.error) throw roomsResult.error;
        if (conflictsResult.error) throw conflictsResult.error;

        const unavailableRoomIds = new Set<string>();
        for (const conflict of conflictsResult.data || []) {
            unavailableRoomIds.add(conflict.room_id);
        }

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
