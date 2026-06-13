import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Coffee, Clock, Menu as MenuIcon, ShoppingCart, Plus, Minus, X, Loader2, Check } from 'lucide-react';
import { getFullMenu } from '../services/menuService';
import { placeOrder } from '../services/orderService';
import menuImg from '../assets/menu.png';

interface MenuCategory {
    id: string;
    name: string;
    sort_order: number;
    items: MenuItem[];
}

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image?: string;
    available: boolean;
}

interface CartItem {
    menu_item_id: string;
    item_name: string;
    price: number;
    quantity: number;
}

const Cafe = () => {
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [orderResult, setOrderResult] = useState<{ order_number: string; total_amount: number } | null>(null);
    const [form, setForm] = useState({ customer_name: '', phone_number: '', address: '', area: '', order_notes: '' });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        let cancelled = false;
        getFullMenu().then(({ data }) => {
            if (!cancelled) {
                if (data && data.length > 0) {
                    setMenu(data);
                }
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const getFeaturedItems = () => {
        if (!menu.length) return [];
        const featuredCategories = menu.slice(0, 2);
        return featuredCategories.map(category => ({
            ...category,
            items: category.items.slice(0, 2)
        })).filter(category => category.items.length > 0);
    };

    const featuredItems = getFeaturedItems();

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.menu_item_id === item.id);
            if (existing) {
                return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { menu_item_id: item.id, item_name: item.name, price: Number(item.price), quantity: 1 }];
        });
    };

    const updateQuantity = (menu_item_id: string, delta: number) => {
        setCart(prev => {
            const updated = prev.map(c => {
                if (c.menu_item_id !== menu_item_id) return c;
                const qty = c.quantity + delta;
                return qty <= 0 ? null : { ...c, quantity: qty };
            }).filter(Boolean) as CartItem[];
            return updated;
        });
    };

    const removeFromCart = (menu_item_id: string) => {
        setCart(prev => prev.filter(c => c.menu_item_id !== menu_item_id));
    };

    const getItemQuantity = (itemId: string) => {
        return cart.find(c => c.menu_item_id === itemId)?.quantity || 0;
    };

    const handlePlaceOrder = async () => {
        setFormError('');
        if (!form.customer_name.trim() || form.customer_name.trim().length < 2) {
            setFormError('Name must be at least 2 characters');
            return;
        }
        if (!form.phone_number.trim()) {
            setFormError('Phone number is required');
            return;
        }
        if (!form.address.trim()) {
            setFormError('Address is required');
            return;
        }

        setPlacing(true);
        const { data, error } = await placeOrder({
            customer_name: form.customer_name.trim(),
            phone_number: form.phone_number.trim(),
            address: form.address.trim(),
            area: form.area.trim() || undefined,
            order_notes: form.order_notes.trim() || undefined,
            items: cart.map(c => ({
                menu_item_id: c.menu_item_id,
                item_name: c.item_name,
                quantity: c.quantity,
                price: c.price,
            })),
        });

        setPlacing(false);

        if (error) {
            setFormError(error);
            return;
        }

        if (data) {
            setOrderResult({ order_number: data.order.order_number, total_amount: data.order.total });
            setCart([]);
            setCartOpen(false);
            setShowCheckout(false);
            setForm({ customer_name: '', phone_number: '', address: '', area: '', order_notes: '' });
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-16">
            <Helmet>
                <title>Cafe Menu | Highlands Motel & Cafe</title>
                <meta name="description" content="Savor authentic local cuisine at our cafe in Surkhet." />
            </Helmet>

            <section className="relative h-96 mb-16">
                <img
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200"
                    alt="Highlands Cafe"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div className="container-custom text-white">
                        <Coffee size={48} className="mx-auto mb-4" />
                        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
                            Highlands Cafe
                        </h1>
                        <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8">
                            Savor authentic local cuisine with breathtaking mountain views
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <a
                                href="https://wa.me/9779763215874"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-amber-900 hover:bg-gray-100 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                <span>Call to Reserve</span>
                            </a>
                            <button
                                onClick={() => {
                                    const menuSection = document.getElementById('menu-section');
                                    menuSection?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center space-x-2 px-8 py-4 bg-transparent border-2 border-white text-white hover:bg-white hover:text-amber-900 rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                            >
                                <span>View Menu</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container-custom">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <p className="text-lg text-gray-600 leading-relaxed mb-6">
                        Our on-site cafe serves fresh, locally-sourced dishes prepared with love.
                        Start your day with a hearty breakfast or enjoy a relaxing meal while taking
                        in the stunning highland scenery.
                    </p>
                    <div className="flex items-center justify-center space-x-8 text-gray-700">
                        <div className="flex items-center space-x-2">
                            <Clock size={20} />
                            <span>Open Daily</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold">7:00 AM - 9:00 PM</span>
                        </div>
                    </div>
                </div>

                <div id="menu-section">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="spinner" />
                        </div>
                    ) : (
                        <div className="mb-12">
                            {menu.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 mb-8">Menu coming soon!</p>
                                </div>
                            ) : (
                                <>
                                    <h2 className="font-heading text-3xl font-bold mb-8 text-center">
                                        Featured Dishes
                                    </h2>
                                    <div className="space-y-12 max-w-4xl mx-auto">
                                        {featuredItems.length > 0 ? (
                                            featuredItems.map((category) => (
                                                <div key={category.id}>
                                                    <h3 className="font-heading text-xl font-semibold mb-4 text-center text-amber-800">
                                                        {category.name}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {category.items.map((item) => {
                                                            const qty = getItemQuantity(item.id);
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    className="flex items-start space-x-4 p-4 rounded-lg bg-amber-50/50 border border-amber-100"
                                                                >
{item.image && (
                                                                    <img
                                                                        src={item.image}
                                                                            alt={item.name}
                                                                            className="w-24 h-24 object-cover rounded-lg"
                                                                            onError={(e) => {
                                                                                const target = e.target as HTMLImageElement;
                                                                                target.style.display = 'none';
                                                                            }}
                                                                        />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <h4 className="font-heading text-lg font-semibold">
                                                                                {item.name}
                                                                            </h4>
                                                                            <span className="font-bold text-primary ml-4 whitespace-nowrap">
                                                                                NPR {item.price.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        {item.description && (
                                                                            <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                                                                {item.description}
                                                                            </p>
                                                                        )}
                                                                        <div className="flex items-center space-x-2">
                                                                            {qty > 0 ? (
                                                                                <div className="flex items-center border border-gray-300 rounded-md">
                                                                                    <button
                                                                                        onClick={() => updateQuantity(item.id, -1)}
                                                                                        className="p-1.5 text-gray-600 hover:text-gray-900"
                                                                                    >
                                                                                        <Minus size={14} />
                                                                                    </button>
                                                                                    <span className="px-3 text-sm font-medium min-w-[1.5rem] text-center">{qty}</span>
                                                                                    <button
                                                                                        onClick={() => updateQuantity(item.id, 1)}
                                                                                        className="p-1.5 text-gray-600 hover:text-gray-900"
                                                                                    >
                                                                                        <Plus size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => addToCart(item)}
                                                                                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                                                                                >
                                                                                    Add
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-600">
                                                <p>Featured dishes will be displayed here</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {menu.length > 0 && (
                                <>
                                    <h2 className="font-heading text-2xl font-bold mt-16 mb-8 text-center">
                                        Full Menu
                                    </h2>
                                    <div className="space-y-8 max-w-4xl mx-auto">
                                        {menu.map((category) => (
                                            <div key={category.id}>
                                                <h3 className="font-heading text-lg font-semibold mb-4 text-amber-800">
                                                    {category.name}
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {category.items.map((item) => {
                                                        const qty = getItemQuantity(item.id);
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                                                            >
                                                                <div className="min-w-0 flex-1 mr-3">
                                                                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                                                    <div className="text-sm text-gray-500">NPR {item.price.toLocaleString()}</div>
                                                                </div>
                                                                {qty > 0 ? (
                                                                    <div className="flex items-center border border-gray-300 rounded-md flex-shrink-0">
                                                                        <button
                                                                            onClick={() => updateQuantity(item.id, -1)}
                                                                            className="p-1 text-gray-600 hover:text-gray-900"
                                                                        >
                                                                            <Minus size={14} />
                                                                        </button>
                                                                        <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center">{qty}</span>
                                                                        <button
                                                                            onClick={() => updateQuantity(item.id, 1)}
                                                                            className="p-1 text-gray-600 hover:text-gray-900"
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => addToCart(item)}
                                                                        className="text-sm px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex-shrink-0"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="text-center mt-12">
                                <button
                                    onClick={() => window.open(menuImg, '_blank')}
                                    className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl font-heading font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
                                >
                                    <MenuIcon size={24} />
                                    <span>View Full Menu</span>
                                </button>
                                <p className="mt-3 text-amber-700 font-medium">
                                    Click to view our detailed menu card
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center bg-gradient-to-r from-amber-900 to-amber-800 text-white rounded-2xl p-12">
                    <h3 className="font-heading text-3xl font-bold mb-4">
                        Visit Us Today
                    </h3>
                    <p className="text-xl mb-6 text-white/90">
                        Experience the warmth of highland hospitality and authentic flavors
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <a
                            href="https://wa.me/9779763215874"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                        >
                            Call to Reserve
                        </a>
                        <a href="/booking" className="btn-secondary bg-white text-amber-900 hover:bg-gray-100">
                            Book a Room
                        </a>
                    </div>
                </div>
            </div>

            {/* Floating cart button */}
            {cartCount > 0 && !orderResult && (
                <button
                    onClick={() => setCartOpen(true)}
                    className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 bg-amber-800 text-white px-4 py-3 rounded-full shadow-lg hover:bg-amber-900"
                >
                    <ShoppingCart size={20} />
                    <span className="font-medium">{cartCount}</span>
                </button>
            )}

            {/* Cart sidebar */}
            {cartOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                                <ShoppingCart size={18} />
                                <span className="font-semibold">Your Order</span>
                                <span className="text-sm text-gray-500">({cartCount} items)</span>
                            </div>
                            <button onClick={() => setCartOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {cart.map((item) => (
                                <div key={item.menu_item_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="min-w-0 flex-1 mr-3">
                                        <div className="font-medium text-sm truncate">{item.item_name}</div>
                                        <div className="text-sm text-gray-500">NPR {item.price.toLocaleString()}</div>
                                    </div>
                                    <div className="flex items-center border border-gray-300 rounded-md flex-shrink-0">
                                        <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="p-1 text-gray-600 hover:text-gray-900"><Minus size={14} /></button>
                                        <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="p-1 text-gray-600 hover:text-gray-900"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.menu_item_id)} className="ml-2 p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                            <div className="flex justify-between font-semibold text-lg">
                                <span>Total</span>
                                <span>NPR {cartTotal.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={() => { setShowCheckout(true); setFormError(''); }}
                                className="w-full py-2.5 bg-amber-800 text-white rounded-lg hover:bg-amber-900 font-medium"
                            >
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout modal */}
            {showCheckout && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCheckout(false)} />
                    <div className="relative bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
                        <button onClick={() => setShowCheckout(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                        <h3 className="text-lg font-semibold mb-6">Order Details</h3>
                        {formError && (
                            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{formError}</div>
                        )}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={form.customer_name}
                                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    required
                                    value={form.phone_number}
                                    onChange={e => setForm({ ...form, phone_number: e.target.value })}
                                    className="input w-full"
                                    placeholder="98XXXXXXXX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    required
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    className="input w-full"
                                    placeholder="Room, table number or delivery address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Area (optional)</label>
                                <input
                                    type="text"
                                    value={form.area}
                                    onChange={e => setForm({ ...form, area: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g. Surkhet"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <textarea
                                    rows={2}
                                    value={form.order_notes}
                                    onChange={e => setForm({ ...form, order_notes: e.target.value })}
                                    className="input w-full resize-none"
                                    placeholder="Any special requests..."
                                />
                            </div>
                            <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span>NPR {cartTotal.toLocaleString()}</span>
                            </div>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={placing}
                                className="w-full py-2.5 bg-amber-800 text-white rounded-lg hover:bg-amber-900 font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                            >
                                {placing ? (
                                    <><Loader2 size={18} className="animate-spin" /><span>Placing Order...</span></>
                                ) : (
                                    <span>Confirm & Place Order</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order confirmation */}
            {orderResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOrderResult(null)} />
                    <div className="relative bg-white rounded-xl w-full max-w-sm p-8 shadow-xl text-center">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={24} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Order Placed!</h3>
                        <p className="text-gray-600 mb-1">Order #{orderResult.order_number}</p>
                        <p className="text-gray-500 text-sm mb-6">Total: NPR {orderResult.total_amount.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs mb-6">Pay on delivery when your order arrives.</p>
                        <button
                            onClick={() => setOrderResult(null)}
                            className="w-full py-2.5 bg-amber-800 text-white rounded-lg hover:bg-amber-900 font-medium"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cafe;
