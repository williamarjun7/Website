import { insforge, handleInsforgeError } from './insforge';
import { getProfileByUserId, type AdminProfile, clearPermissionCache } from './rbacService';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant_id: string;
    created_at: string;
}

export const adminLogin = async (email: string, password: string) => {
    try {
        const { data, error } = await insforge.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data?.user?.id) {
            const { data: profile } = await getProfileByUserId(data.user.id);
            if (profile) {
                localStorage.setItem('saas_user_id', data.user.id);
                localStorage.setItem('saas_tenant_id', profile.tenant_id);
            }
        }

        return { data, error: null };
    } catch (error) {
        console.error('Admin login failed:', error);
        return handleInsforgeError(error);
    }
};

export const adminSignup = async (email: string, password: string) => {
    try {
        const { data, error } = await insforge.auth.signUp({
            email,
            password,
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Admin signup failed:', error);
        return handleInsforgeError(error);
    }
};

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

export const resendVerification = async (email: string) => {
    try {
        const { data, error } = await insforge.auth.resendVerificationEmail({
            email,
            options: { emailRedirectTo: `${window.location.origin}/admin/login` },
        });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Resend verification failed:', error);
        return handleInsforgeError(error);
    }
};

export const adminLogout = async () => {
    try {
        const { error } = await insforge.auth.signOut();
        if (error) throw error;
        clearPermissionCache();
        localStorage.removeItem('saas_user_id');
        localStorage.removeItem('saas_tenant_id');
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAdminSession = async () => {
    try {
        const session = insforge.auth.tokenManager.getSession();
        if (!session) {
            return { data: { session: null }, error: null };
        }
        return { data: { session: { user: session.user } }, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getCurrentAdmin = async () => {
    try {
        const session = insforge.auth.tokenManager.getSession();
        if (!session?.user?.id) {
            return { data: null, error: null };
        }

        const { data: profile } = await getProfileByUserId(session.user.id);
        if (profile) {
            localStorage.setItem('saas_user_id', session.user.id);
            localStorage.setItem('saas_tenant_id', profile.tenant_id);
        }

        return { data: session, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const resetPassword = async (email: string) => {
    try {
        const { data, error } = await insforge.auth.sendResetPasswordEmail({
            email,
        });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Password reset failed:', error);
        return handleInsforgeError(error);
    }
};

export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const { data } = await getAdminSession();
        return !!data?.session;
    } catch {
        return false;
    }
};

export const getAdminProfileForCurrentUser = async () => {
    try {
        const { data: user } = await getCurrentAdmin();
        if (!user?.user?.id) return { data: null, error: 'Not authenticated' };
        const { data: profile } = await getProfileByUserId(user.user.id);
        if (!profile) return { data: null, error: 'No admin profile' };
        localStorage.setItem('saas_user_id', user.user.id);
        localStorage.setItem('saas_tenant_id', profile.tenant_id);
        return { data: profile as AdminProfile, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const hasPermission = async (resource: string, action: string): Promise<boolean> => {
    try {
        const { can } = await import('./rbacService');
        return can(resource as any, action as any);
    } catch {
        return false;
    }
};
