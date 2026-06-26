import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Star, Trash2, CheckCircle, XCircle, Plus, MessageSquare } from 'lucide-react';
import { getReviews, createReview, updateReview, deleteReview, type Review, type CreateReviewData } from '../../services/reviewService';
import { SkeletonTableRow } from '../../components/common/Skeleton';
import AdminModal from '../../components/admin/AdminModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const ReviewsAdmin = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CreateReviewData>({ guest_name: '', rating: 5, comment: '' });
    const [loadError, setLoadError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const load = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data } = await getReviews();
            if (data) setReviews(data);
        } catch (err) {
            console.error('Failed to load reviews:', err);
            setLoadError('Failed to load. Please try again.');
        }
        setLoading(false);
    };

    useEffect(() => {
        let mounted = true;
        setTimeout(async () => {
            await load();
            if (!mounted) return;
        }, 0);
        return () => { mounted = false; };
    }, []);

    const handleApprove = async (id: string, approved: boolean) => {
        const { error } = await updateReview(id, { is_approved: approved } as Partial<Review>);
        if (!error) { load(); showToast(approved ? 'Review approved' : 'Review unapproved'); }
    };

    const handleFeatured = async (id: string, featured: boolean) => {
        const { error } = await updateReview(id, { is_featured: featured } as Partial<Review>);
        if (!error) { load(); showToast(featured ? 'Featured on homepage' : 'Removed from homepage'); }
    };

    const handleDelete = async (review: Review) => {
        setDeleteTarget(review);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { error } = await deleteReview(deleteTarget.id);
        if (!error) { load(); showToast('Review deleted'); }
        setDeleteTarget(null);
    };

    const handleCreate = async () => {
        if (!form.guest_name.trim() || !form.comment.trim()) return;
        setSaving(true);
        const { error } = await createReview(form);
        if (!error) { setShowModal(false); setForm({ guest_name: '', rating: 5, comment: '' }); load(); showToast('Review created'); }
        setSaving(false);
    };

    const renderStars = (rating: number) =>
        Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={14} className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        ));

    return (
        <div>
            <Helmet><title>Reviews | Highlands Cafe & Motel Inn</title></Helmet>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-heading">Guest Reviews</h1>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
                    <Plus size={18} />
                    <span>Add Review</span>
                </button>
            </div>

            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">{toast}</div>
            )}

            {loadError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
                    <span>{loadError}</span>
                    <button onClick={load} className="text-red-700 font-semibold underline hover:no-underline ml-4">Retry</button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Guest</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Comment</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Featured</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }, (_, i) => <SkeletonTableRow key={i} cols={6} />)
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-16 text-gray-400">No reviews yet</td></tr>
                            ) : reviews.map((review) => (
                                <tr key={review.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <MessageSquare size={14} className="text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-gray-900">{review.guest_name}</p>
                                                {review.guest_email && <p className="text-xs text-gray-400">{review.guest_email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4"><div className="flex space-x-0.5">{renderStars(review.rating)}</div></td>
                                    <td className="px-4 py-4 max-w-xs">
                                        <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => handleApprove(review.id, !review.is_approved)}
                                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${review.is_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                                        >
                                            {review.is_approved ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            <span>{review.is_approved ? 'Approved' : 'Pending'}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => handleFeatured(review.id, !review.is_featured)}
                                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${review.is_featured ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}
                                        >
                                            <Star size={12} />
                                            <span>{review.is_featured ? 'Featured' : 'Standard'}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button onClick={() => handleDelete(review)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AdminModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="New Review"
                icon={<Plus size={20} />}
                size="md"
                footer={
                    <button onClick={handleCreate} disabled={saving} className="btn-primary w-full">
                        {saving ? (
                            <span className="flex items-center justify-center space-x-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating...</span>
                            </span>
                        ) : 'Create Review'}
                    </button>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Guest Name</label>
                        <input type="text" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="input w-full" placeholder="Guest name" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Email</label>
                        <input type="email" value={form.guest_email || ''} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className="input w-full" placeholder="guest@email.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Rating</label>
                        <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="input w-full">
                            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Comment</label>
                        <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="input w-full resize-none" rows={4} placeholder="Review comment" />
                    </div>
                </div>
            </AdminModal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Review"
                message={`Are you sure you want to delete this review by "${deleteTarget?.guest_name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                destructive
            />
        </div>
    );
};

export default ReviewsAdmin;
