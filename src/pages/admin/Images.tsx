import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Image as ImageIcon,
    ExternalLink,
    Upload,
    Loader2,
    X
} from 'lucide-react';
import {
    getAllSiteImages,
    addSiteImage,
    deleteSiteImage,
    type SiteImage
} from '../../services/contentService';
import { uploadImage } from '../../services/storageService';
import Skeleton from '../../components/common/Skeleton';

interface SiteImageData {
    id: string;
    image_url: string;
    type: string;
    title?: string;
    is_active: boolean;
}

interface ImageFormData {
    image_url: string;
    type: SiteImage['type'];
    title: string;
    is_active: boolean;
}

const SiteImages = () => {
    const [images, setImages] = useState<SiteImageData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form data
    const [formData, setFormData] = useState<ImageFormData>({
        image_url: '',
        type: 'gallery',
        title: '',
        is_active: true
    });

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        setLoading(true);
        const { data } = await getAllSiteImages();
        if (data) {
            setImages(data);
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

            // Upload to 'site' folder in storage
            const { data, error } = await uploadImage(file, 'site');
            if (error) throw error;

            if (data) {
                setFormData((prev) => ({ ...prev, image_url: data.url }));
            }
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
            type: 'gallery',
            title: '',
            is_active: true
        });
        loadImages();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this image?')) {
            await deleteSiteImage(id);
            loadImages();
        }
    };

    const sections = ['hero', 'gallery', 'cafe', 'exterior', 'other'] as const;
    const sectionLabels: Record<string, string> = {
        hero: 'Home Page Hero Section',
        gallery: 'Gallery Images',
        cafe: 'Cafe & Restaurant',
        exterior: 'Exterior & Property',
        other: 'Other Images',
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Site Images</h1>
                    <p className="text-gray-500">Manage website gallery and hero images</p>
                </div>
                <button
                    onClick={() => {
                        setUploadError('');
                        setFormData({
                            image_url: '',
                            type: 'gallery',
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
                    {['hero', 'gallery', 'cafe', 'exterior', 'other'].map((section) => (
                        <div key={section} className="space-y-4">
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
                    {sections.map(section => {
                        const sectionImages = images.filter(img => img.type === section);
                        if (sectionImages.length === 0) return null;

                        return (
                            <div key={section} className="space-y-4">
                                <h2 className="text-lg font-bold font-heading border-b-2 border-primary/20 pb-2 inline-block">
                                    {sectionLabels[section] || section}
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {sectionImages.map(img => (
                                        <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                            <img
                                                src={img.image_url}
                                                alt={img.title || section}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
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
                            <p className="text-gray-500">Add hero slides or gallery images to make the site look great.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
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
                            {/* Category/Type Select */}
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Display Section</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SiteImage['type'] })}
                                    className="input w-full"
                                >
                                    {sections.map(s => (
                                        <option key={s} value={s}>{sectionLabels[s] || s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Title */}
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

                            {/* Image Upload Area */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700">Upload Image</label>

                                {uploadError && (
                                    <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-3 border border-red-100">
                                        {uploadError}
                                    </div>
                                )}

                                {formData.image_url ? (
                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                                        <img src={formData.image_url} alt="Uploaded" className="w-full h-full object-cover" />
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

                            {/* Action Buttons */}
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
        </div>
    );
};

export default SiteImages;
