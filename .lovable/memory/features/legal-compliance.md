---
name: Legal & cookies compliance
description: Banner de cookies con consentimiento granular, páginas legales (Aviso, Privacidad, Cookies, Términos) y carga condicional de AdSense
type: feature
---
- `useConsent` (src/hooks/useConsent.tsx): provider con estado `{ categories: { necessary, analytics, marketing }, decidedAt, region }`. Persiste en `localStorage` con clave `wfr_consent_v1`. Detecta región (EU/UK/CA/OTHER) por timezone+lang.
- `CookieBanner` (src/components/CookieBanner.tsx): se muestra mientras `decidedAt === null`. Botones Aceptar todo / Rechazar / Configurar (granular). Reabrible desde footer o /legal/cookies.
- AdSense: el `<script>` se eliminó de `index.html`. Solo se inyecta dinámicamente desde `useConsent` cuando `categories.marketing === true`.
- Páginas legales bajo `/legal/notice|privacy|cookies|terms`. Layout compartido `LegalLayout` con tabs. Datos del titular como placeholders `[TU NOMBRE]`, `[TU EMAIL]`, etc.
- Cobertura: RGPD/LOPDGDD (España/UE), UK GDPR/PECR, CCPA/CPRA (California). LSSI-CE art. 22 cumplido (consentimiento previo, no técnicas).
- `LegalFooter` añadido a `Index.tsx` con enlaces y botón "Configurar cookies".
