import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Plus,
    Trash2,
    Edit2,
    Image as ImageIcon,
    Upload,
    X,
    Loader2,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import {
    getAllRoomsForAdmin,
    createRoom,
    updateRoom,
    deleteRoom,
    addRoomImage,
    deleteRoomImage,
    updateRoomImageSortOrder,
    Room,
    RoomImage
} from '../../services/roomService';
import { uploadFile } from '../../services/storageService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminModal from '../../components/admin/AdminModal';
import FormSection from '../../components/admin/FormSection';
import Skeleton from '../../components/common/Skeleton';

interface SeasonalPriceRule {
    label: string;
    start: string;
    end: string;
    price: number;
}

const ITEMS_PER_PAGE = 9;

const Rooms = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [seasonalRules, setSeasonalRules] = useState<SeasonalPriceRule[]>([]);

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [pendingImages, setPendingImages] = useState<{ url: string; key: string }[]>([]);
    const [uploadingFileName, setUploadingFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image management modal
    const [imageManageRoom, setImageManageRoom] = useState<Room | null>(null);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState('');
    const [removeImageId, setRemoveImageId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_per_night: '',
        max_guests: '2',
        room_type: '',
        amenities: '',
        bed_type: '',
        policies: '',
        is_active: true,
        room_number: '',
        has_ac: false,
        floor_number: '',
        featured: false,
        discount_percent: '0',
        maintenance: false,
        availability_status: 'available',
        seasonal_pricing: ''
    });

    useEffect(() => {
        loadRooms();
    }, []);

    const totalPages = Math.ceil(rooms.length / ITEMS_PER_PAGE);
    const paginatedRooms = rooms.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const loadRooms = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data } = await getAllRoomsForAdmin();
            if (data) setRooms(data);
        } catch (err) {
            console.error('Failed to load rooms:', err);
            setLoadError('Failed to load. Please try again.');
        }
        setLoading(false);
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            description: room.description || '',
            price_per_night: room.price_per_night.toString(),
            max_guests: room.max_guests.toString(),
            room_type: room.room_type || '',
            amenities: room.amenities?.join(', ') || '',
            bed_type: room.bed_type || '',
            policies: room.policies || '',
            is_active: room.is_active,
            room_number: room.room_number || '',
            has_ac: room.has_ac || false,
            floor_number: room.floor_number ? room.floor_number.toString() : '',
            featured: room.featured || false,
            discount_percent: room.discount_percent ? room.discount_percent.toString() : '0',
            maintenance: room.maintenance || false,
            availability_status: room.availability_status || 'available',
            seasonal_pricing: ''
        });
        setSeasonalRules(
            Array.isArray(room.seasonal_pricing)
                ? (room.seasonal_pricing as SeasonalPriceRule[])
                : []
        );
        setPendingImages([]);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeleteTargetId(id);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        const { error } = await deleteRoom(deleteTargetId);
        if (error) {
            setUploadError(error || 'Failed to delete room. It may have active bookings or dependencies.');
            setTimeout(() => setUploadError(''), 5000);
        } else {
            loadRooms();
        }
        setDeleteTargetId(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadError('');
        if (files.length === 1) setUploadingFileName(files[0].name);

        try {
            for (const file of Array.from(files)) {
                if (!file.type.startsWith('image/')) {
                    setUploadError('Only image files are allowed');
                    continue;
                }
                if (file.size > 5 * 1024 * 1024) {
                    setUploadError('Image must be smaller than 5MB');
                    continue;
                }

                const { data, error } = await uploadFile(file, 'rooms');
                if (error) {
                    setUploadError(typeof error === 'string' ? error : 'Failed to upload image');
                } else if (data) {
                    setPendingImages(prev => [...prev, { url: data.url, key: data.key }]);
                }
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddImageToExistingRoom = async (roomId: string, file: File) => {
        setUploading(true);
        setUploadError('');
        try {
            const { data, error } = await uploadFile(file, 'rooms');
            if (error) throw error;
            if (data) {
                const room = rooms.find(r => r.id === roomId);
                await addRoomImage({
                    room_id: roomId,
                    url: data.url,
                    sort_order: (room?.room_images?.length || 0) + 1
                });
            }
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removePendingImage = (index: number) => {
        setPendingImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveExistingImage = async (imageId: string) => {
        setRemoveImageId(imageId);
    };

    const handleRemoveImageConfirm = async () => {
        if (!removeImageId) return;
        await deleteRoomImage(removeImageId);
        loadRooms();
        if (imageManageRoom) {
            setImageManageRoom(prev => prev ? ({
                ...prev,
                room_images: prev.room_images?.filter((img: RoomImage) => img.id !== removeImageId)
            }) : null);
        }
        if (editingRoom) {
            setEditingRoom(prev => prev ? ({
                ...prev,
                room_images: prev.room_images?.filter((img: RoomImage) => img.id !== removeImageId)
            }) : null);
        }
        setRemoveImageId(null);
    };

    const handleReorderImage = async (roomId: string, imageId: string, direction: 'up' | 'down') => {
        const room = rooms.find(r => r.id === roomId);
        if (!room || !room.room_images) return;

        const images = [...room.room_images];
        const index = images.findIndex(img => img.id === imageId);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            const temp = images[index];
            images[index] = images[index - 1];
            images[index - 1] = temp;
        } else if (direction === 'down' && index < images.length - 1) {
            const temp = images[index];
            images[index] = images[index + 1];
            images[index + 1] = temp;
        } else {
            return;
        }

        for (let i = 0; i < images.length; i++) {
            await updateRoomImageSortOrder(images[i].id, i + 1);
        }

        loadRooms();
        if (imageManageRoom) {
            const { data } = await getAllRoomsForAdmin();
            if (data) {
                const updated = data.find((r: Room) => r.id === roomId);
                if (updated) setImageManageRoom(updated);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadError('');

        for (const rule of seasonalRules) {
            if (!rule.label || !rule.start || !rule.end || rule.price <= 0) {
                setUploadError('Seasonal pricing rules need label, start/end dates, and a price > 0');
                setSubmitting(false);
                return;
            }
            if (rule.end <= rule.start) {
                setUploadError(`Seasonal rule "${rule.label}": end date must be after start date`);
                setSubmitting(false);
                return;
            }
        }

        const floorNum = formData.room_number
            ? Number(formData.room_number.charAt(0))
            : formData.floor_number
                ? Number(formData.floor_number)
                : undefined;

        const seasonalPricing = seasonalRules.length > 0 ? seasonalRules as unknown as Record<string, unknown> : undefined;

        const roomData = {
            ...formData,
            price_per_night: Number(formData.price_per_night),
            max_guests: Number(formData.max_guests),
            amenities: formData.amenities.split(',').map(s => s.trim()).filter(Boolean),
            floor_number: floorNum || undefined,
            discount_percent: formData.discount_percent ? Number(formData.discount_percent) : 0,
            seasonal_pricing: seasonalPricing
        };

        let savedRoom: Room | null = null;

        try {
            if (editingRoom) {
                const result = await updateRoom(editingRoom.id, roomData);
                if (result.error) throw new Error(result.error);
                savedRoom = result.data;
            } else {
                const result = await createRoom(roomData);
                if (result.error) throw new Error(result.error);
                savedRoom = result.data;
            }

            if (savedRoom && pendingImages.length > 0) {
                const startOrder = editingRoom
                    ? (editingRoom.room_images?.length || 0)
                    : 0;
                for (let i = 0; i < pendingImages.length; i++) {
                    const result = await addRoomImage({
                        room_id: savedRoom.id,
                        url: pendingImages[i].url,
                        sort_order: startOrder + i + 1
                    });
                    if (result.error) throw new Error(result.error);
                }
            }

            setIsModalOpen(false);
            setEditingRoom(null);
            setPendingImages([]);
            setFormData({ ...defaultFormData });
            setSeasonalRules([]);
            loadRooms();
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Failed to save room');
        } finally {
            setSubmitting(false);
        }
    };
    
    const defaultFormData = {
        name: '',
        description: '',
        price_per_night: '',
        max_guests: '2',
        room_type: '',
        amenities: '',
        bed_type: '',
        policies: '',
        is_active: true,
        room_number: '',
        has_ac: false,
        floor_number: '',
        featured: false,
        discount_percent: '0',
        maintenance: false,
        availability_status: 'available',
        seasonal_pricing: ''
    };

    return (
        <div className="space-y-6">
            <Helmet><title>Rooms | Highlands Cafe & Motel Inn</title></Helmet>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Rooms</h1>
                    <p className="text-gray-500">Manage room types, images, and details (Sorted A-Z)</p>
                </div>
                <button
                    onClick={() => {
                        setEditingRoom(null);
                        setPendingImages([]);
                        setUploadError('');
                        setSeasonalRules([]);
                        setFormData({ ...defaultFormData });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Room</span>
                </button>
            </div>

            {loadError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
                    <span>{loadError}</span>
                    <button onClick={loadRooms} className="text-red-700 font-semibold underline hover:no-underline ml-4">Retry</button>
                </div>
            )}

            {loading && rooms.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card">
                            <Skeleton className="aspect-video w-full rounded-lg mb-4" />
                            <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <Skeleton className="h-6 w-36" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-5 w-16 rounded" />
                                    <Skeleton className="h-5 w-12 rounded" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between">
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : rooms.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <ImageIcon className="mx-auto text-gray-400 mb-3" size={48} />
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No rooms yet</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first room.</p>
                    <button onClick={() => { setEditingRoom(null); setPendingImages([]); setUploadError(''); setSeasonalRules([]); setFormData({ ...defaultFormData }); setIsModalOpen(true); }} className="btn-primary">
                        Add Your First Room
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedRooms.map((room) => (
                        <div key={room.id} className="card relative group" tabIndex={0} onFocus={() => {}}>
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => {
                                        setImageManageRoom(room);
                                        setUploadError('');
                                    }}
                                    className="p-2 bg-white rounded-full shadow-md hover:text-blue-500 transition-colors"
                                    title="Manage Images & Order"
                                >
                                    <ImageIcon size={16} />
                                </button>
                                <button
                                    onClick={() => handleEdit(room)}
                                    className="p-2 bg-white rounded-full shadow-md hover:text-primary transition-colors"
                                    title="Edit Room Details"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(room.id)}
                                    className="p-2 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete Room"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                                {room.room_images && room.room_images.length > 0 ? (
                                    <img src={room.room_images[0].url} alt={room.name} loading="lazy" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon size={36} />
                                        <span className="text-xs mt-1">No image</span>
                                    </div>
                                )}
                                {room.room_images && room.room_images.length > 0 && (
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1">
                                        <ImageIcon size={10} />
                                        <span>{room.room_images.length} Photos</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-heading text-lg font-bold truncate pr-4">
                                    {room.name}
                                    {room.room_number && <span className="text-gray-400 font-normal text-sm ml-1">#{room.room_number}</span>}
                                </h3>
                                <div className="flex items-center space-x-1">
                                    {room.maintenance && (
                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-100 text-amber-700">Maint</span>
                                    )}
                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {room.is_active ? 'Active' : 'Hidden'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 mb-3 flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded">{room.room_type || 'Standard Room'}</span>
                                {room.has_ac !== undefined && (
                                    <span className={`px-2 py-0.5 rounded font-medium ${room.has_ac ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {room.has_ac ? 'AC' : 'Non-AC'}
                                    </span>
                                )}
                                {room.floor_number && <span className="text-gray-400">• Floor {room.floor_number}</span>}
                                {room.bed_type && <span className="text-gray-400">• {room.bed_type}</span>}
                                {room.featured && <span className="text-amber-500">★ Featured</span>}
                                {room.discount_percent != null && room.discount_percent > 0 && (
                                    <span className="text-green-600 font-bold">{room.discount_percent}% OFF</span>
                                )}
                            </div>

                            <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{room.description}</p>

                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div>
                                    <span className="text-primary font-bold text-lg">NPR {room.price_per_night.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-400 block -mt-1">per night</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-700 font-medium text-sm">Max {room.max_guests}</span>
                                    <span className="text-[10px] text-gray-400 block -mt-1">guests</span>
                                </div>
                            </div>
                        </div>
                    ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100 mt-6">
                            <p className="text-sm text-gray-500">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                                {Math.min(currentPage * ITEMS_PER_PAGE, rooms.length)} of{' '}
                                {rooms.length} rooms
                            </p>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                                            page === currentPage
                                                ? 'bg-primary text-white'
                                                : 'border border-gray-200 hover:bg-gray-50'
                                        }`}
                                        aria-label={`Page ${page}`}
                                        aria-current={page === currentPage ? 'page' : undefined}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                                    aria-label="Next page"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
    
                    {/* Create/Edit Room Modal */}
            <AdminModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRoom ? `Edit ${editingRoom.name}` : 'Create New Room'}
                icon={editingRoom ? <Edit2 size={20} /> : <Plus size={20} />}
                size="lg"
                footer={
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn-secondary w-full sm:w-auto px-6 py-2.5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="room-form"
                            disabled={submitting}
                            className="btn-primary w-full sm:w-auto px-8 py-2.5 min-w-[140px]"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center space-x-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving...</span>
                                </span>
                            ) : (
                                editingRoom ? 'Update Room' : 'Create Room'
                            )}
                        </button>
                    </div>
                }
            >
                <form id="room-form" onSubmit={handleSubmit} className="space-y-5">
                    <FormSection title="Room Identity">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Room Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full text-sm font-medium"
                                    placeholder="e.g. Mountain View Suite"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Room Number <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.room_number}
                                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                    className="input w-full text-sm font-medium"
                                    placeholder="e.g. 302"
                                />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Pricing & Capacity">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Price / Night (NPR) <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">NPR</span>
                                    <input
                                        type="number"
                                        required
                                        value={formData.price_per_night}
                                        onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                                        className="input w-full pl-12 text-sm font-bold text-primary"
                                        placeholder="2500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Max Guests</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.max_guests}
                                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                                    className="input w-full text-sm font-medium"
                                    placeholder="2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Room Type</label>
                                <select
                                    value={formData.room_type}
                                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                                    className="input w-full text-sm"
                                >
                                    <option value="">Select type...</option>
                                    <option value="Single Room">Single Room</option>
                                    <option value="Double Room">Double Room</option>
                                    <option value="Deluxe Room">Deluxe Room</option>
                                    <option value="Suite">Suite</option>
                                </select>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Room Features">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Bed Type</label>
                                <select
                                    value={formData.bed_type}
                                    onChange={(e) => setFormData({ ...formData, bed_type: e.target.value })}
                                    className="input w-full text-sm"
                                >
                                    <option value="">Select bed type...</option>
                                    <option value="Single Bed">Single Bed</option>
                                    <option value="Double Bed">Double Bed</option>
                                    <option value="Queen Bed">Queen Bed</option>
                                    <option value="King Bed">King Bed</option>
                                    <option value="Twin Bed">Twin Bed</option>
                                </select>
                            </div>
                            <label className="flex items-center space-x-3 bg-white px-4 py-3 rounded-xl border border-gray-100 cursor-pointer hover:border-primary/30 transition-colors">
                                <input
                                    type="checkbox"
                                    id="has_ac"
                                    checked={formData.has_ac}
                                    onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                                    className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded-lg cursor-pointer"
                                />
                                <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">
                                    Air Conditioning (AC)
                                </span>
                            </label>
                        </div>
                    </FormSection>

                    <FormSection title="Description & Amenities">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input w-full resize-none text-sm"
                                    placeholder="Tell guests about what makes this room special..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1.5 text-gray-700">Amenities <span className="text-gray-400 font-normal text-xs">(comma separated)</span></label>
                                <textarea
                                    rows={2}
                                    value={formData.amenities}
                                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                                    className="input w-full resize-none text-sm"
                                    placeholder="WiFi, AC, TV, Hot Water, Mini Bar..."
                                />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Room Status & Visibility">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-amber-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.featured}
                                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                        className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Featured Room</span>
                                </label>
                                <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-amber-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.maintenance}
                                        onChange={(e) => setFormData({ ...formData, maintenance: e.target.checked })}
                                        className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Under Maintenance</span>
                                </label>
                                <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-green-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Publicly Visible</span>
                                </label>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-600">Availability Status</label>
                                    <select
                                        value={formData.availability_status}
                                        onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                                        className="input w-full text-sm border-gray-200"
                                    >
                                        <option value="available">Available</option>
                                        <option value="occupied">Occupied</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="reserved">Reserved</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-gray-600">Discount (%)</label>
                                    <div className="relative">
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">% OFF</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.discount_percent}
                                            onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                                            className="input w-full pr-14 text-sm font-medium text-right"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection
                        title="Seasonal Pricing"
                        description="Override base price for specific date ranges"
                        action={
                            <button
                                type="button"
                                onClick={() => setSeasonalRules(prev => [...prev, { label: '', start: '', end: '', price: 0 }])}
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5"
                            >
                                <Plus size={14} />
                                <span>Add Rule</span>
                            </button>
                        }
                    >
                        {seasonalRules.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                No seasonal pricing rules added yet
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {seasonalRules.map((rule, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
                                        <input
                                            type="text"
                                            value={rule.label}
                                            onChange={(e) => {
                                                const next = [...seasonalRules];
                                                next[index] = { ...next[index], label: e.target.value };
                                                setSeasonalRules(next);
                                            }}
                                            className="input text-xs w-28 shrink-0"
                                            placeholder="Label"
                                        />
                                        <input
                                            type="date"
                                            value={rule.start}
                                            onChange={(e) => {
                                                const next = [...seasonalRules];
                                                next[index] = { ...next[index], start: e.target.value };
                                                setSeasonalRules(next);
                                            }}
                                            className="input text-xs w-36 shrink-0"
                                        />
                                        <span className="text-gray-300 text-xs shrink-0">→</span>
                                        <input
                                            type="date"
                                            value={rule.end}
                                            onChange={(e) => {
                                                const next = [...seasonalRules];
                                                next[index] = { ...next[index], end: e.target.value };
                                                setSeasonalRules(next);
                                            }}
                                            className="input text-xs w-36 shrink-0"
                                        />
                                        <div className="relative flex-1 min-w-[80px]">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">NPR</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={rule.price || ''}
                                                onChange={(e) => {
                                                    const next = [...seasonalRules];
                                                    next[index] = { ...next[index], price: Number(e.target.value) };
                                                    setSeasonalRules(next);
                                                }}
                                                className="input text-xs w-full pl-9"
                                                placeholder="Price"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSeasonalRules(prev => prev.filter((_, i) => i !== index))}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            title="Remove rule"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FormSection>

                    <FormSection title="Policies">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Specific Policies / Notes</label>
                            <textarea
                                rows={3}
                                value={formData.policies}
                                onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                                className="input w-full resize-none text-sm"
                                placeholder="No smoking, Check-in details for this specific room..."
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Room Photos">
                        {uploadError && (
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm mb-4 border border-red-100 flex items-center space-x-2">
                                <span>{uploadError}</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {editingRoom?.room_images?.map((img: RoomImage) => (
                                <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md group/img transition-all duration-200 hover:shadow-lg">
                                    <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveExistingImage(img.id)}
                                        className="absolute inset-0 bg-red-500/80 opacity-0 group-hover/img:opacity-100 transition-all duration-200 flex items-center justify-center text-white backdrop-blur-[1px]"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {pendingImages.map((img, index) => (
                                <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-md group/img transition-all duration-200 hover:shadow-lg">
                                    <div className="absolute top-1 left-1 bg-primary text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold z-10 shadow-sm">+</div>
                                    <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removePendingImage(index)}
                                        className="absolute inset-0 bg-gray-900/80 opacity-0 group-hover/img:opacity-100 transition-all duration-200 flex items-center justify-center text-white backdrop-blur-[1px]"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !uploading && fileInputRef.current?.click()}
                            className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 ${
                                uploading
                                    ? 'bg-primary/[0.03] border-primary/40'
                                    : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                            }`}
                        >
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent animate-shimmer" />
                                    <div className="relative flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 animate-upload-bounce">
                                            <Upload size={20} className="text-primary" />
                                        </div>
                                        <div className="w-full max-w-[160px] h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full w-2/5 bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full animate-progress-bar" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 mt-2">
                                            {uploadingFileName ? `Uploading ${uploadingFileName.substring(0, 20)}${uploadingFileName.length > 20 ? '...' : ''}` : 'Uploading photos...'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Upload size={20} className="text-primary" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-600">Click to upload photos</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">JPG, PNG • Max 5MB each</span>
                                </div>
                            )}
                        </div>
                    </FormSection>
                </form>
            </AdminModal>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* Image Management & Reordering Modal */}
            <AdminModal
                isOpen={imageManageRoom !== null}
                onClose={() => setImageManageRoom(null)}
                title="Manage Photos"
                icon={<ImageIcon size={20} />}
                subtitle={imageManageRoom ? `Reorder or remove images for ${imageManageRoom.name}` : ''}
                size="lg"
                footer={
                    <button
                        type="button"
                        onClick={() => setImageManageRoom(null)}
                        className="btn-primary w-full py-2.5"
                    >
                        Save Photo Order & Close
                    </button>
                }
            >
                {uploadError && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm mb-4 border border-red-100">
                        {uploadError}
                    </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 mb-5 min-h-[160px] border border-gray-100">
                    {imageManageRoom?.room_images && imageManageRoom.room_images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {imageManageRoom.room_images.map((img: RoomImage, index) => (
                                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group/img">
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                        <button
                                            onClick={() => handleReorderImage(imageManageRoom.id, img.id, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 bg-white rounded-full text-gray-700 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-700 transition-colors shadow-lg"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleReorderImage(imageManageRoom.id, img.id, 'down')}
                                            disabled={index === imageManageRoom.room_images!.length - 1}
                                            className="p-1.5 bg-white rounded-full text-gray-700 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-700 transition-colors shadow-lg"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRemoveExistingImage(img.id)}
                                            className="p-1.5 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors shadow-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                            <ImageIcon className="mb-3 opacity-20" size={64} />
                            <p className="text-sm font-medium">No images uploaded for this room yet.</p>
                        </div>
                    )}
                </div>

                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200 cursor-wait' : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                    }`}>
                    {uploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 size={32} className="animate-spin text-primary mb-3" />
                            <span className="font-bold text-gray-600">Uploading photos...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                <Upload size={24} className="text-primary" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Add New Photos</span>
                            <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Multiple Select Supported</span>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                            const files = e.target.files;
                            if (!files) return;
                            for (const file of Array.from(files)) {
                                await handleAddImageToExistingRoom(imageManageRoom!.id, file);
                            }
                            const { data } = await getAllRoomsForAdmin();
                            if (data) {
                                setRooms(data);
                                const updated = data.find((r: Room) => r.id === imageManageRoom!.id);
                                if (updated) setImageManageRoom(updated);
                            }
                            e.target.value = '';
                        }}
                    />
                </label>
            </AdminModal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteTargetId !== null}
                title="Delete Room"
                message="Are you sure you want to delete this room? This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                destructive
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTargetId(null)}
            />

            <ConfirmDialog
                isOpen={removeImageId !== null}
                title="Remove Image"
                message="Are you sure you want to remove this image?"
                confirmLabel="Remove"
                cancelLabel="Cancel"
                destructive
                onConfirm={handleRemoveImageConfirm}
                onCancel={() => setRemoveImageId(null)}
            />
        </div>
    );
};

export default Rooms;
