---
name: Auth and personal area
description: Email/password auth with strong validation, profiles + roles tables, training sessions module
type: feature
---
- Auth: Lovable Cloud (Supabase). Email + contraseña obligatorio. HIBP check activado, contraseña mínima 10 chars (mayús+minús+dígito+símbolo) validada con zod en cliente.
- Confirmación por email obligatoria (auto_confirm = false).
- Tablas: `profiles` (1:1 con auth.users), `user_roles` (separada, enum app_role) con función `has_role` SECURITY DEFINER, `training_sessions`.
- Trigger `on_auth_user_created` crea profile + role 'user' automáticamente.
- RLS: cada tabla restringe a `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.
- Páginas: `/auth` (login/signup/forgot), `/reset-password`, `/profile` (cambio contraseña + alias + materiales), `/sessions` (CRUD completo con edición y snapshot meteo).
- Sesiones guardan snapshot JSONB del rango horario (viento/ráfaga/dir/ola/temp en kn) — desde forecast o archive-api según fecha.
- Edición sesión: mismo formulario, al cambiar fecha/hora/ubicación se descarta el snapshot y avisa al usuario para que pulse "Recargar datos meteo".
- 4 campos material texto libre + URL tracking (Strava) validada con zod.
- Header: `UserMenu` con dropdown (Perfil / Sesiones / Logout) o botón "Entrar".
- AuthProvider envuelve rutas dentro de BrowserRouter; ProtectedRoute para /profile y /sessions.
