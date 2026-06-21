import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Image as ImageIcon,
    ExternalLink,
    Upload,
    Loader2,
    X,
    Eye,
    EyeOff,
    Edit2
} from 'lucide-react';
import {
    getAllSiteImages,
    addSiteImage,
    deleteSiteImage,
    toggleImageActive,
    updateSiteImage,
} from '../../services/contentService';
import { uploadFile } from '../../services/storageService';
import Skeleton from '../../components/common/Skeleton';

interface SiteImageData {
    id: string;
    image_url: string;
    page: string;
    title?: string;
    is_active: boolean;
}

interface ImageFormData {
    image_url: string;
    page: string;
    title: string;
    is_active: boolean;
}

const PAGES = ['home', 'cafe', 'rooms', 'about', 'gallery', 'contact', 'footer', 'other'] as const;
const PAGE_LABELS: Record<string, string> = {
    home: 'Home Page',
    cafe: 'Cafe Page',
    rooms: 'Rooms Page',
    about: 'About Page',
    gallery: 'Gallery Page',
    contact: 'Contact Page',
    footer: 'Footer / Logos',
    other: 'Other Images',
};

const SiteImages = () => {
    const [images, setImages] = useState<SiteImageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<SiteImageData | null>(null);

    const [formData, setFormData] = useState<ImageFormData>({
        image_url: '',
        page: 'gallery',
        title: '',
        is_active: true
    });

    const [editFormData, setEditFormData] = useState({ title: '', page: 'gallery', is_active: true });

    const [uploading, setUploading] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        try {
            const { data } = await getAllSiteImages();
            if (data) setImages(data);
        } catch (err) {
            console.error('Failed to load images:', err);
        }
        setLoading(false);
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
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('Image size should be less than 5MB');
            }

            const { data, error } = await uploadFile(file, 'site');
            if (error) throw error;
            if (data) setFormData((prev) => ({ ...prev, image_url: data.url }));
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.image_url) {
            setUploadError('Please upload an image first');
            return;
        }

        const { error } = await addSiteImage(formData);
        if (error) {
            alert(error);
            return;
        }

        setIsModalOpen(false);
        setFormData({
            image_url: '',
            page: 'gallery',
            title: '',
            is_active: true
        });
        loadImages();
    };

    const handleEdit = (img: SiteImageData) => {
        setEditingImage(img);
        setEditFormData({ title: img.title || '', page: img.page, is_active: img.is_active });
    };

    const handleEditSave = async () => {
        if (!editingImage || savingEdit) return;
        setSavingEdit(true);
        const { error } = await updateSiteImage(editingImage.id, {
            title: editFormData.title,
            page: editFormData.page,
            is_active: editFormData.is_active,
        });
        if (!error) {
            setEditingImage(null);
            loadImages();
        } else {
            setUploadError(error || 'Failed to update image');
        }
        setSavingEdit(false);
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        const { error } = await toggleImageActive(id, !currentActive);
        if (!error) loadImages();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this image?')) {
            const { error } = await deleteSiteImage(id);
            if (error) {
                alert('Failed to delete image: ' + error);
                return;
            }
            loadImages();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Site Images</h1>
                    <p className="text-gray-500">Manage images organized by page</p>
                </div>
                <button
                    onClick={() => {
                        setUploadError('');
                        setFormData({
                            image_url: '',
                            page: 'gallery',
                            title: '',
                            is_active: true
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Image</span>
                </button>
            </div>

            {loading ? (
                <div className="space-y-12">
                    {PAGES.slice(0, 4).map((page) => (
                        <div key={page} className="space-y-4">
                            <Skeleton className="h-6 w-32" />
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="aspect-square rounded-xl" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-12">
                    {PAGES.map(page => {
                        const pageImages = images.filter(img => img.page === page);
                        if (pageImages.length === 0) return null;

                        return (
                            <div key={page} className="space-y-4">
                                <h2 className="text-lg font-bold font-heading border-b-2 border-primary/20 pb-2 inline-block">
                                    {PAGE_LABELS[page] || page}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {pageImages.map(img => (
                                        <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                            <img
                                                src={img.image_url}
                                                alt={img.title || PAGE_LABELS[img.page] || img.page}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(img)}
                                                    className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
                                                    title="Edit details"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(img.id, img.is_active)}
                                                    className={`p-2 bg-white rounded-full transition-colors shadow-lg ${img.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                    title={img.is_active ? 'Click to hide' : 'Click to show'}
                                                >
                                                    {img.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                <a
                                                    href={img.image_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-white rounded-full text-gray-700 hover:text-primary transition-colors shadow-lg"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(img.id)}
                                                    className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            {!img.is_active && (
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/90 text-white text-[10px] rounded-full font-bold">
                                                    Hidden
                                                </div>
                                            )}
                                            {img.title && (
                                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium">
                                                    {img.title}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {images.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
                            <h3 className="text-lg font-semibold text-gray-700">No images yet</h3>
                            <p className="text-gray-500">Upload images for each page of your site.</p>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Add New Image</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Page</label>
                                <select
                                    value={formData.page}
                                    onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                                    className="input w-full"
                                >
                                    {PAGES.map(p => (
                                        <option key={p} value={p}>{PAGE_LABELS[p] || p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Title / Caption (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g. Beautiful mountain view from balcony"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Upload Image</label>

                                {uploadError && (
                                    <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-3 border border-red-100">
                                        {uploadError}
                                    </div>
                                )}

                                {formData.image_url ? (
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                                        <img src={formData.image_url} alt="Uploaded" loading="lazy" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                                                className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => !uploading && fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-inner'
                                            }`}
                                    >
                                        {uploading ? (
                                            <div className="flex flex-col items-center text-gray-500">
                                                <Loader2 size={32} className="animate-spin mb-3 text-primary" />
                                                <span className="font-medium">Uploading to cloud...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-gray-500">
                                                <Upload size={36} className="mb-2 text-gray-400" />
                                                <span className="text-sm font-bold text-gray-700">Click to select image</span>
                                                <span className="text-xs text-gray-400 mt-2 italic">Supports PNG, JPG, WebP up to 5MB</span>
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

                            <div className="flex space-x-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !formData.image_url}
                                    className={`btn-primary flex-1 ${(!formData.image_url || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Save Image
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingImage && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Edit Image</h3>
                            <button onClick={() => setEditingImage(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                                <img src={editingImage.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Page</label>
                                <select
                                    value={editFormData.page}
                                    onChange={(e) => setEditFormData({ ...editFormData, page: e.target.value })}
                                    className="input w-full"
                                >
                                    {PAGES.map(p => (
                                        <option key={p} value={p}>{PAGE_LABELS[p] || p}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Title / Caption</label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    className="input w-full"
                                    placeholder="Image title"
                                />
                            </div>

                            <label className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editFormData.is_active}
                                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded-lg"
                                />
                                <span className="text-sm font-semibold text-gray-700">Visible on website</span>
                            </label>

                            {uploadError && (
                                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">{uploadError}</div>
                            )}
                            <div className="flex space-x-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingImage(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEditSave}
                                    className="btn-primary flex-1"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SiteImages;
