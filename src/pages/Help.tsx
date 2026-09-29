import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type LucideIcon, ArrowLeft, BookOpen, Search, X, ChevronDown, Rocket, MapPin, LineChart, SlidersHorizontal,
  BellRing, Share2, CalendarDays, Wrench, UserCircle, Smartphone, Palette, HelpCircle,
} from 'lucide-react';
import { windRowStyle } from '@/lib/wind-row-color';

type Tag = 'cuenta' | 'dispositivo';

interface HelpItem {
  heading: string;
  body: string;
  tip?: string;
  tags?: Tag[];
}

interface HelpSection {
  id: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  color: string;
  bg: string;
  border: string;
  items: HelpItem[];
}

const TAG_LABEL: Record<Tag, string> = {
  cuenta: 'Requiere cuenta',
  dispositivo: 'Solo en este dispositivo',
};

const SECTIONS: HelpSection[] = [
  {
    id: 'inicio',
    icon: Rocket,
    title: 'Primeros pasos',
    intro: 'En menos de un minuto tienes la previsión de tu spot.',
    color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30',
    items: [
      {
        heading: '1. Busca tu spot',
        body: 'Escribe el nombre de una playa, pueblo o ciudad en «Buscar lugar...» y elige una de las sugerencias. La previsión se carga al momento y la próxima vez que abras la app se cargará sola la última búsqueda.',
      },
      {
        heading: '2. Mira las condiciones',
        body: 'Arriba tienes las condiciones actuales (viento, dirección, ola, temperatura). Debajo, el gráfico de 7 días y la tabla hora a hora del día elegido.',
      },
      {
        heading: '3. Guárdalo en favoritos',
        body: 'Pulsa la estrella «Añadir» junto al nombre del lugar. Desde el botón ⭐ de la cabecera vuelves a él con un toque.',
      },
      {
        heading: '4. Crea una cuenta para ir más allá',
        body: 'Con cuenta puedes recibir alertas de viento por email, WhatsApp o notificación, registrar tus sesiones, guardar tu material y compartir la previsión.',
        tags: ['cuenta'],
      },
    ],
  },
  {
    id: 'buscar',
    icon: MapPin,
    title: 'Buscar y favoritos',
    intro: 'Cómo encontrar un lugar y tener tus spots a mano.',
    color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30',
    items: [
      {
        heading: 'Buscador',
        body: 'Las sugerencias aparecen a partir de 2 letras e indican región, país y coordenadas para distinguir lugares con el mismo nombre. Con Enter o «BUSCAR» se carga el primer resultado. La ✕ vacía el campo.',
      },
      {
        heading: 'Mi ubicación',
        body: 'El botón de la diana, junto al buscador, carga la previsión del lugar donde estás. La primera vez el navegador te pedirá permiso para usar tu ubicación.',
      },
      {
        heading: 'Búsquedas recientes',
        body: 'Al pulsar en el buscador vacío se muestran tus últimas búsquedas para repetirlas sin escribir.',
        tags: ['dispositivo'],
      },
      {
        heading: 'Guardar y quitar favoritos',
        body: 'Usa la estrella junto al nombre del lugar o, en el desplegable ⭐ de la cabecera, «Guardar spot actual» / «Quitar de favoritos». Se guarda con el nombre de la búsqueda. Puedes tener hasta 30.',
        tags: ['dispositivo'],
      },
      {
        heading: 'Tus spots de un vistazo',
        body: 'Si tienes favoritos, en la pantalla principal aparece «Tus spots»: una tarjeta por spot con el viento máximo de hoy y mañana, su dirección y las horas en que se alcanza tu umbral. Las tarjetas con viento suficiente hoy se marcan en verde. Toca una para abrir ese spot.',
        tags: ['dispositivo'],
      },
      {
        heading: 'Abrir o borrar un favorito',
        body: 'En el desplegable ⭐ pulsa un spot para cargarlo o la papelera para borrarlo. El número del botón indica cuántos tienes.',
        tip: 'Los favoritos viven en el navegador: si cambias de móvil o borras los datos del navegador, tendrás que volver a guardarlos.',
      },
    ],
  },
  {
    id: 'prevision',
    icon: LineChart,
    title: 'Leer la previsión',
    intro: 'Qué significa cada bloque de la pantalla principal.',
    color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30',
    items: [
      {
        heading: 'Elegir el día',
        body: 'Con el selector de fecha de la cabecera puedes ver desde 7 días atrás hasta 6 días adelante. Los días pasados salen del archivo histórico; entre hoy y los próximos días el cambio es instantáneo porque la previsión de 7 días ya está descargada.',
      },
      {
        heading: 'Condiciones actuales',
        body: 'Muestran la hora más cercana a ahora (o la primera hora visible si miras otro día): dirección con el nombre local del viento (Tramontana, Garbí, Levante…) y su fuerza Beaufort, viento medio con racha y mínimo del día, precipitación, temperatura del aire y del agua, altura de ola y swell, y el estado del cielo.',
      },
      {
        heading: 'Previsión 7 días',
        body: 'Barras de viento en nudos cada 2 horas con la racha en naranja, y cada 6 horas la dirección, la ola y el tiempo. Desliza en horizontal para recorrer la semana.',
      },
      {
        heading: 'Tabla hora a hora',
        body: 'Viento, racha, viento a 100 m, dirección, ola, temperatura, tiempo, lluvia y Beaufort de cada hora. La fila de la hora actual lleva ▶. En el móvil cada hora es una tarjeta. Solo se muestran las horas del rango que elijas en Configuración.',
      },
      {
        heading: 'AROME HD y el intervalo 15 min',
        body: 'Para hoy y mañana, en Francia y los países vecinos (incluida la mayor parte de la península y Baleares), la app usa el modelo AROME de Météo-France a 1,3 km. Cuando está disponible verás el distintivo «AROME HD» y podrás cambiar el «Intervalo» entre 1h, 30min y 15min. Si no hay AROME para tu zona se usa el modelo global sin avisar.',
      },
      {
        heading: 'Big Day',
        body: 'Si hoy hay al menos 2 horas seguidas con viento igual o superior al umbral, junto al nombre del lugar aparece «Big Day». Si el lugar coincide con uno de «Mis Spots» se usa el umbral de ese spot.',
      },
      {
        heading: 'Gráficos y comparar viento',
        body: 'Debajo de la tabla hay gráficos de viento y rachas, altura de ola y temperatura de aire y agua para los próximos días. En «Comparar viento» eliges otra fecha y se superpone su viento al de hoy.',
      },
      {
        heading: 'Unidades',
        body: 'El viento se muestra en nudos (kn) o en la unidad que elijas en tu Perfil (km/h o m/s). La ola va en metros, la temperatura en °C y la lluvia en mm.',
        tip: 'El umbral de viento y las alertas se configuran siempre en nudos.',
      },
      {
        heading: 'Dirección del viento',
        body: 'El texto (SO, 225°, Garbí…) indica de dónde viene el viento, con 16 puntos cardinales (la O es oeste). Las flechas, en la rosa, la tabla y los gráficos, indican hacia dónde sopla.',
      },
    ],
  },
  {
    id: 'configuracion',
    icon: SlidersHorizontal,
    title: 'Configuración',
    intro: 'Menú de usuario → «Configuración» (desde la pantalla principal). Los cambios se aplican al pulsar «Guardar».',
    color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30',
    items: [
      {
        heading: 'Umbral de viento mínimo',
        body: 'Entre 5 y 30 nudos. Las horas con viento igual o superior se colorean en la tabla y es el valor que usan las alertas de email, WhatsApp y push.',
        tags: ['cuenta'],
      },
      {
        heading: 'Rango de horas visible',
        body: '«Desde» y «Hasta» limitan las horas de la tabla, por ejemplo de 08:00 a 20:00 para no ver la noche.',
        tags: ['cuenta', 'dispositivo'],
      },
      {
        heading: 'Mis Spots',
        body: 'Con «Añadir spot» guardas lugares con su propio viento mínimo. Sirven para el aviso «Big Day»: cuando consultas uno de ellos se usa su umbral en lugar del general.',
        tags: ['cuenta', 'dispositivo'],
      },
    ],
  },
  {
    id: 'alertas',
    icon: BellRing,
    title: 'Alertas de viento',
    intro: 'Recibe la previsión sin abrir la app. Se configuran en Configuración y funcionan aunque tengas la app cerrada.',
    color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30',
    items: [
      {
        heading: 'Email con la previsión',
        body: 'Activa «Envío automático por email», escribe la ubicación y elige una o dos horas de envío y el rango de horas del informe. Llega al email de tu cuenta a esas horas todos los días, haya viento o no; las horas que superan el umbral salen en verde. Las horas de envío son en hora de Madrid.',
        tags: ['cuenta'],
        tip: 'El email de la cuenta tiene que estar confirmado. Si no te llega, mira en la carpeta de spam.',
      },
      {
        heading: 'Ubicación y horas de las alertas',
        body: 'En «Alertas de viento» eliges el spot, una o dos horas de envío y el rango de horas a revisar. Lo comparten WhatsApp y las notificaciones push. Las horas son las del lugar del spot.',
        tags: ['cuenta'],
      },
      {
        heading: 'Direcciones del viento',
        body: 'En «Direcciones del viento» marcas en la rosa de dónde tiene que soplar el viento para que el spot funcione, por ejemplo SO y OSO para el Garbí. Solo te avisaremos si hay viento suficiente desde esas direcciones. Sin ninguna marcada, vale cualquier dirección.',
        tags: ['cuenta'],
      },
      {
        heading: 'WhatsApp (CallMeBot)',
        body: 'Primero, una sola vez, envía por WhatsApp el mensaje «I allow callmebot to send me messages» al +34 644 91 96 80: te responderán con tu API Key. Pega la key en «API Key CallMeBot», pon tu número en el Perfil y activa «Envío automático por WhatsApp». Solo recibirás mensaje los días en que alguna hora del rango alcance el umbral.',
        tags: ['cuenta'],
      },
      {
        heading: 'Notificaciones push',
        body: 'En «Notificaciones push» pulsa «Activar en este dispositivo» y acepta el permiso del navegador. Hay que activarlas en cada móvil u ordenador. Avisan solo cuando hay viento suficiente y al tocarlas se abre la app. Funcionan aunque WhatsApp esté desactivado.',
        tags: ['cuenta'],
        tip: 'En iPhone y iPad (iOS 16.4 o superior) primero hay que instalar la app: Compartir → «Añadir a pantalla de inicio», y activarlas desde la app instalada.',
      },
      {
        heading: 'Botones de prueba',
        body: '«Probar email ahora», «Probar alerta ahora» y «Enviar prueba» envían al momento, aunque no haya viento. Cada canal permite una prueba cada 5 minutos.',
        tags: ['cuenta'],
        tip: 'La prueba usa lo que está guardado: pulsa «Guardar» antes de probar un cambio.',
      },
    ],
  },
  {
    id: 'compartir',
    icon: Share2,
    title: 'Compartir la previsión',
    intro: 'Manda a tu grupo las horas buenas del día.',
    color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30',
    items: [
      {
        heading: 'Enviar por WhatsApp u otra app',
        body: 'Con una previsión cargada, abre el menú de usuario → «Compartir previsión», elige «Desde» y «Hasta» y pulsa «Compartir». En el móvil se abre el menú de compartir del sistema; en el ordenador el texto se copia para pegarlo en WhatsApp Web con Ctrl+V.',
        tags: ['cuenta'],
      },
    ],
  },
  {
    id: 'sesiones',
    icon: CalendarDays,
    title: 'Sesiones',
    intro: 'Tu diario de navegación: menú de usuario → «Sesiones».',
    color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30',
    items: [
      {
        heading: 'Registrar una sesión',
        body: 'Pulsa «Nueva», busca la ubicación y elige fecha, hora de inicio y de fin. Después pulsa «Cargar datos meteo del rango» para guardar el viento, la racha, la dirección, la ola y la temperatura de esas horas. Completa deporte, material, URL de tracking (Strava, etc.) y notas, y pulsa «Guardar sesión».',
        tags: ['cuenta'],
        tip: 'Si cambias la fecha, las horas o el lugar después de cargar los datos meteo, se descartan y hay que volver a cargarlos.',
      },
      {
        heading: 'Deporte y material',
        body: 'El deporte decide qué huecos de material se muestran. Si falta algo, el botón + junto a cada campo lo crea sin salir del formulario.',
        tags: ['cuenta'],
      },
      {
        heading: 'Resumen',
        body: 'Filtra por «Año», «Mes», «Rango» o «Todo» para ver sesiones y horas en el agua por deporte, horas por material y un gráfico de actividad. El filtro también se aplica al historial.',
        tags: ['cuenta'],
      },
      {
        heading: 'Historial',
        body: 'Cada tarjeta muestra lugar, deporte, fecha, horario, datos meteo, material, enlace de tracking y notas. Desde sus iconos puedes compartirla, editarla o borrarla.',
        tags: ['cuenta'],
      },
      {
        heading: 'Compartir en Instagram',
        body: 'El icono de compartir de una sesión genera una imagen vertical de historia con tus datos. Elige plantilla (Franja, Foto o Ficha) y una foto de fondo de tu galería o de tu material. En el móvil se abre el menú de compartir; en el ordenador se descarga la imagen.',
        tags: ['cuenta'],
      },
      {
        heading: 'Diseñar tu tarjeta',
        body: 'Con el botón «Tarjeta» eliges la plantilla por defecto, qué datos se muestran (viento, racha, olas, duración, gráfica, equipo, QR del tracking…), su posición y la alineación. Los cambios se guardan solos en este dispositivo.',
        tags: ['cuenta', 'dispositivo'],
      },
    ],
  },
  {
    id: 'material',
    icon: Wrench,
    title: 'Material',
    intro: 'Tu inventario de tablas, velas, alas y demás: menú de usuario → «Materiales».',
    color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',
    items: [
      {
        heading: 'Deportes',
        body: 'Crea tus deportes (Windsurf, Kitesurf, Wing…) en «Deportes». Puedes renombrarlos con el lápiz o borrarlos.',
        tags: ['cuenta'],
      },
      {
        heading: 'Slots',
        body: 'Un slot es un tipo de material, como Velas o Tablas. Pulsa «Añadir slot», dale nombre con el lápiz y asígnalo a un deporte o a «Todos los deportes». Cada slot aparece como un campo al registrar una sesión.',
        tags: ['cuenta'],
        tip: 'Al borrar un slot se borran también sus materiales y fotos.',
      },
      {
        heading: 'Añadir material',
        body: 'Escribe el nombre en el campo del slot (por ejemplo «Severne Blade 5.3») y pulsa «Añadir» o Enter. Con el lápiz lo editas y con la papelera lo borras.',
        tags: ['cuenta'],
      },
      {
        heading: 'Fotos',
        body: 'Pulsa el recuadro de imagen para subir una foto JPG, PNG o WebP de hasta 20 MB. La app la reduce automáticamente antes de subirla. Pulsa la miniatura para verla en grande.',
        tags: ['cuenta'],
        tip: 'Las fotos se guardan con un enlace público: cualquiera que tenga el enlace puede verlas. No subas fotos con datos personales.',
      },
    ],
  },
  {
    id: 'cuenta',
    icon: UserCircle,
    title: 'Cuenta y perfil',
    intro: 'Registro, contraseña y datos de tu cuenta.',
    color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30',
    items: [
      {
        heading: 'Crear cuenta',
        body: 'Pulsa «Entrar» → «¿No tienes cuenta? Regístrate». La contraseña necesita al menos 10 caracteres con mayúscula, minúscula, número y símbolo. Después confirma tu email con el enlace que te enviamos.',
      },
      {
        heading: 'He olvidado la contraseña',
        body: 'En «Entrar» pulsa «¿Olvidaste tu contraseña?» y escribe tu email. El enlace que recibes abre una pantalla para poner la nueva contraseña; después vuelves a entrar con ella.',
      },
      {
        heading: 'Perfil',
        body: 'Menú de usuario → «Perfil». Puedes elegir las unidades de viento (nudos, km/h o m/s), poner un alias, tu número de WhatsApp (sin + ni espacios, necesario para las alertas de CallMeBot) y cambiar la contraseña al momento o pedir un email para restablecerla.',
        tags: ['cuenta'],
      },
      {
        heading: 'Eliminar la cuenta',
        body: 'Al final del Perfil, marca la casilla de confirmación y pulsa «Eliminar mi cuenta». Se borran tus sesiones, material, fotos, deportes y perfil. No se puede deshacer.',
        tags: ['cuenta'],
      },
    ],
  },
  {
    id: 'app',
    icon: Smartphone,
    title: 'Instalar la app',
    intro: 'WindFlowRadar se instala como una app más, sin pasar por ninguna tienda.',
    color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/30',
    items: [
      {
        heading: 'Android y ordenador',
        body: 'En Chrome o Edge abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio».',
      },
      {
        heading: 'iPhone y iPad',
        body: 'En Safari pulsa Compartir → «Añadir a pantalla de inicio». Instalarla es necesario para recibir notificaciones push en iOS.',
      },
      {
        heading: 'Actualizaciones',
        body: 'Cuando haya una versión nueva verás el aviso «Hay una nueva versión»: pulsa «Recargar» para usarla.',
      },
      {
        heading: 'Sin conexión',
        body: 'La app abre sin conexión y muestra la última previsión consultada durante una hora. Iniciar sesión, las sesiones y el material necesitan conexión.',
      },
    ],
  },
  {
    id: 'apariencia',
    icon: Palette,
    title: 'Tema e idioma',
    intro: 'Adapta la app a tu gusto.',
    color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30',
    items: [
      {
        heading: 'Tema',
        body: 'El botón de tema de la cabecera alterna entre 🌙 Oscuro, ☀️ Claro y 📖 Ebook (tonos cálidos, cómodo al sol).',
        tags: ['dispositivo'],
      },
      {
        heading: 'Idioma',
        body: 'El botón de la bandera cambia entre castellano y català.',
        tags: ['dispositivo'],
      },
    ],
  },
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'Preguntas frecuentes',
    intro: 'Lo que más se suele preguntar.',
    color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/30',
    items: [
      {
        heading: 'No me llega la alerta de WhatsApp',
        body: 'Comprueba que enviaste el mensaje de activación a CallMeBot, que la API Key y tu número del Perfil son correctos y que pulsaste «Guardar». Recuerda que el aviso automático solo llega si alguna hora del rango alcanza el umbral desde una de las direcciones marcadas; usa «Probar alerta ahora» para comprobar la conexión.',
      },
      {
        heading: 'No me llegan las notificaciones push',
        body: 'Revisa que en ese dispositivo aparezca «Activas» y que el permiso de notificaciones del navegador o del sistema no esté bloqueado. En iPhone tienen que activarse desde la app instalada en la pantalla de inicio.',
      },
      {
        heading: '¿Por qué no veo «AROME HD»?',
        body: 'AROME solo cubre Francia y los países vecinos (no llega, por ejemplo, a Canarias), y solo hoy y mañana. En otras zonas o fechas la app usa el modelo global.',
      },
      {
        heading: 'Un día pasado sale sin datos',
        body: 'El archivo histórico tarda un poco en publicar los datos de los días más recientes. Vuelve a intentarlo más tarde.',
      },
      {
        heading: '¿Los datos son fiables?',
        body: 'Vienen de Open-Meteo (modelos de Météo-France, ECMWF, GFS y Copernicus Marine). Son una previsión: comprueba siempre las condiciones reales en el spot antes de salir al agua.',
      },
      {
        heading: '¿Qué datos guardáis?',
        body: 'Tu email, tu configuración y lo que registras (sesiones, material y fotos). Los favoritos, las búsquedas y el tema se quedan en tu navegador. Tienes el detalle en Privacidad y puedes cambiar las cookies en «Configurar cookies», al pie de la página.',
      },
    ],
  },
];

const ROW_LEGEND = [
  { over: 0, label: '+0–4' },
  { over: 5, label: '+5–9' },
  { over: 10, label: '+10–14' },
  { over: 15, label: '+15–19' },
  { over: 20, label: '+20–29' },
  { over: 30, label: '+30' },
];

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function RowColorLegend() {
  const threshold = 10;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Colores de la tabla</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Las horas por debajo del umbral no se colorean. Por encima, el color indica cuántos nudos lo superan:
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {ROW_LEGEND.map(({ over, label }) => (
          <div
            key={over}
            className="rounded-md border border-border px-2 py-1.5 text-center font-mono text-[0.7rem] font-bold text-foreground"
            style={windRowStyle(threshold + over, threshold)}
          >
            {label} kn
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Help() {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const q = normalize(query.trim());
  const visibleSections = useMemo(() => {
    if (!q) return SECTIONS;
    return SECTIONS
      .map(s => ({
        ...s,
        items: s.items.filter(it => normalize(`${s.title} ${it.heading} ${it.body} ${it.tip ?? ''}`).includes(q)),
      }))
      .filter(s => s.items.length > 0);
  }, [q]);

  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-primary">
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
        <aside className="hidden lg:block lg:w-52 lg:shrink-0">
          <nav className="sticky top-20 space-y-1" aria-label="Contenido">
            <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">Contenido</p>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <s.icon size={13} className={s.color} />
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-8">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Guía de uso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo lo que necesitas saber para sacar el máximo partido a WindFlowRadar.
            </p>
          </div>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar en la ayuda: alertas, AROME, fotos…"
              aria-label="Buscar en la ayuda"
              className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-10 text-sm text-foreground outline-none transition focus:border-primary"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Borrar búsqueda"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {!q && (
            <nav className="flex flex-wrap gap-2 lg:hidden" aria-label="Contenido">
              {SECTIONS.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider transition ${s.border} ${s.bg} ${s.color}`}
                >
                  <s.icon size={11} />
                  {s.title}
                </a>
              ))}
            </nav>
          )}

          {visibleSections.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold text-foreground">Sin resultados para «{query.trim()}»</p>
              <p className="mt-1 text-xs text-muted-foreground">Prueba con otra palabra o escríbenos y te ayudamos.</p>
            </div>
          )}

          {visibleSections.map(section => {
            const open = !!q || !collapsed.has(section.id);
            return (
              <section key={section.id} id={section.id} className="scroll-mt-20">
                <button
                  onClick={() => toggle(section.id)}
                  aria-expanded={open}
                  aria-controls={`${section.id}-items`}
                  disabled={!!q}
                  className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left ${section.bg} ${section.border}`}
                >
                  <section.icon size={18} className={section.color} />
                  <span className="min-w-0 flex-1">
                    <span className={`block font-display text-base font-extrabold uppercase tracking-wider ${section.color}`}>
                      {section.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{section.intro}</span>
                  </span>
                  {!q && (
                    <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {open && (
                  <div id={`${section.id}-items`} className="mt-3 space-y-3">
                    <ul className="space-y-3">
                      {section.items.map(item => (
                        <li key={item.heading} className="rounded-xl border border-border bg-card p-4">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-semibold leading-snug text-foreground">{item.heading}</p>
                            {item.tags?.map(tag => (
                              <span
                                key={tag}
                                className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground"
                              >
                                {TAG_LABEL[tag]}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                          {item.tip && (
                            <p className={`mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed text-foreground ${section.bg} ${section.border}`}>
                              {item.tip}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {section.id === 'prevision' && !q && <RowColorLegend />}
                  </div>
                )}
              </section>
            );
          })}

          <p className="pb-8 text-center text-xs text-muted-foreground">
            ¿Tienes alguna duda o sugerencia?{' '}
            <a href="mailto:juhabar@gmail.com" className="text-primary underline">Escríbenos</a>.
          </p>
        </main>
      </div>
    </div>
  );
}
