-- Tabla de Paquetes/Kits (Ej. "Mesa Redonda Imperial")
CREATE TABLE kits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL, -- El precio especial de llevar el paquete completo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Requisitos del Kit (Ej. "Requiere 1 Mesa, 10 Sillas, 1 Mantel")
CREATE TABLE kit_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  kit_id UUID REFERENCES kits(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- Categoría del artículo a buscar (Ej. 'Sillas', 'Mesas')
  quantity INTEGER NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT false, -- Por ejemplo, si el sobremantel es opcional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad (RLS) para poder leer y escribir libremente durante el desarrollo
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for kits" ON kits FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for kit_requirements" ON kit_requirements FOR ALL TO public USING (true) WITH CHECK (true);
