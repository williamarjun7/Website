import { insforge, handleInsforgeError } from './insforge';

export interface Review {
    id: string;
    room_id: string | null;
    guest_name: string;
    guest_email: string | null;
    rating: number;
    comment: string;
    is_approved: boolean;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
}

export type CreateReviewData = Pick<Review, 'guest_name' | 'rating' | 'comment'> & Partial<Pick<Review, 'room_id' | 'guest_email'>>;

export const getReviews = async () => {
    try {
        const { data, error } = await insforge.database
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getApprovedReviews = async (roomId?: string) => {
    try {
        let query = insforge.database
            .from('reviews')
            .select('*')
            .eq('is_approved', true)
            .order('created_at', { ascending: false });
        if (roomId) query = query.eq('room_id', roomId);
        const { data, error } = await query;
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getFeaturedReviews = async (limit = 6) => {
    try {
        const { data, error } = await insforge.database
            .from('reviews')
            .select('*')
            .eq('is_approved', true)
            .eq('is_featured', true)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createReview = async (review: CreateReviewData) => {
    try {
        const { data, error } = await insforge.database
            .from('reviews')
            .insert([review])
            .select()
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateReview = async (id: string, updates: Partial<Review>) => {
    try {
        const { data, error } = await insforge.database
            .from('reviews')
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

export const deleteReview = async (id: string) => {
    try {
        const { error } = await insforge.database
            .from('reviews')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
