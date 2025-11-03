-- Migración minimalista para IBKR
-- Crea 2 tablas: config y posiciones (NO toca investments)

-- Tabla para guardar credenciales de IBKR (una sola fila por usuario)
CREATE TABLE IF NOT EXISTS public.ibkr_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  query_id text NOT NULL,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla para las posiciones de IBKR (completamente separada de investments)
CREATE TABLE IF NOT EXISTS public.ibkr_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificadores
  symbol text NOT NULL,
  description text,
  conid text NOT NULL, -- IBKR Contract ID (único)
  isin text,

  -- Cantidades y precios
  quantity numeric(14, 6) NOT NULL,
  current_price numeric(14, 4) NOT NULL,
  cost_basis numeric(14, 4) NOT NULL,
  position_value numeric(14, 2),

  -- P&L
  unrealized_pnl numeric(14, 2),
  unrealized_pnl_percent numeric(8, 2),

  -- Metadata
  asset_category text, -- STK, OPT, FUT, etc.
  currency text DEFAULT 'USD',
  exchange text,

  -- Sync info
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraint: una posición por conid por usuario
  CONSTRAINT ibkr_positions_user_conid_unique UNIQUE (user_id, conid)
);

-- RLS para ibkr_config
ALTER TABLE public.ibkr_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own IBKR config"
ON public.ibkr_config
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS para ibkr_positions
ALTER TABLE public.ibkr_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own IBKR positions"
ON public.ibkr_positions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Índices para búsquedas rápidas
CREATE INDEX idx_ibkr_config_user_id ON public.ibkr_config(user_id);
CREATE INDEX idx_ibkr_positions_user_id ON public.ibkr_positions(user_id);
CREATE INDEX idx_ibkr_positions_symbol ON public.ibkr_positions(symbol);
CREATE INDEX idx_ibkr_positions_conid ON public.ibkr_positions(conid);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ibkr_config_updated_at ON public.ibkr_config;
CREATE TRIGGER trg_ibkr_config_updated_at
BEFORE UPDATE ON public.ibkr_config
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ibkr_positions_updated_at ON public.ibkr_positions;
CREATE TRIGGER trg_ibkr_positions_updated_at
BEFORE UPDATE ON public.ibkr_positions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.ibkr_config IS 'Configuración de Interactive Brokers por usuario';
COMMENT ON TABLE public.ibkr_positions IS 'Posiciones sincronizadas desde IBKR (tabla independiente)';
COMMENT ON COLUMN public.ibkr_positions.conid IS 'IBKR Contract ID - identificador único';
COMMENT ON COLUMN public.ibkr_positions.quantity IS 'Número de acciones/unidades';
COMMENT ON COLUMN public.ibkr_positions.current_price IS 'Precio de mercado actual';
COMMENT ON COLUMN public.ibkr_positions.cost_basis IS 'Precio de compra promedio';
COMMENT ON COLUMN public.ibkr_positions.unrealized_pnl IS 'Ganancia/pérdida no realizada en moneda';
COMMENT ON COLUMN public.ibkr_positions.unrealized_pnl_percent IS 'Ganancia/pérdida no realizada en porcentaje';
