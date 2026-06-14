import { insforge, handleInsforgeError } from './insforge';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

// Admin login
export const adminLogin = async (email: string, password: string) => {
    try {
        const { data, error } = await insforge.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Admin login failed:', error);
        return handleInsforgeError(error);
    }
};

// Admin signup — disabled
export const adminSignup = async () => {
    return { data: null, error: 'Admin signup is disabled. Contact the system administrator to create an account.' };
};

// Verify email
export const verifyEmail = async (email: string, code: string) => {
    try {
        const { data, error } = await insforge.auth.verifyEmail({
            email,
            otp: code,
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Email verification failed:', error);
        return handleInsforgeError(error);
    }
};

// Resend verification email
export const resendVerification = async (email: string) => {
    try {
        const { data, error } = await insforge.auth.resendVerificationEmail({
            email,
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Resend verification failed:', error);
        return handleInsforgeError(error);
    }
};

// Admin logout
export const adminLogout = async () => {
    try {
        const { error } = await insforge.auth.signOut();
        if (error) throw error;
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get current admin session
export const getAdminSession = async () => {
    try {
        const { data, error } = await insforge.auth.getCurrentSession();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Get current admin user
export const getCurrentAdmin = async () => {
    try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const { data } = await getAdminSession();
        return !!data?.session;
    } catch {
        return false;
    }
};
