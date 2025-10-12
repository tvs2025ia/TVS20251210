/*
  # Create stores table and setup

  1. New Tables
    - `stores`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `stores` table
    - Add policy for authenticated users to read stores
    - Add policy for admin users to manage stores

  3. Initial Data
    - Insert default stores (Tienda Principal, Sucursal Norte, Sucursal Sur)
*/

-- Create stores table
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

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read stores"
  ON stores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage stores"
  ON stores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_stores_updated_at();

-- Insert default stores
INSERT INTO stores (id, name, address, phone, email, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tienda Principal', 'Calle 123, Ciudad', '+57 300 123 4567', 'principal@tienda.com', true),
  ('22222222-2222-2222-2222-222222222222', 'Sucursal Norte', 'Av. Norte 456, Ciudad', '+57 300 123 4568', 'norte@tienda.com', true),
  ('33333333-3333-3333-3333-333333333333', 'Sucursal Sur', 'Av. Sur 789, Ciudad', '+57 300 123 4569', 'sur@tienda.com', true)
ON CONFLICT (id) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);