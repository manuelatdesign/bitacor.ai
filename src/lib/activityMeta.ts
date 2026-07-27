/**
 * Tip / reservation chips: opt-in only.
 * Most AI filler text must not surface in the UI.
 */

const IMPORTANT_TIP =
  /efectivo|cash only|solo cash|cola|fila larga|llega\s+\d|cerrad[oa]|abre a las|cierra a las|horario raro|clave (wifi|del wifi)|password|llevar |dni|pasaporte|prohibid|gratis hasta|pico y placa|sin enchufe|pocos enchufes|muy ruidoso|zona (roja|complicada)|después de las|antes de las|solo con cita|con cita/i;

const MUST_BOOK =
  /obligatori|imprescindible|hay que reserv|debes reserv|necesitas reserv|reserva(r)? (con anticip|online|antes|mesa|entrada)|compra(r)? (la )?(entrada|ticket|boleto)|day[- ]?pass|inscripci[oó]n|inscribirte|ticket online|boletería/i;

const EXPLICITLY_OPTIONAL =
  /no (necesitas|hace falta|requiere|precisa)|sin reserva|no reserve|walk[- ]?in|llega y ya|opcional|no es necesario|si puedes|si quieres|recomend|conviene reserv|mejor reserv/i;

export function meaningfulTip(tip?: string | null): string | null {
  const t = (tip || "").trim();
  if (t.length < 16) return null;
  const lower = t.toLowerCase();
  if (
    /^(revisa|consulta|verifica)/.test(lower) ||
    /^disfruta/.test(lower) ||
    /sin tip|ninguno|n\/a|no aplica/.test(lower)
  ) {
    return null;
  }
  if (!IMPORTANT_TIP.test(t)) return null;
  return t;
}

export function needsReservation(reservation?: string | null): string | null {
  const r = (reservation || "").trim();
  if (r.length < 10) return null;
  if (EXPLICITLY_OPTIONAL.test(r)) return null;
  if (!MUST_BOOK.test(r)) return null;
  return r;
}
