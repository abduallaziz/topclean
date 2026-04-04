// src/app/api/checkout/route.ts
// ── POST /api/checkout ── إصدار فاتورة جديدة ────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { ordersDB, customersDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
    );
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    // Get shop user info
    const { data: shopUser } = await supabase
      .from("shop_users")
      .select("*, shops(*)")
      .eq("auth_id", user.id)
      .single();
    if (!shopUser) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    const body = await req.json();
    const { cart, discount, payMethod, customerName, customerPhone, carPlate, carType, sessionId } = body;

    if (!cart?.length)  return NextResponse.json({ error: "السلة فارغة" }, { status: 400 });
    if (!carPlate)      return NextResponse.json({ error: "رقم اللوحة مطلوب" }, { status: 400 });

    const shopId = shopUser.shop_id;
    const taxRate = shopUser.shops?.tax_rate ?? 15;

    // 1. Create or update customer
    let customerId: string | null = null;
    if (customerPhone || carPlate) {
      const customer = await customersDB.createOrUpdate(shopId, {
        name: customerName,
        phone: customerPhone,
        plate: carPlate,
        carType,
      });
      customerId = customer?.id ?? null;
    }

    // 2. Get next order ID
    const { data: orderId } = await supabase.rpc("next_order_id", { p_shop_id: shopId });

    // 3. Calculate totals
    const subtotal    = cart.reduce((s: number, i: any) => s + i.price * i.qty, 0);
    const discountAmt = Math.min(discount || 0, subtotal);
    const taxAmt      = ((subtotal - discountAmt) * taxRate) / 100;
    const total       = subtotal - discountAmt + taxAmt;

    // 4. Insert order
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      shop_id: shopId,
      customer_id: customerId,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      car_plate: carPlate.toUpperCase(),
      car_type: carType,
      payment: payMethod,
      subtotal,
      discount: discountAmt,
      tax: taxAmt,
      total,
      cashier_name: shopUser.name,
      cashier_id: shopUser.id,
      session_id: sessionId || null,
      status: "completed",
    });
    if (orderErr) throw orderErr;

    // 5. Insert order items
    await supabase.from("order_items").insert(
      cart.map((i: any) => ({
        order_id: orderId,
        shop_id: shopId,
        service_id: i.id,
        service_name: i.name,
        service_icon: i.icon,
        price: i.price,
        quantity: i.qty,
        subtotal: i.price * i.qty,
      }))
    );

    return NextResponse.json({ orderId, total, customerId });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
