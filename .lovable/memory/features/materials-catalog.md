---
name: Materials catalog
description: Per-user material categories (4 slots, custom names) with multiple items each, used as dropdowns in training sessions
type: feature
---
- Tablas: `material_categories` (slot 1-4, name, único por user_id+slot) y `material_items` (referencia a categoría, cascada al borrar). RLS: solo dueño CRUD.
- Perfil → sección Materiales: `MaterialsManager` permite renombrar slot (ej "Velas") y CRUD de items por slot.
- Sesiones → `MaterialSelect` muestra 4 desplegables (label = nombre categoría) con botón "+" que abre dialog modal para añadir nuevo item sin salir de la página y autoseleccionarlo.
- training_sessions sigue guardando `material_1..4` como TEXT (nombre del item seleccionado, snapshot estable aunque luego se borre el catálogo).
- Si una categoría no existe aún, el botón "+" la crea con nombre por defecto al insertar el primer item.
