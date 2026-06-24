import { insforge, handleInsforgeError } from './insforge';
import { invalidateCmsCache } from './cacheService';

export interface MenuCategory {
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    items: MenuItem[];
}

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    available: boolean;
    category: string;
    is_featured?: boolean;
    is_most_sold?: boolean;
}

export const getFullMenu = async () => {
    try {
        const [categoriesResult, itemsResult] = await Promise.all([
            insforge.database
                .from('menu_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            insforge.database
                .from('menu_items')
                .select('id, name, description, price, image, available, category, is_featured, is_most_sold')
                .eq('available', true)
                .is('deleted_at', null)
                .order('name', { ascending: true }),
        ]);

        if (categoriesResult.error) throw categoriesResult.error;
        if (itemsResult.error) throw itemsResult.error;

        const items = itemsResult.data || [];
        const categories = categoriesResult.data || [];

        const catNameLower = (cat: { name: string }) => cat.name.toLowerCase().trim();

        const grouped = categories.map((cat) => {
            const catItems = items
                .filter((item) => (item.category || '').toLowerCase().trim() === catNameLower(cat))
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price: Number(item.price),
                    image: item.image || undefined,
                    available: item.available,
                    category: item.category,
                    is_featured: item.is_featured ?? false,
                    is_most_sold: item.is_most_sold ?? false,
                }));
            return {
                id: cat.id,
                name: cat.name,
                sort_order: cat.sort_order,
                is_active: cat.is_active,
                created_at: cat.created_at,
                items: catItems,
            };
        });

        return { data: grouped, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAdminMenu = async () => {
    try {
        const [categoriesResult, itemsResult] = await Promise.all([
            insforge.database
                .from('menu_categories')
                .select('*')
                .order('sort_order', { ascending: true }),
            insforge.database
                .from('menu_items')
                .select('id, name, description, price, image, available, category, is_featured, is_most_sold')
                .is('deleted_at', null)
                .order('name', { ascending: true }),
        ]);

        if (categoriesResult.error) throw categoriesResult.error;
        if (itemsResult.error) throw itemsResult.error;

        const items = itemsResult.data || [];
        const categories = categoriesResult.data || [];

        const catNameLower = (cat: { name: string }) => cat.name.toLowerCase().trim();

        const grouped = categories.map((cat) => {
            const catItems = items
                .filter((item) => (item.category || '').toLowerCase().trim() === catNameLower(cat))
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price: Number(item.price),
                    image: item.image || undefined,
                    available: item.available,
                    category: item.category,
                    is_featured: item.is_featured ?? false,
                    is_most_sold: item.is_most_sold ?? false,
                }));
            return {
                id: cat.id,
                name: cat.name,
                sort_order: cat.sort_order,
                is_active: cat.is_active,
                created_at: cat.created_at,
                items: catItems,
            };
        });

        return { data: grouped, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getMenuItemsByCategory = async (categoryName: string) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .select('*')
            .eq('available', true)
            .is('deleted_at', null)
            .eq('category', categoryName.toLowerCase())
            .order('name', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getMenuCategories = async () => {
    try {
        const { data, error } = await insforge.database
            .from('menu_categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error && error.code !== 'PGRST116') throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createCategory = async (category: Record<string, unknown>) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_categories')
            .insert(category)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateCategory = async (id: string, updates: Record<string, unknown>) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deleteCategory = async (id: string) => {
    try {
        const { error } = await insforge.database
            .from('menu_categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createMenuItem = async (item: Record<string, unknown>) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateMenuItem = async (id: string, updates: Record<string, unknown>) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deleteMenuItem = async (id: string) => {
    try {
        const { error } = await insforge.database
            .from('menu_items')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const toggleItemAvailability = async (id: string, available: boolean) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .update({ available })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const toggleItemFeatured = async (id: string, is_featured: boolean) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .update({ is_featured })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const toggleItemMostSold = async (id: string, is_most_sold: boolean) => {
    try {
        const { data, error } = await insforge.database
            .from('menu_items')
            .update({ is_most_sold })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('menu');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
