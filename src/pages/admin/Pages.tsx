import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    Send,
    X,
    FileText
} from 'lucide-react';
import {
    getPages,
    createPage,
    updatePage,
    deletePage,
    publishPage,
    getPageById,
    type SitePage
} from '../../services/pageService';
import { addRevision } from '../../services/revisionService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard, PermissionButton } from '../../components/common/PermissionGuard';

interface PageFormData {
    title: string;
    slug: string;
    seo_title: string;
    seo_description: string;
    page_content: string;
    status: SitePage['status'];
    author: string;
}

const emptyForm: PageFormData = {
    title: '',
    slug: '',
    seo_title: '',
    seo_description: '',
    page_content: '',
    status: 'draft',
    author: ''
};

const statusConfig: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
    review: { label: 'Review', classes: 'bg-yellow-100 text-yellow-700' },
    published: { label: 'Published', classes: 'bg-green-100 text-green-700' },
    archived: { label: 'Archived', classes: 'bg-red-100 text-red-700' },
};

const Pages = () => {
    const [pages, setPages] = useState<SitePage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<SitePage | null>(null);
    const [form, setForm] = useState<PageFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<SitePage | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => { loadPages(); }, []);

    const loadPages = async () => {
        setLoading(true);
        const { data } = await getPages();
        if (data) setPages(data);
        setLoading(false);
    };

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const openAddModal = () => {
        setEditingPage(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (page: SitePage) => {
        setEditingPage(page);
        setForm({
            title: page.title,
            slug: page.slug,
            seo_title: page.seo_title || '',
            seo_description: page.seo_description || '',
            page_content: page.page_content || '',
            status: page.status,
            author: page.author || ''
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<SitePage> = {
            ...form,
            seo_title: form.seo_title || form.title,
            seo_description: form.seo_description || form.title,
        };

        if (editingPage) {
            const { error } = await updatePage(editingPage.id, payload);
            if (error) { showToast(error); return; }
            await addRevision({ entity_type: 'site_pages', entity_id: editingPage.id, field_name: 'content', old_value: JSON.stringify(editingPage), new_value: JSON.stringify(payload), user_name: 'admin' });
        } else {
            const { data: newPage, error } = await createPage(payload);
            if (error) { showToast(error); return; }
            if (newPage) {
                await addRevision({ entity_type: 'site_pages', entity_id: newPage.id, field_name: 'created', old_value: '', new_value: JSON.stringify(newPage), user_name: 'admin' });
            }
        }

        setModalOpen(false);
        setEditingPage(null);
        setForm(emptyForm);
        loadPages();
        showToast(editingPage ? 'Page updated' : 'Page created');
    };

    const handlePublish = async (page: SitePage) => {
        const { error } = await publishPage(page.id);
        if (!error) {
            loadPages();
            showToast('Page published');
            await addRevision({ entity_type: 'site_pages', entity_id: page.id, field_name: 'status', old_value: page.status, new_value: 'published', user_name: 'admin' });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        const { error } = await deletePage(deleteTarget.id);
        if (error) { showToast(error); setDeleteTarget(null); return; }
        await addRevision({ entity_type: 'site_pages', entity_id: deleteTarget.id, field_name: 'deleted', old_value: JSON.stringify(deleteTarget), new_value: '', user_name: 'admin' });
        setDeleteTarget(null);
        loadPages();
        showToast('Page deleted');
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Pages</h1>
                    <p className="text-gray-500">Manage website pages and content</p>
                </div>
                <PermissionButton resource="page" action="create" onClick={openAddModal} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Create New Page</span>
                </PermissionButton>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-900">Title</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Slug</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Author</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Updated</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <Skeleton className={`h-4 ${j === 0 ? 'w-40' : j === 5 ? 'w-28' : 'w-24'}`} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : pages.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        <FileText className="mx-auto mb-3 text-gray-300" size={40} />
                                        No pages yet. Click "Create New Page" to get started.
                                    </td>
                                </tr>
                            ) : (
                                pages.map((page) => {
                                    const sc = statusConfig[page.status] || statusConfig.draft;
                                    return (
                                        <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{page.title}</div>
                                                {page.seo_title && (
                                                    <div className="text-xs text-gray-400 mt-0.5">{page.seo_title}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-sm text-gray-500 bg-gray-50 px-2 py-0.5 rounded">/{page.slug}</code>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sc.classes}`}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{page.author || '—'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(page.updated_at || page.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1">
                                                    {page.status !== 'published' && (
                                                        <PermissionGuard resource="page" action="publish">
                                                            <button
                                                                onClick={() => handlePublish(page)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Publish"
                                                            >
                                                                <Send size={16} />
                                                            </button>
                                                        </PermissionGuard>
                                                    )}
                                                    <PermissionGuard resource="page" action="update">
                                                        <button
                                                            onClick={() => openEditModal(page)}
                                                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </PermissionGuard>
                                                    <PermissionGuard resource="page" action="delete">
                                                        <button
                                                            onClick={() => setDeleteTarget(page)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </PermissionGuard>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">
                                {editingPage ? 'Edit Page' : 'Create New Page'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => {
                                        const title = e.target.value;
                                        setForm({
                                            ...form,
                                            title,
                                            slug: editingPage ? form.slug : slugify(title)
                                        });
                                    }}
                                    className="input w-full"
                                    placeholder="Page title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Slug</label>
                                <input
                                    type="text"
                                    required
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    className="input w-full font-mono text-sm"
                                    placeholder="page-slug"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">SEO Title</label>
                                    <input
                                        type="text"
                                        value={form.seo_title}
                                        onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                                        className="input w-full"
                                        placeholder="Meta title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Author</label>
                                    <input
                                        type="text"
                                        value={form.author}
                                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                                        className="input w-full"
                                        placeholder="Author name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">SEO Description</label>
                                <textarea
                                    rows={2}
                                    value={form.seo_description}
                                    onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                                    className="input w-full resize-none"
                                    placeholder="Meta description"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Content</label>
                                <textarea
                                    rows={6}
                                    value={form.page_content}
                                    onChange={(e) => setForm({ ...form, page_content: e.target.value })}
                                    className="input w-full resize-none font-mono text-sm"
                                    placeholder="Page content (HTML supported)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value as SitePage['status'] })}
                                    className="input w-full"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="review">Review</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="flex space-x-4 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">
                                    {editingPage ? 'Update Page' : 'Create Page'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Page"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
};

export default Pages;
