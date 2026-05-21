import { useState, useEffect } from 'react';
import { getAllOrders, updateOrderStatus } from '../../services/orderService';
import { Clock, Search } from 'lucide-react';

const ORDER_STATUSES = ['Order Placed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];

const CafeOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        const { data } = await getAllOrders();
        if (data) setOrders(data);
        setLoading(false);
    };

    const handleStatusChange = async (id: string, status: string) => {
        await updateOrderStatus(id, status);
        loadOrders();
    };

    const filtered = orders.filter(o =>
        !search || 
        o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.phone_number?.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Cafe Orders</h1>
                    <p className="text-gray-500">Manage incoming food orders</p>
                </div>
                <button onClick={loadOrders} className="btn-secondary text-sm">
                    Refresh
                </button>
            </div>

            <div className="relative max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search orders..."
                    className="input w-full pl-9"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    {search ? 'No orders match your search.' : 'No orders yet.'}
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((order) => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="font-semibold text-gray-900">{order.order_number}</div>
                                    <div className="text-sm text-gray-500">{order.customer_name} &middot; {order.phone_number}</div>
                                    <div className="text-sm text-gray-400">{order.delivery_address}{order.delivery_area ? `, ${order.delivery_area}` : ''}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">NPR {Number(order.total).toLocaleString()}</div>
                                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-1">
                                        <Clock size={12} />
                                        <span>{new Date(order.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {order.order_items && order.order_items.length > 0 && (
                                <div className="mb-3 text-sm text-gray-600 space-y-1">
                                    {order.order_items.map((item: any) => (
                                        <div key={item.id} className="flex justify-between">
                                            <span>{item.name} x{item.qty}</span>
                                            <span className="text-gray-400">NPR {(Number(item.price) * item.qty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {order.order_notes && (
                                <div className="mb-3 text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded">
                                    {order.order_notes}
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <select
                                    value={order.status}
                                    onChange={e => handleStatusChange(order.id, e.target.value)}
                                    className="text-sm border border-gray-300 rounded-md px-2 py-1.5"
                                >
                                    {ORDER_STATUSES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                    order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    order.status === 'Preparing' ? 'bg-blue-100 text-blue-700' :
                                    order.status === 'Ready' ? 'bg-amber-100 text-amber-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CafeOrders;
