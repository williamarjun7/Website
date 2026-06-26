import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../../services/authService';
import { usePermission } from '../../hooks/usePermission';

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
);

const AdminGate = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isAuth, setIsAuth] = useState<boolean | null>(null);
    const [authTimeout, setAuthTimeout] = useState(false);
    const { refreshPermissions } = usePermission();

    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const checkAuth = async () => {
            timeoutId = setTimeout(() => {
                if (cancelled) return;
                setAuthTimeout(true);
                localStorage.removeItem('saas_user_id');
                localStorage.removeItem('saas_tenant_id');
                setIsAuth(false);
            }, 10000);

            const auth = await isAuthenticated();
            if (cancelled) return;
            if (timeoutId) clearTimeout(timeoutId);
            setIsAuth(auth);
            if (auth) {
                try {
                    await refreshPermissions();
                } catch {
                    // Permission refresh failed but user is still authenticated
                }
            }
        };
        checkAuth();

        return () => {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [location.pathname, refreshPermissions, navigate]);

    if (isAuth === null) {
        if (authTimeout) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center max-w-md p-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-red-600 text-2xl">!</span>
                        </div>
                        <h2 className="text-xl font-bold font-heading text-gray-900 mb-2">Session Expired</h2>
                        <p className="text-gray-600 mb-6">Your session could not be restored. Please log in again.</p>
                        <a href="/admin/login" className="btn-primary inline-block">Go to Login</a>
                    </div>
                </div>
            );
        }
        return <LoadingSpinner />;
    }

    const publicRoutes = ['/admin/login', '/admin/signup', '/admin/verify', '/admin/'];
    const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

    if (location.pathname === '/admin' || location.pathname === '/admin/') {
        if (isAuth) {
            return <Navigate to="/admin/dashboard" replace />;
        }
        if (localStorage.getItem('saas_user_id')) {
            return <LoadingSpinner />;
        }
        return <Navigate to="/admin/login" replace />;
    }

    if (!isAuth && !isPublicRoute) {
        if (localStorage.getItem('saas_user_id')) {
            return <LoadingSpinner />;
        }
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default AdminGate;
