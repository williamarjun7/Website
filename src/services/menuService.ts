import { insforge, handleInsforgeError } from './insforge';

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
}

const buildGroupedMenu = (items: any[]) => {
    const grouped: Record<string, MenuItem[]> = {};
    for (const item of items || []) {
        const cat = item.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: Number(item.price),
            image: item.image || undefined,
            available: item.available,
            category: item.category,
        });
    }
    return Object.entries(grouped).map(([name, items], i) => ({
        id: name,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        sort_order: i,
        is_active: true,
        created_at: '',
        items,
    }));
};

export const getFullMenu = async () => {
    try {
        const { data: items, error } = await insforge.database
            .from('menu_items')
            .select('id, name, description, price, image, available, category')
            .eq('available', true)
            .is('deleted_at', null)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return { data: buildGroupedMenu(items), error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAdminMenu = async () => {
    try {
        const { data: items, error } = await insforge.database
            .from('menu_items')
            .select('id, name, description, price, image, available, category')
            .is('deleted_at', null)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return { data: buildGroupedMenu(items), error: null };
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
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
