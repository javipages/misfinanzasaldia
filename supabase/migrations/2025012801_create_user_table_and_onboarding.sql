-- Eliminar las políticas y triggers existentes de user_preferences solo si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_preferences'
      AND c.relkind = 'r'
  ) THEN
    DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
    DROP POLICY IF EXISTS "User preferences - select own" ON public.user_preferences;
    DROP POLICY IF EXISTS "User preferences - insert own" ON public.user_preferences;
    DROP POLICY IF EXISTS "User preferences - update own" ON public.user_preferences;

    -- Renombrar la tabla a user_info
    ALTER TABLE public.user_preferences RENAME TO user_info;
  END IF;
END $$;

-- Agregar nuevos campos para onboarding y configuración de usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_info'
      AND c.relkind = 'r'
  ) THEN
    CREATE TABLE public.user_info (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      onboarding_completed BOOLEAN DEFAULT FALSE,
      onboarding_step INTEGER DEFAULT 0,
      onboarding_completed_at TIMESTAMPTZ,
      email_notifications_enabled BOOLEAN DEFAULT TRUE,
      user_profile_setup JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.user_info
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS user_profile_setup JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Asegurar que la función set_updated_at existe antes de crear triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Actualizar registros existentes para tener los nuevos campos
UPDATE public.user_info
SET
  onboarding_completed = FALSE,
  onboarding_step = 0,
  email_notifications_enabled = FALSE,
  user_profile_setup = '{}',
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE onboarding_completed IS NULL;

-- Recrear trigger para updated_at (usando la función existente)
DROP TRIGGER IF EXISTS trg_user_info_updated_at ON public.user_info;
CREATE TRIGGER trg_user_info_updated_at
BEFORE UPDATE ON public.user_info
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Recrear políticas RLS para la tabla user_info
ALTER TABLE public.user_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User data - select own" ON public.user_info;
CREATE POLICY "User data - select own"
ON public.user_info FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User data - insert own" ON public.user_info;
CREATE POLICY "User data - insert own"
ON public.user_info FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "User data - update own" ON public.user_info;
CREATE POLICY "User data - update own"
ON public.user_info FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

