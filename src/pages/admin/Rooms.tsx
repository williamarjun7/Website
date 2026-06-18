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
        maintenance: false
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
            maintenance: room.maintenance || false
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

        const floorNum = formData.room_number
            ? Number(formData.room_number.charAt(0))
            : formData.floor_number
                ? Number(formData.floor_number)
                : undefined;

        const roomData = {
            ...formData,
            price_per_night: Number(formData.price_per_night),
            max_guests: Number(formData.max_guests),
            amenities: formData.amenities.split(',').map(s => s.trim()).filter(Boolean),
            floor_number: floorNum || undefined,
            discount_percent: formData.discount_percent ? Number(formData.discount_percent) : 0
        };

        let savedRoom: Room | null = null;

        if (editingRoom) {
            const result = await updateRoom(editingRoom.id, roomData);
            savedRoom = result.data;
        } else {
            const result = await createRoom(roomData);
            savedRoom = result.data;
        }

        if (savedRoom && !editingRoom && pendingImages.length > 0) {
            for (let i = 0; i < pendingImages.length; i++) {
                await addRoomImage({
                    room_id: savedRoom.id,
                    image_url: pendingImages[i].url,
                    sort_order: i + 1
                });
            }
        }

        setIsModalOpen(false);
        setEditingRoom(null);
        setPendingImages([]);
        setFormData({
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
            maintenance: false
        });
        loadRooms();
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
                        setFormData({
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
                            featured: false,
                            floor_number: '',
                            discount_percent: '0',
                            maintenance: false
                        });
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
                                <span className="bg-gray-100 px-2 py-0.5 rounded">{room.room_type || 'General'}</span>
                                {room.has_ac !== undefined && (
                                    <span className={`px-2 py-0.5 rounded font-medium ${room.has_ac ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {room.has_ac ? 'AC' : 'Non-AC'}
                                    </span>
                                )}
                                {room.floor_number && <span className="text-gray-400">• Floor {room.floor_number}</span>}
                                {room.room_size && <span className="text-gray-400">• {room.room_size}</span>}
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

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Basic Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Room Name *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="input w-full"
                                                placeholder="e.g. Room 302"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Room Number *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.room_number}
                                                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                                className="input w-full"
                                                placeholder="e.g. 302"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Room Type</label>
                                            <select
                                                value={formData.room_type}
                                                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                                                className="input w-full"
                                            >
                                                <option value="">Select type...</option>
                                                <option value="Single Room">Single Room</option>
                                                <option value="Double Room">Double Room</option>
                                                <option value="Deluxe Room">Deluxe Room</option>
                                                <option value="Suite">Suite</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Room Size (sq ft)</label>
                                            <input
                                                type="text"
                                                value={formData.room_size}
                                                onChange={(e) => setFormData({ ...formData, room_size: e.target.value })}
                                                className="input w-full"
                                                placeholder="350 sq ft"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Price / Night (NPR) *</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.price_per_night}
                                                onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                                                className="input w-full border-primary/20 focus:border-primary"
                                                placeholder="2500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-700">Capacity *</label>
                                            <input
                                                type="number"
                                                required
                                                value={formData.max_guests}
                                                onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                                                className="input w-full"
                                                placeholder="2"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                            <input
                                                type="checkbox"
                                                id="has_ac"
                                                checked={formData.has_ac}
                                                onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                                                className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded-lg cursor-pointer"
                                            />
                                            <label htmlFor="has_ac" className="text-sm font-bold text-gray-600 cursor-pointer">
                                                Air Conditioning (AC)
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Details & Amenities */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Features & Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Bed Type</label>
                                        <select
                                            value={formData.bed_type}
                                            onChange={(e) => setFormData({ ...formData, bed_type: e.target.value })}
                                            className="input w-full"
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
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Amenities (Comma separated)</label>
                                        <textarea
                                            rows={2}
                                            value={formData.amenities}
                                            onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                                            className="input w-full resize-none text-sm"
                                            placeholder="WiFi, AC, TV, Hot Water, Mini Bar..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="input w-full resize-none text-sm"
                                            placeholder="Tell guests about what makes this room special..."
                                        />
                                    </div>
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Room Status & Flags</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.featured}
                                                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                                                />
                                                <span className="text-sm font-medium text-gray-600">Featured Room</span>
                                            </label>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.maintenance}
                                                    onChange={(e) => setFormData({ ...formData, maintenance: e.target.checked })}
                                                    className="w-4 h-4 text-amber-500 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                                                />
                                                <span className="text-sm font-medium text-gray-600">Under Maintenance</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-gray-600">Discount (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.discount_percent}
                                                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                                                className="input w-full"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Policies & Images</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Specific Policies / Notes</label>
                                        <textarea
                                            rows={4}
                                            value={formData.policies}
                                            onChange={(e) => setFormData({ ...formData, policies: e.target.value })}
                                            className="input w-full resize-none text-xs"
                                            placeholder="No smoking, Check-in details for this specific room..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">Room Photos</label>

                                        {uploadError && (
                                            <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs mb-2 border border-red-100">
                                                {uploadError}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {/* Existing/Editing Photos */}
                                            {editingRoom?.room_images?.map((img: RoomImage) => (
                                                <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-100 group/img shadow-sm">
                                                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveExistingImage(img.id)}
                                                        className="absolute inset-0 bg-red-500/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {/* New/Pending Photos */}
                                            {pendingImages.map((img, index) => (
                                                <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden border border-primary/20 group/img shadow-sm">
                                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removePendingImage(index)}
                                                        className="absolute inset-0 bg-gray-900/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div
                                            role="button"
                                            onClick={() => !uploading && fileInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${uploading ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-primary hover:bg-primary/5 hover:shadow-inner'
                                                }`}
                                        >
                                            {uploading ? (
                                                <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Upload size={20} className="text-gray-400 mb-1" />
                                                    <span className="text-[10px] font-bold text-gray-500">Pick Images</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t pt-6">
                                <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-bold text-gray-600 cursor-pointer">
                                        Publicly Visible
                                    </label>
                                </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary min-w-[140px]"
                                    >
                                        {editingRoom ? 'Update Room' : 'Create Room'}
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
