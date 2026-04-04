// src/lib/db.ts
// ── طبقة الوصول للبيانات — كل العمليات هنا ──────────────────────────────────
import { supabase } from "./supabase";
import type {
  Order, OrderItem, Customer, CustomerVehicle,
  Service, Expense, CashSession, Worker, CheckoutData
} from "@/types/database";

// ─── Orders ───────────────────────────────────────────────────────────────────
export const ordersDB = {
  async getAll(shopId: string, filter?: { from?: string; to?: string }) {
    let q = supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (filter?.from) q = q.gte("created_at", filter.from);
    if (filter?.to)   q = q.lte("created_at", filter.to);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async getToday(shopId: string) {
    const today = new Date().toISOString().split("T")[0];
    return this.getAll(shopId, {
      from: `${today}T00:00:00`,
      to:   `${today}T23:59:59`,
    });
  },

  async create(shopId: string, checkout: CheckoutData, cashierName: string, cashierId?: string, sessionId?: string) {
    // 1. Get next order ID
    const { data: idData } = await supabase
      .rpc("next_order_id", { p_shop_id: shopId });
    const orderId = idData as string;

    // 2. Calculate totals
    const subtotal    = checkout.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discountAmt = Math.min(checkout.discount || 0, subtotal);
    const taxAmt      = ((subtotal - discountAmt) * 15) / 100; // tax from shop settings
    const total       = subtotal - discountAmt + taxAmt;

    // 3. Insert order
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      shop_id: shopId,
      customer_id: checkout.carPlate ? undefined : undefined,
      customer_name: checkout.customerName || null,
      customer_phone: checkout.customerPhone || null,
      car_plate: checkout.carPlate.toUpperCase(),
      car_type: checkout.carType,
      payment: checkout.payMethod,
      subtotal,
      discount: discountAmt,
      tax: taxAmt,
      total,
      cashier_name: cashierName,
      cashier_id: cashierId || null,
      session_id: sessionId || null,
      status: "completed",
    });
    if (orderErr) throw orderErr;

    // 4. Insert order items
    const items = checkout.cart.map(i => ({
      order_id: orderId,
      shop_id: shopId,
      service_id: i.id,
      service_name: i.name,
      service_icon: i.icon,
      price: i.price,
      quantity: i.qty,
      subtotal: i.price * i.qty,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) throw itemsErr;

    return { orderId, total };
  },

  // Subscribe to realtime new orders
  subscribe(shopId: string, onNew: (order: Order) => void) {
    return supabase
      .channel(`orders:${shopId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `shop_id=eq.${shopId}`,
      }, payload => onNew(payload.new as Order))
      .subscribe();
  },
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersDB = {
  async getAll(shopId: string) {
    const { data, error } = await supabase
      .from("customers")
      .select("*, vehicles:customer_vehicles(*)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async findByPhone(shopId: string, phone: string) {
    const { data } = await supabase
      .from("customers")
      .select("*, vehicles:customer_vehicles(*)")
      .eq("shop_id", shopId)
      .eq("phone", phone)
      .single();
    return data;
  },

  async findByPlate(shopId: string, plate: string) {
    const { data } = await supabase
      .from("customer_vehicles")
      .select("*, customer:customers(*)")
      .eq("shop_id", shopId)
      .ilike("plate", plate)
      .single();
    return data?.customer ?? null;
  },

  async createOrUpdate(shopId: string, info: {
    name?: string; phone?: string; plate: string; carType: string;
  }) {
    // Try find by phone
    let customer = info.phone ? await this.findByPhone(shopId, info.phone) : null;

    if (!customer) {
      // Create new customer
      const { data: idData } = await supabase
        .rpc("next_customer_id", { p_shop_id: shopId });
      const custId = idData as string;

      const { data, error } = await supabase
        .from("customers")
        .insert({
          id: custId,
          shop_id: shopId,
          name: info.name || `عميل ${custId}`,
          phone: info.phone || null,
        })
        .select()
        .single();
      if (error) throw error;
      customer = data;
    }

    // Add vehicle if not exists
    if (info.plate) {
      await supabase
        .from("customer_vehicles")
        .upsert({
          customer_id: customer.id,
          shop_id: shopId,
          plate: info.plate.toUpperCase(),
          car_type: info.carType,
        }, { onConflict: "customer_id,shop_id,plate" });
    }

    return customer;
  },

  async save(shopId: string, customer: Partial<Customer> & { id: string }) {
    const { error } = await supabase
      .from("customers")
      .upsert({ ...customer, shop_id: shopId });
    if (error) throw error;
  },

  async delete(shopId: string, id: string) {
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  },
};

// ─── Services ─────────────────────────────────────────────────────────────────
export const servicesDB = {
  async getAll(shopId: string) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async save(shopId: string, service: Partial<Service>) {
    const { data, error } = await supabase
      .from("services")
      .upsert({ ...service, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(shopId: string, id: string) {
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  },
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expensesDB = {
  async getAll(shopId: string) {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async save(shopId: string, expense: Partial<Expense>) {
    const { data, error } = await supabase
      .from("expenses")
      .upsert({ ...expense, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(shopId: string, id: string) {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  },
};

// ─── Cash Sessions ────────────────────────────────────────────────────────────
export const sessionsDB = {
  async getOpen(shopId: string) {
    const { data } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .single();
    return data;
  },

  async getAll(shopId: string) {
    const { data } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("shop_id", shopId)
      .order("opened_at", { ascending: false })
      .limit(20);
    return data ?? [];
  },

  async open(shopId: string, cashierName: string, openAmount: number, cashierId?: string) {
    const { data, error } = await supabase
      .from("cash_sessions")
      .insert({
        shop_id: shopId,
        cashier_name: cashierName,
        cashier_id: cashierId || null,
        open_amount: openAmount,
        status: "open",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async close(sessionId: string, shopId: string, note: string, salesTotal: number, ordersCount: number) {
    const { error } = await supabase
      .from("cash_sessions")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        note,
        sales_total: salesTotal,
        orders_count: ordersCount,
        close_amount: salesTotal,
      })
      .eq("id", sessionId)
      .eq("shop_id", shopId);
    if (error) throw error;
  },
};

// ─── Workers ──────────────────────────────────────────────────────────────────
export const workersDB = {
  async getAll(shopId: string) {
    const { data } = await supabase
      .from("workers")
      .select("*")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("created_at");
    return data ?? [];
  },

  async setBusy(id: string, busy: boolean) {
    await supabase.from("workers").update({ busy }).eq("id", id);
  },

  async incrementDone(id: string) {
    await supabase.rpc("increment", { table: "workers", id, field: "done_count" });
  },

  async save(shopId: string, worker: Partial<Worker>) {
    const { data, error } = await supabase
      .from("workers")
      .upsert({ ...worker, shop_id: shopId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Realtime
  subscribe(shopId: string, onChange: (worker: Worker) => void) {
    return supabase
      .channel(`workers:${shopId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "workers",
        filter: `shop_id=eq.${shopId}`,
      }, payload => onChange(payload.new as Worker))
      .subscribe();
  },
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsDB = {
  async getDashboard(shopId: string) {
    const today = new Date().toISOString().split("T")[0];

    const [todayOrders, totalOrders, totalExpenses, customersCount] = await Promise.all([
      supabase
        .from("orders")
        .select("total, payment")
        .eq("shop_id", shopId)
        .gte("created_at", `${today}T00:00:00`)
        .eq("status", "completed"),

      supabase
        .from("orders")
        .select("total", { count: "exact" })
        .eq("shop_id", shopId)
        .eq("status", "completed"),

      supabase
        .from("expenses")
        .select("amount")
        .eq("shop_id", shopId),

      supabase
        .from("customers")
        .select("id", { count: "exact" })
        .eq("shop_id", shopId),
    ]);

    const todayRevenue  = (todayOrders.data ?? []).reduce((s, o) => s + o.total, 0);
    const totalRevenue  = (totalOrders.data ?? []).reduce((s, o) => s + o.total, 0);
    const totalExp      = (totalExpenses.data ?? []).reduce((s, e) => s + e.amount, 0);

    return {
      todayRevenue,
      todayOrdersCount: todayOrders.data?.length ?? 0,
      totalRevenue,
      totalOrdersCount: totalOrders.count ?? 0,
      totalExpenses: totalExp,
      netProfit: totalRevenue - totalExp,
      customersCount: customersCount.count ?? 0,
    };
  },

  // Last 7 days data for chart
  async getLast7Days(shopId: string) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const results = await Promise.all(
      days.map(async day => {
        const [orders, expenses] = await Promise.all([
          supabase.from("orders").select("total").eq("shop_id", shopId).gte("created_at", `${day}T00:00:00`).lte("created_at", `${day}T23:59:59`),
          supabase.from("expenses").select("amount").eq("shop_id", shopId).eq("expense_date", day),
        ]);
        return {
          day,
          rev: (orders.data ?? []).reduce((s, o) => s + o.total, 0),
          exp: (expenses.data ?? []).reduce((s, e) => s + e.amount, 0),
        };
      })
    );
    return results;
  },
};
