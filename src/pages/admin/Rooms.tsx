import { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    Image as ImageIcon,
    Upload,
    X,
    Loader2,
    ChevronUp,
    ChevronDown
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
import { uploadImage } from '../../services/storageService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Skeleton from '../../components/common/Skeleton';

const Rooms = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [pendingImages, setPendingImages] = useState<{ url: string; key: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Image management modal
    const [imageManageRoom, setImageManageRoom] = useState<Room | null>(null);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_per_night: '',
        max_guests: '2',
        room_type: '',
        amenities: '',
        room_size: '',
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

    const loadRooms = async () => {
        setLoading(true);
        const { data } = await getAllRoomsForAdmin();
        if (data) {
            setRooms(data);
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
            room_size: room.room_size || '',
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
            seasonal_pricing: room.seasonal_pricing ? JSON.stringify(room.seasonal_pricing, null, 2) : ''
        });
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

                const { data, error } = await uploadImage(file, 'rooms');
                if (error) {
                    setUploadError(typeof error === 'string' ? error : 'Failed to upload image');
                } else if (data) {
                    if (editingRoom) {
                        await addRoomImage({
                            room_id: editingRoom.id,
                            image_url: data.url,
                            sort_order: (editingRoom.room_images?.length || 0) + 1
                        });
                    } else {
                        setPendingImages(prev => [...prev, { url: data.url, key: data.key }]);
                    }
                }
            }
            if (editingRoom) {
                const { data } = await getAllRoomsForAdmin();
                if (data) {
                    setRooms(data);
                    const updated = data.find(r => r.id === editingRoom.id);
                    if (updated) setEditingRoom(updated);
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
            const { data, error } = await uploadImage(file, 'rooms');
            if (error) throw error;
            if (data) {
                const room = rooms.find(r => r.id === roomId);
                await addRoomImage({
                    room_id: roomId,
                    image_url: data.url,
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
        if (confirm('Remove this image?')) {
            await deleteRoomImage(imageId);
            loadRooms();
            if (imageManageRoom) {
                setImageManageRoom(prev => prev ? ({
                    ...prev,
                    room_images: prev.room_images?.filter((img: RoomImage) => img.id !== imageId)
                }) : null);
            }
            if (editingRoom) {
                setEditingRoom(prev => prev ? ({
                    ...prev,
                    room_images: prev.room_images?.filter((img: RoomImage) => img.id !== imageId)
                }) : null);
            }
        }
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
        setLoading(true);
        setUploadError('');

        const floorNum = formData.room_number
            ? Number(formData.room_number.charAt(0))
            : formData.floor_number
                ? Number(formData.floor_number)
                : undefined;

        let seasonalPricing: Record<string, unknown> | undefined;
        if (formData.seasonal_pricing.trim()) {
            try {
                seasonalPricing = JSON.parse(formData.seasonal_pricing);
            } catch {
                setUploadError('Invalid Seasonal Pricing JSON');
                setLoading(false);
                return;
            }
        }

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

            if (savedRoom && !editingRoom && pendingImages.length > 0) {
                for (let i = 0; i < pendingImages.length; i++) {
                    const result = await addRoomImage({
                        room_id: savedRoom.id,
                        image_url: pendingImages[i].url,
                        sort_order: i + 1
                    });
                    if (result.error) throw new Error(result.error);
                }
            }

            setIsModalOpen(false);
            setEditingRoom(null);
            setPendingImages([]);
            setFormData({ ...defaultFormData });
            loadRooms();
        } catch (err: unknown) {
            setUploadError(err instanceof Error ? err.message : 'Failed to save room');
        } finally {
            setLoading(false);
        }
    };
    
    const defaultFormData = {
        name: '',
        description: '',
        price_per_night: '',
        max_guests: '2',
        room_type: '',
        amenities: '',
        room_size: '',
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
                        setFormData({ ...defaultFormData });
                        setIsModalOpen(true);
                    }}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus size={20} />
                    <span>Add Room</span>
                </button>
            </div>

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
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                        Add Your First Room
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <div key={room.id} className="card relative group">
                            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                                    <img src={room.room_images[0].image_url} alt={room.name} className="w-full h-full object-cover rounded-lg" />
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
                                {room.room_size && <span className="text-gray-400">• {room.room_size}</span>}
                                {room.bed_type && <span className="text-gray-400">• {room.bed_type}</span>}
                                {room.featured && <span className="text-amber-500">★ Featured</span>}
                                {room.discount_percent && room.discount_percent > 0 && (
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

            {/* Create/Edit Room Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2 border-b">
                            <h2 className="text-xl font-bold font-heading text-gray-900 flex items-center">
                                {editingRoom ? <Edit2 className="mr-2 text-primary" size={20} /> : <Plus className="mr-2 text-primary" size={24} />}
                                {editingRoom ? `Edit ${editingRoom.name}` : 'Create New Room'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-7">
                            {/* Room Name & Number (full width header) */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Room Identity
                                </h3>
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
                            </div>

                            {/* Pricing & Capacity */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Pricing & Capacity
                                </h3>
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
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Capacity</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                value={formData.max_guests}
                                                onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                                                className="input w-full pl-10 text-sm font-medium"
                                                placeholder="2"
                                            />
                                        </div>
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
                            </div>

                            {/* Room Features */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Room Features
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Room Size</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
                                            <input
                                                type="text"
                                                value={formData.room_size}
                                                onChange={(e) => setFormData({ ...formData, room_size: e.target.value })}
                                                className="input w-full pl-10 text-sm font-medium"
                                                placeholder="350 sq ft"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="flex items-center space-x-3 bg-white px-4 py-3 rounded-xl border border-gray-100 cursor-pointer hover:border-primary/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            id="has_ac"
                                            checked={formData.has_ac}
                                            onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                                            className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded-lg cursor-pointer"
                                        />
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-blue-500"><path d="M12 2v20M16 4l-4 4-4-4M16 20l-4-4-4 4"/></svg>
                                        <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">
                                            Air Conditioning (AC)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Description & Amenities */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Description & Amenities
                                </h3>
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
                            </div>

                            {/* Status & Flags */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Room Status & Flags
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-amber-300 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.featured}
                                                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                                className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-gray-300 rounded-lg cursor-pointer"
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                            <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Featured Room</span>
                                        </label>
                                        <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-amber-300 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.maintenance}
                                                onChange={(e) => setFormData({ ...formData, maintenance: e.target.checked })}
                                                className="w-5 h-5 text-amber-500 focus:ring-amber-500 border-gray-300 rounded-lg cursor-pointer"
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                            <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Under Maintenance</span>
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
                                    <div className="mt-4">
                                        <details className="group">
                                            <summary className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-primary transition-colors list-none flex items-center space-x-2">
                                                <svg className="w-4 h-4 group-open:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                                                <span>Seasonal Pricing (JSON)</span>
                                            </summary>
                                            <div className="mt-3">
                                                <label className="block text-xs text-gray-400 mb-1.5">Override base price for specific date ranges</label>
                                                <textarea
                                                    rows={4}
                                                    value={formData.seasonal_pricing}
                                                    onChange={(e) => setFormData({ ...formData, seasonal_pricing: e.target.value })}
                                                    className="input w-full font-mono text-xs resize-none"
                                                    placeholder='[{"label":"Peak Season","start":"2026-04-01","end":"2026-04-15","price":3500}]'
                                                />
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>

                            {/* Policies */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Policies
                                </h3>
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
                            </div>

                            {/* Photos */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                                    Room Photos
                                </h3>
                                {uploadError && (
                                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm mb-4 border border-red-100 flex items-center space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                        <span>{uploadError}</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {editingRoom?.room_images?.map((img: RoomImage) => (
                                        <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md group/img transition-all duration-200 hover:shadow-lg">
                                            <img src={img.image_url} alt="" className="w-full h-full object-cover" />
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
                                        <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/30 shadow-md group/img transition-all duration-200 hover:shadow-lg">
                                            <div className="absolute top-1 left-1 bg-primary text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold z-10 shadow-sm">+</div>
                                            <img src={img.url} alt="" className="w-full h-full object-cover" />
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
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                                        uploading
                                            ? 'bg-gray-50 border-gray-200'
                                            : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                                    }`}
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 size={28} className="animate-spin text-primary mb-2" />
                                            <span className="text-sm font-medium text-gray-500">Uploading photos...</span>
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
                            </div>

                            {/* Footer Actions */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t pt-6">
                                <label className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl border border-gray-100 cursor-pointer hover:border-green-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 text-green-500 focus:ring-green-500 border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-green-500"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    <span className="text-sm font-semibold text-gray-600 cursor-pointer select-none">Publicly Visible</span>
                                </label>
                                <div className="flex space-x-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 sm:flex-none btn-secondary px-6 py-2.5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 sm:flex-none btn-primary px-8 py-2.5 min-w-[140px]"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center space-x-2">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Saving...</span>
                                            </span>
                                        ) : (
                                            editingRoom ? 'Update Room' : 'Create Room'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
            {imageManageRoom && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold font-heading text-gray-900 leading-tight">
                                    Manage Photos
                                </h2>
                                <p className="text-xs text-gray-500">Reorder or remove images for {imageManageRoom.name}</p>
                            </div>
                            <button onClick={() => setImageManageRoom(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {uploadError && (
                            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm mb-4 border border-red-100">
                                {uploadError}
                            </div>
                        )}

                        <div className="bg-gray-50 rounded-2xl p-4 mb-6 min-h-[200px] border border-gray-100">
                            {imageManageRoom.room_images && imageManageRoom.room_images.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {imageManageRoom.room_images.map((img: RoomImage, index) => (
                                        <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group/img">
                                            <img src={img.image_url} alt="" className="w-full h-full object-cover" />

                                            {/* Overlay Controls */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                                <button
                                                    onClick={() => handleReorderImage(imageManageRoom.id, img.id, 'up')}
                                                    disabled={index === 0}
                                                    className={`p-1.5 bg-white rounded-full text-gray-700 hover:text-primary disabled:opacity-30 disabled:hover:text-gray-700 transition-colors shadow-lg`}
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

                                            {/* Sort Badge */}
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                                    <ImageIcon className="mb-3 opacity-20" size={64} />
                                    <p className="text-sm font-medium">No images uploaded for this room yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200 cursor-wait' : 'border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-inner'
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
                                            await handleAddImageToExistingRoom(imageManageRoom.id, file);
                                        }
                                        const { data } = await getAllRoomsForAdmin();
                                        if (data) {
                                            setRooms(data);
                                            const updated = data.find((r: Room) => r.id === imageManageRoom.id);
                                            if (updated) setImageManageRoom(updated);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </label>

                            <button onClick={() => setImageManageRoom(null)} className="btn-primary w-full py-3 text-lg font-bold">
                                Save Photo Order & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default Rooms;
