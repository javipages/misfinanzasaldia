# Finanzas - Boilerplate Sidebar

## Migraciones Supabase (CLI)

1. Instala la CLI de Supabase

```bash
brew install supabase/tap/supabase
```

2. Autenticación e inicialización

```bash
supabase login --no-browser
# Pega el access token desde https://supabase.com/dashboard/account/tokens
supabase init
```

3. Aplica las migraciones locales al proyecto

```bash
# Levanta un Postgres local (opcional)
supabase start

# Enlaza tu proyecto remoto
supabase link --project-ref <PROJECT_REF>

# Empuja migraciones
supabase db push
```

Las migraciones creadas añaden:

- Tabla `income_categories` con RLS
- Tabla `expense_categories` con RLS

4. Variables de entorno

Crea `.env` con:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Utilidades de categorías (frontend)

En `src/integrations/supabase/categories.ts` tienes funciones para listar, crear, actualizar y borrar categorías de ingresos y gastos. Requieren sesión de Supabase activa.

## Notas

- Comentarios en código en inglés. Commits en una línea.
