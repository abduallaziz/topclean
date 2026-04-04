// src/types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: Shop;
        Insert: Omit<Shop, "id" | "created_at" | "updated_at">;
        Update: Partial<Shop>;
      };
      shop_users: {
        Row: ShopUser;
        Insert: Omit<ShopUser, "id" | "created_at">;
        Update: Partial<ShopUser>;
      };
      services: {
        Row: Service;
        Insert: Omit<Service, "id" | "created_at" | "updated_at">;
        Update: Partial<Service>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, "created_at" | "updated_at">;
        Update: Partial<Customer>;
      };
      customer_vehicles: {
        Row: CustomerVehicle;
        Insert: Omit<CustomerVehicle, "id" | "created_at">;
        Update: Partial<CustomerVehicle>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "created_at">;
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id">;
        Update: Partial<OrderItem>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, "id" | "created_at">;
        Update: Partial<Expense>;
      };
      refunds: {
        Row: Refund;
        Insert: Omit<Refund, "id" | "created_at">;
        Update: Partial<Refund>;
      };
      cash_sessions: {
        Row: CashSession;
        Insert: Omit<CashSession, "id" | "opened_at">;
        Update: Partial<CashSession>;
      };
      workers: {
        Row: Worker;
        Insert: Omit<Worker, "id" | "created_at">;
        Update: Partial<Worker>;
      };
    };
    Functions: {
      get_my_shop_id: { Returns: string };
      get_my_role: { Returns: string };
      next_order_id: { Args: { p_shop_id: string }; Returns: string };
      next_customer_id: { Args: { p_shop_id: string }; Returns: string };
    };
  };
}

// ─── Entity Types ─────────────────────────────────────────────────────────────
export interface Shop {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  tax_rate: number;
  logo_url?: string;
  plan: "free" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface ShopUser {
  id: string;
  auth_id: string;
  shop_id: string;
  name: string;
  username?: string;
  role: "admin" | "supervisor" | "cashier";
  active: boolean;
  created_at: string;
  shops?: Shop;
}

export interface Service {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  icon: string;
  color: string;
  category: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  total_orders: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
  updated_at: string;
  vehicles?: CustomerVehicle[];
}

export interface CustomerVehicle {
  id: string;
  customer_id: string;
  shop_id: string;
  plate: string;
  car_type: string;
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  car_plate: string;
  car_type?: string;
  payment: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashier_id?: string;
  cashier_name?: string;
  session_id?: string;
  status: "completed" | "refunded" | "cancelled";
  notes?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  shop_id: string;
  service_id?: string;
  service_name: string;
  service_icon?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  shop_id: string;
  title: string;
  amount: number;
  category: string;
  note?: string;
  added_by?: string;
  expense_date: string;
  created_at: string;
}

export interface Refund {
  id: string;
  shop_id: string;
  order_id?: string;
  reason: string;
  amount: number;
  processed_by?: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  shop_id: string;
  cashier_id?: string;
  cashier_name?: string;
  open_amount: number;
  close_amount?: number;
  sales_total: number;
  orders_count: number;
  note?: string;
  opened_at: string;
  closed_at?: string;
  status: "open" | "closed";
}

export interface Worker {
  id: string;
  shop_id: string;
  name: string;
  busy: boolean;
  done_count: number;
  active: boolean;
  created_at: string;
}

// ─── App State Types ──────────────────────────────────────────────────────────
export interface CartItem extends Service {
  qty: number;
}

export interface CheckoutData {
  cart: CartItem[];
  discount: number;
  payMethod: string;
  customerName: string;
  customerPhone: string;
  carPlate: string;
  carType: string;
}
