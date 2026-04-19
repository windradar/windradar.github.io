---
name: Materials catalog
description: Per-user material categories (4 slots, custom names) with multiple items each, with optional photo per item, used as dropdowns in training sessions
type: feature
---
- Tablas: `material_categories` (slot 1-4, name, único por user_id+slot) y `material_items` (referencia a categoría, `photo_url` opcional). RLS: solo dueño CRUD.
- Storage: bucket `material-photos` (público por path, sin listado broad). Path: `{user_id}/{item_id}-{timestamp}.{ext}`. Máx 3 MB, jpg/png/webp.
- Perfil → sección Materiales: `MaterialsManager` permite renombrar slot y CRUD de items. Cada item muestra `MaterialPhoto` (subir/cambiar/eliminar foto inline).
- Sesiones → `MaterialSelect` muestra 4 desplegables con miniatura del item seleccionado a la izquierda. Botón "+" abre dialog modal para añadir nuevo item sin salir de la página y autoseleccionarlo.
- training_sessions sigue guardando `material_1..4` como TEXT (nombre snapshot, estable aunque se borre el catálogo).
- Si una categoría no existe aún, el botón "+" la crea con nombre por defecto al insertar el primer item.
