/*
  # Add password support to users table

  1. New Columns
    - `password_hash` (text) - Contraseña hasheada del usuario
    - `last_login` (timestamp) - Último inicio de sesión

  2. Security
    - Mantener RLS existente
    - Agregar políticas para gestión de contraseñas

  3. Changes
    - Agregar columna de contraseña a usuarios existentes
    - Actualizar usuarios mock con contraseñas por defecto
*/

-- Add password column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
  END IF;
END $$;

-- Add last_login column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Insert default users with passwords (hash of '123456')
INSERT INTO users (id, username, email, role, store_id, is_active, password_hash) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', 'admin@tienda.com', 'admin', '11111111-1111-1111-1111-111111111111', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'empleado1', 'empleado1@tienda.com', 'employee', '11111111-1111-1111-1111-111111111111', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'empleado2', 'empleado2@tienda.com', 'employee', '22222222-2222-2222-2222-222222222222', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email = EXCLUDED.email;

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for user management
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id OR EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

CREATE POLICY "Admins can manage users" ON users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user 
    WHERE admin_user.id = auth.uid()::text 
    AND admin_user.role = 'admin'
  ));

-- Create index for password lookups
CREATE INDEX IF NOT EXISTS idx_users_username_active ON users(username, is_active);
CREATE INDEX IF NOT EXISTS idx_users_password ON users(password_hash);