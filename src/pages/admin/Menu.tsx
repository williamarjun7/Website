import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Plus,
    Trash2,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Utensils,
    Upload,
    X,
    Star,
    TrendingUp,
    Image as ImageIcon,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import {
    getAdminMenu,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleItemAvailability,
    toggleItemFeatured,
    toggleItemMostSold,
    MenuItem
} from '../../services/menuService';
import {
    getAllMenuPages,
    addSiteImage,
    deleteSiteImage,
    toggleImageActive,
    updateMenuPage,
} from '../../services/contentService';
import { uploadFile } from '../../services/storageService';
import Skeleton from '../../components/common/Skeleton';
import AdminModal from '../../components/admin/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

interface MenuCategoryData {
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    items: MenuItem[];
}

interface MenuPageData {
    id: string;
    image_url: string;
    title?: string;
    is_active: boolean;
    sort_order?: number;
}

interface ItemFormData {
    name: string;
    description: string;
    price: string;
    category: string;
    image: string;
    available: boolean;
    is_featured: boolean;
    is_most_sold: boolean;
}

const Menu = () => {
    const [menu, setMenu] = useState<MenuCategoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Modals
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setItemModalOpen] = useState(false);

    // Editing states
    const [editingCategory, setEditingCategory] = useState<MenuCategoryData | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [, setActiveCategoryId] = useState<string>('');

    // Form Data
    const [categoryForm, setCategoryForm] = useState({ name: '', sort_order: 0 });
    const [savingCategory, setSavingCategory] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [itemForm, setItemForm] = useState<ItemFormData>({
        name: '',
        description: '',
        price: '',
        category: '',
        image: '',
        available: true,
        is_featured: false,
        is_most_sold: false
    });

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('error');
    const [uploadingFileName, setUploadingFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete confirm states
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
    const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
    const [deleteMenuPageId, setDeleteMenuPageId] = useState<string | null>(null);

    // Menu Pages state
    const [menuPages, setMenuPages] = useState<MenuPageData[]>([]);
    const [menuPagesLoading, setMenuPagesLoading] = useState(true);
    const [menuPageModalOpen, setMenuPageModalOpen] = useState(false);
    const [mpUploading, setMpUploading] = useState(false);
    const [mpUploadError, setMpUploadError] = useState('');
    const [mpUploadingFileName, setMpUploadingFileName] = useState('');
    const [mpImageUrl, setMpImageUrl] = useState('');
    const mpFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadMenu();
        loadMenuPages();
    }, []);

    const loadMenu = async () => {
        setLoading(true);
        try {
            const { data } = await getAdminMenu();
            if (data) setMenu(data);
        } catch (err) {
            setLoadError('Failed to load menu. Please try again.');
            console.error('Failed to load menu:', err);
        }
        setLoading(false);
    };

    // Category Actions
    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingCategory(true);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, categoryForm);
            } else {
                await createCategory(categoryForm);
            }
            setCategoryModalOpen(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', sort_order: 0 });
            loadMenu();
            setToastType('success');
            setToastMessage(editingCategory ? 'Category updated!' : 'Category created!');
            setTimeout(() => setToastMessage(''), 5000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save category';
            setToastType('error');
            setToastMessage(msg);
            setTimeout(() => setToastMessage(''), 5000);
        } finally {
            setSavingCategory(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        setDeleteCategoryId(id);
    };

    const confirmDeleteCategory = async () => {
        if (!deleteCategoryId) return;
        try {
            await deleteCategory(deleteCategoryId);
            loadMenu();
        } catch (err) {
            console.error('Failed to delete category:', err);
        }
        setDeleteCategoryId(null);
    };

    // Item Actions
    const handleItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingItem(true);
        try {
            const itemData = {
                ...itemForm,
                price: Number(itemForm.price),
                is_featured: itemForm.is_featured,
                is_most_sold: itemForm.is_most_sold,
            };

            if (editingItem) {
                await updateMenuItem(editingItem.id, itemData);
            } else {
                await createMenuItem(itemData);
            }

            setItemModalOpen(false);
            setEditingItem(null);
            setItemForm({
                name: '',
                description: '',
                price: '',
                category: '',
                image: '',
                available: true,
                is_featured: false,
                is_most_sold: false
            });
            loadMenu();
            setToastType('success');
            setToastMessage(editingItem ? 'Menu item updated!' : 'Menu item created!');
            setTimeout(() => setToastMessage(''), 5000);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to save menu item';
            setToastType('error');
            setToastMessage(msg);
            setTimeout(() => setToastMessage(''), 5000);
        } finally {
            setSavingItem(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        setDeleteItemId(id);
    };

    const confirmDeleteItem = async () => {
        if (!deleteItemId) return;
        try {
            await deleteMenuItem(deleteItemId);
            loadMenu();
        } catch (err) {
            console.error('Failed to delete item:', err);
        }
        setDeleteItemId(null);
    };

    const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
        try {
            await toggleItemAvailability(id, !currentStatus);
            loadMenu();
        } catch (err) {
            console.error('Failed to toggle availability:', err);
        }
    };

    const handleToggleFeatured = async (id: string, current: boolean) => {
        try {
            await toggleItemFeatured(id, !current);
            loadMenu();
        } catch (err) {
            console.error('Failed to toggle featured:', err);
        }
    };

    const handleToggleMostSold = async (id: string, current: boolean) => {
        try {
            await toggleItemMostSold(id, !current);
            loadMenu();
        } catch (err) {
            console.error('Failed to toggle most sold:', err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');
        setUploadingFileName(file.name);

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('Image size should be less than 2MB');
            }

            const { data, error } = await uploadFile(file, 'menu');
            if (error) throw error;

            if (data) {
                setItemForm(prev => ({ ...prev, image: data.url }));
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Menu Pages handlers
    const loadMenuPages = async () => {
        setMenuPagesLoading(true);
        try {
            const { data } = await getAllMenuPages();
            if (data) setMenuPages(data);
        } catch (err) {
            console.error('Failed to load menu pages:', err);
        }
        setMenuPagesLoading(false);
    };

    const handleMenuPageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMpUploading(true);
        setMpUploadError('');
        setMpUploadingFileName(file.name);

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Image size should be less than 10MB');
            }

            const { data, error } = await uploadFile(file, 'menu-pages');
            if (error) throw error;
            if (data) setMpImageUrl(data.url);
        } catch (err: unknown) {
            setMpUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setMpUploading(false);
            if (mpFileInputRef.current) mpFileInputRef.current.value = '';
        }
    };

    const handleMenuPageAdd = async () => {
        if (!mpImageUrl) {
            setMpUploadError('Please upload an image first');
            return;
        }

        const nextOrder = menuPages.length;
        const { error } = await addSiteImage({
            image_url: mpImageUrl,
            page: 'menu',
            title: `Menu Page ${menuPages.length + 1}`,
            is_active: true,
            sort_order: nextOrder,
        });

        if (error) {
            setMpUploadError(error);
            return;
        }

        setMenuPageModalOpen(false);
        setMpImageUrl('');
        setMpUploadError('');
        loadMenuPages();
    };

    const handleMenuPageDelete = async (id: string) => {
        setDeleteMenuPageId(id);
    };

    const confirmDeleteMenuPage = async () => {
        if (!deleteMenuPageId) return;
        const { error } = await deleteSiteImage(deleteMenuPageId);
        if (error) {
            console.error('Failed to delete: ' + error);
            setDeleteMenuPageId(null);
            return;
        }
        setDeleteMenuPageId(null);
        loadMenuPages();
    };

    const handleMenuPageToggleActive = async (id: string, current: boolean) => {
        const { error } = await toggleImageActive(id, !current);
        if (error) {
            alert('Failed to toggle: ' + error);
            return;
        }
        loadMenuPages();
    };

    const handleMenuPageMove = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= menuPages.length) return;

        const updated = [...menuPages];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

        setMenuPages(updated);

        for (let i = 0; i < updated.length; i++) {
            await updateMenuPage(updated[i].id, { sort_order: i } as never);
        }
    };

    return (
        <div className="space-y-8">
            <Helmet><title>Menu | Highlands Cafe & Motel Inn</title></Helmet>
            {toastMessage && (
                <div className={`fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm border ${
                    toastType === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                    {toastMessage}
                </div>
            )}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Cafe Menu</h1>
                    <p className="text-gray-500">Manage categories and menu items</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setCategoryForm({ name: '', sort_order: menu.length + 1 });
                        setCategoryModalOpen(true);
                    }}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Category</span>
                </button>
            </div>

            {loadError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 flex items-center justify-between">
                    <span>{loadError}</span>
                    <button onClick={() => { setLoadError(''); loadMenu(); }} className="text-red-700 font-medium hover:underline">Retry</button>
                </div>
            )}

            {loading ? (
                <div className="space-y-8">
                    {[1, 2, 3].map((cat) => (
                        <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-6 w-40" />
                                    <div className="flex items-center space-x-2">
                                        <Skeleton className="h-5 w-5" />
                                        <Skeleton className="h-5 w-5" />
                                        <div className="w-px h-6 bg-gray-300 mx-2" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3].map((item) => (
                                        <div key={item} className="flex p-3 rounded-lg border border-gray-200">
                                            <Skeleton className="w-20 h-20 rounded-md flex-shrink-0 mr-4" />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between">
                                                    <Skeleton className="h-5 w-28" />
                                                    <Skeleton className="h-6 w-6" />
                                                </div>
                                                <Skeleton className="h-4 w-full" />
                                                <div className="flex justify-between items-end mt-2">
                                                    <Skeleton className="h-5 w-20" />
                                                    <div className="flex space-x-1">
                                                        <Skeleton className="h-6 w-6" />
                                                        <Skeleton className="h-6 w-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-8">
                    {menu.map((category) => (
                        <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Category Header */}
                            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                                <h2 className="text-lg font-bold font-heading text-gray-800">
                                    {category.name}
                                </h2>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => {
                                            setEditingCategory(category);
                                            setCategoryForm({ name: category.name, sort_order: category.sort_order });
                                            setCategoryModalOpen(true);
                                        }}
                                        className="p-1 text-gray-500 hover:text-primary"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="p-1 text-gray-500 hover:text-red-500"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    <div className="w-px h-6 bg-gray-300 mx-2" />
                                    <button
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setEditingItem(null);
                                            setUploadError('');
                                            setItemForm({
                                                name: '',
                                                description: '',
                                                price: '',
                                                category: category.name,
                                                image: '',
                                                available: true,
                                                is_featured: false,
                                                is_most_sold: false
                                            });
                                            setUploadError('');
                                            setItemModalOpen(true);
                                        }}
                                        className="flex items-center space-x-1 text-sm text-primary font-medium hover:text-primary/80"
                                    >
                                        <Plus size={16} />
                                        <span>Add Item</span>
                                    </button>
                                </div>
                            </div>

                            {/* Items Grid */}
                            <div className="p-6">
                                {category.items.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No items in this category.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {category.items.map((item) => (
                                            <div key={item.id} className={`flex p-3 rounded-lg border ${item.available ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                                                {/* Image */}
                                                <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden mr-4">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <Utensils size={24} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div className="truncate pr-2">
                                                            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                {item.is_featured && (
                                                                    <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Featured</span>
                                                                )}
                                                                {item.is_most_sold && (
                                                                    <span className="inline-block text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Most Sold</span>
                                                                )}
                                                            </div>
                                                        </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAvailability(item.id, item.available)}
                                                title={item.available ? "Mark as Unavailable" : "Mark as Available"}
                                            >
                                                {item.available ? (
                                                    <ToggleRight className="text-green-500" size={24} />
                                                ) : (
                                                    <ToggleLeft className="text-gray-400" size={24} />
                                                )}
                                            </button>
                                                    </div>
                                                    <p className="text-sm text-gray-500 line-clamp-1 mb-1">{item.description}</p>
                                                    <div className="flex justify-between items-end mt-2">
                                                        <span className="font-bold text-primary">
                                                            NPR {(Number(item.price) || 0).toLocaleString()}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleFeatured(item.id, item.is_featured ?? false)}
                                                                className={`p-1 rounded transition-colors ${item.is_featured ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'}`}
                                                                title={item.is_featured ? "Remove Featured" : "Mark as Featured"}
                                                            >
                                                                <Star size={16} className={item.is_featured ? 'fill-amber-500' : ''} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleMostSold(item.id, item.is_most_sold ?? false)}
                                                                className={`p-1 rounded transition-colors ${item.is_most_sold ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-green-500'}`}
                                                                title={item.is_most_sold ? "Remove Most Sold" : "Mark as Most Sold"}
                                                            >
                                                                <TrendingUp size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setActiveCategoryId(category.id);
                                                                    setEditingItem(item);
                                                                    setUploadError('');
                                                                    setItemForm({
                                                                        name: item.name,
                                                                        description: item.description || '',
                                                                        price: item.price.toString(),
                                                                        category: item.category || '',
                                                                        image: item.image || '',
                                                                        available: item.available,
                                                                        is_featured: item.is_featured ?? false,
                                                                        is_most_sold: item.is_most_sold ?? false
                                                                    });
                                                                    setUploadError('');
                                                                    setItemModalOpen(true);
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-primary"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1 text-gray-400 hover:text-red-500"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Category Modal */}
            <AdminModal
                isOpen={isCategoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title={editingCategory ? 'Edit Category' : 'New Category'}
                size="sm"
                footer={
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button type="button" onClick={() => setCategoryModalOpen(false)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                        <button type="submit" form="category-form" disabled={savingCategory} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none">
                            {savingCategory ? (
                                <span className="flex items-center justify-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </span>
                            ) : (editingCategory ? 'Update' : 'Save')}
                        </button>
                    </div>
                }
            >
                <form id="category-form" onSubmit={handleCategorySubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Name</label>
                        <input
                            type="text"
                            required
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className="input w-full"
                            placeholder="e.g. Breakfast"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Sort Order</label>
                        <input
                            type="number"
                            required
                            value={categoryForm.sort_order}
                            onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })}
                            className="input w-full"
                        />
                    </div>
                </form>
            </AdminModal>
            {/* Item Modal */}
            <AdminModal
                isOpen={isItemModalOpen}
                onClose={() => setItemModalOpen(false)}
                title={editingItem ? 'Edit Item' : 'New Item'}
                size="md"
                footer={
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button type="button" onClick={() => setItemModalOpen(false)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                        <button type="submit" form="item-form" disabled={uploading || savingItem} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none">
                            {savingItem ? 'Saving...' : (editingItem ? 'Update Item' : 'Create Item')}
                        </button>
                    </div>
                }
            >
                <form id="item-form" onSubmit={handleItemSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Name</label>
                        <input
                            type="text"
                            required
                            value={itemForm.name}
                            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                            className="input w-full"
                            placeholder="e.g. Nepali Thali"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Description</label>
                        <textarea
                            rows={2}
                            value={itemForm.description}
                            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                            className="input w-full resize-none"
                            placeholder="Brief description of the dish..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Category</label>
                        <select
                            required
                            value={itemForm.category}
                            onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                            className="input w-full"
                        >
                            <option value="" disabled>Select category</option>
                            {menu.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Price (NPR)</label>
                            <input
                                type="number"
                                required
                                value={itemForm.price}
                                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                className="input w-full"
                                placeholder="450"
                            />
                        </div>
                        <div className="flex items-center sm:pt-6">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={itemForm.available}
                                    onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
                                    className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Available</span>
                            </label>
                        </div>
                    </div>

                    {/* Image Upload Area */}
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Item Image</label>

                        {uploadError && (
                            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-2 border border-red-100">
                                {uploadError}
                            </div>
                        )}

                        {itemForm.image ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 mb-2 group animate-fade-in-up">
                                <img src={itemForm.image} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setItemForm(prev => ({ ...prev, image: '' }))}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => !uploading && fileInputRef.current?.click()}
                                className={`relative overflow-hidden border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
                                    uploading
                                        ? 'bg-primary/[0.03] border-primary/40'
                                        : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                                }`}
                            >
                                {uploading ? (
                                    <div className="flex flex-col items-center">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent animate-shimmer" />
                                        <div className="relative flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 animate-upload-bounce">
                                                <Upload size={20} className="text-primary" />
                                            </div>
                                            <div className="w-full max-w-[160px] h-1 bg-gray-200 rounded-full overflow-hidden">
                                                <div className="h-full w-2/5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-progress-bar" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 mt-2">
                                                {uploadingFileName ? `Uploading ${uploadingFileName.substring(0, 20)}${uploadingFileName.length > 20 ? '...' : ''}` : 'Uploading...'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-500">
                                        <Upload size={28} className="mb-2" />
                                        <span className="text-sm font-medium">Click to upload image</span>
                                        <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP • Max 2MB</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="flex items-center space-x-6">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={itemForm.is_featured}
                                onChange={(e) => setItemForm({ ...itemForm, is_featured: e.target.checked })}
                                className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors">Featured</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={itemForm.is_most_sold}
                                onChange={(e) => setItemForm({ ...itemForm, is_most_sold: e.target.checked })}
                                className="w-5 h-5 text-green-500 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">Most Sold</span>
                        </label>
                    </div>
                </form>
            </AdminModal>

            {/* ── Menu Pages / Full Menu Images ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-12">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold font-heading text-gray-900">Full Menu Images</h2>
                        <p className="text-sm text-gray-500">Upload and arrange menu card images for the cafe viewer</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setMpUploadError('');
                            setMpImageUrl('');
                            setMenuPageModalOpen(true);
                        }}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus size={18} />
                        <span>Add Image</span>
                    </button>
                </div>
                <div className="p-6">
                    {menuPagesLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                            ))}
                        </div>
                    ) : menuPages.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <ImageIcon className="mx-auto text-gray-400 mb-3" size={40} />
                            <h3 className="text-base font-semibold text-gray-700">No menu card images yet</h3>
                            <p className="text-sm text-gray-500 mt-1">Upload images of your menu card to display in the menu viewer.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {menuPages.map((page, index) => (
                                <div
                                    key={page.id}
                                    className="group relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                                >
                                    <img
                                        src={page.image_url}
                                        alt={page.title || `Menu page ${index + 1}`}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '';
                                            target.alt = 'Failed to load';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMenuPageMove(index, 'up')}
                                            disabled={index === 0}
                                            className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-primary'}`}
                                            title="Move up"
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuPageMove(index, 'down')}
                                            disabled={index === menuPages.length - 1}
                                            className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${index === menuPages.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-primary'}`}
                                            title="Move down"
                                        >
                                            <ArrowDown size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuPageToggleActive(page.id, page.is_active)}
                                            className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${page.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                            title={page.is_active ? 'Hide' : 'Show'}
                                        >
                                            {page.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuPageDelete(page.id)}
                                            className="p-1.5 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {!page.is_active && (
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/90 text-white text-[10px] rounded-full font-bold">
                                            Hidden
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                        <span className="text-white text-xs font-medium">Page {index + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Pages Add Modal */}
            <AdminModal
                isOpen={menuPageModalOpen}
                onClose={() => setMenuPageModalOpen(false)}
                title="Add Menu Card Image"
                icon={<ImageIcon size={20} />}
                size="sm"
                footer={
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button type="button" onClick={() => setMenuPageModalOpen(false)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                        <button
                            type="button"
                            onClick={handleMenuPageAdd}
                            disabled={mpUploading || !mpImageUrl}
                            className={`btn-primary w-full sm:w-auto flex-1 sm:flex-none ${(!mpImageUrl || mpUploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Add Image
                        </button>
                    </div>
                }
            >
                <div className="space-y-5">
                    {mpUploadError && (
                        <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                            {mpUploadError}
                        </div>
                    )}

                    {mpImageUrl ? (
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 shadow-inner group animate-fade-in-up">
                            <img src={mpImageUrl} alt="Menu page preview" loading="lazy" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => setMpImageUrl('')}
                                    className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => !mpUploading && mpFileInputRef.current?.click()}
                            className={`relative overflow-hidden border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                                mpUploading
                                    ? 'bg-primary/[0.03] border-primary/40'
                                    : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                            }`}
                        >
                            {mpUploading ? (
                                <div className="flex flex-col items-center">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent animate-shimmer" />
                                    <div className="relative flex flex-col items-center">
                                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 animate-upload-bounce">
                                            <Upload size={24} className="text-primary" />
                                        </div>
                                        <div className="w-full max-w-[200px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full w-2/5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-progress-bar" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600 mt-3">
                                            {mpUploadingFileName ? `Uploading ${mpUploadingFileName.substring(0, 25)}${mpUploadingFileName.length > 25 ? '...' : ''}` : 'Uploading...'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                    <Upload size={36} className="mb-2 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-700">Click to upload menu card image</span>
                                    <span className="text-xs text-gray-400 mt-2">PNG, JPG, WebP up to 10MB</span>
                                </div>
                            )}
                        </div>
                    )}

                    <input
                        ref={mpFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleMenuPageUpload}
                        className="hidden"
                    />
                </div>
            </AdminModal>

            <ConfirmDialog
                isOpen={deleteCategoryId !== null}
                title="Delete Category"
                message="Are you sure you want to delete this category? All items in it will also be deleted. This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDeleteCategory}
                onCancel={() => setDeleteCategoryId(null)}
                destructive
            />

            <ConfirmDialog
                isOpen={deleteItemId !== null}
                title="Delete Item"
                message="Are you sure you want to delete this menu item? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDeleteItem}
                onCancel={() => setDeleteItemId(null)}
                destructive
            />

            <ConfirmDialog
                isOpen={deleteMenuPageId !== null}
                title="Delete Menu Page Image"
                message="Are you sure you want to delete this menu page image? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={confirmDeleteMenuPage}
                onCancel={() => setDeleteMenuPageId(null)}
                destructive
            />
        </div>
    );
};

export default Menu;
