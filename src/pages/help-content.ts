// Help page texts per language. Section order, icons and colours live in Help.tsx.
// Kept out of the i18n JSON files because they are long-form content, not UI labels.

export type HelpTag = 'cuenta' | 'dispositivo';
export type HelpLang = 'es' | 'ca';

export interface HelpItemText {
  heading: string;
  body: string;
  tip?: string;
  tags?: HelpTag[];
}

export interface HelpSectionText {
  title: string;
  intro: string;
  items: HelpItemText[];
}

export interface HelpContent {
  ui: Record<'back' | 'title' | 'subtitle' | 'contents' | 'searchPlaceholder' | 'searchLabel' | 'clearSearch' | 'noResults' | 'noResultsHint' | 'question' | 'contact' | 'tagAccount' | 'tagDevice' | 'legendTitle' | 'legendDesc', string>;
  sections: Record<string, HelpSectionText>;
}

export const HELP_CONTENT: Record<HelpLang, HelpContent> = {
  "es": {
    "ui": {
      "back": "Volver",
      "title": "Guía de uso",
      "subtitle": "Todo lo que necesitas saber para sacar el máximo partido a WindFlowRadar.",
      "contents": "Contenido",
      "searchPlaceholder": "Buscar en la ayuda: alertas, AROME, fotos…",
      "searchLabel": "Buscar en la ayuda",
      "clearSearch": "Borrar búsqueda",
      "noResults": "Sin resultados para «{q}»",
      "noResultsHint": "Prueba con otra palabra o escríbenos y te ayudamos.",
      "question": "¿Tienes alguna duda o sugerencia?",
      "contact": "Escríbenos",
      "tagAccount": "Requiere cuenta",
      "tagDevice": "Solo en este dispositivo",
      "legendTitle": "Colores de la tabla",
      "legendDesc": "Las horas por debajo del umbral no se colorean. Por encima, el color indica cuántos nudos lo superan:"
    },
    "sections": {
      "inicio": {
        "title": "Primeros pasos",
        "intro": "En menos de un minuto tienes la previsión de tu spot.",
        "items": [
          {
            "heading": "1. Busca tu spot",
            "body": "Escribe el nombre de una playa, pueblo o ciudad en «Buscar lugar...» y elige una de las sugerencias. La previsión se carga al momento y la próxima vez que abras la app se cargará sola la última búsqueda."
          },
          {
            "heading": "2. Mira las condiciones",
            "body": "Arriba tienes las condiciones actuales (viento, dirección, ola, temperatura). Debajo, el gráfico de 7 días y la tabla hora a hora del día elegido."
          },
          {
            "heading": "3. Guárdalo en favoritos",
            "body": "Pulsa la estrella «Añadir» junto al nombre del lugar. Desde el botón ⭐ de la cabecera vuelves a él con un toque."
          },
          {
            "heading": "4. Crea una cuenta para ir más allá",
            "body": "Con cuenta puedes recibir alertas de viento por email, WhatsApp o notificación, registrar tus sesiones, guardar tu material y compartir la previsión.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "buscar": {
        "title": "Buscar y favoritos",
        "intro": "Cómo encontrar un lugar y tener tus spots a mano.",
        "items": [
          {
            "heading": "Buscador",
            "body": "Las sugerencias aparecen a partir de 2 letras e indican región, país y coordenadas para distinguir lugares con el mismo nombre. Con Enter o «BUSCAR» se carga el primer resultado. La ✕ vacía el campo."
          },
          {
            "heading": "Mi ubicación",
            "body": "El botón de la diana, junto al buscador, carga la previsión del lugar donde estás. La primera vez el navegador te pedirá permiso para usar tu ubicación."
          },
          {
            "heading": "Búsquedas recientes",
            "body": "Al pulsar en el buscador vacío se muestran tus últimas búsquedas para repetirlas sin escribir.",
            "tags": [
              "dispositivo"
            ]
          },
          {
            "heading": "Guardar y quitar favoritos",
            "body": "Usa la estrella junto al nombre del lugar o, en el desplegable ⭐ de la cabecera, «Guardar spot actual» / «Quitar de favoritos». Se guarda con el nombre de la búsqueda. Puedes tener hasta 30."
          },
          {
            "heading": "Favoritos en todos tus dispositivos",
            "body": "Sin cuenta, los favoritos se guardan solo en este navegador. Si inicias sesión, se guardan también en tu cuenta y aparecen en el móvil, la tablet y el ordenador. La primera vez que entras en un dispositivo, sus favoritos se suman a los de la cuenta.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Tus spots de un vistazo",
            "body": "Si tienes favoritos, en la pantalla principal aparece «Tus spots»: una tarjeta por spot con el viento máximo de hoy y mañana, su dirección y las horas en que se alcanza tu umbral. Las tarjetas con viento suficiente hoy se marcan en verde. Toca una para abrir ese spot."
          },
          {
            "heading": "Abrir o borrar un favorito",
            "body": "En el desplegable ⭐ pulsa un spot para cargarlo o la papelera para borrarlo. El número del botón indica cuántos tienes.",
            "tip": "Sin cuenta, si cambias de móvil o borras los datos del navegador, los favoritos se pierden. Con cuenta los recuperas al iniciar sesión."
          }
        ]
      },
      "prevision": {
        "title": "Leer la previsión",
        "intro": "Qué significa cada bloque de la pantalla principal.",
        "items": [
          {
            "heading": "Elegir el día",
            "body": "Con el selector de fecha de la cabecera puedes ver desde 7 días atrás hasta 6 días adelante. Los días pasados salen del archivo histórico; entre hoy y los próximos días el cambio es instantáneo porque la previsión de 7 días ya está descargada."
          },
          {
            "heading": "Condiciones actuales",
            "body": "Muestran la hora más cercana a ahora (o la primera hora visible si miras otro día): dirección con el nombre local del viento (Tramontana, Garbí, Levante…) y su fuerza Beaufort, viento medio con racha y mínimo del día, precipitación, temperatura del aire y del agua, altura de ola y swell, y el estado del cielo."
          },
          {
            "heading": "Previsión 7 días",
            "body": "Barras de viento cada 2 horas con la racha en naranja, y cada 6 horas la dirección, la ola y el tiempo. Desliza en horizontal para recorrer la semana."
          },
          {
            "heading": "Tabla hora a hora",
            "body": "Viento, racha, viento a 100 m, dirección, ola, temperatura, tiempo, lluvia y Beaufort de cada hora. La fila de la hora actual lleva ▶. En el móvil cada hora es una tarjeta. Solo se muestran las horas del rango que elijas en Configuración."
          },
          {
            "heading": "Mejor ventana",
            "body": "Encima de la tabla verás la mejor ventana del día elegido: el tramo seguido más largo con viento igual o superior a tu umbral, por ejemplo «de 14 a 18 h · 16–22 kn del SO». Si ninguna hora llega al umbral, se indica el viento máximo del día y a qué hora."
          },
          {
            "heading": "AROME HD y el intervalo 15 min",
            "body": "Para hoy y mañana, en Francia y los países vecinos (incluida la mayor parte de la península y Baleares), la app usa el modelo AROME de Météo-France a 1,3 km. Cuando está disponible verás el distintivo «AROME HD» y podrás cambiar el «Intervalo» entre 1h, 30min y 15min. Si no hay AROME para tu zona se usa el modelo global sin avisar."
          },
          {
            "heading": "Big Day",
            "body": "Si hoy hay al menos 2 horas seguidas con viento igual o superior al umbral, junto al nombre del lugar aparece «Big Day». Si el lugar coincide con uno de «Mis spots» se usa el umbral de ese spot."
          },
          {
            "heading": "Gráficos y comparar viento",
            "body": "Debajo de la tabla hay gráficos de viento y rachas, altura de ola y temperatura de aire y agua para los próximos días. En «Comparar viento» eliges otra fecha y se superpone su viento al de hoy."
          },
          {
            "heading": "Mapa de viento",
            "body": "El botón del mapa, en la cabecera, abre un mapa con flechas de viento sobre la zona que ves: indican hacia dónde sopla, con su color y su valor en tu unidad. Con la barra inferior recorres hoy y mañana hora a hora. Donde hay AROME HD se usa ese modelo y, si no, el global. Tus favoritos aparecen con su viento; tócalos para abrir su previsión."
          },
          {
            "heading": "Unidades",
            "body": "El viento se muestra en nudos (kn) o en la unidad que elijas en tu Perfil (km/h o m/s). La ola va en metros, la temperatura en °C y la lluvia en mm.",
            "tip": "El umbral de viento y las alertas se configuran siempre en nudos."
          },
          {
            "heading": "Dirección del viento",
            "body": "El texto (SO, 225°, Garbí…) indica de dónde viene el viento, con 16 puntos cardinales (la O es oeste). Las flechas, en la rosa, la tabla y los gráficos, indican hacia dónde sopla."
          }
        ]
      },
      "configuracion": {
        "title": "Configuración",
        "intro": "Menú de usuario → «Configuración» (desde la pantalla principal). Los cambios se aplican al pulsar «Guardar».",
        "items": [
          {
            "heading": "Umbral de viento mínimo",
            "body": "Entre 5 y 30 nudos. Las horas con viento igual o superior se colorean en la tabla y es el valor que usan las alertas de email, WhatsApp y push.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Rango de horas visible",
            "body": "«Desde» y «Hasta» limitan las horas de la tabla, por ejemplo de 08:00 a 20:00 para no ver la noche.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          },
          {
            "heading": "Mis spots",
            "body": "Con «Añadir spot» guardas lugares con su propio viento mínimo. Sirven para el aviso «Big Day»: cuando consultas uno de ellos se usa su umbral en lugar del general.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          }
        ]
      },
      "alertas": {
        "title": "Alertas de viento",
        "intro": "Recibe la previsión sin abrir la app. Se configuran en Configuración y funcionan aunque tengas la app cerrada.",
        "items": [
          {
            "heading": "Email con la previsión",
            "body": "Activa «Envío automático por email», escribe la ubicación y elige una o dos horas de envío y el rango de horas del informe. Llega al email de tu cuenta a esas horas todos los días, haya viento o no; las horas que superan el umbral salen en verde. Las horas de envío son en hora de Madrid.",
            "tip": "El email de la cuenta tiene que estar confirmado. Si no te llega, mira en la carpeta de spam.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Ubicación y horas de las alertas",
            "body": "En «Alertas de viento» eliges el spot, una o dos horas de envío y el rango de horas a revisar. Lo comparten WhatsApp y las notificaciones push. Las horas son las del lugar del spot.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Direcciones del viento",
            "body": "En «Direcciones del viento» marcas en la rosa de dónde tiene que soplar el viento para que el spot funcione, por ejemplo SO y OSO para el Garbí. Solo te avisaremos si hay viento suficiente desde esas direcciones. Sin ninguna marcada, vale cualquier dirección.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "WhatsApp (CallMeBot)",
            "body": "Primero, una sola vez, envía por WhatsApp el mensaje «I allow callmebot to send me messages» al +34 644 91 96 80: te responderán con tu API Key. Pega la key en «API Key CallMeBot», pon tu número en el Perfil y activa «Envío automático por WhatsApp». Solo recibirás mensaje los días en que alguna hora del rango alcance el umbral.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Notificaciones push",
            "body": "En «Notificaciones push» pulsa «Activar en este dispositivo» y acepta el permiso del navegador. Hay que activarlas en cada móvil u ordenador. Avisan solo cuando hay viento suficiente y al tocarlas se abre la app. Funcionan aunque WhatsApp esté desactivado.",
            "tip": "En iPhone y iPad (iOS 16.4 o superior) primero hay que instalar la app: Compartir → «Añadir a pantalla de inicio», y activarlas desde la app instalada.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Botones de prueba",
            "body": "«Probar email ahora», «Probar alerta ahora» y «Enviar prueba» envían al momento, aunque no haya viento. Cada canal permite una prueba cada 5 minutos.",
            "tip": "La prueba usa lo que está guardado: pulsa «Guardar» antes de probar un cambio.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "compartir": {
        "title": "Compartir la previsión",
        "intro": "Manda a tu grupo las horas buenas del día.",
        "items": [
          {
            "heading": "Enviar por WhatsApp u otra app",
            "body": "Con una previsión cargada, abre el menú de usuario → «Compartir previsión», elige «Desde» y «Hasta» y pulsa «Compartir». En el móvil se abre el menú de compartir del sistema; en el ordenador el texto se copia para pegarlo en WhatsApp Web con Ctrl+V.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "sesiones": {
        "title": "Sesiones",
        "intro": "Tu diario de navegación: menú de usuario → «Sesiones».",
        "items": [
          {
            "heading": "Registrar una sesión",
            "body": "Pulsa «Nueva», busca la ubicación y elige fecha, hora de inicio y de fin. Después pulsa «Cargar datos meteo del rango» para guardar el viento, la racha, la dirección, la ola y la temperatura de esas horas. Completa deporte, material, URL de tracking (Strava, etc.) y notas, y pulsa «Guardar sesión».",
            "tip": "Si cambias la fecha, las horas o el lugar después de cargar los datos meteo, se descartan y hay que volver a cargarlos.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Deporte y material",
            "body": "El deporte decide qué huecos de material se muestran. Si falta algo, el botón + junto a cada campo lo crea sin salir del formulario.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Resumen",
            "body": "Filtra por «Año», «Mes», «Rango» o «Todo» para ver sesiones y horas en el agua por deporte, horas por material y un gráfico de actividad. El filtro también se aplica al historial.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Historial",
            "body": "Cada tarjeta muestra lugar, deporte, fecha, horario, datos meteo, material, enlace de tracking y notas. Desde sus iconos puedes compartirla, editarla o borrarla.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Compartir en Instagram",
            "body": "El icono de compartir de una sesión genera una imagen vertical de historia con tus datos. Elige plantilla (Franja, Foto o Ficha) y una foto de fondo de tu galería o de tu material. En el móvil se abre el menú de compartir; en el ordenador se descarga la imagen.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Diseñar tu tarjeta",
            "body": "Con el botón «Tarjeta» eliges la plantilla por defecto, qué datos se muestran (viento, racha, olas, duración, gráfica, equipo, QR del tracking…), su posición y la alineación. Los cambios se guardan solos en este dispositivo.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          }
        ]
      },
      "material": {
        "title": "Material",
        "intro": "Tu inventario de tablas, velas, alas y demás: menú de usuario → «Materiales».",
        "items": [
          {
            "heading": "Deportes",
            "body": "Crea tus deportes (Windsurf, Kitesurf, Wing…) en «Deportes». Puedes renombrarlos con el lápiz o borrarlos.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Slots",
            "body": "Un slot es un tipo de material, como Velas o Tablas. Pulsa «Añadir slot», dale nombre con el lápiz y asígnalo a un deporte o a «Todos los deportes». Cada slot aparece como un campo al registrar una sesión.",
            "tip": "Al borrar un slot se borran también sus materiales y fotos.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Añadir material",
            "body": "Escribe el nombre en el campo del slot (por ejemplo «Severne Blade 5.3») y pulsa «Añadir» o Enter. Con el lápiz lo editas y con la papelera lo borras.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Horas de uso y mantenimiento",
            "body": "Debajo de cada material verás las horas de uso que suman tus sesiones. Con el lápiz puedes indicar «Revisar cada … h»: la app contará las horas desde la última revisión y te avisará con «Revisión pendiente» cuando toque. Pulsa «Revisado hoy» al hacerla para empezar a contar de nuevo.",
            "tip": "Si cambias el nombre de un material, también se cambia en tus sesiones pasadas para no perder sus horas.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Fotos",
            "body": "Pulsa el recuadro de imagen para subir una foto JPG, PNG o WebP de hasta 20 MB. La app la reduce automáticamente antes de subirla. Pulsa la miniatura para verla en grande.",
            "tip": "Las fotos se guardan con un enlace público: cualquiera que tenga el enlace puede verlas. No subas fotos con datos personales.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "cuenta": {
        "title": "Cuenta y perfil",
        "intro": "Registro, contraseña y datos de tu cuenta.",
        "items": [
          {
            "heading": "Crear cuenta",
            "body": "Pulsa «Entrar» → «¿No tienes cuenta? Regístrate». La contraseña necesita al menos 10 caracteres con mayúscula, minúscula, número y símbolo. Después confirma tu email con el enlace que te enviamos."
          },
          {
            "heading": "He olvidado la contraseña",
            "body": "En «Entrar» pulsa «¿Olvidaste tu contraseña?» y escribe tu email. El enlace que recibes abre una pantalla para poner la nueva contraseña; después vuelves a entrar con ella."
          },
          {
            "heading": "Perfil",
            "body": "Menú de usuario → «Perfil». Puedes elegir las unidades de viento (nudos, km/h o m/s), poner un alias, tu número de WhatsApp (sin + ni espacios, necesario para las alertas de CallMeBot) y cambiar la contraseña al momento o pedir un email para restablecerla.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Eliminar la cuenta",
            "body": "Al final del Perfil, marca la casilla de confirmación y pulsa «Eliminar mi cuenta». Se borran tus sesiones, material, fotos, deportes y perfil. No se puede deshacer.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "app": {
        "title": "Instalar la app",
        "intro": "WindFlowRadar se instala como una app más, sin pasar por ninguna tienda.",
        "items": [
          {
            "heading": "Android y ordenador",
            "body": "Pulsa «Instalar app» (aquí abajo o al pie de la pantalla principal). Si no aparece, en Chrome o Edge abre el menú del navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio»."
          },
          {
            "heading": "iPhone y iPad",
            "body": "En Safari pulsa Compartir → «Añadir a pantalla de inicio». El botón «Instalar app» te muestra los pasos. Instalarla es necesario para recibir notificaciones push en iOS."
          },
          {
            "heading": "Actualizaciones",
            "body": "Cuando haya una versión nueva verás el aviso «Hay una nueva versión»: pulsa «Recargar» para usarla."
          },
          {
            "heading": "Sin conexión",
            "body": "La app abre sin conexión y muestra la última previsión consultada durante una hora. Iniciar sesión, las sesiones y el material necesitan conexión."
          }
        ]
      },
      "apariencia": {
        "title": "Tema e idioma",
        "intro": "Adapta la app a tu gusto.",
        "items": [
          {
            "heading": "Tema",
            "body": "El botón de tema de la cabecera alterna entre 🌙 Oscuro, ☀️ Claro y 📖 Ebook (tonos cálidos, cómodo al sol).",
            "tags": [
              "dispositivo"
            ]
          },
          {
            "heading": "Idioma",
            "body": "El botón de la bandera cambia entre castellano y català.",
            "tags": [
              "dispositivo"
            ]
          }
        ]
      },
      "faq": {
        "title": "Preguntas frecuentes",
        "intro": "Lo que más se suele preguntar.",
        "items": [
          {
            "heading": "No me llega la alerta de WhatsApp",
            "body": "Comprueba que enviaste el mensaje de activación a CallMeBot, que la API Key y tu número del Perfil son correctos y que pulsaste «Guardar». Recuerda que el aviso automático solo llega si alguna hora del rango alcanza el umbral desde una de las direcciones marcadas; usa «Probar alerta ahora» para comprobar la conexión."
          },
          {
            "heading": "No me llegan las notificaciones push",
            "body": "Revisa que en ese dispositivo aparezca «Activas» y que el permiso de notificaciones del navegador o del sistema no esté bloqueado. En iPhone tienen que activarse desde la app instalada en la pantalla de inicio."
          },
          {
            "heading": "¿Por qué no veo «AROME HD»?",
            "body": "AROME solo cubre Francia y los países vecinos (no llega, por ejemplo, a Canarias), y solo hoy y mañana. En otras zonas o fechas la app usa el modelo global."
          },
          {
            "heading": "Un día pasado sale sin datos",
            "body": "El archivo histórico tarda un poco en publicar los datos de los días más recientes. Vuelve a intentarlo más tarde."
          },
          {
            "heading": "¿Los datos son fiables?",
            "body": "Vienen de Open-Meteo (modelos de Météo-France, ECMWF, GFS y Copernicus Marine). Son una previsión: comprueba siempre las condiciones reales en el spot antes de salir al agua."
          },
          {
            "heading": "¿Qué datos guardáis?",
            "body": "Tu email, tu configuración, tus favoritos y lo que registras (sesiones, material y fotos). Las búsquedas recientes y el tema se quedan en tu navegador. Tienes el detalle en Privacidad y puedes cambiar las cookies en «Configurar cookies», al pie de la página."
          }
        ]
      }
    }
  },
  "ca": {
    "ui": {
      "back": "Tornar",
      "title": "Guia d'ús",
      "subtitle": "Tot el que cal saber per treure el màxim profit de WindFlowRadar.",
      "contents": "Contingut",
      "searchPlaceholder": "Cerca a l'ajuda: alertes, AROME, fotos…",
      "searchLabel": "Cerca a l'ajuda",
      "clearSearch": "Esborrar la cerca",
      "noResults": "Cap resultat per a «{q}»",
      "noResultsHint": "Prova amb una altra paraula o escriu-nos i t'ajudarem.",
      "question": "Tens algun dubte o suggeriment?",
      "contact": "Escriu-nos",
      "tagAccount": "Cal compte",
      "tagDevice": "Només en aquest dispositiu",
      "legendTitle": "Colors de la taula",
      "legendDesc": "Les hores per sota del llindar no es pinten. Per sobre, el color indica quants nusos el superen:"
    },
    "sections": {
      "inicio": {
        "title": "Primers passos",
        "intro": "En menys d'un minut tens la previsió del teu spot.",
        "items": [
          {
            "heading": "1. Busca el teu spot",
            "body": "Escriu el nom d'una platja, poble o ciutat a «Cercar lloc...» i tria un dels suggeriments. La previsió es carrega a l'instant i la propera vegada que obris l'app es carregarà sola l'última cerca."
          },
          {
            "heading": "2. Mira les condicions",
            "body": "A dalt tens les condicions actuals (vent, direcció, onada, temperatura). A sota, el gràfic de 7 dies i la taula hora a hora del dia triat."
          },
          {
            "heading": "3. Desa'l als favorits",
            "body": "Prem l'estrella «Afegir» al costat del nom del lloc. Des del botó ⭐ de la capçalera hi tornes amb un toc."
          },
          {
            "heading": "4. Crea un compte per anar més enllà",
            "body": "Amb compte pots rebre alertes de vent per correu, WhatsApp o notificació, registrar les teves sessions, desar el teu material i compartir la previsió.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "buscar": {
        "title": "Cerca i favorits",
        "intro": "Com trobar un lloc i tenir els teus spots a mà.",
        "items": [
          {
            "heading": "Cercador",
            "body": "Els suggeriments apareixen a partir de 2 lletres i indiquen regió, país i coordenades per distingir llocs amb el mateix nom. Amb Enter o «CERCAR» es carrega el primer resultat. La ✕ buida el camp."
          },
          {
            "heading": "La meva ubicació",
            "body": "El botó de la diana, al costat del cercador, carrega la previsió del lloc on ets. La primera vegada el navegador et demanarà permís per fer servir la teva ubicació."
          },
          {
            "heading": "Cerques recents",
            "body": "Si prems el cercador buit es mostren les teves últimes cerques per repetir-les sense escriure.",
            "tags": [
              "dispositivo"
            ]
          },
          {
            "heading": "Desar i treure favorits",
            "body": "Fes servir l'estrella al costat del nom del lloc o, al desplegable ⭐ de la capçalera, «Desar spot actual» / «Treure de favorits». Es desa amb el nom de la cerca. En pots tenir fins a 30."
          },
          {
            "heading": "Favorits a tots els teus dispositius",
            "body": "Sense compte, els favorits es desen només en aquest navegador. Si inicies sessió, es desen també al teu compte i apareixen al mòbil, la tauleta i l'ordinador. La primera vegada que entres en un dispositiu, els seus favorits se sumen als del compte.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Els teus spots d'un cop d'ull",
            "body": "Si tens favorits, a la pantalla principal apareix «Els teus spots»: una targeta per spot amb el vent màxim d'avui i demà, la seva direcció i les hores en què s'arriba al teu llindar. Les targetes amb prou vent avui es marquen en verd. Toca'n una per obrir aquell spot."
          },
          {
            "heading": "Obrir o esborrar un favorit",
            "body": "Al desplegable ⭐ prem un spot per carregar-lo o la paperera per esborrar-lo. El número del botó indica quants en tens.",
            "tip": "Sense compte, si canvies de mòbil o esborres les dades del navegador, els favorits es perden. Amb compte els recuperes en iniciar sessió."
          }
        ]
      },
      "prevision": {
        "title": "Llegir la previsió",
        "intro": "Què vol dir cada bloc de la pantalla principal.",
        "items": [
          {
            "heading": "Triar el dia",
            "body": "Amb el selector de data de la capçalera pots veure des de 7 dies enrere fins a 6 dies endavant. Els dies passats surten de l'arxiu històric; entre avui i els propers dies el canvi és instantani perquè la previsió de 7 dies ja està descarregada."
          },
          {
            "heading": "Condicions actuals",
            "body": "Mostren l'hora més propera a ara (o la primera hora visible si mires un altre dia): direcció amb el nom local del vent (Tramuntana, Garbí, Llevant…) i la seva força Beaufort, vent mitjà amb ratxa i mínim del dia, precipitació, temperatura de l'aire i de l'aigua, alçada d'onada i swell, i l'estat del cel."
          },
          {
            "heading": "Previsió 7 dies",
            "body": "Barres de vent cada 2 hores amb la ratxa en taronja, i cada 6 hores la direcció, l'onada i el temps. Llisca en horitzontal per recórrer la setmana."
          },
          {
            "heading": "Taula hora a hora",
            "body": "Vent, ratxa, vent a 100 m, direcció, onada, temperatura, temps, pluja i Beaufort de cada hora. La fila de l'hora actual porta ▶. Al mòbil cada hora és una targeta. Només es mostren les hores del rang que triïs a Configuració."
          },
          {
            "heading": "Millor finestra",
            "body": "A sobre de la taula veuràs la millor finestra del dia triat: el tram seguit més llarg amb vent igual o superior al teu llindar, per exemple «de 14 a 18 h · 16–22 kn de SO». Si cap hora no arriba al llindar, s'indica el vent màxim del dia i a quina hora."
          },
          {
            "heading": "AROME HD i l'interval de 15 min",
            "body": "Per a avui i demà, a França i els països veïns (inclosa la major part de la península i les Balears), l'app fa servir el model AROME de Météo-France a 1,3 km. Quan està disponible veuràs el distintiu «AROME HD» i podràs canviar l'«Interval» entre 1h, 30min i 15min. Si no hi ha AROME per a la teva zona es fa servir el model global sense avisar."
          },
          {
            "heading": "Big Day",
            "body": "Si avui hi ha almenys 2 hores seguides amb vent igual o superior al llindar, al costat del nom del lloc apareix «Big Day». Si el lloc coincideix amb un dels teus spots (Els meus spots) es fa servir el llindar d'aquell spot."
          },
          {
            "heading": "Gràfics i comparar vent",
            "body": "Sota la taula hi ha gràfics de vent i ratxes, alçada d'onada i temperatura de l'aire i l'aigua per als propers dies. A «Comparar vent» tries una altra data i se superposa el seu vent al d'avui."
          },
          {
            "heading": "Mapa de vent",
            "body": "El botó del mapa, a la capçalera, obre un mapa amb fletxes de vent sobre la zona que veus: indiquen cap on bufa, amb el seu color i el seu valor en la teva unitat. Amb la barra inferior recorres avui i demà hora a hora. On hi ha AROME HD es fa servir aquest model i, si no, el global. Els teus favorits apareixen amb el seu vent; toca'ls per obrir-ne la previsió."
          },
          {
            "heading": "Unitats",
            "body": "El vent es mostra en nusos (kn) o en la unitat que triïs al teu Perfil (km/h o m/s). L'onada va en metres, la temperatura en °C i la pluja en mm.",
            "tip": "El llindar de vent i les alertes es configuren sempre en nusos."
          },
          {
            "heading": "Direcció del vent",
            "body": "El text (SO, 225°, Garbí…) indica d'on ve el vent, amb 16 punts cardinals (la O és oest). Les fletxes, a la rosa, la taula i els gràfics, indiquen cap on bufa."
          }
        ]
      },
      "configuracion": {
        "title": "Configuració",
        "intro": "Menú d'usuari → «Configuració» (des de la pantalla principal). Els canvis s'apliquen en prémer «Desar».",
        "items": [
          {
            "heading": "Llindar de vent mínim",
            "body": "Entre 5 i 30 nusos. Les hores amb vent igual o superior es pinten de color a la taula i és el valor que fan servir les alertes de correu, WhatsApp i push.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Rang d'hores visible",
            "body": "«Des de» i «Fins a» limiten les hores de la taula, per exemple de 08:00 a 20:00 per no veure la nit.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          },
          {
            "heading": "Els meus spots",
            "body": "Amb «Afegir spot» deses llocs amb el seu propi vent mínim. Serveixen per a l'avís «Big Day»: quan en consultes un es fa servir el seu llindar en lloc del general.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          }
        ]
      },
      "alertas": {
        "title": "Alertes de vent",
        "intro": "Rep la previsió sense obrir l'app. Es configuren a Configuració i funcionen encara que tinguis l'app tancada.",
        "items": [
          {
            "heading": "Correu amb la previsió",
            "body": "Activa «Enviament automàtic per correu», escriu la ubicació i tria una o dues hores d'enviament i el rang d'hores de l'informe. Arriba al correu del teu compte a aquestes hores cada dia, hi hagi vent o no; les hores que superen el llindar surten en verd. Les hores d'enviament són en hora de Madrid.",
            "tags": [
              "cuenta"
            ],
            "tip": "El correu del compte ha d'estar confirmat. Si no t'arriba, mira a la carpeta de correu brossa."
          },
          {
            "heading": "Ubicació i hores de les alertes",
            "body": "A «Alertes de vent» tries l'spot, una o dues hores d'enviament i el rang d'hores a revisar. Ho comparteixen WhatsApp i les notificacions push. Les hores són les del lloc de l'spot.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Direccions del vent",
            "body": "A «Direccions del vent» marques a la rosa d'on ha de bufar el vent perquè l'spot funcioni, per exemple SO i OSO per al Garbí. Només t'avisarem si hi ha prou vent des d'aquestes direccions. Sense cap de marcada, val qualsevol direcció.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "WhatsApp (CallMeBot)",
            "body": "Primer, una sola vegada, envia per WhatsApp el missatge «I allow callmebot to send me messages» al +34 644 91 96 80: et respondran amb la teva API Key. Enganxa la key a «API Key CallMeBot», posa el teu número al Perfil i activa «Enviament automàtic per WhatsApp». Només rebràs missatge els dies en què alguna hora del rang arribi al llindar.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Notificacions push",
            "body": "A «Notificacions push» prem «Activar en aquest dispositiu» i accepta el permís del navegador. Cal activar-les a cada mòbil o ordinador. Avisen només quan hi ha prou vent i en tocar-les s'obre l'app. Funcionen encara que WhatsApp estigui desactivat.",
            "tags": [
              "cuenta"
            ],
            "tip": "A l'iPhone i l'iPad (iOS 16.4 o superior) primer cal instal·lar l'app: Compartir → «Afegeix a la pantalla d'inici», i activar-les des de l'app instal·lada."
          },
          {
            "heading": "Botons de prova",
            "body": "«Provar email ara», «Provar alerta ara» i «Enviar prova» envien a l'instant, encara que no hi hagi vent. Cada canal permet una prova cada 5 minuts.",
            "tags": [
              "cuenta"
            ],
            "tip": "La prova fa servir el que està desat: prem «Desar» abans de provar un canvi."
          }
        ]
      },
      "compartir": {
        "title": "Compartir la previsió",
        "intro": "Envia al teu grup les bones hores del dia.",
        "items": [
          {
            "heading": "Enviar per WhatsApp o una altra app",
            "body": "Amb una previsió carregada, obre el menú d'usuari → «Compartir la previsió», tria «Des de» i «Fins a» i prem «Compartir». Al mòbil s'obre el menú de compartir del sistema; a l'ordinador el text es copia per enganxar-lo a WhatsApp Web amb Ctrl+V.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "sesiones": {
        "title": "Sessions",
        "intro": "El teu diari de navegació: menú d'usuari → «Sessions».",
        "items": [
          {
            "heading": "Registrar una sessió",
            "body": "Prem «Nova», busca la ubicació i tria data, hora d'inici i de final. Després prem «Carregar dades meteo del rang» per desar el vent, la ratxa, la direcció, l'onada i la temperatura d'aquelles hores. Completa esport, material, URL de seguiment (Strava, etc.) i notes, i prem «Desar sessió».",
            "tags": [
              "cuenta"
            ],
            "tip": "Si canvies la data, les hores o el lloc després de carregar les dades meteo, es descarten i cal tornar-les a carregar."
          },
          {
            "heading": "Esport i material",
            "body": "L'esport decideix quins espais de material es mostren. Si hi falta alguna cosa, el botó + al costat de cada camp la crea sense sortir del formulari.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Resum",
            "body": "Filtra per «Any», «Mes», «Rang» o «Tot» per veure sessions i hores a l'aigua per esport, hores per material i un gràfic d'activitat. El filtre també s'aplica a l'historial.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Historial",
            "body": "Cada targeta mostra lloc, esport, data, horari, dades meteo, material, enllaç de seguiment i notes. Des de les seves icones la pots compartir, editar o esborrar.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Compartir a Instagram",
            "body": "La icona de compartir d'una sessió genera una imatge vertical d'història amb les teves dades. Tria plantilla (Franja, Foto o Fitxa) i una foto de fons de la teva galeria o del teu material. Al mòbil s'obre el menú de compartir; a l'ordinador es descarrega la imatge.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Dissenyar la teva targeta",
            "body": "Amb el botó «Targeta» tries la plantilla per defecte, quines dades es mostren (vent, ratxa, onades, durada, gràfica, equip, QR del seguiment…), la seva posició i l'alineació. Els canvis es desen sols en aquest dispositiu.",
            "tags": [
              "cuenta",
              "dispositivo"
            ]
          }
        ]
      },
      "material": {
        "title": "Material",
        "intro": "El teu inventari de taules, veles, ales i la resta: menú d'usuari → «Materials».",
        "items": [
          {
            "heading": "Esports",
            "body": "Crea els teus esports (Windsurf, Kitesurf, Wing…) a «Esports». Els pots canviar de nom amb el llapis o esborrar.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Slots",
            "body": "Un slot és un tipus de material, com Veles o Taules. Prem «Afegir slot», posa-li nom amb el llapis i assigna'l a un esport o a «Tots els esports». Cada slot apareix com un camp en registrar una sessió.",
            "tags": [
              "cuenta"
            ],
            "tip": "En esborrar un slot s'esborren també els seus materials i fotos."
          },
          {
            "heading": "Afegir material",
            "body": "Escriu el nom al camp del slot (per exemple «Severne Blade 5.3») i prem «Afegir» o Enter. Amb el llapis l'edites i amb la paperera l'esborres.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Hores d'ús i manteniment",
            "body": "Sota cada material veuràs les hores d'ús que sumen les teves sessions. Amb el llapis pots indicar «Revisa cada … h»: l'app comptarà les hores des de l'última revisió i t'avisarà amb «Revisió pendent» quan toqui. Prem «Revisat avui» en fer-la per tornar a començar a comptar.",
            "tags": [
              "cuenta"
            ],
            "tip": "Si canvies el nom d'un material, també es canvia a les teves sessions passades per no perdre'n les hores."
          },
          {
            "heading": "Fotos",
            "body": "Prem el requadre d'imatge per pujar una foto JPG, PNG o WebP de fins a 20 MB. L'app la redueix automàticament abans de pujar-la. Prem la miniatura per veure-la en gran.",
            "tags": [
              "cuenta"
            ],
            "tip": "Les fotos es desen amb un enllaç públic: qualsevol que tingui l'enllaç les pot veure. No pugis fotos amb dades personals."
          }
        ]
      },
      "cuenta": {
        "title": "Compte i perfil",
        "intro": "Registre, contrasenya i dades del teu compte.",
        "items": [
          {
            "heading": "Crear un compte",
            "body": "Prem «Entrar» → «No tens compte? Registra't». La contrasenya necessita almenys 10 caràcters amb majúscula, minúscula, número i símbol. Després confirma el teu correu amb l'enllaç que t'enviem."
          },
          {
            "heading": "He oblidat la contrasenya",
            "body": "A «Entrar» prem «Has oblidat la contrasenya?» i escriu el teu correu. L'enllaç que reps obre una pantalla per posar la nova contrasenya; després tornes a entrar amb ella."
          },
          {
            "heading": "Perfil",
            "body": "Menú d'usuari → «Perfil». Pots triar les unitats de vent (nusos, km/h o m/s), posar un àlies, el teu número de WhatsApp (sense + ni espais, necessari per a les alertes de CallMeBot) i canviar la contrasenya a l'instant o demanar un correu per restablir-la.",
            "tags": [
              "cuenta"
            ]
          },
          {
            "heading": "Eliminar el compte",
            "body": "Al final del Perfil, marca la casella de confirmació i prem «Eliminar el meu compte». S'esborren les teves sessions, material, fotos, esports i perfil. No es pot desfer.",
            "tags": [
              "cuenta"
            ]
          }
        ]
      },
      "app": {
        "title": "Instal·lar l'app",
        "intro": "WindFlowRadar s'instal·la com una app més, sense passar per cap botiga.",
        "items": [
          {
            "heading": "Android i ordinador",
            "body": "Prem «Instal·lar l'app» (aquí sota o al peu de la pantalla principal). Si no apareix, a Chrome o Edge obre el menú del navegador i tria «Instal·la l'aplicació» o «Afegeix a la pantalla d'inici»."
          },
          {
            "heading": "iPhone i iPad",
            "body": "A Safari prem Compartir → «Afegeix a la pantalla d'inici». El botó «Instal·lar l'app» et mostra els passos. Cal instal·lar-la per rebre notificacions push a iOS."
          },
          {
            "heading": "Actualitzacions",
            "body": "Quan hi hagi una versió nova veuràs l'avís «Hi ha una versió nova»: prem «Recarrega» per fer-la servir."
          },
          {
            "heading": "Sense connexió",
            "body": "L'app s'obre sense connexió i mostra l'última previsió consultada durant una hora. Iniciar sessió, les sessions i el material necessiten connexió."
          }
        ]
      },
      "apariencia": {
        "title": "Tema i idioma",
        "intro": "Adapta l'app al teu gust.",
        "items": [
          {
            "heading": "Tema",
            "body": "El botó de tema de la capçalera alterna entre 🌙 Fosc, ☀️ Clar i 📖 Ebook (tons càlids, còmode al sol).",
            "tags": [
              "dispositivo"
            ]
          },
          {
            "heading": "Idioma",
            "body": "El botó de la bandera canvia entre castellano i català.",
            "tags": [
              "dispositivo"
            ]
          }
        ]
      },
      "faq": {
        "title": "Preguntes freqüents",
        "intro": "El que més es pregunta.",
        "items": [
          {
            "heading": "No m'arriba l'alerta de WhatsApp",
            "body": "Comprova que vas enviar el missatge d'activació a CallMeBot, que l'API Key i el teu número del Perfil són correctes i que vas prémer «Desar». Recorda que l'avís automàtic només arriba si alguna hora del rang arriba al llindar des d'una de les direccions marcades; fes servir «Provar alerta ara» per comprovar la connexió."
          },
          {
            "heading": "No m'arriben les notificacions push",
            "body": "Revisa que en aquell dispositiu aparegui «Actives» i que el permís de notificacions del navegador o del sistema no estigui bloquejat. A l'iPhone s'han d'activar des de l'app instal·lada a la pantalla d'inici."
          },
          {
            "heading": "Per què no veig «AROME HD»?",
            "body": "AROME només cobreix França i els països veïns (no arriba, per exemple, a les Canàries), i només avui i demà. En altres zones o dates l'app fa servir el model global."
          },
          {
            "heading": "Un dia passat surt sense dades",
            "body": "L'arxiu històric triga una mica a publicar les dades dels dies més recents. Torna-ho a provar més tard."
          },
          {
            "heading": "Les dades són fiables?",
            "body": "Vénen d'Open-Meteo (models de Météo-France, ECMWF, GFS i Copernicus Marine). Són una previsió: comprova sempre les condicions reals a l'spot abans de sortir a l'aigua."
          },
          {
            "heading": "Quines dades deseu?",
            "body": "El teu correu, la teva configuració, els teus favorits i el que registres (sessions, material i fotos). Les cerques recents i el tema es queden al teu navegador. Tens el detall a Privacitat i pots canviar les galetes a «Configurar galetes», al peu de la pàgina."
          }
        ]
      }
    }
  }
};
