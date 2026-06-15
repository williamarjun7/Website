import { createClient } from '@insforge/sdk';

const insforgeUrl = import.meta.env.VITE_INSFORGE_BASE_URL;
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

if (!insforgeUrl) {
    throw new Error('Missing VITE_INSFORGE_BASE_URL environment variable');
}

export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey || ''
});

export const handleInsforgeError = <T = null>(error: unknown): { data: T | null; error: string } => {
    console.error('Insforge Error:', error);
    let message: string;
    if (error instanceof Error) {
        message = error.message || JSON.stringify(error);
    } else if (typeof error === 'string') {
        message = error;
    } else if (error && typeof error === 'object') {
        const obj = error as Record<string, unknown>;
        message = (typeof obj.message === 'string' ? obj.message : obj.error as string) || JSON.stringify(error);
    } else {
        message = 'An unexpected error occurred';
    }
    return { data: null, error: message };
};

export default insforge;
