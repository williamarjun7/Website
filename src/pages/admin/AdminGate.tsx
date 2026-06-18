import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../services/authService';

const AdminGate = () => {
    const location = useLocation();
    const [isAuth, setIsAuth] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const auth = await isAuthenticated();
            setIsAuth(auth);
        };
        checkAuth();
    }, [location.pathname]);

    if (isAuth === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const publicRoutes = ['/admin/login', '/admin/signup', '/admin/verify', '/admin/'];
    const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

    if (location.pathname === '/admin' || location.pathname === '/admin/') {
        if (isAuth) {
            return <Navigate to="/admin/dashboard" replace />;
        }
        return <Navigate to="/admin/login" replace />;
    }

    if (!isAuth && !isPublicRoute) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default AdminGate;
