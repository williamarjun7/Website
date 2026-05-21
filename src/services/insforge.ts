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

// Helper function to handle errors consistently
export const handleInsforgeError = <T = null>(error: unknown): { data: T | null; error: string } => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Insforge Error:', message);
    return { data: null, error: message };
};

export default insforge;
