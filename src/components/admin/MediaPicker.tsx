import { useEffect, useState } from 'react';
import { Image, X, Loader2 } from 'lucide-react';
import { getMediaFiles, type MediaFile } from '../../services/mediaService';

interface MediaPickerProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

const MediaPicker = ({ onSelect, onClose }: MediaPickerProps) => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMediaFiles()
            .then(({ data }) => {
                if (data) setFiles(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Select Media</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-gray-400" />
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12">
                            <Image size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No media files found. Upload files in Media Library first.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {files.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => onSelect(file.url)}
                                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-primary hover:shadow-lg transition-all"
                                >
                                    {file.mime_type?.startsWith('image/') ? (
                                        <img
                                            src={file.url}
                                            alt={file.alt_text || file.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <Image size={32} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs truncate font-medium">{file.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MediaPicker;
