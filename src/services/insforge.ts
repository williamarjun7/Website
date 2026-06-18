import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.VITE_INSFORGE_BASE_URL;
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!insforgeUrl) {
    throw new Error('Missing VITE_INSFORGE_BASE_URL environment variable');
}

export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey || '',
    storage: localStorage
});

export const handleInsforgeError = <T = null>(error: unknown): { data: T | null; error: string } => {
    console.error('Insforge Error:', error);
    const message = error instanceof Error ? error.message
        : typeof error === 'string' ? error
        : error && typeof error === 'object' && 'message' in error ? String((error as Record<string, unknown>).message)
        : error && typeof error === 'object' && 'error' in error ? String((error as Record<string, unknown>).error)
        : 'An unexpected error occurred';
    return { data: null, error: message };
};

export default insforge;
