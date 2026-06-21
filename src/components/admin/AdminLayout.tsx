import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BedDouble,
    CalendarDays,
    Coffee,
    Image as ImageIcon,
    FileText,
    LogOut,
    Menu,
    X,
    ShieldAlert,
    Star,
    Navigation,
    FileSymlink,
    HelpCircle,
    History,
    Settings,
    FolderOpen
} from 'lucide-react';
import { adminLogout } from '../../services/authService';
import { usePermission } from '../../hooks/usePermission';

interface NavItemDefinition {
    name: string;
    path: string;
    icon: any;
    resource?: string;
    action?: string;
}

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { can, profile, loading: permLoading } = usePermission();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login');
    };

    const allNavItems: NavItemDefinition[] = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
        { name: 'Rooms', path: '/admin/rooms', icon: BedDouble },
        { name: 'Cafe Menu', path: '/admin/menu', icon: Coffee },
        { name: 'Navigation', path: '/admin/navigation', icon: Navigation, resource: 'navigation', action: 'read' },
        { name: 'Pages', path: '/admin/pages', icon: FileSymlink, resource: 'page', action: 'read' },
        { name: 'FAQ', path: '/admin/faq', icon: HelpCircle, resource: 'faq', action: 'read' },
        { name: 'Media Library', path: '/admin/media', icon: FolderOpen, resource: 'media', action: 'read' },
        { name: 'Site Images', path: '/admin/images', icon: ImageIcon, resource: 'media', action: 'read' },
        { name: 'Content', path: '/admin/content', icon: FileText, resource: 'page', action: 'read' },
        { name: 'Site Settings', path: '/admin/settings', icon: Settings, resource: 'setting', action: 'read' },
        { name: 'Revisions', path: '/admin/revisions', icon: History, resource: 'revision', action: 'read' },
        { name: 'Reviews', path: '/admin/reviews', icon: Star },
        { name: 'Payment Recovery', path: '/admin/payment-recovery', icon: ShieldAlert },
    ];

    const [filteredNavItems, setFilteredNavItems] = useState<NavItemDefinition[]>([]);

    useEffect(() => {
        const filterItems = async () => {
            const filtered: NavItemDefinition[] = [];
            for (const item of allNavItems) {
                if (item.resource && item.action) {
                    const hasAccess = await can(item.resource as any, item.action as any);
                    if (hasAccess) filtered.push(item);
                } else {
                    filtered.push(item);
                }
            }
            setFilteredNavItems(filtered);
        };
        filterItems();
    }, [can]);

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:relative md:translate-x-0`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <span className="font-heading text-xl font-bold text-primary">Admin Panel</span>
                            {profile?.role && (
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase font-semibold">
                                    {profile.role}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden text-gray-500 hover:text-primary"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
                                        }`}
                                    onClick={() => isMobile && setSidebarOpen(false)}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="font-medium">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header (Mobile only) */}
                <div className="md:hidden h-16 bg-white shadow-sm flex items-center px-4">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-500 hover:text-primary p-2"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-heading font-bold text-lg">Highlands Admin</span>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Overlay for mobile */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
