import { insforge, handleInsforgeError } from './insforge';

export type StorageProvider = 'insforge' | 's3' | 'cloudinary';

export interface StorageConfig {
    provider: StorageProvider;
    bucket: string;
    cdnUrl: string;
}

export interface UploadResult {
    url: string;
    key: string;
    size: number;
    mimeType: string;
    version: number;
}

export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'application/pdf',
    'video/mp4', 'video/webm',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSION = 4096;

const BUCKET_NAME = 'site-assets';

const getStorageConfig = (): StorageConfig => ({
    provider: (import.meta.env.VITE_STORAGE_PROVIDER as StorageProvider) || 'insforge',
    bucket: import.meta.env.VITE_STORAGE_BUCKET || BUCKET_NAME,
    cdnUrl: import.meta.env.VITE_CDN_URL || '',
});

export const validateFile = (file: File): FileValidationResult => {
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} is not allowed` };
    }
    return { valid: true };
};

export const validateImageDimensions = (file: File): Promise<FileValidationResult> => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve({ valid: true });
            return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
                resolve({ valid: false, error: `Image dimensions too large. Maximum is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px` });
            } else {
                resolve({ valid: true });
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ valid: true });
        };
        img.src = url;
    });
};

const generateFileName = (file: File, folder: string): string => {
    const ext = file.name.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${folder}/${timestamp}-${random}.${ext}`;
};

export const getPublicUrl = (key: string): string => {
    const config = getStorageConfig();
    if (config.provider === 'insforge') {
        try {
            return insforge.storage.from(config.bucket).getPublicUrl(key);
        } catch {
            return `${import.meta.env.VITE_INSFORGE_BASE_URL}/storage/v1/object/public/${config.bucket}/${key}`;
        }
    }
    if (config.cdnUrl) {
        return `${config.cdnUrl}/${key}`;
    }
    return key;
};

export const uploadFile = async (file: File, folder: string = 'general'): Promise<{ data: UploadResult | null; error: string | null }> => {
    try {
        const validation = validateFile(file);
        if (!validation.valid) {
            return { data: null, error: validation.error || 'Invalid file' };
        }

        const dimensionCheck = await validateImageDimensions(file);
        if (!dimensionCheck.valid) {
            return { data: null, error: dimensionCheck.error || 'Invalid image dimensions' };
        }

        const fileName = generateFileName(file, folder);
        const bucket = insforge.storage.from(BUCKET_NAME);
        const { data, error } = await bucket.upload(fileName, file);
        if (error) throw error;

        const publicUrl = data?.url || getPublicUrl(data?.key || fileName);

        return {
            data: {
                url: publicUrl,
                key: data?.key || fileName,
                size: file.size,
                mimeType: file.type,
                version: 1,
            },
            error: null,
        };
    } catch (error) {
        console.error('Upload error:', error);
        return handleInsforgeError(error);
    }
};

export const extractStorageKey = (url: string): string | null => {
    try {
        const patterns = [
            /\/public\/site-assets\/(.+)/,
            /\/storage\/v1\/object\/public\/site-assets\/(.+)/,
            /\/site-assets\/(.+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    } catch {
        return null;
    }
};

export const deleteFile = async (key: string): Promise<{ data: unknown | null; error: string | null }> => {
    try {
        const { data, error } = await insforge.storage
            .from(BUCKET_NAME)
            .remove([key]);
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        if (msg.includes('not found') || msg.includes('Not Found')) {
            console.warn(`File not found in storage, skipping: ${key}`);
            return { data: null, error: null };
        }
        return handleInsforgeError(error);
    }
};

export const getFileVersionKey = (originalKey: string, version: number): string => {
    const parts = originalKey.split('.');
    const ext = parts.pop();
    return `${parts.join('.')}_v${version}.${ext}`;
};
