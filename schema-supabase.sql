-- ========================================
-- SUPABASE SCHEMA PARA SISTEMA POS
-- ========================================
-- Ejecuta este script completo en el SQL Editor de Supabase

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLAS PRINCIPALES
-- ========================================

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  store_id UUID NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  store_id UUID NOT NULL,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  last_purchase TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  customer_id UUID,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  net_total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payment_method_discount DECIMAL(5,2) DEFAULT 0,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de venta
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);

-- Tabla de gastos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  employee_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id UUID NOT NULL
);

-- Tabla de items de cotización
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);

-- Tabla de compras
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  supplier_id UUID,
  total DECIMAL(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  employee_id UUID NOT NULL,
  invoice_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de compra
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  store_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  contact_person VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cajas registradoras
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  opening_amount DECIMAL(10,2) NOT NULL,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  expenses_turno JSONB,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

-- Tabla de movimientos de efectivo
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'expense', 'opening', 'closing', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de métodos de pago
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas de recibos
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  store_id UUID NOT NULL,
  header_text TEXT,
  footer_text TEXT,
  show_logo BOOLEAN DEFAULT false,
  logo_url TEXT,
  thermal_width INTEGER DEFAULT 58,
  font_size INTEGER DEFAULT 11,
  show_date BOOLEAN DEFAULT true,
  show_employee BOOLEAN DEFAULT true,
  show_customer BOOLEAN DEFAULT true,
  show_invoice_number BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  show_item_details BOOLEAN DEFAULT true,
  show_totals BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos separados (layaway)
CREATE TABLE IF NOT EXISTS layaways (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  total_paid DECIMAL(10,2) DEFAULT 0,
  remaining_balance DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  employee_id UUID NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Tabla de items separados
CREATE TABLE IF NOT EXISTS layaway_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES layaways(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
);

-- Tabla de pagos de separados
CREATE TABLE IF NOT EXISTS layaway_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES layaways(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  employee_id UUID NOT NULL,
  notes TEXT
);

-- ========================================
-- CONFIGURACIÓN DE STORAGE PARA IMÁGENES
-- ========================================

-- Crear bucket para imágenes de productos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para el bucket de imágenes
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- ========================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_store_id ON cash_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_layaways_store_id ON layaways(store_id);
CREATE INDEX IF NOT EXISTS idx_layaways_customer_id ON layaways(customer_id);

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Insertar métodos de pago por defecto
INSERT INTO payment_methods (name, discount_percentage, is_active) VALUES
('Efectivo', 0, true),
('Tarjeta Débito', 2.5, true),
('Tarjeta Crédito', 3.8, true),
('Transferencia', 1.2, true),
('PayPal', 4.2, true),
('Nequi', 1.8, true)
ON CONFLICT DO NOTHING;

-- ========================================
-- TRIGGERS PARA TIMESTAMPS AUTOMÁTICOS
-- ========================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps automáticamente
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ========================================
-- CONFIRMACIÓN
-- ========================================

-- Mostrar mensaje de confirmación
DO $$ 
BEGIN 
    RAISE NOTICE 'Schema del Sistema POS creado exitosamente!';
    RAISE NOTICE 'Tablas creadas: products, customers, sales, expenses, y más';
    RAISE NOTICE 'Bucket de Storage: product-images (público)';
    RAISE NOTICE 'Métodos de pago por defecto insertados';
END $$;
