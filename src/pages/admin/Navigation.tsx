import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Plus,
    Trash2,
    Edit2,
    Eye,
    EyeOff,
    Navigation as NavIcon
} from 'lucide-react';
import {
    getNavigation,
    addNavItem,
    updateNavItem,
    deleteNavItem,
    type NavItem
} from '../../services/navigationService';
import { addRevision } from '../../services/revisionService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard, PermissionButton } from '../../components/common/PermissionGuard';
import { usePermission } from '../../hooks/usePermission';

interface NavFormData {
    label: string;
    url: string;
    parent_id: string;
    sort_order: number;
    is_visible: boolean;
    target: string;
}

const emptyForm: NavFormData = {
    label: '',
    url: '',
    parent_id: '',
    sort_order: 0,
    is_visible: true,
    target: '_self'
};

const Navigation = () => {
    const { profile } = usePermission();
    const [items, setItems] = useState<NavItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NavItem | null>(null);
    const [form, setForm] = useState<NavFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<NavItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const { data } = await getNavigation();
            if (data) setItems(data);
        } catch (err) {
            console.error('Failed to load navigation:', err);
        }
        setLoading(false);
    };

    useEffect(() => { setTimeout(() => loadItems(), 0); }, []);

    const openAddModal = () => {
        setEditingItem(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (item: NavItem) => {
        setEditingItem(item);
        setForm({
            label: item.label,
            url: item.url,
            parent_id: item.parent_id || '',
            sort_order: item.sort_order,
            is_visible: item.is_visible,
            target: item.target
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload: Partial<NavItem> = {
            ...form,
            parent_id: form.parent_id || null
        };

        if (editingItem) {
            const { error } = await updateNavItem(editingItem.id, payload);
            if (error) { showToast(error); return; }
            await addRevision({ entity_type: 'site_navigation', entity_id: editingItem.id, field_name: 'content', old_value: JSON.stringify(editingItem), new_value: JSON.stringify(payload), user_name: profile?.display_name || 'admin' });
        } else {
            const { data, error } = await addNavItem(payload);
            if (error) { showToast(error); return; }
            if (data) {
                await addRevision({ entity_type: 'site_navigation', entity_id: data.id, field_name: 'created', old_value: '', new_value: JSON.stringify(data), user_name: profile?.display_name || 'admin' });
            }
        }

        setModalOpen(false);
        setEditingItem(null);
        setForm(emptyForm);
        loadItems();
        showToast(editingItem ? 'Navigation item updated' : 'Navigation item added');
        setSaving(false);
    };

    const handleToggleVisibility = async (item: NavItem) => {
        const newVisible = !item.is_visible;
        const { error } = await updateNavItem(item.id, { is_visible: newVisible });
        if (!error) {
            loadItems();
            await addRevision({ entity_type: 'site_navigation', entity_id: item.id, field_name: 'is_visible', old_value: String(item.is_visible), new_value: String(newVisible), user_name: profile?.display_name || 'admin' });
        } else {
            showToast(error);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        const { error } = await deleteNavItem(deleteTarget.id);
        if (error) { showToast(error); setDeleteTarget(null); return; }
        await addRevision({ entity_type: 'site_navigation', entity_id: deleteTarget.id, field_name: 'deleted', old_value: JSON.stringify(deleteTarget), new_value: '', user_name: profile?.display_name || 'admin' });
        setDeleteTarget(null);
        loadItems();
        showToast('Navigation item deleted');
    };

    const parentOptions = items.filter(i => !i.parent_id && i.id !== editingItem?.id);

    return (
        <div className="space-y-6">
            <Helmet><title>Navigation | Highlands Cafe & Motel Inn</title></Helmet>
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Navigation Manager</h1>
                    <p className="text-gray-500">Manage menu items and their order</p>
                </div>
                <PermissionButton resource="navigation" action="create" onClick={openAddModal} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Add New</span>
                </PermissionButton>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-900">Label</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">URL</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Parent</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Order</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Target</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Visible</th>
                                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }).map((_, j) => (
                                            <td key={j} className="px-6 py-4">
                                                <Skeleton className={`h-4 ${j === 0 ? 'w-32' : j === 6 ? 'w-20' : 'w-24'}`} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        <NavIcon size={36} className="mx-auto text-gray-300 mb-3" />
                                        No navigation items yet. Click "Add New" to create one.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.label}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.url}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {item.parent_id
                                                ? items.find(p => p.id === item.parent_id)?.label || '—'
                                                : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{item.sort_order}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                                                {item.target}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <PermissionGuard resource="navigation" action="update">
                                                <button
                                                    onClick={() => handleToggleVisibility(item)}
                                                    className={`p-1.5 rounded-lg transition-colors ${item.is_visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                    aria-label={item.is_visible ? 'Hide nav item' : 'Show nav item'}
                                                >
                                                    {item.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                            </PermissionGuard>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <PermissionGuard resource="navigation" action="update">
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                        aria-label="Edit nav item"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </PermissionGuard>
                                                <PermissionGuard resource="navigation" action="delete">
                                                    <button
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        aria-label="Delete nav item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </PermissionGuard>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? 'Edit Navigation Item' : 'Add Navigation Item'}
                size="md"
                footer={
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary w-full sm:w-auto flex-1 sm:flex-none">Cancel</button>
                        <button type="submit" form="nav-form" disabled={saving} className="btn-primary w-full sm:w-auto flex-1 sm:flex-none">
                            {saving ? (
                                <span className="flex items-center justify-center space-x-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Saving...</span>
                                </span>
                            ) : (editingItem ? 'Update' : 'Save')}
                        </button>
                    </div>
                }
            >
                <form id="nav-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Label</label>
                        <input
                            type="text"
                            required
                            value={form.label}
                            onChange={(e) => setForm({ ...form, label: e.target.value })}
                            className="input w-full"
                            placeholder="e.g. Home"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">URL</label>
                        <input
                            type="text"
                            required
                            value={form.url}
                            onChange={(e) => setForm({ ...form, url: e.target.value })}
                            className="input w-full"
                            placeholder="e.g. /about"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Parent Item</label>
                        <select
                            value={form.parent_id}
                            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                            className="input w-full"
                        >
                            <option value="">— No Parent (Top Level) —</option>
                            {parentOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Sort Order</label>
                            <input
                                type="number"
                                required
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Target</label>
                            <select
                                value={form.target}
                                onChange={(e) => setForm({ ...form, target: e.target.value })}
                                className="input w-full"
                            >
                                <option value="_self">Same Tab (_self)</option>
                                <option value="_blank">New Tab (_blank)</option>
                            </select>
                        </div>
                    </div>

                    <label className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_visible}
                            onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
                            className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded-lg"
                        />
                        <span className="text-sm font-semibold text-gray-700">Visible on website</span>
                    </label>
                </form>
            </AdminModal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Navigation Item"
                message={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
};

export default Navigation;
