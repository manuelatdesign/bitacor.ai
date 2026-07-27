export function buildCategoriesPrompt(destination: string): string {
  return `Eres un nómada digital que conoce bien "${destination}". Genera exactamente 5 o 6 categorías de interés (no lugares/POIs concretos) con nombres cercanos y naturales.

Reglas:
- Cada ítem es una categoría amplia (ej. "Coworking", "Surf", "Street food"), no un sitio específico.
- Orientado a nómadas: remote work + explorar cultura/naturaleza.
- Nombres cortos (máx. 4 palabras); Spanglish ok si suena natural (Cowork, Surf, Wellness).
- "icon" debe ser un nombre válido de Material Symbols Outlined (ej. laptop_mac, local_cafe, museum, forest, restaurant, surfing, spa, self_improvement, nightlife, beach_access, directions_boat, castle, explore, photo_camera, edit).
- "id" slug en minúsculas con guiones (a-z0-9-).
- "desc" una frase corta y oral (máx. 120 caracteres) contextual al destino; sin jerga de producto.

Responde SOLO con JSON válido, sin markdown:
{
  "categories": [
    { "id": "coworking", "name": "Espacios Coworking", "icon": "laptop_mac", "desc": "..." }
  ]
}`;
}

export function buildCategoriesRepairPrompt(raw: string, error: string): string {
  return `La respuesta anterior no pasó validación: ${error}

Corrige y devuelve SOLO JSON válido con forma:
{ "categories": [ { "id": "...", "name": "...", "icon": "...", "desc": "..." } ] }

Respuesta previa:
${raw.slice(0, 4000)}`;
}
