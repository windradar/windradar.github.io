# Memory: index.md
Updated: now

# Project Memory

## Core
Wind/gusts exclusively in knots (kn) everywhere. Never use KM/H.
Prioritize mobile UI: data tables become compact cards on small screens.
Ensure high text-to-background contrast across all 5 color themes.
Progressive heatmap (yellow-red) for wind intensity based on user threshold.
Auth: Lovable Cloud, email+password obligatorio, HIBP on, contraseña ≥10 con mayús/minús/dígito/símbolo.
Roles en tabla `user_roles` separada con `has_role` SECURITY DEFINER. Nunca en profiles.

## Memories
- [Color Themes](mem://style/themes) — 5 selectable color modes with strict text-background contrast rules
- [Wind Measurements](mem://features/wind-measurements) — Wind and gusts must be displayed exclusively in knots (kn), never KM/H
- [Wind Rose Visualization](mem://features/wind-rose) — Wind direction displayed via Wind Rose with specific indicators
- [Search System](mem://features/search-system) — Location search with history and smart suggestions for partial matches
- [Responsive Behavior](mem://design/responsive-behavior) — Mobile-first responsive design, data tables convert to compact cards
- [Wind Intensity Heatmap](mem://features/wind-intensity-heatmap) — Progressive color coding (yellow to red) based on a configurable knot threshold
- [Forecast Sharing Range](mem://features/sharing-range) — Share forecast summaries for specific time ranges
- [Settings Panel](mem://features/settings-system) — Centralized settings for heatmap threshold, visible hours, and email reports
- [Auth & Sessions](mem://features/auth-and-sessions) — Email/password auth, profiles, training_sessions con snapshot meteo
