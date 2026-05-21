import { insforge, handleInsforgeError } from './insforge';

export interface PlaceOrderData {
  customer_name: string;
  phone_number: string;
  address: string;
  area?: string;
  order_notes?: string;
  items: { menu_item_id: string; item_name: string; quantity: number; price: number }[];
}

export interface CafeOrder {
  id: string;
  order_number: string;
  customer_name: string;
  phone_number: string;
  delivery_address: string;
  delivery_area: string | null;
  order_notes: string | null;
  total: number;
  status: string;
  order_type: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  qty: number;
  price: number;
}

export const placeOrder = async (orderData: PlaceOrderData) => {
  try {
    const { data, error } = await insforge.functions.invoke('place-cafe-order', {
      body: orderData
    });
    if (error) throw error;
    return { data: data as { order: CafeOrder; items: OrderItem[] }, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const getOrderByNumber = async (orderNumber: string) => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', orderNumber)
      .single();
    if (error) throw error;
    return { data: data as CafeOrder & { order_items: OrderItem[] }, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const getOrdersByPhone = async (phone: string) => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*)')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as (CafeOrder & { order_items: OrderItem[] })[], error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const getAllOrders = async () => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*)')
      .not('customer_name', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as (CafeOrder & { order_items: OrderItem[] })[], error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as CafeOrder, error: null };
  } catch (error) {
    return handleInsforgeError(error);
  }
};
