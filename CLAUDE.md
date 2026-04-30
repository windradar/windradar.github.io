# CLAUDE.md — Guía para el asistente de IA

Este archivo define el contexto, convenciones y decisiones del proyecto para que el asistente (Claude Code) trabaje correctamente en futuras sesiones.

---

## Proyecto

**WindFlowRadar** — app meteorológica para deportes de viento.
- Autor: Juan Mª de Haro (jdeharo@sylo.es)
- Producción: https://windradar.github.io
- Repo: https://github.com/windradar/windradar.github.io
- Supabase project ID: `nextrkzcyddprywyvhsa`

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend:** Supabase (PostgreSQL + GoTrue Auth + Storage)
- **Deploy:** GitHub Pages vía GitHub Actions (push a `main` despliega automáticamente)
- **Package manager:** Bun (`bun install`, `bun run dev`, `bun run build`)
  - En algunos entornos Bun no está en PATH — usar `npx vite` o `node` como alternativa

---

## Comandos habituales

```bash
bun run dev        # Desarrollo local en localhost:8080
bun run build      # Build de producción en dist/
bun run test       # Tests con Vitest
```

---

## Convenciones de código

- **Idioma del UI:** español (etiquetas, toasts, mensajes de error)
- **Idioma del código:** inglés (nombres de variables, funciones, componentes)
- **Comentarios:** solo cuando el WHY no es obvio; nunca documentar el WHAT
- **Sin emojis** en código salvo que el usuario lo pida explícitamente
- **Estilos:** Tailwind CSS + clases de shadcn/ui; no CSS inline salvo para valores dinámicos
- **Formularios:** validación con Zod + react-hook-form
- **Iconos:** lucide-react
- **Animaciones:** framer-motion

---

## Arquitectura

### Rutas (react-router-dom v6)
| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | `Index.tsx` | Público |
| `/auth` | `Auth.tsx` | Público |
| `/reset-password` | `ResetPassword.tsx` | Público |
| `/sessions` | `Sessions.tsx` | Autenticado |
| `/materials` | `Materials.tsx` | Autenticado |
| `/profile` | `Profile.tsx` | Autenticado |
| `/help` | `Help.tsx` | Público |

### Auth
- `useAuth()` hook en `src/hooks/useAuth.tsx` — provee `user`, `session`, `loading`
- `<ProtectedRoute>` redirige a `/auth` si no hay sesión
- Contraseñas: mínimo 10 chars + mayúscula + minúscula + número (validado en frontend con Zod)

### APIs externas
- **Open-Meteo** (`api.open-meteo.com` + `marine-api.open-meteo.com`) — sin API key
- **BigDataCloud** (`api.bigdatacloud.net`) — geocodificación inversa, sin API key

---

## Base de datos — Supabase

### Reglas importantes
- **Todas las tablas tienen RLS activado** — nunca desactivarlo
- Toda política usa `auth.uid() = user_id` para aislar datos por usuario
- Las funciones con `SECURITY DEFINER` siempre incluyen `SET search_path = public`
- Las migraciones van en `supabase/migrations/` con timestamp en el nombre
- **Las migraciones NO se aplican automáticamente** — hay que ejecutarlas manualmente en Supabase → SQL Editor

### Tablas
| Tabla | FK a auth.users | Cascade |
|-------|----------------|---------|
| `profiles` | `user_id` REFERENCES + ON DELETE CASCADE | Sí |
| `user_roles` | `user_id` REFERENCES + ON DELETE CASCADE | Sí |
| `training_sessions` | `user_id` REFERENCES + ON DELETE CASCADE | Sí |
| `material_categories` | `user_id` REFERENCES + ON DELETE CASCADE | Sí (añadido en migración 20260430) |
| `material_items` | `user_id` REFERENCES + ON DELETE CASCADE | Sí (añadido en migración 20260430) |

### Storage
- Bucket: `material-photos` (público — cualquiera puede ver con la URL)
- Las políticas de escritura usan `(storage.foldername(name))[1]` para verificar que la carpeta = uid del usuario

---

## Decisiones técnicas tomadas

### GitHub Pages + SPA routing
El workflow copia `dist/index.html` → `dist/404.html` para que las rutas profundas (p.ej. `/reset-password`) funcionen en GitHub Pages sin BrowserRouter.

### Supabase anon key
La anon key (JWT) es pública por diseño — se puede ver en el código fuente. La seguridad real viene del RLS, no de ocultar la key. **Usar siempre el formato JWT**, no el formato `sb_publishable_` (no compatible con Supabase Auth).

### WhatsApp share
- Móvil: `navigator.share()` (Web Share API) — pasa emoji correctamente
- Escritorio: `navigator.clipboard.writeText()` + toast "Pégalo en WhatsApp Web"
- Fallback final: abrir `wa.me` URL
- Evitar `🌬️` (U+1F32C + U+FE0F) — usar `💨` en mensajes compartidos

### WindRose — rotación SVG
La flecha usa `<g transform="translate(cx, cy)">` + `style={{ transformOrigin: '0px 0px' }}` en el `motion.g` interior. **No usar** `transformOrigin: 'Xpx Ypx'` directamente sobre el SVG — no es fiable entre navegadores.

### Tema claro/oscuro
- Guardado en `localStorage` con clave `windradar_theme`
- Aplicado como `data-theme` en `document.documentElement`
- Valor por defecto: `dark`

### Preferencias de usuario
Guardadas en `profiles`: `wind_units` (kn/kmh/ms) y `date_format` (dmy/mdy/iso).

---

## Seguridad

- **CSP** activa en `index.html` via meta tag
- **tracking_url** validada con `/^https?:\/\//i` tanto al guardar (Zod) como al renderizar (`<a href>`)
- **delete_own_account()** borra material_items → material_categories → auth.users (en ese orden)
- Confirm email activado en Supabase Auth
- Redirect URLs en Supabase Auth: solo `https://windradar.github.io`

---

## Lo que NO hacer

- No desactivar RLS en ninguna tabla
- No usar `git push --force` en `main`
- No commitear el `.env` (tiene las keys de Supabase)
- No añadir comentarios que expliquen el WHAT — solo el WHY cuando no es obvio
- No crear archivos de documentación adicionales salvo que el usuario lo pida
- No añadir abstracciones o features no pedidas explícitamente
