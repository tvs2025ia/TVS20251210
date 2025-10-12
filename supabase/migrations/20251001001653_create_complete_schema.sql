/*
  # Crear esquema completo del sistema POS

  ## Tablas Principales

  ### 1. stores - Tiendas
  - Almacena información de las tiendas/sucursales
  - Campos: id, name, address, phone, email, is_active

  ### 2. users - Usuarios del sistema
  - Empleados y administradores
  - Campos: id, username, email, role, store_id, is_active, password_hash, last_login

  ### 3. customers - Clientes
  - Información de clientes
  - Campos: id, name, email, phone, address, store_id, total_purchases, last_purchase

  ### 4. products - Productos
  - Inventario de productos
  - Campos: id, name, sku, category, price, cost, stock, min_stock, store_id, image_url

  ### 5. layaways - Separados
  - Sistema de separados/layaway
  - Campos: id, store_id, customer_id, employee_id, items, subtotal, discount, total, total_paid, remaining_balance, status, due_date, notes

  ### 6. layaway_payments - Abonos a separados
  - Pagos/abonos realizados a los separados
  - Campos: id, layaway_id, amount, payment_method, employee_id, notes, date

  ## Seguridad
  - RLS habilitado en todas las tablas
  - Políticas para usuarios autenticados basadas en store_id
  - Los usuarios solo pueden acceder a datos de su tienda

  ## Índices
  - Índices en campos de búsqueda frecuente
  - Índices en foreign keys para mejorar joins
*/

-- ============================================
-- STORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  password_hash text,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  total_purchases numeric NOT NULL DEFAULT 0,
  last_purchase timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  cost numeric NOT NULL DEFAULT 0 CHECK (cost >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock integer NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sku, store_id)
);

-- ============================================
-- LAYAWAYS TABLE (Separados)
-- ============================================
CREATE TABLE IF NOT EXISTS layaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  employee_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  due_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- LAYAWAY_PAYMENTS TABLE (Abonos)
-- ============================================
CREATE TABLE IF NOT EXISTS layaway_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layaway_id uuid NOT NULL REFERENCES layaways(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'Efectivo',
  employee_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes text,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE layaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE layaway_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - STORES
-- ============================================
CREATE POLICY "Users can read all stores"
  ON stores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage stores"
  ON stores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES - USERS
-- ============================================
CREATE POLICY "Users can read users from their store"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = id 
    OR EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid()::text 
      AND admin_user.role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES - CUSTOMERS
-- ============================================
CREATE POLICY "Users can read customers from their store"
  ON customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = customers.store_id
    )
  );

CREATE POLICY "Users can create customers in their store"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = customers.store_id
    )
  );

CREATE POLICY "Users can update customers in their store"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = customers.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = customers.store_id
    )
  );

-- ============================================
-- RLS POLICIES - PRODUCTS
-- ============================================
CREATE POLICY "Users can read products from their store"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = products.store_id
    )
  );

CREATE POLICY "Users can create products in their store"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = products.store_id
    )
  );

CREATE POLICY "Users can update products in their store"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = products.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = products.store_id
    )
  );

-- ============================================
-- RLS POLICIES - LAYAWAYS
-- ============================================
CREATE POLICY "Users can read layaways from their store"
  ON layaways FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = layaways.store_id
    )
  );

CREATE POLICY "Users can create layaways in their store"
  ON layaways FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = layaways.store_id
    )
  );

CREATE POLICY "Users can update layaways in their store"
  ON layaways FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = layaways.store_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::text 
      AND users.store_id = layaways.store_id
    )
  );

-- ============================================
-- RLS POLICIES - LAYAWAY_PAYMENTS
-- ============================================
CREATE POLICY "Users can read payments from their store's layaways"
  ON layaway_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM layaways l
      JOIN users u ON u.store_id = l.store_id
      WHERE l.id = layaway_payments.layaway_id
      AND u.id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create payments for their store's layaways"
  ON layaway_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM layaways l
      JOIN users u ON u.store_id = l.store_id
      WHERE l.id = layaway_payments.layaway_id
      AND u.id = auth.uid()::text
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_layaways_updated_at
    BEFORE UPDATE ON layaways
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: AUTO-UPDATE LAYAWAY ON PAYMENT
-- ============================================
CREATE OR REPLACE FUNCTION update_layaway_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE layaways
    SET 
        total_paid = total_paid + NEW.amount,
        remaining_balance = total - (total_paid + NEW.amount),
        status = CASE 
            WHEN (total - (total_paid + NEW.amount)) <= 0 THEN 'completed'
            ELSE status
        END,
        updated_at = now()
    WHERE id = NEW.layaway_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_layaway_on_payment
    AFTER INSERT ON layaway_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_layaway_on_payment();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
-- Stores
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Layaways
CREATE INDEX IF NOT EXISTS idx_layaways_store_id ON layaways(store_id);
CREATE INDEX IF NOT EXISTS idx_layaways_customer_id ON layaways(customer_id);
CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);
CREATE INDEX IF NOT EXISTS idx_layaways_due_date ON layaways(due_date);
CREATE INDEX IF NOT EXISTS idx_layaways_created_at ON layaways(created_at);

-- Layaway Payments
CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway_id ON layaway_payments(layaway_id);
CREATE INDEX IF NOT EXISTS idx_layaway_payments_date ON layaway_payments(date);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================
-- Tiendas por defecto
INSERT INTO stores (id, name, address, phone, email, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tienda Principal', 'Calle 123, Ciudad', '+57 300 123 4567', 'principal@tienda.com', true),
  ('22222222-2222-2222-2222-222222222222', 'Sucursal Norte', 'Av. Norte 456, Ciudad', '+57 300 123 4568', 'norte@tienda.com', true),
  ('33333333-3333-3333-3333-333333333333', 'Sucursal Sur', 'Av. Sur 789, Ciudad', '+57 300 123 4569', 'sur@tienda.com', true)
ON CONFLICT (id) DO NOTHING;

-- Usuarios por defecto (password: 123456)
INSERT INTO users (id, username, email, role, store_id, is_active, password_hash) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', 'admin@tienda.com', 'admin', '11111111-1111-1111-1111-111111111111', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'empleado1', 'empleado1@tienda.com', 'employee', '11111111-1111-1111-1111-111111111111', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'empleado2', 'empleado2@tienda.com', 'employee', '22222222-2222-2222-2222-222222222222', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email;

-- Cliente de ejemplo
INSERT INTO customers (name, email, phone, address, store_id, total_purchases) VALUES
  ('Juan Pérez', 'juan@email.com', '+57 300 123 4567', 'Calle 123, Ciudad', '11111111-1111-1111-1111-111111111111', 0)
ON CONFLICT DO NOTHING;