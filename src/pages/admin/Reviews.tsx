import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Star, Trash2, CheckCircle, XCircle, X, Plus, MessageSquare, Loader2 } from 'lucide-react';
import { getReviews, createReview, updateReview, deleteReview, type Review, type CreateReviewData } from '../../services/reviewService';
import { SkeletonTableRow } from '../../components/common/Skeleton';

const ReviewsAdmin = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CreateReviewData>({ guest_name: '', rating: 5, comment: '' });
    const [loadError, setLoadError] = useState('');

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

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review?')) return;
        const { error } = await deleteReview(id);
        if (!error) { load(); showToast('Review deleted'); }
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
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{toast}</div>
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
                                        <button onClick={() => handleDelete(review.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">New Review</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Guest Name</label>
                                <input type="text" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="input w-full" placeholder="Guest name" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Rating</label>
                                <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="input w-full">
                                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Comment</label>
                                <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="input w-full resize-none" rows={4} placeholder="Review comment" />
                            </div>
                            <button onClick={handleCreate} disabled={saving} className="btn-primary w-full flex items-center justify-center space-x-2">
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                <span>{saving ? 'Creating...' : 'Create Review'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsAdmin;
