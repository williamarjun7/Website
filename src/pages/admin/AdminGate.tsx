import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentAdmin } from '../../services/authService';
import { insforge } from '../../services/insforge';

const AdminGate = () => {
    const location = useLocation();
    const [isAuth, setIsAuth] = useState<boolean | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        const checkAuth = async () => {
            const auth = await isAuthenticated();
            setIsAuth(auth);

            // Verify admin role against database (not just auth)
            if (auth) {
                try {
                    const { data: user } = await getCurrentAdmin();
                    if (user?.user?.email) {
                        const { data } = await insforge.database
                            .from('admins')
                            .select('id')
                            .eq('email', user.user.email)
                            .single();
                        setIsAdmin(!!data);
                    }
                } catch {
                    setIsAdmin(false);
                }
            }
        };
        checkAuth();
    }, [location.pathname]);

    if (isAuth === null) {
        // Loading state
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const publicRoutes = ['/admin/login', '/admin/verify'];
    const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

    // Handle root /admin path
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
        if (isAuth && isAdmin) {
            return <Navigate to="/admin/dashboard" replace />;
        } else {
            return <Navigate to="/admin/login" replace />;
        }
    }

    if ((!isAuth || !isAdmin) && !isPublicRoute) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default AdminGate;