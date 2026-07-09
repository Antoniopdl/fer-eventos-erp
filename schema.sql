-- Esquema para Fer Eventos ERP (Supabase / PostgreSQL)

-- 1. Tabla de Inventario (Mobiliario)
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category TEXT, -- ej. Sillas, Mesas, Decoración
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Vehículos
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- ej. Nissan Redilas, Super Duty, Tacoma + Remolque
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT, -- o zona habitual
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Órdenes (Rentas)
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  event_date DATE NOT NULL,
  delivery_address TEXT,
  zone_fee DECIMAL(10,2) DEFAULT 0.00, -- Flete cobrado por separado
  status TEXT DEFAULT 'pending', -- pending, out_for_delivery, delivered, collected
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid
  vehicle_id UUID REFERENCES vehicles(id),
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Detalle de Órdenes (Items rentados)
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  price_at_booking DECIMAL(10,2) NOT NULL, -- Precio al momento de agendar
  missing_quantity INTEGER DEFAULT 0 -- Para el checklist de recolección (si perdieron 2 sillas)
);

-- 6. Tabla de Gastos
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL, -- ej. Gasolina, Reparaciones, Sueldos
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
