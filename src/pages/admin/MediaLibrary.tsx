import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    Folder
} from 'lucide-react';
import {
    getMediaFiles,
    getMediaByFolder,
    addMediaFile,
    updateMediaFile,
    deleteMediaFile,
    type MediaFile
} from '../../services/mediaService';
import { uploadImage } from '../../services/storageService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard, PermissionButton } from '../../components/common/PermissionGuard';

const MediaLibrary = () => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [folders, setFolders] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFolder, setActiveFolder] = useState('all');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
    const [editForm, setEditForm] = useState({ name: '', alt_text: '', folder: '' });
    const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
    const [toast, setToast] = useState('');

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadedUrl, setUploadedUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => { loadFiles(); }, []);

    const loadFiles = async () => {
        setLoading(true);
        const { data } = await getMediaFiles();
        if (data) {
            setFiles(data);
            const unique = [...new Set(data.map(f => f.folder).filter(Boolean))] as string[];
            setFolders(unique);
        }
        setLoading(false);
    };

    const loadFiltered = async (folder: string) => {
        setActiveFolder(folder);
        if (folder === 'all') {
            loadFiles();
            return;
        }
        setLoading(true);
        const { data } = await getMediaByFolder(folder);
        if (data) setFiles(data);
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');

        try {
            if (!file.type.startsWith('image/')) {
                throw new Error('Please upload an image file');
            }
            if (file.size > 10 * 1024 * 1024) {
                throw new Error('File size should be less than 10MB');
            }

            const { data, error } = await uploadImage(file, 'media');
            if (error) throw error;

            if (data) {
                setUploadedUrl(data.url);
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUploadConfirm = async () => {
        if (!uploadedUrl) return;

        const { error } = await addMediaFile({
            url: uploadedUrl,
            name: uploadedUrl.split('/').pop() || 'Untitled',
            type: 'image',
            folder: 'media',
            alt_text: ''
        });

        if (error) {
            showToast(error);
            return;
        }

        setUploadModalOpen(false);
        setUploadedUrl('');
        loadFiles();
        showToast('File uploaded');
    };

    const handleEditSave = async () => {
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

    const displayedFiles = files;

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Media Library</h1>
                    <p className="text-gray-500">Upload and manage site media files</p>
                </div>
                <PermissionButton resource="media" action="create" onClick={() => {
                    setUploadError('');
                    setUploadedUrl('');
                    setUploadModalOpen(true);
                }} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Upload</span>
                </PermissionButton>
            </div>

            {/* Folder Filter */}
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

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-square rounded-xl" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>
            ) : displayedFiles.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <ImageIcon className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-700">No media files</h3>
                    <p className="text-gray-500">Upload images to use across the site.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {displayedFiles.map((file) => (
                        <div key={file.id} className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                            <div className="aspect-square">
                                <img
                                    src={file.url}
                                    alt={file.alt_text || file.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                <button
                                    onClick={() => {
                                        setEditingFile(file);
                                        setEditForm({
                                            name: file.name || '',
                                            alt_text: file.alt_text || '',
                                            folder: file.folder || ''
                                        });
                                    }}
                                    className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
                                    title="Edit metadata"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <PermissionGuard resource="media" action="delete">
                                    <button
                                        onClick={() => setDeleteTarget(file)}
                                        className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg"
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

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Upload Media</h3>
                            <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            {uploadError && (
                                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                                    {uploadError}
                                </div>
                            )}

                            {uploadedUrl ? (
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                                    <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-cover" />
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
                                            <span className="text-sm font-bold text-gray-700">Click to select file</span>
                                            <span className="text-xs text-gray-400 mt-2">Images up to 10MB</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />

                            <div className="flex space-x-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setUploadModalOpen(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUploadConfirm}
                                    disabled={uploading || !uploadedUrl}
                                    className={`btn-primary flex-1 ${(!uploadedUrl || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Add to Library
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Metadata Modal */}
            {editingFile && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Edit Metadata</h3>
                            <button onClick={() => setEditingFile(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
                                <img src={editingFile.url} alt="" className="w-full h-full object-cover" />
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

                            <div className="flex space-x-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingFile(null)}
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

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete File"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove it from the media library.`}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
};

export default MediaLibrary;
