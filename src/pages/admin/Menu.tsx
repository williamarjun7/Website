import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    ToggleLeft,
    ToggleRight,
    Utensils,
    Upload,
    Loader2,
    X
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
    MenuItem
} from '../../services/menuService';
import { uploadImage } from '../../services/storageService';
import Skeleton from '../../components/common/Skeleton';

interface MenuCategoryData {
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    items: MenuItem[];
}

interface ItemFormData {
    name: string;
    description: string;
    price: string;
    category: string;
    image: string;
    available: boolean;
}

const Menu = () => {
    const [menu, setMenu] = useState<MenuCategoryData[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
    const [isItemModalOpen, setItemModalOpen] = useState(false);

    // Editing states
    const [editingCategory, setEditingCategory] = useState<MenuCategoryData | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [, setActiveCategoryId] = useState<string>('');

    // Form Data
    const [categoryForm, setCategoryForm] = useState({ name: '', sort_order: 0 });
    const [itemForm, setItemForm] = useState<ItemFormData>({
        name: '',
        description: '',
        price: '',
        category: '',
        image: '',
        available: true
    });

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        setLoading(true);
        const { data } = await getAdminMenu();
        if (data) {
            setMenu(data);
        }
        setLoading(false);
    };

    // Category Actions
    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            await updateCategory(editingCategory.id, categoryForm);
        } else {
            await createCategory(categoryForm);
        }
        setCategoryModalOpen(false);
        setEditingCategory(null);
        setCategoryForm({ name: '', sort_order: 0 });
        loadMenu();
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm('Delete this category? All items in it will be deleted.')) {
            await deleteCategory(id);
            loadMenu();
        }
    };

    // Item Actions
    const handleItemSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const itemData = {
            ...itemForm,
            price: Number(itemForm.price),
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
            available: true
        });
        loadMenu();
    };

    const handleDeleteItem = async (id: string) => {
        if (confirm('Delete this item?')) {
            await deleteMenuItem(id);
            loadMenu();
        }
    };

    const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
        await toggleItemAvailability(id, !currentStatus);
        loadMenu();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('Image size should be less than 2MB');
            }

            const { data, error } = await uploadImage(file, 'menu');
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

    return (
        <div className="space-y-8">
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
                                                category: '',
                                                image: '',
                                                available: true
                                            });
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
                                                        <h3 className="font-semibold text-gray-900 truncate pr-2">{item.name}</h3>
                                                        <button
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
                                                            NPR {Number(item.price).toLocaleString()}
                                                        </span>
                                                        <div className="flex space-x-1">
                                                            <button
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
                                                                        available: item.available
                                                                    });
                                                                    setItemModalOpen(true);
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-primary"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
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
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 font-heading border-b pb-2">
                            {editingCategory ? 'Edit Category' : 'New Category'}
                        </h3>
                        <form onSubmit={handleCategorySubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g. Breakfast"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Sort Order</label>
                                <input
                                    type="number"
                                    required
                                    value={categoryForm.sort_order}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })}
                                    className="input w-full"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setCategoryModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    {editingCategory ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Modal */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4 font-heading border-b pb-2">
                            {editingItem ? 'Edit Item' : 'New Item'}
                        </h3>
                        <form onSubmit={handleItemSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
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
                                <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                                <textarea
                                    rows={2}
                                    value={itemForm.description}
                                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                    className="input w-full resize-none"
                                    placeholder="Brief description of the dish..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Price (NPR)</label>
                                    <input
                                        type="number"
                                        required
                                        value={itemForm.price}
                                        onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                                        className="input w-full"
                                        placeholder="450"
                                    />
                                </div>
                                <div className="flex items-center pt-6">
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
                                <label className="block text-sm font-medium mb-2 text-gray-700">Item Image</label>

                                {uploadError && (
                                    <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-2 border border-red-100">
                                        {uploadError}
                                    </div>
                                )}

                                {itemForm.image ? (
                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 mb-2 group">
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
                                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                                            }`}
                                    >
                                        {uploading ? (
                                            <div className="flex flex-col items-center text-gray-500">
                                                <Loader2 size={24} className="animate-spin mb-2" />
                                                <span className="text-sm">Uploading...</span>
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

                            <div className="flex space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setItemModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={uploading} className="btn-primary flex-1">
                                    {editingItem ? 'Update Item' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;
