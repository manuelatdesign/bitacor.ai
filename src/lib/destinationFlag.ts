/** Country / city → flag emoji and short trip titles. */

const CITY_FLAGS: Array<{ match: RegExp; flag: string }> = [
  { match: /medell[ií]n|bogot[aá]|cartagena|colombia|cali/i, flag: "🇨🇴" },
  { match: /kioto|kyoto|tokio|tokyo|osaka|jap[oó]n|japan/i, flag: "🇯🇵" },
  { match: /amalfi|positano|roma|rome|milan|florencia|florence|italia|italy|napol[ei]/i, flag: "🇮🇹" },
  { match: /highlands|escocia|scotland|edimburgo|edinburgh|glasgow/i, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { match: /\bbali\b|indonesia|jakarta|ubud|canggu/i, flag: "🇮🇩" },
  { match: /lisboa|lisbon|porto|portugal/i, flag: "🇵🇹" },
  { match: /r[ií]o\b|rio de janeiro|s[aã]o paulo|brasil|brazil|copacabana/i, flag: "🇧🇷" },
  { match: /buenos aires|argentina|mendoza|patagonia/i, flag: "🇦🇷" },
  { match: /ciudad de m[eé]xico|cdmx|canc[uú]n|oaxaca|m[eé]xico|mexico/i, flag: "🇲🇽" },
  { match: /barcelona|madrid|sevilla|valencia|espa[nñ]a|spain/i, flag: "🇪🇸" },
  { match: /par[ií]s|paris|lyon|marsella|francia|france/i, flag: "🇫🇷" },
  { match: /berl[ií]n|munich|m[uü]nchen|alemania|germany/i, flag: "🇩🇪" },
  { match: /amsterdam|rotterdam|pa[ií]ses bajos|netherlands|holanda/i, flag: "🇳🇱" },
  { match: /londres|london|manchester|inglaterra|england|reino unido|uk\b/i, flag: "🇬🇧" },
  { match: /nueva york|new york|miami|los angeles|san francisco|usa|estados unidos/i, flag: "🇺🇸" },
  { match: /toronto|vancouver|montreal|canad[aá]/i, flag: "🇨🇦" },
  { match: /santiago|valpara[ií]so|chile/i, flag: "🇨🇱" },
  { match: /lima|cusco|per[uú]/i, flag: "🇵🇪" },
  { match: /bangkok|phuket|tailandia|thailand/i, flag: "🇹🇭" },
  { match: /se[uú]l|seoul|corea|korea/i, flag: "🇰🇷" },
  { match: /singapur|singapore/i, flag: "🇸🇬" },
  { match: /dubai|abu dhabi|emiratos|uae/i, flag: "🇦🇪" },
  { match: /marrakech|casablanca|marruecos|morocco/i, flag: "🇲🇦" },
  { match: /el cairo|cairo|egipto|egypt/i, flag: "🇪🇬" },
  { match: /atenas|athens|grecia|greece|santorini/i, flag: "🇬🇷" },
  { match: /estambul|istanbul|turqu[ií]a|turkey/i, flag: "🇹🇷" },
  { match: /praga|prague|chequia|czech/i, flag: "🇨🇿" },
  { match: /viena|vienna|austria/i, flag: "🇦🇹" },
  { match: /zurich|ginebra|suiza|switzerland/i, flag: "🇨🇭" },
  { match: /estocolmo|stockholm|suecia|sweden/i, flag: "🇸🇪" },
  { match: /copenhague|copenhagen|dinamarca|denmark/i, flag: "🇩🇰" },
  { match: /oslo|noruega|norway/i, flag: "🇳🇴" },
  { match: /helsinki|finlandia|finland/i, flag: "🇫🇮" },
  { match: /dublin|irlanda|ireland/i, flag: "🇮🇪" },
  { match: /s[ií]dney|sydney|melbourne|australia/i, flag: "🇦🇺" },
  { match: /auckland|wellington|nueva zelanda|new zealand/i, flag: "🇳🇿" },
  { match: /ciudad del cabo|cape town|sud[aá]frica|south africa/i, flag: "🇿🇦" },
  { match: /la habana|habana|cuba/i, flag: "🇨🇺" },
  { match: /san jos[eé]|costa rica/i, flag: "🇨🇷" },
  { match: /panama|panam[aá]/i, flag: "🇵🇦" },
  { match: /montevideo|uruguay/i, flag: "🇺🇾" },
  { match: /quito|ecuador/i, flag: "🇪🇨" },
  { match: /caracas|venezuela/i, flag: "🇻🇪" },
  { match: /la paz|bolivia/i, flag: "🇧🇴" },
  { match: /asunci[oó]n|paraguay/i, flag: "🇵🇾" },
  { match: /hong kong/i, flag: "🇭🇰" },
  { match: /taip[eé]i|taiwan/i, flag: "🇹🇼" },
  { match: /manila|filipinas|philippines/i, flag: "🇵🇭" },
  { match: /hanoi|ho chi minh|vietnam/i, flag: "🇻🇳" },
  { match: /kuala lumpur|malasia|malaysia/i, flag: "🇲🇾" },
  { match: /delhi|mumbai|bangalore|india/i, flag: "🇮🇳" },
  { match: /tel aviv|jerusal[eé]n|israel/i, flag: "🇮🇱" },
  { match: /beirut|l[ií]bano|lebanon/i, flag: "🇱🇧" },
  { match: /zagreb|croacia|croatia|dubrovnik/i, flag: "🇭🇷" },
];

const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Leading flag emoji(s), including regional / subdivision flags. */
const FLAG_PREFIX =
  /^(?:\u{1F3F4}(?:\u{E0067}-\u{E007F})+\u{E007F}|[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F3}\u{FE0F}?\u{200D}\u{1F308}|🌍)\s*/u;

export function flagForDestination(destination: string): string {
  const raw = (destination || "").trim();
  if (!raw) return "🌍";
  const existing = raw.match(FLAG_PREFIX)?.[0]?.trim();
  if (existing && existing !== "🌍") return existing;
  for (const { match, flag } of CITY_FLAGS) {
    if (match.test(raw)) return flag;
  }
  return "🌍";
}

/** Short city/place name for titles (drops country, slogans, flags). */
export function shortDestinationName(destination: string): string {
  let name = (destination || "").trim().replace(FLAG_PREFIX, "").trim();
  if (!name) return "Destino";
  // Drop AI slogans after dash/colon
  name = name.split(/\s*[—–|:]\s*/)[0]?.trim() || name;
  // "City, Country" → City
  name = name.split(",")[0]?.trim() || name;
  // Truncate leftover long phrases
  if (name.length > 40) name = name.slice(0, 40).replace(/\s+\S*$/, "").trim();
  return name || "Destino";
}

function parseTripDate(dateIso?: string): Date {
  if (dateIso && /^\d{4}-\d{2}-\d{2}/.test(dateIso)) {
    const d = new Date(`${dateIso.slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (dateIso) {
    const d = new Date(dateIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Short trip title: 🇧🇷 Río de Janeiro Jul 2026
 */
export function formatTripTitle(
  destination: string,
  dateIso?: string,
  fallbackDestination?: string
): string {
  const source = (destination || fallbackDestination || "").trim();
  const place = shortDestinationName(source);
  const flag = flagForDestination(source || place);
  const d = parseTripDate(dateIso);
  const month = MONTHS_ES[d.getMonth()] || "Ene";
  const year = d.getFullYear();
  return `${flag} ${place} ${month} ${year}`;
}

/** @deprecated Prefer formatTripTitle — kept as alias for call sites. */
export function titledWithFlag(
  destinationTitle: string,
  fallbackDestination?: string,
  dateIso?: string
): string {
  return formatTripTitle(
    fallbackDestination || destinationTitle,
    dateIso,
    destinationTitle
  );
}
