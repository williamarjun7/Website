import { useEffect, useState, type ComponentType } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Menu, Image, HelpCircle,
    Settings, History, XCircle,
    CheckCircle, AlertTriangle, HardDrive,
    BookOpen, LayoutDashboard
} from 'lucide-react';
import { getPages, type SitePage } from '../../services/pageService';
import { getNavigation, type NavItem } from '../../services/navigationService';
import { getMediaFiles, type MediaFile } from '../../services/mediaService';
import { getFaqItems, type FaqItem } from '../../services/faqService';
import { getAllSettings, type SiteSetting } from '../../services/settingsService';
import { getAllRevisions, type ContentRevision } from '../../services/revisionService';
import type { Resource, Action } from '../../services/rbacService';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard } from '../../components/common/PermissionGuard';

interface CmsStats {
    pages: { total: number; published: number; draft: number; archived: number };
    navigation: { total: number; visible: number };
    media: { total: number; noAlt: number; totalSizeBytes: number };
    faq: { total: number; published: number; categories: number };
    settings: { total: number };
}

interface HealthItem {
    label: string;
    good: boolean;
    detail: string;
}

interface IntegrityItem {
    severity: 'error' | 'warning' | 'info';
    message: string;
    count: number;
    entityLabel: string;
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const timeAgo = (dateStr: string): string => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
};

const entityIcons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
    page: FileText,
    site_page: FileText,
    navigation: Menu,
    site_navigation: Menu,
    media: Image,
    media_file: Image,
    faq: HelpCircle,
    faq_item: HelpCircle,
    setting: Settings,
    site_setting: Settings,
};

const entityLabel: Record<string, string> = {
    page: 'Page',
    site_page: 'Page',
    navigation: 'Nav Item',
    site_navigation: 'Nav Item',
    media: 'Media',
    media_file: 'Media',
    faq: 'FAQ',
    faq_item: 'FAQ',
    setting: 'Setting',
    site_setting: 'Setting',
};

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    color: string;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<CmsStats | null>(null);
    const [revisions, setRevisions] = useState<ContentRevision[]>([]);
    const [healthItems, setHealthItems] = useState<HealthItem[]>([]);
    const [integrityItems, setIntegrityItems] = useState<IntegrityItem[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [pagesRes, navRes, mediaRes, faqRes, settingsRes, revisionsRes] = await Promise.all([
                getPages(),
                getNavigation(),
                getMediaFiles(),
                getFaqItems(),
                getAllSettings(),
                getAllRevisions(),
            ]);

            const pages: SitePage[] = pagesRes.data || [];
            const navItems: NavItem[] = navRes.data || [];
            const media: MediaFile[] = mediaRes.data || [];
            const faqs: FaqItem[] = faqRes.data || [];
            const settings: SiteSetting[] = settingsRes.data || [];
            const allRevisions: ContentRevision[] = revisionsRes.data || [];

            const pageStats = {
                total: pages.length,
                published: pages.filter((p) => p.status === 'published').length,
                draft: pages.filter((p) => p.status === 'draft').length,
                archived: pages.filter((p) => p.status === 'archived').length,
            };

            const faqCategories = new Set<string>();
            for (const f of faqs) {
                if (f.category) faqCategories.add(f.category);
            }

            setStats({
                pages: pageStats,
                navigation: {
                    total: navItems.length,
                    visible: navItems.filter((n) => n.is_visible).length,
                },
                media: {
                    total: media.length,
                    noAlt: media.filter((m) => !m.alt_text).length,
                    totalSizeBytes: media.reduce((sum, m) => sum + (m.size || 0), 0),
                },
                faq: {
                    total: faqs.length,
                    published: faqs.filter((f) => f.published).length,
                    categories: faqCategories.size,
                },
                settings: { total: settings.length },
            });

            setRevisions(allRevisions.slice(0, 10));

            const allEntityIds = new Set<string>();
            for (const p of pages) allEntityIds.add(p.id);
            for (const f of faqs) allEntityIds.add(f.id);
            for (const n of navItems) allEntityIds.add(n.id);
            for (const m of media) allEntityIds.add(m.id);
            for (const s of settings) allEntityIds.add(s.key);

            const orphanedRevisions = allRevisions.filter(
                (r) => r.entity_id && !allEntityIds.has(r.entity_id)
            );

            setHealthItems([
                {
                    label: 'Published Pages',
                    good: pageStats.total === 0 || pageStats.published / pageStats.total >= 0.5,
                    detail: `${pageStats.published} / ${pageStats.total} pages published`,
                },
                {
                    label: 'Published FAQs',
                    good: faqs.length === 0 || faqs.filter((f) => f.published).length / faqs.length >= 0.5,
                    detail: `${faqs.filter((f) => f.published).length} / ${faqs.length} FAQs published`,
                },
                {
                    label: 'Navigation Visibility',
                    good: navItems.length === 0 || navItems.filter((n) => n.is_visible).length / navItems.length >= 0.5,
                    detail: `${navItems.filter((n) => n.is_visible).length} / ${navItems.length} nav items visible`,
                },
                {
                    label: 'Media Accessibility',
                    good: media.length === 0 || media.filter((m) => !m.alt_text).length === 0,
                    detail: media.filter((m) => !m.alt_text).length > 0
                        ? `${media.filter((m) => !m.alt_text).length} items missing alt text`
                        : 'All media has alt text',
                },
                {
                    label: 'Orphaned Revisions',
                    good: orphanedRevisions.length === 0,
                    detail: orphanedRevisions.length > 0
                        ? `${orphanedRevisions.length} revisions reference deleted entities`
                        : 'No orphaned revisions',
                },
            ]);

            const integrityList: IntegrityItem[] = [];

            const emptyPages = pages.filter(
                (p) => p.status !== 'archived' && (!p.page_content || p.page_content.trim() === '')
            );
            if (emptyPages.length > 0) {
                integrityList.push({
                    severity: 'warning',
                    message: `${emptyPages.length} published/draft page(s) have empty content`,
                    count: emptyPages.length,
                    entityLabel: 'Pages',
                });
            }

            if (orphanedRevisions.length > 0) {
                integrityList.push({
                    severity: 'warning',
                    message: `${orphanedRevisions.length} revision(s) reference non-existent entities`,
                    count: orphanedRevisions.length,
                    entityLabel: 'Revisions',
                });
            }

            if (pageStats.archived > 0) {
                integrityList.push({
                    severity: 'info',
                    message: `${pageStats.archived} page(s) are archived`,
                    count: pageStats.archived,
                    entityLabel: 'Pages',
                });
            }

            if (integrityList.length === 0) {
                integrityList.push({
                    severity: 'info',
                    message: 'All CMS integrity checks passed',
                    count: 0,
                    entityLabel: 'System',
                });
            }

            setIntegrityItems(integrityList);
        } catch (err) {
            console.error('Error loading CMS dashboard:', err);
            setError('Failed to load CMS dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const quickActions: {
        label: string;
        icon: ComponentType<{ size?: number; className?: string }>;
        path: string;
        description: string;
        resource: Resource;
        action: Action;
    }[] = [
        { label: 'Manage Pages', icon: FileText, path: '/admin/pages', description: 'Create and edit site pages', resource: 'page', action: 'create' },
        { label: 'Manage Navigation', icon: Menu, path: '/admin/navigation', description: 'Organize site menus', resource: 'navigation', action: 'create' },
        { label: 'Media Library', icon: Image, path: '/admin/media', description: 'Upload and manage media', resource: 'media', action: 'create' },
        { label: 'Manage FAQ', icon: HelpCircle, path: '/admin/faq', description: 'Add and edit FAQ items', resource: 'faq', action: 'create' },
        { label: 'Site Settings', icon: Settings, path: '/admin/settings', description: 'Configure site settings', resource: 'setting', action: 'update' },
        { label: 'Content History', icon: History, path: '/admin/revisions', description: 'View revision history', resource: 'revision', action: 'read' },
    ];

    const StatCard = ({ title, value, subtitle, icon: Icon, color }: StatCardProps) => (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
                <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                    <Icon size={20} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </span>
                {subtitle && (
                    <span className="text-sm text-gray-500">{subtitle}</span>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-80 mt-2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-10 rounded-lg" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-5 w-40 mb-6" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center space-x-4 mb-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <Skeleton className="h-5 w-32 mb-6" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between mb-3">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertTriangle size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Dashboard</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                    onClick={loadDashboardData}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 font-medium transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Helmet><title>Dashboard | Highlands Cafe & Motel Inn</title></Helmet>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-heading">CMS Control Center</h1>
                    <p className="text-gray-500">Overview of your content management system</p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                >
                    <History size={14} />
                    Refresh
                </button>
            </div>

            {/* Section 1: Overview Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Pages"
                        value={stats.pages.total}
                        subtitle={`${stats.pages.published} published`}
                        icon={FileText}
                        color="bg-indigo-500"
                    />
                    <StatCard
                        title="Navigation Items"
                        value={stats.navigation.total}
                        subtitle={`${stats.navigation.visible} visible`}
                        icon={Menu}
                        color="bg-cyan-500"
                    />
                    <StatCard
                        title="Media Files"
                        value={stats.media.total}
                        subtitle={formatBytes(stats.media.totalSizeBytes)}
                        icon={Image}
                        color="bg-pink-500"
                    />
                    <StatCard
                        title="FAQ Items"
                        value={stats.faq.total}
                        subtitle={`${stats.faq.categories} categories`}
                        icon={HelpCircle}
                        color="bg-amber-500"
                    />
                    <StatCard
                        title="Site Settings"
                        value={stats.settings.total}
                        icon={Settings}
                        color="bg-slate-500"
                    />
                    <StatCard
                        title="Content Revisions"
                        value={revisions.length > 0 ? revisions.length : stats.pages.total + stats.faq.total}
                        subtitle="Total changes tracked"
                        icon={BookOpen}
                        color="bg-violet-500"
                    />
                </div>
            )}

            {/* Section 2: Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 font-heading mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {quickActions.map((action) => (
                        <PermissionGuard
                            key={action.path}
                            resource={action.resource}
                            action={action.action}
                            fallback={null}
                        >
                            <button
                                onClick={() => navigate(action.path)}
                                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                                    <action.icon size={20} className="text-gray-600 group-hover:text-primary transition-colors" />
                                </div>
                                <h3 className="font-semibold text-gray-900 text-sm mb-1">{action.label}</h3>
                                <p className="text-xs text-gray-500">{action.description}</p>
                            </button>
                        </PermissionGuard>
                    ))}
                </div>
            </div>

            {/* Section 3: Recent Activity + CMS Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="font-bold text-gray-900">Recent Activity</h2>
                        <button
                            onClick={() => navigate('/admin/revisions')}
                            className="text-sm text-primary hover:text-primary/80 font-medium"
                        >
                            View All
                        </button>
                    </div>
                    {revisions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <History size={32} className="mx-auto mb-2 text-gray-300" />
                            <p>No activity recorded yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {revisions.map((rev) => {
                                const Icon = entityIcons[rev.entity_type] || FileText;
                                const label = entityLabel[rev.entity_type] || rev.entity_type;
                                return (
                                    <div key={rev.id} className="p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <Icon size={18} className="text-gray-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">
                                                {label} updated
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {rev.user_name || 'System'} &middot; {rev.field_name}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {timeAgo(rev.created_at)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* CMS Health Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <LayoutDashboard size={20} className="text-gray-500" />
                        <h2 className="font-bold text-gray-900">CMS Health</h2>
                    </div>
                    <div className="space-y-4">
                        {healthItems.map((item) => (
                            <div key={item.label} className="flex items-start space-x-3">
                                {item.good ? (
                                    <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                    <p className="text-xs text-gray-500">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section 4: System Integrity Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <HardDrive size={20} className="text-gray-500" />
                    <h2 className="font-bold text-gray-900">System Integrity</h2>
                </div>
                {integrityItems.length === 0 ? (
                    <div className="flex items-center space-x-3 py-2">
                        <CheckCircle size={18} className="text-green-500" />
                        <span className="text-sm text-gray-600">All checks passed</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {integrityItems.map((item) => (
                            <div key={item.message} className="flex items-start space-x-3">
                                {item.severity === 'error' ? (
                                    <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                                ) : item.severity === 'warning' ? (
                                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <p className="text-sm text-gray-700">{item.message}</p>
                                    {item.count > 0 && (
                                        <span className="text-xs text-gray-400">{item.entityLabel}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
