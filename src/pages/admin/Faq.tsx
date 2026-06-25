import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Plus,
    Trash2,
    Edit2,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    X
} from 'lucide-react';
import {
    getFaqItems,
    addFaqItem,
    updateFaqItem,
    deleteFaqItem,
    type FaqItem
} from '../../services/faqService';
import { addRevision } from '../../services/revisionService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';
import { PermissionGuard, PermissionButton } from '../../components/common/PermissionGuard';

interface FaqFormData {
    question: string;
    answer: string;
    category: string;
    sort_order: number;
    published: boolean;
}

const emptyForm: FaqFormData = {
    question: '',
    answer: '',
    category: '',
    sort_order: 0,
    published: true
};

const Faq = () => {
    const [items, setItems] = useState<FaqItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FaqItem | null>(null);
    const [form, setForm] = useState<FaqFormData>(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const loadItems = async () => {
        setLoading(true);
        try {
            const { data } = await getFaqItems();
            if (data) {
                setItems(data);
                const cats = new Set(data.map(i => i.category));
                setExpandedCategories(new Set(cats));
            }
        } catch (err) {
            console.error('Failed to load FAQs:', err);
        }
        setLoading(false);
    };

    useEffect(() => { setTimeout(() => loadItems(), 0); }, []);

    const openAddModal = () => {
        setEditingItem(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (item: FaqItem) => {
        setEditingItem(item);
        setForm({
            question: item.question,
            answer: item.answer,
            category: item.category,
            sort_order: item.sort_order,
            published: item.published
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (editingItem) {
            const { error } = await updateFaqItem(editingItem.id, form);
            if (error) { showToast(error); return; }
            await addRevision({ entity_type: 'faq_items', entity_id: editingItem.id, field_name: 'content', old_value: JSON.stringify(editingItem), new_value: JSON.stringify(form), user_name: 'admin' });
        } else {
            const { data, error } = await addFaqItem(form);
            if (error) { showToast(error); return; }
            if (data) {
                await addRevision({ entity_type: 'faq_items', entity_id: data.id, field_name: 'created', old_value: '', new_value: JSON.stringify(data), user_name: 'admin' });
            }
        }
        setModalOpen(false);
        setEditingItem(null);
        setForm(emptyForm);
        loadItems();
        showToast(editingItem ? 'FAQ updated' : 'FAQ added');
        setSaving(false);
    };

    const handleTogglePublished = async (item: FaqItem) => {
        const newPublished = !item.published;
        const { error } = await updateFaqItem(item.id, { published: newPublished });
        if (!error) {
            loadItems();
            await addRevision({ entity_type: 'faq_items', entity_id: item.id, field_name: 'published', old_value: String(item.published), new_value: String(newPublished), user_name: 'admin' });
        } else {
            showToast(error);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        const { error } = await deleteFaqItem(deleteTarget.id);
        if (error) { showToast(error); setDeleteTarget(null); return; }
        await addRevision({ entity_type: 'faq_items', entity_id: deleteTarget.id, field_name: 'deleted', old_value: JSON.stringify(deleteTarget), new_value: '', user_name: 'admin' });
        setDeleteTarget(null);
        loadItems();
        showToast('FAQ deleted');
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const grouped = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            <Helmet><title>FAQ | Highlands Cafe & Motel Inn</title></Helmet>
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">FAQ Manager</h1>
                    <p className="text-gray-500">Manage frequently asked questions grouped by category</p>
                </div>
                <PermissionButton resource="faq" action="create" onClick={openAddModal} className="btn-primary flex items-center space-x-2">
                    <Plus size={20} />
                    <span>Add FAQ</span>
                </PermissionButton>
            </div>

            {loading ? (
                <div className="space-y-6">
                    {[1, 2, 3].map((cat) => (
                        <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                                <Skeleton className="h-6 w-40" />
                            </div>
                            <div className="divide-y divide-gray-100">
                                {[1, 2].map((item) => (
                                    <div key={item} className="px-6 py-4 space-y-2">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-5 w-16" />
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-400">No FAQ items yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([category, faqs]) => (
                        <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-100 transition-colors text-left"
                            >
                                <h2 className="text-lg font-bold font-heading text-gray-800">{category}</h2>
                                {expandedCategories.has(category) ? (
                                    <ChevronDown size={20} className="text-gray-400" />
                                ) : (
                                    <ChevronRight size={20} className="text-gray-400" />
                                )}
                            </button>

                            {expandedCategories.has(category) && (
                                <div className="divide-y divide-gray-100">
                                    {faqs.map((faq) => (
                                        <div key={faq.id} className="px-6 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                                                    {!faq.published && (
                                                        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">HIDDEN</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 line-clamp-2">{faq.answer}</p>
                                                <span className="text-xs text-gray-400 mt-1 inline-block">Order: {faq.sort_order}</span>
                                            </div>
                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                <PermissionGuard resource="faq" action="update">
                                                    <button
                                                        onClick={() => handleTogglePublished(faq)}
                                                        className={`p-1.5 rounded-lg transition-colors ${faq.published ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                        title={faq.published ? 'Click to hide' : 'Click to show'}
                                                    >
                                                        {faq.published ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    </button>
                                                </PermissionGuard>
                                                <PermissionGuard resource="faq" action="update">
                                                    <button
                                                        onClick={() => openEditModal(faq)}
                                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </PermissionGuard>
                                                <PermissionGuard resource="faq" action="delete">
                                                    <button
                                                        onClick={() => setDeleteTarget(faq)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </PermissionGuard>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">
                                {editingItem ? 'Edit FAQ' : 'Add FAQ'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Question</label>
                                <input
                                    type="text"
                                    required
                                    value={form.question}
                                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g. What time is check-in?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700">Answer</label>
                                <textarea
                                    rows={4}
                                    required
                                    value={form.answer}
                                    onChange={(e) => setForm({ ...form, answer: e.target.value })}
                                    className="input w-full resize-none"
                                    placeholder="Full answer text..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Category</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="input w-full"
                                        placeholder="e.g. Booking"
                                        list="faq-categories"
                                    />
                                    <datalist id="faq-categories">
                                        {[...new Set(items.map(i => i.category))].map(cat => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Sort Order</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.sort_order}
                                        onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.published}
                                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                                    className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded-lg"
                                />
                                <span className="text-sm font-semibold text-gray-700">Published</span>
                            </label>

                            <div className="flex space-x-4 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary flex-1">
                                    {saving ? 'Saving...' : (editingItem ? 'Update' : 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete FAQ"
                message={`Are you sure you want to delete "${deleteTarget?.question}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
};

export default Faq;
