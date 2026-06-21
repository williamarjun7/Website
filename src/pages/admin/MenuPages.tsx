import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    Eye,
    EyeOff,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import {
    getAllMenuPages,
    addSiteImage,
    deleteSiteImage,
    toggleImageActive,
    updateMenuPage,
} from '../../services/contentService';
import { uploadFile } from '../../services/storageService';
import Skeleton from '../../components/common/Skeleton';

interface MenuPageData {
    id: string;
    image_url: string;
    title?: string;
    is_active: boolean;
    sort_order?: number;
}

const MenuPages = () => {
    const [pages, setPages] = useState<MenuPageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            const { data } = await getAllMenuPages();
            if (data) setPages(data);
        } catch (err) {
            console.error('Failed to load menu pages:', err);
        }
        setLoading(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('Image size should be less than 10MB');
            }

            const { data, error } = await uploadFile(file, 'menu-pages');
            if (error) throw error;
            if (data) setImageUrl(data.url);
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAdd = async () => {
        if (!imageUrl) {
            setUploadError('Please upload an image first');
            return;
        }

        const nextOrder = pages.length;
        const { error } = await addSiteImage({
            image_url: imageUrl,
            page: 'menu',
            title: `Menu Page ${pages.length + 1}`,
            is_active: true,
            sort_order: nextOrder,
        });

        if (error) {
            setUploadError(error);
            return;
        }

        setIsModalOpen(false);
        setImageUrl('');
        setUploadError('');
        loadPages();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this menu page image?')) return;
        const { error } = await deleteSiteImage(id);
        if (error) {
            console.error('Failed to delete: ' + error);
            return;
        }
        loadPages();
    };

    const handleToggleActive = async (id: string, current: boolean) => {
        const { error } = await toggleImageActive(id, !current);
        if (error) {
            alert('Failed to toggle: ' + error);
            return;
        }
        loadPages();
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= pages.length) return;

        const updated = [...pages];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

        setPages(updated);

        for (let i = 0; i < updated.length; i++) {
            await updateMenuPage(updated[i].id, { sort_order: i } as any);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Menu Pages</h1>
                    <p className="text-gray-500">Upload and arrange menu page images for the cafe</p>
                </div>
                <button
                    onClick={() => {
                        setUploadError('');
                        setImageUrl('');
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Menu Page</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                    ))}
                </div>
            ) : pages.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-700">No menu pages yet</h3>
                    <p className="text-gray-500">Upload images of your menu card to display in the menu viewer.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {pages.map((page, index) => (
                        <div
                            key={page.id}
                            className="group relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                        >
                            <img
                                src={page.image_url}
                                alt={page.title || `Menu page ${index + 1}`}
                                loading="lazy"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                                <button
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0}
                                    className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-primary'}`}
                                    title="Move up"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === pages.length - 1}
                                    className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${index === pages.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:text-primary'}`}
                                    title="Move down"
                                >
                                    <ArrowDown size={14} />
                                </button>
                                <button
                                    onClick={() => handleToggleActive(page.id, page.is_active)}
                                    className={`p-1.5 bg-white rounded-full transition-colors shadow-lg ${page.is_active ? 'text-green-600' : 'text-gray-400'}`}
                                    title={page.is_active ? 'Hide' : 'Show'}
                                >
                                    {page.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button
                                    onClick={() => handleDelete(page.id)}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Add Menu Page</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {uploadError && (
                                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                                    {uploadError}
                                </div>
                            )}

                            {imageUrl ? (
                                <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                                    <img src={imageUrl} alt="Menu page preview" loading="lazy" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setImageUrl('')}
                                            className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-primary hover:bg-primary/5'}`}
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center text-gray-500">
                                            <Loader2 size={32} className="animate-spin mb-3 text-primary" />
                                            <span className="font-medium">Uploading...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-500">
                                            <Upload size={36} className="mb-2 text-gray-400" />
                                            <span className="text-sm font-bold text-gray-700">Click to upload menu page</span>
                                            <span className="text-xs text-gray-400 mt-2">PNG, JPG, WebP up to 10MB</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleUpload}
                                className="hidden"
                            />

                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    disabled={uploading || !imageUrl}
                                    className={`btn-primary flex-1 ${(!imageUrl || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Add Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuPages;
