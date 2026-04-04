-- ═══════════════════════════════════════════════════════════════════
-- TOP CLEAN CLOUD - قاعدة البيانات الكاملة
-- ═══════════════════════════════════════════════════════════════════

-- 1. جدول المتاجر (Multi-tenant)
CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  tax_rate    NUMERIC(5,2) DEFAULT 15,
  logo_url    TEXT,
  plan        TEXT DEFAULT 'free',        -- free | pro | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول المستخدمين (مرتبط بـ Supabase Auth)
CREATE TABLE shop_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  username    TEXT,
  role        TEXT DEFAULT 'cashier',     -- admin | supervisor | cashier
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الخدمات
CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  icon        TEXT DEFAULT '💧',
  color       TEXT DEFAULT '#00c6ff',
  category    TEXT DEFAULT 'غسيل',
  active      BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول العملاء
CREATE TABLE customers (
  id          TEXT,                        -- CUS0001, CUS0002...
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent  NUMERIC(10,2) DEFAULT 0,
  last_visit   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, shop_id)
);

-- 5. جدول سيارات العملاء
CREATE TABLE customer_vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  plate       TEXT NOT NULL,
  car_type    TEXT DEFAULT 'سيدان',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, shop_id, plate)
);

-- 6. جدول الطلبات
CREATE TABLE orders (
  id          TEXT,                        -- ORD0001...
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  car_plate   TEXT NOT NULL,
  car_type    TEXT,
  payment     TEXT NOT NULL,               -- نقد | فيزا | ماستر كارد | مدى
  subtotal    NUMERIC(10,2) NOT NULL,
  discount    NUMERIC(10,2) DEFAULT 0,
  tax         NUMERIC(10,2) DEFAULT 0,
  total       NUMERIC(10,2) NOT NULL,
  cashier_id  UUID REFERENCES shop_users(id),
  cashier_name TEXT,
  session_id  UUID,
  status      TEXT DEFAULT 'completed',   -- completed | refunded | cancelled
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, shop_id)
);

-- 7. جدول بنود الطلبات
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    TEXT NOT NULL,
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  service_id  UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  service_icon TEXT,
  price       NUMERIC(10,2) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  subtotal    NUMERIC(10,2) NOT NULL
);

-- 8. جدول المصروفات
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL,
  note        TEXT,
  added_by    UUID REFERENCES shop_users(id),
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 9. جدول المرتجعات
CREATE TABLE refunds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  order_id    TEXT,
  reason      TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  processed_by UUID REFERENCES shop_users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. جدول جلسات الصندوق
CREATE TABLE cash_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  cashier_id  UUID REFERENCES shop_users(id),
  cashier_name TEXT,
  open_amount NUMERIC(10,2) DEFAULT 0,
  close_amount NUMERIC(10,2),
  sales_total NUMERIC(10,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  note        TEXT,
  opened_at   TIMESTAMPTZ DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  status      TEXT DEFAULT 'open'          -- open | closed
);

-- 11. جدول العمال (الطابور)
CREATE TABLE workers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  busy        BOOLEAN DEFAULT FALSE,
  done_count  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 12. سجل النشاطات (Audit log)
CREATE TABLE activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES shop_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES للأداء
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX idx_orders_shop_date    ON orders(shop_id, created_at DESC);
CREATE INDEX idx_orders_customer     ON orders(customer_id, shop_id);
CREATE INDEX idx_customers_phone     ON customers(phone, shop_id);
CREATE INDEX idx_expenses_shop_date  ON expenses(shop_id, expense_date DESC);
CREATE INDEX idx_sessions_shop       ON cash_sessions(shop_id, opened_at DESC);
CREATE INDEX idx_vehicles_plate      ON customer_vehicles(plate, shop_id);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (كل متجر يرى بياناته فقط)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE shops             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log      ENABLE ROW LEVEL SECURITY;

-- Helper function: يرجع shop_id للمستخدم الحالي
CREATE OR REPLACE FUNCTION get_my_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM shop_users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: يرجع role للمستخدم الحالي
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM shop_users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Policies
CREATE POLICY "shop_users_own" ON shop_users
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "services_own" ON services
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "customers_own" ON customers
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "vehicles_own" ON customer_vehicles
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "orders_own" ON orders
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "order_items_own" ON order_items
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "expenses_own" ON expenses
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "refunds_own" ON refunds
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "sessions_own" ON cash_sessions
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "workers_own" ON workers
  FOR ALL USING (shop_id = get_my_shop_id());

CREATE POLICY "log_own" ON activity_log
  FOR ALL USING (shop_id = get_my_shop_id());

-- Shop: يرى فقط متجره
CREATE POLICY "shop_own" ON shops
  FOR ALL USING (id = get_my_shop_id());

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME (للتحديث الفوري بين الأجهزة)
-- ═══════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE cash_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE workers;

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shops_updated     BEFORE UPDATE ON shops     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated  BEFORE UPDATE ON services  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update customer stats when order is added
CREATE OR REPLACE FUNCTION update_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      total_spent  = total_spent + NEW.total,
      last_visit   = CURRENT_DATE,
      updated_at   = NOW()
    WHERE id = NEW.customer_id AND shop_id = NEW.shop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_customer
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_on_order();

-- Auto-generate sequential IDs
CREATE OR REPLACE FUNCTION next_order_id(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE v_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) + 1
  INTO v_num FROM orders WHERE shop_id = p_shop_id;
  RETURN 'ORD' || LPAD(v_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_customer_id(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE v_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) + 1
  INTO v_num FROM customers WHERE shop_id = p_shop_id;
  RETURN 'CUS' || LPAD(v_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
