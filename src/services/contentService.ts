import { insforge, handleInsforgeError } from './insforge';
import { deleteImage, extractStorageKey } from './storageService';

export interface SiteContent {
    id: string;
    key: string;
    value: string;
    updated_at: string;
}

export interface SiteImage {
    id: string;
    image_url: string;
    type: 'hero' | 'gallery' | 'cafe' | 'exterior' | 'other';
    title?: string;
    is_active: boolean;
    created_at: string;
}

// Get site content by key
export const getSiteContent = async (key: string) => {
    try {
        const { data, error } = await insforge.database
            .from('site_content')
            .select('*')
            .eq('key', key)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get all site content
export const getAllSiteContent = async () => {
    try {
        const { data, error } = await insforge.database
            .from('site_content')
            .select('*');

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Update site content
export const updateSiteContent = async (key: string, value: string) => {
    try {
        const { data, error } = await insforge.database
            .from('site_content')
            .upsert({ key, value, updated_at: new Date().toISOString() })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get site images by type
export const getSiteImagesByType = async (type: SiteImage['type']) => {
    try {
        const { data, error } = await insforge.database
            .from('site_images')
            .select('*')
            .eq('type', type)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get all active site images
export const getAllSiteImages = async () => {
    try {
        const { data, error } = await insforge.database
            .from('site_images')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Add site image
export const addSiteImage = async (image: Partial<SiteImage>) => {
    try {
        const { data, error } = await insforge.database
            .from('site_images')
            .insert(image)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Delete site image (also removes from storage)
export const deleteSiteImage = async (id: string) => {
    try {
        const { data: image, error: fetchError } = await insforge.database
            .from('site_images')
            .select('image_url')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (image?.image_url) {
            const key = extractStorageKey(image.image_url);
            if (key) await deleteImage(key);
        }

        const { error } = await insforge.database
            .from('site_images')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get all site content as a key-value map
export const getSiteContentMap = async () => {
    try {
        const { data, error } = await insforge.database
            .from('site_content')
            .select('key, value');

        if (error) throw error;
        const map: Record<string, string> = {};
        if (data) {
            for (const item of data) {
                if (item.key) map[item.key] = item.value;
            }
        }
        return { data: map, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Toggle image active status
export const toggleImageActive = async (id: string, isActive: boolean) => {
    try {
        const { data, error } = await insforge.database
            .from('site_images')
            .update({ is_active: isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Admin: Update site image metadata
export const updateSiteImage = async (id: string, updates: Partial<SiteImage>) => {
    try {
        const { data, error } = await insforge.database
            .from('site_images')
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
