import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';
import { invalidateCmsCache } from './cacheService';
import { logMediaEvent } from './auditService';
import { deleteFile, extractStorageKey } from './storageService';
import { can } from './rbacService';

export interface MediaFile {
    id: string;
    tenant_id: string;
    name: string;
    url: string;
    type: string;
    mime_type: string;
    size: number;
    folder: string;
    alt_text: string;
    current_version: number;
    created_at: string;
    updated_at: string;
}

export interface FileVersion {
    id: string;
    media_file_id: string;
    version_number: number;
    url: string;
    size: number;
    mime_type: string;
    uploaded_by: string;
    created_at: string;
}

const applyTenantFilter = () => {
    const tenantId = getCurrentTenantId();
    if (!tenantId) throw new Error('No tenant context');
    return tenantId;
};

export const getMediaFiles = async (folder?: string) => {
    try {
        const tenantId = applyTenantFilter();
        let query = insforge.database
            .from('media_files')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (folder) {
            query = query.eq('folder', folder);
        }
        const { data, error } = await query;
        if (error) throw error;
        return { data: data as MediaFile[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getMediaByFolder = async (folder: string) => {
    try {
        const tenantId = applyTenantFilter();
        const { data, error } = await insforge.database
            .from('media_files')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('folder', folder)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data: data as MediaFile[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const addMediaFile = async (fileData: Partial<MediaFile>) => {
    try {
        if (!await can('media', 'create')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = applyTenantFilter();
        const { data, error } = await insforge.database
            .from('media_files')
            .insert({ ...fileData, tenant_id: tenantId, current_version: 1 })
            .select()
            .single();
        if (error) throw error;
        invalidateCmsCache('media');
        logMediaEvent('create', data?.id || '', { name: fileData.name });
        return { data: data as MediaFile, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateMediaFile = async (id: string, updates: Partial<MediaFile>) => {
    try {
        if (!await can('media', 'update')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = applyTenantFilter();
        const { data, error } = await insforge.database
            .from('media_files')
            .update(updates)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();
        if (error) throw error;
        invalidateCmsCache('media');
        return { data: data as MediaFile, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deleteMediaFile = async (id: string) => {
    try {
        if (!await can('media', 'delete')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = applyTenantFilter();
        const { data: file, error: fetchError } = await insforge.database
            .from('media_files')
            .select('url')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();
        if (fetchError) throw fetchError;

        if (file?.url) {
            const key = extractStorageKey(file.url);
            if (key) await deleteFile(key);
        }

        const { error } = await insforge.database
            .from('media_files')
            .delete()
            .eq('id', id)
            .eq('tenant_id', tenantId);
        if (error) throw error;
        invalidateCmsCache('media');
        logMediaEvent('delete', id);
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const recordFileVersion = async (mediaFileId: string, url: string, size: number, mimeType: string, uploadedBy: string) => {
    try {
        if (!await can('media', 'update')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const { data: versions, error: fetchError } = await insforge.database
            .from('file_versions')
            .select('version_number')
            .eq('media_file_id', mediaFileId)
            .order('version_number', { ascending: false })
            .limit(1);
        if (fetchError) throw fetchError;
        const nextVersion = (versions && versions.length > 0 ? versions[0].version_number : 0) + 1;
        const { data, error } = await insforge.database
            .from('file_versions')
            .insert({
                media_file_id: mediaFileId,
                version_number: nextVersion,
                url,
                size,
                mime_type: mimeType,
                uploaded_by: uploadedBy,
            })
            .select()
            .single();
        if (error) throw error;
        await insforge.database
            .from('media_files')
            .update({ current_version: nextVersion, url, size, mime_type: mimeType })
            .eq('id', mediaFileId);
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getFileVersions = async (mediaFileId: string) => {
    try {
        const { data, error } = await insforge.database
            .from('file_versions')
            .select('*')
            .eq('media_file_id', mediaFileId)
            .order('version_number', { ascending: false });
        if (error) throw error;
        return { data: data as FileVersion[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getMediaFolders = async () => {
    try {
        const tenantId = applyTenantFilter();
        const { data, error } = await insforge.database
            .from('media_files')
            .select('folder')
            .eq('tenant_id', tenantId);
        if (error) throw error;
        const folders = new Set<string>();
        if (data) {
            for (const item of data) {
                if (item.folder) folders.add(item.folder);
            }
        }
        return { data: Array.from(folders).sort(), error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
