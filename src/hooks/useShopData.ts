// src/hooks/useShopData.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ordersDB, customersDB, servicesDB, expensesDB, sessionsDB, workersDB, analyticsDB } from "@/lib/db";
import type { Order, Customer, Service, Expense, CashSession, Worker, ShopUser } from "@/types/database";

// ── useShopUser ───────────────────────────────────────────────────────────────
export function useShopUser() {
  const [user, setUser]   = useState<ShopUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      supabase
        .from("shop_users")
        .select("*, shops(*)")
        .eq("auth_id", session.user.id)
        .single()
        .then(({ data }) => { setUser(data); setLoading(false); });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { setUser(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

// ── useOrders ─────────────────────────────────────────────────────────────────
export function useOrders(shopId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await ordersDB.getAll(shopId);
    setOrders(data as Order[]);
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    load();
    if (!shopId) return;

    // Realtime subscription
    const channel = ordersDB.subscribe(shopId, (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
    });
    return () => { supabase.removeChannel(channel); };
  }, [shopId, load]);

  return { orders, loading, refetch: load };
}

// ── useCustomers ──────────────────────────────────────────────────────────────
export function useCustomers(shopId: string | null) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await customersDB.getAll(shopId);
    setCustomers(data as Customer[]);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const save = async (customer: Partial<Customer> & { id: string }) => {
    await customersDB.save(shopId!, customer);
    await load();
  };

  const remove = async (id: string) => {
    await customersDB.delete(shopId!, id);
    setCustomers(p => p.filter(c => c.id !== id));
  };

  return { customers, loading, refetch: load, save, remove };
}

// ── useServices ───────────────────────────────────────────────────────────────
export function useServices(shopId: string | null) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await servicesDB.getAll(shopId);
    setServices(data);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const save = async (service: Partial<Service>) => {
    const saved = await servicesDB.save(shopId!, service);
    await load();
    return saved;
  };

  const remove = async (id: string) => {
    await servicesDB.delete(shopId!, id);
    setServices(p => p.filter(s => s.id !== id));
  };

  const toggle = async (id: string) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    await servicesDB.save(shopId!, { ...svc, active: !svc.active });
    setServices(p => p.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return { services, loading, refetch: load, save, remove, toggle };
}

// ── useExpenses ───────────────────────────────────────────────────────────────
export function useExpenses(shopId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const data = await expensesDB.getAll(shopId);
    setExpenses(data);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const save = async (expense: Partial<Expense>) => {
    const saved = await expensesDB.save(shopId!, expense);
    await load();
    return saved;
  };

  const remove = async (id: string) => {
    await expensesDB.delete(shopId!, id);
    setExpenses(p => p.filter(e => e.id !== id));
  };

  return { expenses, loading, refetch: load, save, remove };
}

// ── useCashSession ────────────────────────────────────────────────────────────
export function useCashSession(shopId: string | null) {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const [open, all] = await Promise.all([
      sessionsDB.getOpen(shopId),
      sessionsDB.getAll(shopId),
    ]);
    setActiveSession(open);
    setSessions(all);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const openDrawer = async (cashierName: string, amount: number, cashierId?: string) => {
    const sess = await sessionsDB.open(shopId!, cashierName, amount, cashierId);
    setActiveSession(sess);
    setSessions(p => [sess, ...p]);
    return sess;
  };

  const closeDrawer = async (note: string, salesTotal: number, ordersCount: number) => {
    if (!activeSession) return;
    await sessionsDB.close(activeSession.id, shopId!, note, salesTotal, ordersCount);
    setActiveSession(null);
    await load();
  };

  return { activeSession, sessions, loading, openDrawer, closeDrawer, refetch: load };
}

// ── useWorkers ────────────────────────────────────────────────────────────────
export function useWorkers(shopId: string | null) {
  const [workers, setWorkers] = useState<Worker[]>([]);

  const load = useCallback(async () => {
    if (!shopId) return;
    const data = await workersDB.getAll(shopId);
    setWorkers(data);
  }, [shopId]);

  useEffect(() => {
    load();
    if (!shopId) return;
    const channel = workersDB.subscribe(shopId, (updated) => {
      setWorkers(prev => prev.map(w => w.id === updated.id ? updated : w));
    });
    return () => { supabase.removeChannel(channel); };
  }, [shopId, load]);

  const setBusy = async (id: string, busy: boolean) => {
    await workersDB.setBusy(id, busy);
    setWorkers(p => p.map(w => w.id === id ? { ...w, busy } : w));
  };

  const save = async (worker: Partial<Worker>) => {
    const saved = await workersDB.save(shopId!, worker);
    await load();
    return saved;
  };

  return { workers, setBusy, save, refetch: load };
}

// ── useDashboard ──────────────────────────────────────────────────────────────
export function useDashboard(shopId: string | null) {
  const [stats, setStats] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    Promise.all([
      analyticsDB.getDashboard(shopId),
      analyticsDB.getLast7Days(shopId),
    ]).then(([dashStats, last7]) => {
      setStats(dashStats);
      setChart(last7);
      setLoading(false);
    });
  }, [shopId]);

  return { stats, chart, loading };
}
