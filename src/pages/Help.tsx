import { Link } from 'react-router-dom';
import {
  ArrowLeft, Map, Star, CalendarDays, Wrench, UserCircle,
  Wind, Waves, Thermometer, Navigation, Plus, Camera,
  ExternalLink, BookOpen,
} from 'lucide-react';

const sections = [
  {
    id: 'radar',
    icon: Map,
    title: 'Radar meteorológico',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    steps: [
      {
        icon: Navigation,
        heading: 'Selecciona un punto en el mapa',
        body: 'Pulsa en cualquier lugar del mapa o usa el buscador de localización para centrar la vista. El panel lateral mostrará los datos meteorológicos de ese punto.',
      },
      {
        icon: Wind,
        heading: 'Interpreta el viento',
        body: 'La velocidad se muestra en nudos (kt) por defecto. El indicador de dirección señala desde dónde sopla el viento. El valor entre paréntesis es la ráfaga máxima.',
      },
      {
        icon: Waves,
        heading: 'Datos de oleaje',
        body: 'La altura de ola (Hs) y el periodo (T) se actualizan cada hora con el modelo de Open-Meteo Marine. Son orientativos: comprueba siempre las condiciones reales in situ.',
      },
      {
        icon: Thermometer,
        heading: 'Temperatura y otras capas',
        body: 'Usa el selector de capas para alternar entre temperatura del aire, temperatura del agua y visibilidad. El gráfico de 7 días muestra la tendencia horaria del parámetro activo.',
      },
    ],
  },
  {
    id: 'spots',
    icon: Star,
    title: 'Spots favoritos',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    steps: [
      {
        icon: Star,
        heading: 'Guardar un spot',
        body: 'Con cualquier punto seleccionado en el mapa, pulsa el botón de estrella (☆) en el panel lateral. Puedes darle un nombre personalizado antes de guardar.',
      },
      {
        icon: Navigation,
        heading: 'Acceder a tus spots',
        body: 'El desplegable de favoritos (icono estrella en la barra superior) lista todos tus spots guardados. Pulsa uno para centrarte en él y cargar su previsión al instante.',
      },
      {
        icon: Star,
        heading: 'Eliminar un spot',
        body: 'Abre el desplegable de favoritos y pulsa el icono de papelera junto al spot que quieras eliminar. La acción es inmediata.',
      },
    ],
  },
  {
    id: 'sessions',
    icon: CalendarDays,
    title: 'Sesiones',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    steps: [
      {
        icon: Plus,
        heading: 'Registrar una sesión',
        body: 'Ve a Sesiones desde el menú de usuario. Pulsa "+ Nueva sesión" e introduce la fecha, horas en el agua, el spot, el material usado y tus notas. Los datos meteorológicos del momento se capturan automáticamente.',
      },
      {
        icon: ExternalLink,
        heading: 'Vincular con Strava',
        body: 'En el formulario de sesión puedes pegar la URL de tu actividad en Strava. Aparecerá como enlace en el detalle de la sesión.',
      },
      {
        icon: CalendarDays,
        heading: 'Historial y estadísticas',
        body: 'La lista de sesiones muestra un resumen cronológico. Las tarjetas incluyen condiciones meteo del momento, material empleado y tiempo en el agua acumulado.',
      },
    ],
  },
  {
    id: 'materials',
    icon: Wrench,
    title: 'Materiales',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    steps: [
      {
        icon: Plus,
        heading: 'Añadir material',
        body: 'Ve a Materiales desde el menú de usuario (/materials). Pulsa "+ Añadir" y escribe el nombre del elemento (tabla, vela, ala, trapecio…). Puedes editar el nombre directamente desde la tarjeta.',
      },
      {
        icon: Camera,
        heading: 'Subir una foto',
        body: 'Cada tarjeta de material tiene un área de imagen. Pulsa sobre ella o en el botón de cámara para subir una foto desde tu dispositivo. La imagen se guarda de forma privada en la nube: solo tú puedes verla.',
      },
      {
        icon: Wrench,
        heading: 'Usar material en una sesión',
        body: 'Al registrar una sesión, el campo "Material" muestra tu lista de materiales guardados. Selecciona el que usaste y quedará vinculado a esa sesión.',
      },
      {
        icon: Camera,
        heading: 'Ver foto ampliada',
        body: 'Pulsa sobre la miniatura de cualquier material para abrir la imagen en un visor emergente a pantalla completa.',
      },
    ],
  },
  {
    id: 'profile',
    icon: UserCircle,
    title: 'Perfil y cuenta',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    steps: [
      {
        icon: UserCircle,
        heading: 'Alias y preferencias',
        body: 'Desde tu Perfil puedes cambiar el alias que aparece en la app y configurar las unidades preferidas (nudos, km/h, m/s) y el formato de fecha.',
      },
      {
        icon: UserCircle,
        heading: 'Seguridad',
        body: 'Para cambiar la contraseña usa el enlace "Cambiar contraseña" del perfil. Se enviará un correo a tu dirección registrada con las instrucciones.',
      },
      {
        icon: UserCircle,
        heading: 'Eliminar cuenta',
        body: 'En los ajustes de cuenta encontrarás la opción de eliminar tu cuenta. Esto borrará de forma permanente todos tus datos (sesiones, materiales e imágenes) en un plazo máximo de 30 días.',
      },
    ],
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={14} /> Volver
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1.5 text-sm font-bold">
            <BookOpen size={15} className="text-primary" />
            Guía de uso
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 lg:flex lg:gap-10">
        {/* Sidebar TOC — visible solo en desktop */}
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Contenido
            </p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground`}
              >
                <s.icon size={13} className={s.color} />
                {s.title}
              </a>
            ))}
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="min-w-0 flex-1 space-y-10">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Guía de uso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo lo que necesitas saber para sacar el máximo partido a WindFlowRadar.
            </p>
          </div>

          {/* TOC móvil */}
          <nav className="flex flex-wrap gap-2 lg:hidden">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wider transition ${s.border} ${s.bg} ${s.color}`}
              >
                <s.icon size={11} />
                {s.title}
              </a>
            ))}
          </nav>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              {/* Cabecera de sección */}
              <div className={`mb-4 flex items-center gap-2 rounded-xl border p-3 ${section.bg} ${section.border}`}>
                <section.icon size={18} className={section.color} />
                <h2 className={`font-display text-base font-extrabold uppercase tracking-wider ${section.color}`}>
                  {section.title}
                </h2>
              </div>

              {/* Pasos */}
              <ol className="space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${section.bg}`}>
                      <step.icon size={14} className={section.color} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        {step.heading}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <p className="pb-8 text-center text-xs text-muted-foreground">
            ¿Tienes alguna duda o sugerencia?{' '}
            <a href="mailto:juhabar@gmail.com" className="text-primary underline">
              Escríbenos
            </a>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
