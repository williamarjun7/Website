import { useState, useEffect, useCallback, type ElementType } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { type Resource, type Action } from '../../services/rbacService';
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
    FolderOpen,
    ChevronDown
} from 'lucide-react';
import { adminLogout } from '../../services/authService';
import { usePermission } from '../../hooks/usePermission';

interface NavItemDefinition {
    name: string;
    path: string;
    icon: ElementType;
    resource?: string;
    action?: string;
}

interface NavGroup {
    label: string;
    icon: ElementType;
    items: NavItemDefinition[];
}

const allGroups: NavGroup[] = [
    {
        label: 'Bookings',
        icon: CalendarDays,
        items: [
            { name: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
            { name: 'Rooms', path: '/admin/rooms', icon: BedDouble },
            { name: 'Reviews', path: '/admin/reviews', icon: Star },
            { name: 'Payment Recovery', path: '/admin/payment-recovery', icon: ShieldAlert },
        ],
    },
    {
        label: 'Content',
        icon: FileText,
        items: [
            { name: 'Pages', path: '/admin/pages', icon: FileSymlink, resource: 'page', action: 'read' },
            { name: 'Cafe Menu', path: '/admin/menu', icon: Coffee },
            { name: 'FAQ', path: '/admin/faq', icon: HelpCircle, resource: 'faq', action: 'read' },
            { name: 'Website Content', path: '/admin/content', icon: FileText },
        ],
    },
    {
        label: 'Media',
        icon: FolderOpen,
        items: [
            { name: 'Media', path: '/admin/media', icon: ImageIcon, resource: 'media', action: 'read' },
        ],
    },
    {
        label: 'Settings',
        icon: Settings,
        items: [
            { name: 'Navigation', path: '/admin/navigation', icon: Navigation, resource: 'navigation', action: 'read' },
            { name: 'Site Settings', path: '/admin/settings', icon: Settings, resource: 'setting', action: 'read' },
            { name: 'Revisions', path: '/admin/revisions', icon: History, resource: 'revision', action: 'read' },
        ],
    },
];

const dashboardItem: NavItemDefinition = { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard };

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [filteredGroups, setFilteredGroups] = useState<NavGroup[]>([]);
    const { can, profile } = usePermission();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth < 768) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobile) {
            const timer = setTimeout(() => setSidebarOpen(false), 0);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, isMobile]);

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const group of allGroups) {
            const isActive = group.items.some(i => location.pathname === i.path);
            if (isActive) initial[group.label] = true;
        }
        return initial;
    });

    const handleLogout = async () => {
        await adminLogout();
        navigate('/admin/login');
    };

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const filterGroups = useCallback(async () => {
        const result: NavGroup[] = [];
        for (const group of allGroups) {
            const visibleItems: NavItemDefinition[] = [];
            for (const item of group.items) {
                if (item.resource && item.action) {
                    const hasAccess = await can(item.resource as Resource, item.action as Action);
                    if (hasAccess) visibleItems.push(item);
                } else {
                    visibleItems.push(item);
                }
            }
            if (visibleItems.length > 0) {
                result.push({ ...group, items: visibleItems });
            }
        }
        setFilteredGroups(result);
    }, [can]);

    useEffect(() => {
        setTimeout(() => filterGroups(), 0);
    }, [filterGroups]);

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
                        {/* Dashboard - standalone */}
                        {(() => {
                            const Icon = dashboardItem.icon;
                            const isActive = location.pathname === dashboardItem.path;
                            return (
                                <Link
                                    key={dashboardItem.path}
                                    to={dashboardItem.path}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
                                        }`}
                                    onClick={() => isMobile && setSidebarOpen(false)}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{dashboardItem.name}</span>
                                </Link>
                            );
                        })()}

                        {/* Groups */}
                        {filteredGroups.map((group) => {
                            const GroupIcon = group.icon;
                            const isExpanded = expandedGroups[group.label] ?? false;
                            const isGroupActive = group.items.some(i => location.pathname === i.path);
                            return (
                                <div key={group.label} className="space-y-1">
                                    <button
                                        onClick={() => toggleGroup(group.label)}
                                        className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg transition-colors text-sm font-semibold uppercase tracking-wider ${isGroupActive
                                            ? 'text-primary'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <GroupIcon size={16} />
                                            <span>{group.label}</span>
                                        </div>
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'
                                                }`}
                                        />
                                    </button>
                                    {isExpanded && (
                                        <div className="ml-2 space-y-1 border-l-2 border-gray-100 pl-2">
                                            {group.items.map((item) => {
                                                const ItemIcon = item.icon;
                                                const isActive = location.pathname === item.path;
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${isActive
                                                            ? 'bg-primary/10 text-primary font-semibold'
                                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                            }`}
                                                        onClick={() => isMobile && setSidebarOpen(false)}
                                                    >
                                                        <ItemIcon size={16} />
                                                        <span>{item.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
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
            <div className="flex-1 flex flex-col min-w-0">
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
                <main className="flex-1 overflow-auto p-4 md:p-8">
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
