-- Tabla para almacenar el historial de benchmarks (S&P 500, MSCI World, etc.)
-- Guarda valores diarios de los índices para comparación de rendimiento

CREATE TABLE IF NOT EXISTS benchmark_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_name text NOT NULL, -- 'SP500' | 'MSCI_WORLD'
  date date NOT NULL,
  close_value numeric(12, 4) NOT NULL, -- Valor de cierre del índice
  change_percent numeric(8, 4), -- % cambio respecto al día anterior
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benchmark_name, date)
);

-- Índices para queries rápidos
CREATE INDEX idx_benchmark_history_name_date ON benchmark_history (benchmark_name, date DESC);
CREATE INDEX idx_benchmark_history_date ON benchmark_history (date DESC);

-- RLS (no necesario porque es data pública, pero lo habilitamos por consistencia)
ALTER TABLE benchmark_history ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer (es data pública)
CREATE POLICY "Anyone can read benchmark history"
  ON benchmark_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo service role puede insertar/actualizar (vía cron job)
CREATE POLICY "Service role can insert benchmark history"
  ON benchmark_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update benchmark history"
  ON benchmark_history
  FOR UPDATE
  TO service_role
  USING (true);

-- Comentarios
COMMENT ON TABLE benchmark_history IS 'Historial de valores diarios de índices de referencia (S&P 500, MSCI World) para comparación de rendimiento';
COMMENT ON COLUMN benchmark_history.benchmark_name IS 'Nombre del índice: SP500, MSCI_WORLD';
COMMENT ON COLUMN benchmark_history.date IS 'Fecha del valor de cierre';
COMMENT ON COLUMN benchmark_history.close_value IS 'Valor de cierre del índice';
COMMENT ON COLUMN benchmark_history.change_percent IS 'Porcentaje de cambio respecto al día anterior';
