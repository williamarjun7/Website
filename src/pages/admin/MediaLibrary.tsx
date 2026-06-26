import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Plus,
    Trash2,
    Edit2,
    Image as ImageIcon,
    ExternalLink,
    Upload,
    Folder,
    Eye,
    EyeOff
} from 'lucide-react';
import AdminModal from '../../components/admin/AdminModal';
import {
    getMediaFiles,
    getMediaByFolder,
    addMediaFile,
    updateMediaFile,
    deleteMediaFile,
    type MediaFile
} from '../../services/mediaService';
import {
    getAllSiteImages,
    addSiteImage,
    deleteSiteImage,
    toggleImageActive,
    updateSiteImage,
} from '../../services/contentService';
import { uploadFile } from '../../services/storageService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard } from '../../components/common/PermissionGuard';

interface SiteImageData {
    id: string;
    image_url: string;
    page: string;
    title?: string;
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

type Tab = 'library' | 'images';

const MediaPage = () => {
    const [activeTab, setActiveTab] = useState<Tab>('library');

    // ── Shared upload state ──
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadedUrl, setUploadedUrl] = useState('');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Site Images state ──
    const [images, setImages] = useState<SiteImageData[]>([]);
    const [imagesLoading, setImagesLoading] = useState(true);
    const [editingImage, setEditingImage] = useState<SiteImageData | null>(null);
    const [imageFormData, setImageFormData] = useState({
        image_url: '', page: 'gallery', title: '', is_active: true
    });
    const [editFormData, setEditFormData] = useState({ title: '', page: 'gallery', is_active: true });
    const [savingEdit, setSavingEdit] = useState(false);

    // ── Media Library state ──
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [activeFolder, setActiveFolder] = useState('all');
    const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
    const [editForm, setEditForm] = useState({ name: '', alt_text: '', folder: '' });
    const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
    const [deleteImageTarget, setDeleteImageTarget] = useState<SiteImageData | null>(null);
    const [toast, setToast] = useState('');
    const [loadError, setLoadError] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // ── Data loading ──
    useEffect(() => {
        if (activeTab === 'library') loadFiles();
        else loadImages();
    }, [activeTab]);

    const loadFiles = async () => {
        setFilesLoading(true);
        setLoadError('');
        try {
            const { data } = await getMediaFiles();
            if (data) {
                setFiles(data);
                const unique = [...new Set(data.map(f => f.folder).filter(Boolean))] as string[];
                setFolders(unique);
            }
        } catch (err) {
            console.error('Failed to load media:', err);
            setLoadError('Failed to load. Please try again.');
        }
        setFilesLoading(false);
    };

    const loadFiltered = async (folder: string) => {
        setActiveFolder(folder);
        if (folder === 'all') { loadFiles(); return; }
        setFilesLoading(true);
        try {
            const { data } = await getMediaByFolder(folder);
            if (data) setFiles(data);
        } catch (err) {
            console.error('Failed to load filtered media:', err);
        }
        setFilesLoading(false);
    };

    const loadImages = async () => {
        setImagesLoading(true);
        setLoadError('');
        try {
            const { data } = await getAllSiteImages();
            if (data) setImages(data);
        } catch (err) {
            console.error('Failed to load images:', err);
            setLoadError('Failed to load. Please try again.');
        }
        setImagesLoading(false);
    };

    // ── Drag-and-drop handlers ──
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fakeEvent = { target: { files } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileUpload(fakeEvent);
        }
    };

    // ── Shared upload handler ──
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');
        setUploadingFileName(file.name);

        try {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                throw new Error('Please upload an image or video file');
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size should be less than 10MB');
            }

            const folder = activeTab === 'images' ? 'site' : 'media';
            const { data, error } = await uploadFile(file, folder);
            if (error) throw error;
            if (data) setUploadedUrl(data.url);
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openUploadModal = () => {
        setUploadError('');
        setUploadedUrl('');
        setImageFormData({ image_url: '', page: 'gallery', title: '', is_active: true });
        setUploadModalOpen(true);
    };

    // ── Image-specific handlers ──
    const handleImageSave = async () => {
        if (!uploadedUrl) return;
        const { error } = await addSiteImage({
            image_url: uploadedUrl,
            page: imageFormData.page,
            title: imageFormData.title,
            is_active: true
        });
        if (error) { showToast(error); return; }
        setUploadModalOpen(false);
        setUploadedUrl('');
        loadImages();
        showToast('Image saved');
    };

    const handleEditImage = (img: SiteImageData) => {
        setEditingImage(img);
        setEditFormData({ title: img.title || '', page: img.page, is_active: img.is_active });
    };

    const handleEditImageSave = async () => {
        if (!editingImage || savingEdit) return;
        setSavingEdit(true);
        const { error } = await updateSiteImage(editingImage.id, {
            title: editFormData.title,
            page: editFormData.page,
            is_active: editFormData.is_active,
        });
        if (!error) { setEditingImage(null); loadImages(); }
        else setUploadError(error || 'Failed to update image');
        setSavingEdit(false);
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        const { error } = await toggleImageActive(id, !currentActive);
        if (!error) loadImages();
    };

    const handleDeleteImage = async (img: SiteImageData) => {
        setDeleteImageTarget(img);
    };

    const confirmDeleteImage = async () => {
        if (!deleteImageTarget) return;
        const { error } = await deleteSiteImage(deleteImageTarget.id);
        if (error) { showToast('Failed to delete image: ' + error); setDeleteImageTarget(null); return; }
        setDeleteImageTarget(null);
        loadImages();
    };

    // ── Media Library handlers ──
    const handleMediaUploadConfirm = async () => {
        if (!uploadedUrl) return;
        const mimeType = uploadedUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video/' + (uploadedUrl.match(/\.(mp4|webm|ogg)$/i)?.[1] || 'mp4') : 'image';
        const { error } = await addMediaFile({
            url: uploadedUrl,
            name: uploadedUrl.split('/').pop() || 'Untitled',
            type: mimeType.startsWith('video') ? 'video' : 'image',
            folder: 'media',
            alt_text: ''
        });
        if (error) { showToast(error); return; }
        setUploadModalOpen(false);
        setUploadedUrl('');
        loadFiles();
        showToast('File uploaded');
    };

    const handleEditFileSave = async () => {
        if (!editingFile) return;
        const { error } = await updateMediaFile(editingFile.id, editForm);
        if (error) { showToast(error); return; }
        setEditingFile(null);
        loadFiles();
        showToast('Metadata updated');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        const { error } = await deleteMediaFile(deleteTarget.id);
        if (error) { showToast(error); setDeleteTarget(null); return; }
        setDeleteTarget(null);
        loadFiles();
        showToast('File deleted');
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ── Upload Modal (shared) ──
    const renderUploadModal = () => (
        <AdminModal
            isOpen={isUploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            title={activeTab === 'images' ? 'Add New Image' : 'Upload Media'}
            icon={<Upload size={20} />}
            size="md"
            footer={
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <button type="button" onClick={() => setUploadModalOpen(false)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                    <button
                        type="button"
                        onClick={activeTab === 'images' ? handleImageSave : handleMediaUploadConfirm}
                        disabled={uploading || !uploadedUrl}
                        className={`btn-primary w-full sm:w-auto flex-1 sm:flex-none ${(!uploadedUrl || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {activeTab === 'images' ? 'Save Image' : 'Add to Library'}
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                {uploadError && (
                    <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                        {uploadError}
                    </div>
                )}

                {uploadedUrl ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner group animate-fade-in-up">
                        {uploadedUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                            <video src={uploadedUrl} controls className="w-full h-full object-cover" />
                        ) : (
                            <img src={uploadedUrl} alt="Uploaded" loading="lazy" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                type="button"
                                onClick={() => setUploadedUrl('')}
                                className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative overflow-hidden border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                            uploading
                                ? 'bg-primary/[0.03] border-primary/40'
                                : isDragging
                                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg'
                                    : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                        }`}
                    >
                        {uploading ? (
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
                                        {uploadingFileName ? `Uploading ${uploadingFileName.substring(0, 25)}${uploadingFileName.length > 25 ? '...' : ''}` : 'Uploading to cloud...'}
                                    </span>
                                    <span className="text-xs text-gray-400 mt-0.5">Compressing & uploading...</span>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex flex-col items-center text-gray-500 transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isDragging ? 'bg-primary/20 text-primary scale-110' : 'bg-gray-100 text-gray-400'}`}>
                                    <Upload size={24} className={isDragging ? 'animate-upload-bounce' : ''} />
                                </div>
                                <span className={`text-sm font-bold transition-colors ${isDragging ? 'text-primary' : 'text-gray-700'}`}>
                                    {isDragging ? 'Drop file here' : 'Click or drag file here'}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">Images & Videos up to 10MB</span>
                            </div>
                        )}
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />

                {activeTab === 'images' && uploadedUrl && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-gray-700">Page</label>
                            <select
                                value={imageFormData.page}
                                onChange={(e) => setImageFormData({ ...imageFormData, page: e.target.value })}
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
                                value={imageFormData.title}
                                onChange={(e) => setImageFormData({ ...imageFormData, title: e.target.value })}
                                className="input w-full"
                                placeholder="e.g. Beautiful mountain view from balcony"
                            />
                        </div>
                    </>
                )}
            </div>
        </AdminModal>
    );

    // ── Edit Image Modal ──
    const renderEditImageModal = () => (
        <AdminModal
            isOpen={!!editingImage}
            onClose={() => setEditingImage(null)}
            title="Edit Image"
            icon={<Edit2 size={20} />}
            size="md"
            footer={
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <button type="button" onClick={() => setEditingImage(null)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                    <button type="button" onClick={handleEditImageSave} disabled={savingEdit} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none">Save Changes</button>
                </div>
            }
        >
            <div className="space-y-5">
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                    <img src={editingImage!.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
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
            </div>
        </AdminModal>
    );

    // ── Edit File (Media Library) Modal ──
    const renderEditFileModal = () => (
        <AdminModal
            isOpen={!!editingFile}
            onClose={() => setEditingFile(null)}
            title="Edit Metadata"
            icon={<Edit2 size={20} />}
            size="md"
            footer={
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                    <button type="button" onClick={() => setEditingFile(null)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                    <button type="button" onClick={handleEditFileSave} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none">Save Changes</button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                    {editingFile!.type === 'video' || editingFile!.url.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video src={editingFile!.url} controls className="w-full h-full object-cover" />
                    ) : (
                        <img src={editingFile!.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">File Name</label>
                    <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="input w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Alt Text</label>
                    <input
                        type="text"
                        value={editForm.alt_text}
                        onChange={(e) => setEditForm({ ...editForm, alt_text: e.target.value })}
                        className="input w-full"
                        placeholder="Descriptive text for accessibility"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Folder</label>
                    <input
                        type="text"
                        value={editForm.folder}
                        onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                        className="input w-full"
                        placeholder="e.g. gallery, hero"
                        list="edit-folders"
                    />
                    <datalist id="edit-folders">
                        {folders.map(f => <option key={f} value={f} />)}
                    </datalist>
                </div>
            </div>
        </AdminModal>
    );

    const tabClass = (tab: Tab) =>
        `px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab
            ? 'bg-primary text-white shadow-md'
            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`;

    return (
        <div className="space-y-6">
            <Helmet><title>Media Library | Highlands Cafe & Motel Inn</title></Helmet>
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            {loadError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
                    <span>{loadError}</span>
                    <button onClick={() => (activeTab === 'library' ? loadFiles() : loadImages())} className="text-red-700 font-semibold underline hover:no-underline ml-4">Retry</button>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Media</h1>
                    <p className="text-gray-500">
                        {activeTab === 'images' ? 'Manage images organized by site page' : 'Upload and manage site media files'}
                    </p>
                </div>
                <button onClick={openUploadModal} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>{activeTab === 'images' ? 'Add Image' : 'Upload'}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('library')} className={tabClass('library')}>
                    Media Library
                </button>
                <button onClick={() => setActiveTab('images')} className={tabClass('images')}>
                    Site Images
                </button>
            </div>

            {/* ── Media Library Tab ── */}
            {activeTab === 'library' && (
                <>
                    {folders.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => loadFiltered('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFolder === 'all' ? 'bg-amber-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                                All Files
                            </button>
                            {folders.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => loadFiltered(folder)}
                                    className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFolder === folder ? 'bg-amber-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    <Folder size={14} />
                                    <span>{folder}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {filesLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="aspect-square rounded-xl" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                            <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
                            <h3 className="text-lg font-semibold text-gray-700">No media files</h3>
                            <p className="text-gray-500">Upload images to use across the site.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {files.map((file) => (
                                <div key={file.id} className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                    <div className="aspect-square">
                                        {file.type === 'video' || file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <video src={file.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img
                                                src={file.url}
                                                alt={file.alt_text || file.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                        <button
                                            onClick={() => {
                                                setEditingFile(file);
                                                setEditForm({ name: file.name || '', alt_text: file.alt_text || '', folder: file.folder || '' });
                                            }}
                                            className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
                                            aria-label="Edit file metadata"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <PermissionGuard resource="media" action="delete">
                                            <button
                                                onClick={() => setDeleteTarget(file)}
                                                className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg"
                                                aria-label="Delete file"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </PermissionGuard>
                                    </div>
                                    <div className="p-2 bg-white">
                                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <span className="text-[10px] text-gray-400">{file.folder}</span>
                                            {file.size > 0 && (
                                                <span className="text-[10px] text-gray-400">{formatSize(file.size)}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Site Images Tab ── */}
            {activeTab === 'images' && (
                imagesLoading ? (
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
                                                    <button onClick={() => handleEditImage(img)} className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-lg" aria-label="Edit image details">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(img.id, img.is_active)}
                                                        className={`p-2 bg-white rounded-full transition-colors shadow-lg ${img.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                        aria-label={img.is_active ? 'Hide image' : 'Show image'}
                                                    >
                                                        {img.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    </button>
                                                    <a
                                                        href={img.image_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-white rounded-full text-gray-700 hover:text-primary transition-colors shadow-lg"
                                                        aria-label="Open image in new tab"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </a>
                                                    <button onClick={() => handleDeleteImage(img)} className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg" aria-label="Delete image">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                {!img.is_active && (
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500/90 text-white text-[10px] rounded-full font-bold">Hidden</div>
                                                )}
                                                {img.title && (
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-medium">{img.title}</div>
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
                )
            )}

            {/* Modals */}
            {isUploadModalOpen && renderUploadModal()}
            {editingImage && renderEditImageModal()}
            {editingFile && renderEditFileModal()}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete File"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove it from the media library.`}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />

            <ConfirmDialog
                isOpen={!!deleteImageTarget}
                title="Delete Image"
                message={`Are you sure you want to delete "${deleteImageTarget?.title || 'this image'}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDeleteImage}
                onCancel={() => setDeleteImageTarget(null)}
                destructive
            />
        </div>
    );
};

export default MediaPage;
