import { TravelConfig, GeneratedItinerary, ItineraryDay, ItineraryActivity, CafeOrCowork } from "./types";

export interface Suggestion {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "medellin",
    name: "Medellín",
    description: "La 'Ciudad de la Eterna Primavera'. Destacada por su clima templado, montañas verdes, gente acogedora y una inmensa comunidad de nómadas digitales con cafés de clase mundial.",
    image: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=600&q=80",
    tags: ["Comunidad", "Clima", "Cafés"],
  },
  {
    id: "kyoto",
    name: "Kioto",
    description: "Sumérgete en la serenidad de antiguos templos, bosques de bambú y jardines zen. Una mezcla perfecta de tradición mística y calma ideal para el enfoque creativo.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD7-us4vxAyGK3empfqr27gfac21qMGIuI401FmUVe45_S9RPgbB5h0wWAYrs6j5pKfH4XYKhONsxS6iazRXpt2S7IZtm1Dk-kpudoXvhXGH_b2JC2fJ_zJcyLLoTneanxDdLnHKTYVSnIywapM2wVw5T5tYTGGC0cHpDhDm0ZitN8J9JAOl3-wCD2trO5fAXwBN9BlstZz5t2a0SWlfr8KcPiGVSuV3PDsQt-ql9mtCDnSl72_psCa1w",
    tags: ["Cultura", "Historia", "Paz"],
  },
  {
    id: "amalfi",
    name: "Costa Amalfitana",
    description: "Pueblos coloridos aferrados a acantilados sobre el resplandeciente Mediterráneo. Estilo de vida italiano costero, gastronomía de autor y paseos marítimos.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJc4rDF35-JjzFhArq8O0vQnBuOBvcSIAMMEHxyAE40spN6gA_g1737UKhaqfrigTZE-Mdff_h7oZh_X73lH2jr3BOmEIuM08io85FNSkv1BHcgIMxHhm8Ba0fpq7OJRVg5_fS-c-cpH58XE8LX6GULwC6BYbnDSYQxML3IqnWi9gBNqWRtirImQFHLfk1RZhHCFxOu5CHQ6yoVABrovSMw7yVKBcOVY78KySB4vZCP4e2WrTUlaQ-xA",
    tags: ["Playa", "Gastronomía", "Vistas"],
  },
  {
    id: "highlands",
    name: "Tierras Altas",
    description: "Paisajes escarpados, lagos misteriosos, castillos milenarios y valles solitarios. Ideal para desconectar del ruido digital y recargar energía creativa.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdNYUpsEBLk3m-JSveDeEQJdq4jFgZd5fuWhXM_oVzG2IjpFFq269FEPrGKXXVz3DQ9tJoD830I74B9nL8LfZIhucRKKN9nE8WnKOEQ2492MrPaS1wNbRXiWY9dT_-7C5SB-6_c6iN5o3PAjWriE5P08nVelUtp8Mt08LFsA2Cp5npcdbialtTyxOGiLDOegZr262UIIIad5xiLU_FHyUW2Lu1IxMi7BDtO2YGvbHtuJWFdQDi_6uB2w",
    tags: ["Naturaleza", "Aventura", "Historia"],
  },
  {
    id: "bali",
    name: "Bali",
    description: "El epicentro global de los nómadas digitales. Ofrece co-workings icónicos de bambú entre arrozales en Ubud, surf en Canggu y templos sagrados rodeados de selva tropical.",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80",
    tags: ["Surf", "Coworking", "Espiritual"],
  }
];

// Mapping of interests/categories dependent on destination chosen
export interface DestinationCategory {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

/** True when the user has typed/selected a real destination (not empty / placeholder). */
export function hasDestination(destination: string | undefined | null): boolean {
  const d = (destination || "").trim();
  if (!d) return false;
  const lower = d.toLowerCase();
  return lower !== "sin especificar" && lower !== "pendiente de selección";
}

/** Generic category-level interests for unknown destinations (and API fallback). */
export const GENERIC_DESTINATION_CATEGORIES: DestinationCategory[] = [
  { id: "coworking", name: "Espacios Coworking", icon: "laptop_mac", desc: "Lugares equipados con Wi-Fi veloz, comunidad y aire acondicionado." },
  { id: "cafes", name: "Cafés de Especialidad", icon: "local_cafe", desc: "Rincones acogedores con buena repostería, espressos y tomas de corriente." },
  { id: "culture", name: "Inmersión Cultural", icon: "museum", desc: "Visitas guiadas, museos significativos, monumentos y barrios locales." },
  { id: "nature", name: "Parques y Escapes", icon: "forest", desc: "Senderos, reservas naturales, montañas o playas cercanas para respirar aire puro." },
  { id: "gastronomy", name: "Gastronomía Local", icon: "restaurant", desc: "Mercados tradicionales, restaurantes autóctonos y platillos icónicos." },
];

/** Static catalog match — null if destination is not in the curated list. */
export function getCatalogCategories(destination: string): DestinationCategory[] | null {
  if (!hasDestination(destination)) return null;

  const norm = destination.toLowerCase().trim();

  if (norm.includes("medellín") || norm.includes("medellin")) {
    return [
      { id: "coworking", name: "Comunidad Coworking", icon: "laptop_mac", desc: "Sedes de Selina, WeWork y colivings en El Poblado y Laureles." },
      { id: "cafes", name: "Cafés de Especialidad", icon: "local_cafe", desc: "Cafés con baristas locales de primer nivel e internet de alta velocidad." },
      { id: "culture", name: "Cultura Paisa", icon: "museum", desc: "Comuna 13, Plaza Botero, museos de arte e inmersión lingüística." },
      { id: "nature", name: "Naturaleza en Arví", icon: "forest", desc: "Parque Arví, senderos ecológicos y escape de montaña en Santa Elena." },
      { id: "nightlife", name: "Vida Nocturna / Salsa", icon: "nightlife", desc: "Bailar salsa en El Eslabón Prendido o bares boutique en Provenza." },
    ];
  }

  if (norm.includes("kioto") || norm.includes("kyoto")) {
    return [
      { id: "peace", name: "Paz y Meditación", icon: "self_improvement", desc: "Templos budistas antiguos, jardines zen de arena y templos de silencio." },
      { id: "cafes", name: "Cafés de Especialidad", icon: "local_cafe", desc: "Microtostadores minimalistas como % Arabica a orillas del río." },
      { id: "history", name: "Templos e Historia", icon: "museum", desc: "Kinkaku-ji (Pabellón Dorado), Fushimi Inari y el barrio de Gion." },
      { id: "nature", name: "Naturaleza Serena", icon: "forest", desc: "Bosque de bambú de Arashiyama y paseos junto al Río Kamo." },
      { id: "gastronomy", name: "Gastronomía Tradicional", icon: "restaurant", desc: "Comida Kaiseki de temporada y brochetas en el mercado de Nishiki." },
    ];
  }

  if (norm.includes("amalfi") || norm.includes("positano") || norm.includes("amalfitana")) {
    return [
      { id: "vistas", name: "Vistas de Acantilados", icon: "photo_camera", desc: "Miradores espectaculares de Positano, Amalfi y senderos escénicos." },
      { id: "beach", name: "Playas y Mar Tirreno", icon: "surfing", desc: "Playas de guijarros de ensueño y calas de aguas turquesas." },
      { id: "gastronomy", name: "Gastronomía Italiana", icon: "restaurant", desc: "Pasta con mariscos frescos, cata de limoncello y pizzerías rústicas." },
      { id: "boats", name: "Paseos en Bote", icon: "directions_boat", desc: "Excursiones de día a Capri o navegación privada por la costa." },
      { id: "nightlife", name: "Vida Nocturna Relajada", icon: "nightlife", desc: "Terrazas elegantes con Spritz y música acústica frente al mar." },
    ];
  }

  if (norm.includes("highlands") || norm.includes("tierras altas") || norm.includes("escocia") || norm.includes("scotland")) {
    return [
      { id: "nature", name: "Naturaleza Salvaje", icon: "forest", desc: "Paisajes de película en Glen Coe y valles escarpados infinitos." },
      { id: "lakes", name: "Senderismo y Lagos", icon: "explore", desc: "Rutas alrededor del misterioso Lago Ness y el espectacular Loch Lomond." },
      { id: "castles", name: "Castillos e Historia", icon: "castle", desc: "Ruinas medievales del Castillo de Urquhart y fortalezas habitadas." },
      { id: "creative", name: "Retiro Creativo", icon: "edit", desc: "Cabañas tranquilas de piedra perfectas para escribir, diseñar o programar." },
      { id: "gastronomy", name: "Gastronomía Rústica", icon: "restaurant", desc: "Pubs acogedores con chimenea, pescados locales y cata de whisky escocés." },
    ];
  }

  if (norm.includes("bali")) {
    return [
      { id: "surf", name: "Surf en Canggu y Uluwatu", icon: "surfing", desc: "Olas de categoría mundial, playas con arena volcánica y vibra playera." },
      { id: "coworking", name: "Coworking de Bambú", icon: "laptop_mac", desc: "Espacios de trabajo abiertos integrados en la jungla como Outpost u Dojo." },
      { id: "spiritual", name: "Espiritualidad y Yoga", icon: "self_improvement", desc: "Clases en The Yoga Barn Ubud y ceremonias de purificación en templos de agua." },
      { id: "beach", name: "Playas Tropicales", icon: "beach_access", desc: "Atardeceres dorados en Seminyak, playas tranquilas en Nusa Dua." },
      { id: "wellness", name: "Bienestar y Masajes", icon: "spa", desc: "Tratamientos holísticos, spas balineses tradicionales y jugos orgánicos." },
    ];
  }

  return null;
}

export function isKnownDestination(destination: string): boolean {
  return getCatalogCategories(destination) !== null;
}

export const getCategoriesForDestination = (destination: string): DestinationCategory[] => {
  if (!hasDestination(destination)) return [];
  return getCatalogCategories(destination) || [...GENERIC_DESTINATION_CATEGORIES];
};

export const BUDGET_OPTIONS = [
  { id: "mochilero", name: "Mochilero", icon: "backpack", label: "Económico", desc: "Hostales, street food, cafés accesibles y transporte público." },
  { id: "estandar", name: "Nómada / Estándar", icon: "laptop_chromebook", label: "Equilibrado", desc: "Depto o coliving, café de especialidad y tours locales." },
  { id: "lujo", name: "Premium / Lujo", icon: "diamond", label: "Exclusivo", desc: "Boutique hotels, villas, cowork premium y cenas gourmet." }
];

export const INTEREST_OPTIONS = [
  { id: "coworking", name: "Coworking moderno", icon: "laptop_mac", desc: "Zonas con excelente internet, escritorios ergonómicos y comunidad activa." },
  { id: "cafes", name: "Cafés de especialidad", icon: "local_cafe", desc: "Sitios acogedores para trabajar con buen espresso y ambiente vibrante." },
  { id: "culture", name: "Cultura e Historia", icon: "museum", desc: "Templos, museos, ruinas históricas y festivales locales." },
  { id: "nature", name: "Naturaleza y Parques", icon: "forest", desc: "Senderismo, áreas verdes, montañas o reservas ecológicas." },
  { id: "beach", name: "Playas y Surf", icon: "surfing", desc: "Cercanía al mar, actividades acuáticas y club de playas." },
  { id: "gastronomy", name: "Gastronomía Local", icon: "restaurant", desc: "Mercados locales, street food y restaurantes imperdibles." },
  { id: "nightlife", name: "Vida Nocturna", icon: "nightlife", desc: "Bares, clubes y eventos de networking social." },
  { id: "wellness", name: "Bienestar y Yoga", icon: "self_improvement", desc: "Centros de meditación, clases de yoga y spa para relajar el estrés." },
];

export const PACE_OPTIONS = [
  { id: "lento", name: "Paso Lento (Deep Focus)", icon: "spa", desc: "Calma: más café/work y una sola exploración al día." },
  { id: "moderado", name: "Paso Moderado (Equilibrado)", icon: "directions_walk", desc: "4–6 h de deep work + turismo por la tarde." },
  { id: "intenso", name: "Paso Intenso (Explorador)", icon: "speed", desc: "Full on: muchas paradas y work en sprints cortos." }
];

// Helper to generate activities for mock days
const getMockActivitiesForDay = (
  dayNum: number, 
  destination: string, 
  proposalType: string, 
  interests: string[], 
  pace: string
): ItineraryActivity[] => {
  const energyMatch = pace.match(/\((\d{1,3})\)/);
  const energy = energyMatch ? parseInt(energyMatch[1], 10) : null;
  const isLento = energy !== null
    ? energy < 38
    : pace.toLowerCase().includes("lento");
  const isIntenso = energy !== null
    ? energy > 65
    : pace.toLowerCase().includes("intenso");
  
  // Custom activities based on proposal type
  if (proposalType.includes("Aventura")) {
    return [
      {
        time: "08:30 - 11:30",
        title: `Aventura Matutina en ${destination}`,
        desc: `Caminata o scooter por un sendero emblemático con aire fresco.`,
        category: "adventure" as const,
        isCoworkingFriendly: false,
        tip: "Lleva agua y calzado cómodo; sal antes del calor.",
        reservation: "Si alquilarás scooter, reserva casco y seguro online.",
      },
      {
        time: "12:00 - 16:30",
        title: `Sesión de Trabajo en Spot Recomendado`,
        desc: `Café con Wi‑Fi rápido y mesas amplias para el bloque productivo.`,
        category: "work" as const,
        isCoworkingFriendly: true,
        tip: "Pide la zona más silenciosa lejos de la barra.",
        reservation: "Day-pass o mesa: reserva si suele llenarse a mediodía.",
      },
      {
        time: "17:00 - 20:30",
        title: "Atardecer & Networking Social",
        desc: "Meetup de nómadas en mirador o bar craft al atardecer.",
        category: "nightlife" as const,
        isCoworkingFriendly: false,
        tip: "Llega 15 min antes para pillar buena vista.",
        reservation: "Mesa en terraza: reserva si el lugar es popular.",
      },
    ].slice(0, isLento ? 2 : isIntenso ? 3 : 3);
  } else if (proposalType.includes("Deep Focus")) {
    return [
      {
        time: "09:00 - 14:00",
        title: "Bloque de Trabajo Profundo (Concentración)",
        desc: "Coworking o café tranquilo con enchufes para 4–5 h de foco.",
        category: "work" as const,
        isCoworkingFriendly: true,
        tip: "Activa modo avión en el móvil las primeras 2 horas.",
        reservation: "Reserva day-pass la noche anterior.",
      },
      {
        time: "14:30 - 17:00",
        title: `Paseo de Desconexión en ${destination}`,
        desc: "Templo, jardín o biblioteca para desconectar del plano digital.",
        category: "culture" as const,
        isCoworkingFriendly: false,
        tip: "Deja el portátil en el alojamiento en este tramo.",
        reservation: "Entradas online si el sitio limita aforo.",
      },
      {
        time: "17:30 - 20:00",
        title: "Tostaduría de Café & Planeación",
        desc: "Goteo artesanal mientras cierras notas del día.",
        category: "cafe" as const,
        isCoworkingFriendly: false,
        tip: "Pide una mesa lateral con toma eléctrica.",
        reservation: "Sin reserva; llega antes del rush vespertino.",
      },
    ].slice(0, isLento ? 2 : isIntenso ? 3 : 3);
  } else {
    // Local Wellness / Lifestyle
    return [
      {
        time: "07:30 - 09:00",
        title: "Rutina Holística & Estiramiento",
        desc: "Yoga, meditación o trote ligero para activar el día.",
        category: "wellness" as const,
        isCoworkingFriendly: false,
        tip: "Lleva esterilla o toalla ligera.",
        reservation: "Clase drop-in: reserva cupo la tarde previa.",
      },
      {
        time: "10:00 - 14:30",
        title: "Coworking Creativo al Aire Libre",
        desc: "Terraza o coliving verde con buen Wi‑Fi y café local.",
        category: "work" as const,
        isCoworkingFriendly: true,
        tip: "Si hay sol fuerte, busca sombra con enchufe.",
        reservation: "Confirma day-pass o hot desk por WhatsApp.",
      },
      {
        time: "15:30 - 19:30",
        title: "Inmersión en Gastronomía o Talleres",
        desc: "Taller de cocina, mercado o charla cultural local.",
        category: "food" as const,
        isCoworkingFriendly: false,
        tip: "Lleva efectivo pequeño para mercados.",
        reservation: "Talleres: reserva con 24–48 h de antelación.",
      },
    ].slice(0, isLento ? 2 : isIntenso ? 3 : 3);
  }
};

// Main generator of 3 realistic mock proposals
export const generateMockProposals = (config: TravelConfig): GeneratedItinerary[] => {
  const destName = config.destination || "Destino Elegido";
  const daysCount = config.days || 3;
  const selectedInterests = config.interests.length > 0 ? config.interests : ["Cafés de especialidad", "Exploraciones"];
  
  // Specific tips based on destination
  const getDestinationTips = (dest: string): string[] => {
    const norm = dest.toLowerCase();
    if (norm.includes("medellín") || norm.includes("medellin")) {
      return [
        `Internet ultra veloz: Fibra óptica de 150+ Mbps en [El Poblado](https://www.google.com/maps/search/?api=1&query=El+Poblado+Medellin) y [Laureles](https://www.google.com/maps/search/?api=1&query=Laureles+Medellin). Movistar y Claro son estables.`,
        `Mejor zona de hospedaje: [Provenza](https://www.google.com/maps/search/?api=1&query=Provenza+Medellin), Manila o Laureles cerca de la Circular 4. Compara en [Booking](https://www.booking.com/searchresults.html?ss=Medellin).`,
        `Transporte recomendado: [Metro de Medellín](https://www.google.com/maps/search/?api=1&query=Metro+de+Medellin) y tranvía, o trayectos en Uber/Didi.`,
        "Seguridad nómada: Sigue la regla local 'no dar papaya' (mantén guardado el laptop en trayectos)."
      ];
    }
    if (norm.includes("kioto") || norm.includes("kyoto")) {
      return [
        "Internet simétrico: Wi-Fi público estable de 80 Mbps en cafeterías de especialidad y hostales modernos.",
        `Mejor zona de hospedaje: Cerca de las estaciones [Shijo](https://www.google.com/maps/search/?api=1&query=Shijo+Station+Kyoto) u [Oike](https://www.google.com/maps/search/?api=1&query=Karasuma+Oike+Kyoto). Reserva en [Booking](https://www.booking.com/searchresults.html?ss=Kyoto).`,
        `Conectividad móvil: Adquiere una e-SIM ilimitada vía [Airalo](https://www.airalo.com/) antes de llegar.`,
        "Enchufes y corriente: Tipo A de dos clavijas planas (100V). Lleva cargadores adaptables."
      ];
    }
    if (norm.includes("amalfi") || norm.includes("costa")) {
      return [
        "Internet en la costa: Conexiones 4G estables, pero el Wi-Fi de hoteles suele fluctuar en horas pico.",
        "Mejor zona de hospedaje: Sorrento como base económica y conectada, o Maiori por sus playas amplias.",
        "Logística nómada: Alquila una scooter Vespa si tienes experiencia, o viaja en transbordadores (ferries).",
        "Costos aproximados: Presupuesto alto. Una taza de café espresso cuesta €1.50 pero los almuerzos oscilan los €25."
      ];
    }
    if (norm.includes("highlands") || norm.includes("tierras") || norm.includes("escocia")) {
      return [
        "Internet satelital/fibra: Coworkings en Inverness tienen 100 Mbps. En cabañas remotas busca Starlink.",
        "Mejor zona de hospedaje: Inverness como centro neurálgico o Fort William para senderistas.",
        "Requisitos de clima: Prepárate para el clima cambiante ('cuatro estaciones en un día'). Ropa impermeable es obligatoria.",
        "Transporte crítico: Se recomienda alquilar coche para explorar valles lejanos donde no llega el tren."
      ];
    }
    if (norm.includes("bali")) {
      return [
        "Velocidades de Internet: Fibra óptica excelente (100+ Mbps) en coworkings. Wi-Fi de cafés ronda los 30-50 Mbps.",
        "Mejor zona de hospedaje: Canggu si prefieres playa y networking, o Ubud para selva, yoga y calma.",
        "Transporte diario: La scooter es reina. Usa las apps Gojek o Grab para pedir choferes baratos.",
        "Seguridad digital: Utiliza VPN en redes de cafés abiertas para proteger tus credenciales bancarias."
      ];
    }
    return [
      "Velocidades de Internet: Rango de 50-100 Mbps en cafeterías del centro urbano principal.",
      "Mejor zona de hospedaje: Elige un distrito central y caminable con supermercados y cafés de especialidad.",
      "Transporte confiable: Las tarjetas de transporte recargables locales o aplicaciones de ridesharing son ideales.",
      "Consejo de trabajo: Confirma el silencio y tomas eléctricas antes de sentarte en cualquier café de paso."
    ];
  };

  // Specific spots based on destination
  const getDestinationSpots = (dest: string): CafeOrCowork[] => {
    const norm = dest.toLowerCase();
    if (norm.includes("medellín") || norm.includes("medellin")) {
      return [
        { name: "Semilla Café Coworking", type: "coworking", rating: "4.9/5", notes: "Excelente internet de 300 Mbps, cabinas de videollamadas y asombrosos bowls de desayuno." },
        { name: "Rituales Compañía de Café", type: "cafe", rating: "4.8/5", notes: "Ubicado en Laureles. Cafés de origen increíbles, tomas eléctricas en la barra y atmósfera amigable." },
        { name: "Pergamino Café", type: "cafe", rating: "4.7/5", notes: "El epicentro nómada de Provenza. Excelente espresso y buen espacio en la terraza para chats cortos." },
        { name: "Selina Cowork", type: "coworking", rating: "4.6/5", notes: "Vibrante coworking en Manila con hot-desking, piscina de bolas y eventos semanales de networking." }
      ];
    }
    if (norm.includes("kioto") || norm.includes("kyoto")) {
      return [
        { name: "Andspace Kyoto", type: "coworking", rating: "4.8/5", notes: "Espacio moderno cerca de la estación Karasuma. Cabinas insonorizadas y café de cortesía." },
        { name: "Weekenders Coffee", type: "cafe", rating: "4.7/5", notes: "Pequeño oasis zen escondido tras un parking. Cafés tostados al estilo nórdico excepcionales." },
        { name: "Blue Bottle Kyoto", type: "cafe", rating: "4.6/5", notes: "Estancia tradicional Machiya de madera remodelada. Mesas amplias y luz natural preciosa." }
      ];
    }
    if (norm.includes("amalfi") || norm.includes("costa")) {
      return [
        { name: "Sorrento Co-working Space", type: "coworking", rating: "4.7/5", notes: "Ubicado a minutos de la estación de Sorrento. Conexión de fibra de 200 Mbps y oficinas privadas." },
        { name: "Bar Francese (Positano)", type: "cafe", rating: "4.5/5", notes: "Mesas exteriores frente al mar con enchufes discretos y excelente capuchino matutino." },
        { name: "Casa e Bottega", type: "cafe", rating: "4.6/5", notes: "Café boutique luminoso y verde con desayunos saludables, ideal para escribir una hora temprano." }
      ];
    }
    if (norm.includes("highlands") || norm.includes("tierras") || norm.includes("escocia")) {
      return [
        { name: "The Wasps Creative Cowork (Inverness)", type: "coworking", rating: "4.8/5", notes: "Ubicado en un edificio histórico. Excelente Wi-Fi, talleres compartidos y gran ambiente artístico." },
        { name: "Velocity Cafe & Bicycle Workshop", type: "cafe", rating: "4.6/5", notes: "Café comunitario acogedor con estufa a leña, repostería casera y Wi-Fi sólido." },
        { name: "Grain and Grind", type: "cafe", rating: "4.7/5", notes: "Ubicación céntrica, tostados propios, mesas de madera cómodas y enchufes para laptops." }
      ];
    }
    if (norm.includes("bali")) {
      return [
        { name: "Tropical Nomad Coworking (Canggu)", type: "coworking", rating: "4.9/5", notes: "Vistas al jardín tropical, internet redundante de alta velocidad, cabinas de Zoom y cocina saludable." },
        { name: "Ubud Yoga Barn Cafe", type: "cafe", rating: "4.7/5", notes: "Comidas veganas asombrosas, internet decente y un entorno de naturaleza verde espectacular." },
        { name: "Bwork Bali", type: "coworking", rating: "4.8/5", notes: "Enfoque de co-growth para nómadas creativos. Espacio climatizado moderno, piscina y café de barista." }
      ];
    }
    return [
      { name: "Impact Hub Co-Pilot", type: "coworking", rating: "4.8/5", notes: "Mesas ergonómicas amplias, cabinas telefónicas privadas y velocidad de fibra de 150 Mbps." },
      { name: "The Lab Coffee Roasters", type: "cafe", rating: "4.7/5", notes: "Café de origen galardonado, múltiples conexiones eléctricas y atmósfera de concentración ideal." }
    ];
  };

  const tips = getDestinationTips(destName);
  const spots = getDestinationSpots(destName).map((s) => ({
    ...s,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${destName}`)}`,
  }));

  const energyMatch = config.pace.match(/\((\d{1,3})\)/);
  const energy = energyMatch ? parseInt(energyMatch[1], 10) : 50;
  const isHighEnergy = energy >= 62;
  const isLowEnergy = energy < 38;

  const proposalPrimary: GeneratedItinerary = {
    proposalType: "Principal",
    destinationTitle: destName,
    shortDescription: isLowEnergy
      ? `Deep Focus vibes en ${destName}: bloques sólidos de work y exploraciones cortas, a tu presupuesto ${config.budget || "flexible"}.`
      : isHighEnergy
      ? `Modo explorador en ${destName}: más salidas y networking, sin soltar del todo el work nómada.`
      : `Balance work/explore en ${destName}, a tu presupuesto ${config.budget || "flexible"} y tus intereses.`,
    practicalTips: tips,
    recommendedCafesAndCoworks: spots,
    itinerary: Array.from({ length: daysCount }).map((_, i) => {
      const dayNum = i + 1;
      return {
        day: dayNum,
        title: dayNum === 1
          ? "Llegada, instalación y primer bloque útil"
          : dayNum === daysCount
          ? "Cierre del viaje y últimas prioridades"
          : `Día ${dayNum} — a tu ritmo`,
        activities: getMockActivitiesForDay(
          dayNum,
          destName,
          isHighEnergy ? "Aventura" : isLowEnergy ? "Deep Focus" : "Wellness",
          selectedInterests,
          config.pace
        ),
      };
    }),
  };

  const proposalB: GeneratedItinerary = {
    proposalType: "Opción B",
    destinationTitle: destName,
    shortDescription: `Mismo vibe, otro ángulo: otro orden del día, otros barrios/spots — sin soltar tu energía (~${energy}/100) ni tus intereses.`,
    practicalTips: [...tips].reverse(),
    recommendedCafesAndCoworks: [...spots].reverse(),
    itinerary: Array.from({ length: daysCount }).map((_, i) => {
      const dayNum = i + 1;
      return {
        day: dayNum,
        title: dayNum === 1
          ? "Aterrizaje suave y exploración cercana"
          : dayNum === daysCount
          ? "Despedida con un plan B memorable"
          : `Día ${dayNum} — variación creativa`,
        activities: getMockActivitiesForDay(
          dayNum,
          destName,
          isHighEnergy ? "Wellness" : isLowEnergy ? "Aventura" : "Deep Focus",
          selectedInterests,
          config.pace
        ),
      };
    }),
  };

  return [proposalPrimary, proposalB];
};
