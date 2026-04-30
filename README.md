# WindFlowRadar

Radar de viento y previsión meteorológica para deportes de viento (kitesurf, windsurf, vela…), con registro de sesiones y gestión de material.

**Producción:** https://windradar.github.io

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend / Auth / DB | Supabase (PostgreSQL + GoTrue) |
| Deploy | GitHub Pages via GitHub Actions |
| Package manager | Bun |

---

## Desarrollo local

```bash
bun install
bun run dev
```

La app arranca en `http://localhost:8080`.

### Variables de entorno

Crea un `.env` en la raíz con:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-jwt-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

---

## Estructura

```
src/
  pages/          # Rutas principales
    Index.tsx       # Dashboard principal (viento + previsión)
    Auth.tsx         # Login / registro
    ResetPassword.tsx
    Sessions.tsx     # Registro de sesiones de entrenamiento
    Materials.tsx    # Gestión de material
    Profile.tsx      # Preferencias + eliminar cuenta
    Help.tsx
  components/     # Componentes reutilizables
    WindRose.tsx        # Rosa de los vientos animada
    WeekForecastChart.tsx  # Previsión 7 días (SVG, cada 2h)
    WindCharts.tsx      # Gráficas de viento
    WindCompareChart.tsx
    MaterialsManager.tsx / MaterialPhoto.tsx
    SessionStoryShare.tsx  # Compartir sesión como historia
    ThemeSelector.tsx   # Toggle oscuro/claro
    SearchHistory.tsx / SearchSuggestions.tsx / FavoritesButton.tsx
    CookieBanner.tsx / LegalFooter.tsx
    ProtectedRoute.tsx / UserMenu.tsx
  hooks/
    useAuth.tsx       # Contexto de autenticación
    useConsent.tsx    # Consentimiento cookies
  lib/
    weather-helpers.ts  # Conversiones, colores Beaufort, helpers meteorológicos
  integrations/supabase/
    client.ts         # Cliente Supabase
    types.ts          # Tipos generados de la BD
```

---

## Base de datos

Las migraciones están en `supabase/migrations/` y deben aplicarse manualmente en Supabase → SQL Editor.

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil de usuario + preferencias (unidades viento, formato fecha, WhatsApp) |
| `user_roles` | Roles `admin` / `user` |
| `training_sessions` | Sesiones de entrenamiento con snapshot meteorológico |
| `material_categories` | 4 categorías de material por usuario |
| `material_items` | Items de material con foto opcional |

Storage bucket: `material-photos` (público — solo escritura del propietario).

Todas las tablas tienen **RLS** activo: cada usuario solo accede a sus propios datos.

---

## APIs externas

| API | Uso | Clave |
|-----|-----|-------|
| [Open-Meteo](https://open-meteo.com) | Viento + previsión horaria | No necesaria |
| [Open-Meteo Marine](https://open-meteo.com) | Altura de ola | No necesaria |
| [BigDataCloud](https://www.bigdatacloud.com) | Geocodificación inversa | No necesaria |

---

## Deploy

El deploy es automático al hacer push a `main`. El workflow (`.github/workflows/deploy.yml`):

1. Instala dependencias con Bun
2. Ejecuta `bun run build`
3. Copia `dist/index.html` → `dist/404.html` (fix de rutas SPA en GitHub Pages)
4. Despliega en GitHub Pages

---

## Seguridad

- RLS en todas las tablas de Supabase
- CSP (Content Security Policy) en `index.html`
- Contraseñas: mínimo 10 caracteres + mayúscula + minúscula + número
- URLs de tracking validadas (solo `http://` / `https://`)
- Confirmación de email activada en Supabase Auth
