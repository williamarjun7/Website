import { insforge, handleInsforgeError } from './insforge';

const BUCKET_NAME = 'site-assets';

// Upload a file and return its public URL
export const uploadImage = async (file: File, folder: string = 'rooms') => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const bucket = insforge.storage.from(BUCKET_NAME);
        const { data, error } = await bucket.upload(fileName, file);

        if (error) throw error;

        // The upload response has { key, bucket, url, size, ... }
        const publicUrl = data?.url || bucket.getPublicUrl(data?.key || fileName);

        return { data: { url: publicUrl, key: data?.key || fileName }, error: null };
    } catch (error) {
        console.error('Upload error:', error);
        return handleInsforgeError(error);
    }
};

// Delete a file from storage
export const deleteImage = async (key: string) => {
    try {
        const { data, error } = await insforge.storage
            .from(BUCKET_NAME)
            .remove(key);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
