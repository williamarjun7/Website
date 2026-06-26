import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../services/authService';
import { usePermission } from '../../hooks/usePermission';

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
);

const AdminGate = () => {
    const location = useLocation();
    const [isAuth, setIsAuth] = useState<boolean | null>(null);
    const { refreshPermissions } = usePermission();

    useEffect(() => {
        let cancelled = false;

        const checkAuth = async () => {
            const auth = await isAuthenticated();
            if (cancelled) return;
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

        return () => { cancelled = true; };
    }, [location.pathname, refreshPermissions]);

    if (isAuth === null) {
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
