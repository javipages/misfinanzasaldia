-- Eliminar las políticas y triggers existentes de user_preferences
DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
DROP POLICY IF EXISTS "User preferences - select own" ON public.user_preferences;
DROP POLICY IF EXISTS "User preferences - insert own" ON public.user_preferences;
DROP POLICY IF EXISTS "User preferences - update own" ON public.user_preferences;

-- Renombrar la tabla a user_info
ALTER TABLE public.user_preferences RENAME TO user_info;

-- Agregar nuevos campos para onboarding y configuración de usuario
ALTER TABLE public.user_info
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS user_profile_setup JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

