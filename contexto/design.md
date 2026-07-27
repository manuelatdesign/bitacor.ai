# Sistema de Diseño y Guía Visual • Bitácor.ai 🗺️✨

Esta guía técnica y estética documenta el lenguaje visual de **Bitácor.ai**, un planificador inteligente de itinerarios de viaje híbridos para desarrolladores y nómadas digitales que integra un diario fotográfico de doble cámara (BeReal style) y mapas topográficos interactivos.

---

## 1. ADN de la Marca & Dirección de Arte

**Bitácor.ai** fusiona la precisión técnica y lógica del desarrollo de software con la atmósfera acogedora e inmersiva del café de especialidad y el viaje activo. 

* **Atmósfera General**: "Glassmorphic Cozy-Tech" (Tecnología cálida translúcida).
* **Principios de Diseño**:
  * **Translucidez Controlada (Glassmorphism)**: Paneles desenfocados de alta densidad que permiten ver las gradaciones de color del fondo orgánico dinámico sin comprometer la legibilidad.
  * **Asimetría Rítmica**: Variaciones en márgenes, rellenos y grosores de borde para evitar la apariencia robótica y plana de los templates genéricos.
  * **Honestidad Arquitectónica**: Cero "AI slop" o telemetría falsa. Las etiquetas y estados reflejan datos reales y con propósito para el nómada (latencia de Wi-Fi, locación exacta de GPS, nivel de enfoque).

---

## 2. Tipografía (Typography)

La jerarquía tipográfica se estructura utilizando tres familias complementarias, importadas directamente desde Google Fonts en `index.css`:

| Rol | Familia | Vibe / Estética | Clases Tailwind |
| :--- | :--- | :--- | :--- |
| **Display (Encabezados / Títulos)** | **Hanken Grotesk** | Suizo, moderno, amigable pero con fuerza geométrica. | `font-display tracking-tight` |
| **Cuerpo (Interfaz General / Textos)** | **Inter** | Versátil, neutro y con legibilidad excelente a escalas pequeñas. | `font-sans text-gray-700` |
| **Mono (Datos / Indicadores / GPS)** | **JetBrains Mono** | Técnico, limpio, evoca entornos de programación estables. | `font-mono tracking-wider` |

### Escalado Sugerido:
```html
<h1 class="font-display font-light text-4xl tracking-tight">Destino Nómada</h1>
<p class="font-sans text-sm leading-relaxed">Bloque de código profundo en cafetería local...</p>
<span class="font-mono text-[9px] tracking-widest uppercase">LAT: 6.2442° N</span>
```

---

## 3. Paleta de Colores y Tokens CSS

La paleta se configura dinámicamente usando el nuevo motor de temas de Tailwind CSS v4, garantizando una transición impecable entre el modo claro y el modo oscuro mediante variables CSS nativas.

### Tonos Core (Core Brand Tones)
* **Púrpura Primario (`#2a064b`)**: Representa el enfoque profundo, la noche estrellada del programador y la estabilidad del backend.
* **Rosa Velvet / Orquídea (`#914660` / `#ed93af`)**: Representa la creatividad, los matices del café artesanal y la calidez de la exploración cultural.
* **Menta / Esmeralda Sincrónico (`#14b8a6` / `#2dd4bf`)**: Usado exclusivamente para estados seguros de GPS, conexiones simétricas de Wi-Fi y confirmaciones exitosas de sincronización.

### Superficies (Surfaces)
```css
/* Valores Clave en index.css */
--color-surface: #fff7fe;                  /* Fondo base en modo claro (Cálido Off-white) */
--color-primary-container: #2a064b;        /* Contenedores oscuros profundos */
--color-secondary-container: #fda1bd;      /* Acentos rosas de interacción */
--color-on-surface: #1d1b1f;               /* Texto principal de alto contraste */
```

---

## 4. Efectos y Texturas Visuales

### A. Malla de Fondo Orgánica (BackgroundMesh.tsx)
La interfaz flota sobre una malla matemática dinámica animada que simula corrientes topográficas en constante cambio.
* **Estructura**: SVG dinámico de pantalla completa con rutas complejas (curvas de Bézier) pintadas con degradados fluidos de color violeta a ámbar/rosa.
* **Animación**: Pequeñas rotaciones y traslaciones fluidas que proporcionan profundidad orgánica sin distraer la vista del contenido.

### B. Fórmula de Glassmorphism Consistente
Para lograr un efecto de cristal esmerilado que funcione tanto en entornos claros como oscuros:
* **Fondo**: `bg-white/40 dark:bg-[#0f172a]/40`
* **Difuminado**: `backdrop-blur-[40px] md:backdrop-blur-[32px]`
* **Borde**: `border border-white/60 dark:border-white/10` (un borde claro de baja opacidad simula el bisel de cristal que refleja la luz).
* **Sombra**: `shadow-xl shadow-[#240046]/5`

---

## 5. Componentes Claves con Alta Identidad Visual

### 1. El Simulador de Cámara Dual BeReal (TripView.tsx)
Emula la experiencia física de un teléfono móvil físico nómada mediante una interfaz táctil encapsulada:
* **Foco e Intercambio**: La selfie frontal pequeña y la vista posterior son intercambiables. Tienen un diseño de bordes redondeados orgánicos de alta densidad.
* **Shutter Flash**: Un destello blanco puro en toda la pantalla con curvas de entrada de desaceleración emula el disparador de la cámara.
* **Estándar de Imágenes**: Integración de imágenes de Unsplash de alta fidelidad referenciando locaciones reales (ej. *Canggu en Bali*, *Laureles en Medellín*, *Arashiyama en Kyoto*) emparejadas con un avatar de retrato transparente.

### 2. Mapa de Conexión Topográfico (Interactive SVG Map)
* **Backdrop**: Patrones de cuadrícula de 40px y curvas de nivel topográficas en vectores de baja opacidad (`opacity-10 dark:opacity-5`).
* **Conectores**: Líneas discontinuas dobles de color púrpura y rosa de especialidad que simulan rutas de fibra óptica o trayectos caminables.
* **Pines de Fotos**: Pines flotantes de doble cámara con animaciones de tipo "Spring" y de escala interactiva que muestran previsualizaciones dinámicas al pasar el cursor.

---

## 6. Animaciones y Micro-Interacciones (`motion/react`)

Toda transición dentro de la aplicación sigue curvas físicas reales, huyendo de las animaciones lineales aburridas:

```typescript
// Configuración recomendada para popups y modales (Spring Physics)
const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 25
};

// Configuración para desvanecimientos generales (Fades)
const fadeTransition = {
  duration: 0.3,
  ease: "easeInOut"
};
```

### Reglas de Animación en el Proyecto:
1. **Staggered Entry**: Los listados de actividades del itinerario o las fotos de la galería deben mostrarse con un desfase secuencial (`delay: index * 0.05`).
2. **Hover Feedbacks**: Los botones interactivos deben reaccionar con un sutil cambio de escala (`whileHover={{ scale: 1.02 }}`) y opacidades dinámicas.
3. **Active Presses**: Cualquier botón crítico de acción debe dar respuesta táctil visual reduciendo su tamaño levemente (`whileTap={{ scale: 0.98 }}`).
