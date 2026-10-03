/**
 * BeltFlow - Definición de los 20 niveles progresivos
 * 
 * Cada nivel define:
 * - id: número de nivel (1..20)
 * - name: nombre descriptivo y relajante
 * - description: instrucción u objetivo claro
 * - hint: consejo rápido para el jugador
 * - timeLimit: tiempo en segundos (relajado, o null para sandbox)
 * - quota: cantidad de formas requeridas para completar el nivel
 * - targetShape: estructura de la forma objetivo requerida en la salida
 * - availableTools: herramientas habilitadas en la barra (belt, extractor, trash, cutter, painter, mixer, tunnel)
 * - allowedColors: colores disponibles para el pintor en este nivel
 * - fixedGrid: piezas fijas iniciales (extractores con formas, salidas, obstáculos)
 */

export const SHAPE_TYPES = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  TRIANGLE: 'triangle',
  DIAMOND: 'diamond',
  STAR: 'star'
};

export const PASTEL_COLORS = {
  MINT: 'mint',       // #A8D5BA
  SKY: 'sky',         // #A9CCE3
  LAVENDER: 'lavender',// #C9B6E4
  PEACH: 'peach',     // #F5C6A5
  CORAL: 'coral',     // #E8A0A0
  GRAY: 'gray'        // Base / sin pintar
};

export const COLOR_HEX = {
  mint: '#A8D5BA',
  sky: '#A9CCE3',
  lavender: '#C9B6E4',
  peach: '#F5C6A5',
  coral: '#E8A0A0',
  gray: '#D5D1C8'
};

/**
 * Helper para crear una forma:
 * Una forma tiene dos mitades (izquierda y derecha).
 * Una forma entera tiene el mismo tipo en izquierda y derecha.
 */
export function createShape(leftType, leftColor, rightType = null, rightColor = null) {
  if (rightType === null) rightType = leftType;
  if (rightColor === null) rightColor = leftColor;
  return {
    left: leftType ? { type: leftType, color: leftColor } : null,
    right: rightType ? { type: rightType, color: rightColor } : null
  };
}

export const LEVELS = [
  // Nivel 1: Tutorial directo
  {
    id: 1,
    name: "Primeros Pasos",
    description: "Coloca un extractor sobre la mina de recursos y conéctalo con una cinta a la salida.",
    hint: "Selecciona el Extractor (2), colócalo encima de la mina brillante y traza la cinta hacia la salida.",
    timeLimit: 180,
    quota: 5,
    stars: { gold: 63, silver: 104, bronze: 158 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 5, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 11, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 2: Distancia
  {
    id: 2,
    name: "Ruta Directa",
    description: "Transporta los cuadrados celestes a la salida.",
    hint: "Une el camino con cintas transportadoras.",
    timeLimit: 180,
    quota: 8,
    stars: { gold: 63, silver: 104, bronze: 158 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 13, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 3: Curvas y giros
  {
    id: 3,
    name: "Curvas Suaves",
    description: "La salida no está alineada. Gira las cintas para llegar a ella.",
    hint: "Pulsa 'R' o el botón de rotar para cambiar la dirección de la cinta.",
    timeLimit: 190,
    quota: 10,
    stars: { gold: 67, silver: 110, bronze: 167 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 5, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 11, y: 11, type: 'delivery', dir: 3, fixed: true }
    ]
  },

  // Nivel 4: Obstáculos
  {
    id: 4,
    name: "El Laberinto",
    description: "Rodea las piedras del jardín para entregar los rombos.",
    hint: "Diseña un camino suave alrededor de los obstáculos naturales.",
    timeLimit: 200,
    quota: 10,
    stars: { gold: 70, silver: 116, bronze: 176 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 4, y: 6, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 7, y: 5, type: 'obstacle', fixed: true },
      { x: 7, y: 6, type: 'obstacle', fixed: true },
      { x: 7, y: 7, type: 'obstacle', fixed: true },
      { x: 12, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 5: Dos fuentes, una correcta
  {
    id: 5,
    name: "Dos Fuentes",
    description: "Hay dos extractores. Entrega únicamente los cuadrados celestes.",
    hint: "Conecta solo el extractor adecuado hacia la salida.",
    timeLimit: 200,
    quota: 12,
    stars: { gold: 70, silver: 116, bronze: 176 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 4, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 4, y: 10, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 12, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 6: Convergencia
  {
    id: 6,
    name: "Convergencia",
    description: "Une dos extractores del mismo recurso para acelerar la entrega.",
    hint: "Haz converger dos cintas en una sola para alimentar la salida rápidamente.",
    timeLimit: 170,
    quota: 18,
    stars: { gold: 59, silver: 99, bronze: 150 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt', 'extractor'],
    fixedGrid: [
      { x: 4, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 4, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 12, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 7: Trituradora (Filtro)
  {
    id: 7,
    name: "El Filtro",
    description: "Usa la Trituradora para deshacerte de las piezas no deseadas.",
    hint: "La trituradora destruye cualquier pieza que entre en ella.",
    timeLimit: 210,
    quota: 12,
    stars: { gold: 74, silver: 122, bronze: 185 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'extractor', 'trash'],
    fixedGrid: [
      { x: 4, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 4, y: 9, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 12, y: 5, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 8: Cortadora (Cutter)
  {
    id: 8,
    name: "Corte Preciso",
    description: "Corta los cuadrados para entregar medias formas izquierdas.",
    hint: "La Cortadora divide la forma: la mitad izquierda sale recta y la derecha a 90°.",
    timeLimit: 220,
    quota: 10,
    stars: { gold: 77, silver: 128, bronze: 194 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY, null, null), // solo izquierda
    availableTools: ['belt', 'extractor', 'cutter', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 12, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 9: Mitad derecha
  {
    id: 9,
    name: "Mitades Espejadas",
    description: "Entrega la mitad derecha de los círculos de menta.",
    hint: "La mitad derecha sale por el lateral de la cortadora. Desecha la izquierda con la trituradora.",
    timeLimit: 220,
    quota: 12,
    stars: { gold: 77, silver: 128, bronze: 194 },
    targetShape: { left: null, right: { type: SHAPE_TYPES.CIRCLE, color: PASTEL_COLORS.MINT } },
    availableTools: ['belt', 'extractor', 'cutter', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 12, y: 10, type: 'delivery', dir: 3, fixed: true }
    ]
  },

  // Nivel 10: Pintor
  {
    id: 10,
    name: "Taller de Color",
    description: "Colorea los círculos neutros con el Pintor en tono Lavanda.",
    hint: "Selecciona el Pintor, configúralo en Lavanda y pásale las formas.",
    timeLimit: 220,
    quota: 14,
    stars: { gold: 77, silver: 128, bronze: 194 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'extractor', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.LAVENDER, PASTEL_COLORS.MINT, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 13, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 11: Pinta y Corta
  {
    id: 11,
    name: "Pinta y Corta",
    description: "Pinta las estrellas de Coral suave y luego corta su mitad izquierda.",
    hint: "Pasa la estrella por el pintor y después por la cortadora.",
    timeLimit: 240,
    quota: 12,
    stars: { gold: 84, silver: 139, bronze: 211 },
    targetShape: { left: { type: SHAPE_TYPES.STAR, color: PASTEL_COLORS.CORAL }, right: null },
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.MINT],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.GRAY), fixed: true },
      { x: 13, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 12: Color Selectivo
  {
    id: 12,
    name: "Color Selectivo",
    description: "Corta primero los rombos y pinta solo la mitad derecha de Durazno.",
    hint: "Conecta la salida derecha de la cortadora directamente al pintor.",
    timeLimit: 240,
    quota: 12,
    stars: { gold: 84, silver: 139, bronze: 211 },
    targetShape: { left: null, right: { type: SHAPE_TYPES.DIAMOND, color: PASTEL_COLORS.PEACH } },
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.PEACH, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 3, y: 7, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
      { x: 13, y: 9, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 13: Túnel
  {
    id: 13,
    name: "Paso Subterráneo",
    description: "Cruza dos líneas perpendiculares de formas sin que colisionen usando el Túnel.",
    hint: "El túnel transporta piezas bajo tierra hasta 4 celdas en línea recta.",
    timeLimit: 250,
    quota: 15,
    stars: { gold: 88, silver: 145, bronze: 220 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 8, y: 4, type: 'mine', dir: 1, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 13, y: 8, type: 'delivery', dir: 2, fixed: true },
      { x: 8, y: 12, type: 'trash', dir: 1, fixed: true }
    ]
  },

  // Nivel 14: Mezcladora (Mixer)
  {
    id: 14,
    name: "Fusión Armónica",
    description: "Combina medio círculo de menta con medio cuadrado celeste.",
    hint: "Corta ambas formas y aliméntalas a los dos lados de la Mezcladora.",
    timeLimit: 260,
    quota: 10,
    stars: { gold: 91, silver: 151, bronze: 229 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'extractor', 'cutter', 'mixer', 'trash', 'tunnel'],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 14, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 15: Bicolor
  {
    id: 15,
    name: "Círculo Bicolor",
    description: "Crea un círculo con mitad izquierda celeste y mitad derecha lavanda.",
    hint: "Corta círculos, píntalos por separado y únelos en la Mezcladora.",
    timeLimit: 280,
    quota: 10,
    stars: { gold: 98, silver: 162, bronze: 246 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 14, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 16: Línea de Montaje
  {
    id: 16,
    name: "Línea de Montaje",
    description: "Crea una forma híbrida: Triángulo menta a la izquierda + Rombo durazno a la derecha.",
    hint: "Corta ambas formas, pinta el rombo de durazno y fusiona las mitades.",
    timeLimit: 290,
    quota: 12,
    stars: { gold: 102, silver: 168, bronze: 255 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.PEACH],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
      { x: 15, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 17: Reorganización Espacial
  {
    id: 17,
    name: "Espacio Reducido",
    description: "Crea Estrella coral (izq) + Cuadrado cielo (der) en un área con obstáculos.",
    hint: "Aprovecha los túneles para cruzar líneas sin ocupar espacio extra.",
    timeLimit: 300,
    quota: 12,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 4, y: 4, type: 'mine', dir: 1, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 4, y: 12, type: 'mine', dir: 3, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 9, y: 7, type: 'obstacle', fixed: true },
      { x: 9, y: 8, type: 'obstacle', fixed: true },
      { x: 9, y: 9, type: 'obstacle', fixed: true },
      { x: 15, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 18: Dos Salidas Simultáneas
  {
    id: 18,
    name: "Doble Demanda",
    description: "Entrega medios círculos menta en la salida A y círculos lavanda en la salida B.",
    hint: "Aprovecha la cortadora para la salida A y pinta los círculos grises con lavanda para la salida B.",
    timeLimit: 320,
    quota: 14,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: { left: { type: SHAPE_TYPES.CIRCLE, color: PASTEL_COLORS.MINT }, right: null },
    secondaryTarget: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'salida_a', name: 'Medio Círculo Menta', shape: { left: { type: SHAPE_TYPES.CIRCLE, color: PASTEL_COLORS.MINT }, right: null }, quota: 7, deliveryIndex: 0 },
      { id: 'salida_b', name: 'Círculo Lavanda', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER), quota: 7, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 15, y: 5, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 15, y: 11, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 19: Eficiencia Pura
  {
    id: 19,
    name: "Eficiencia Pura",
    description: "Entrega 25 unidades de Estrella-Rombo bicolor optimizando al máximo tus cintas.",
    hint: "Usa múltiples líneas paralelas para mantener un flujo continuo.",
    timeLimit: 220,
    quota: 25,
    stars: { gold: 77, silver: 128, bronze: 194 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'estrella_rombo', name: 'Estrella-Rombo', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 25 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.PEACH],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 7, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 10, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 3, y: 13, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 15, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 20: Maestro del Flujo (Sandbox Fundamentos)
  {
    id: 20,
    name: "Maestro del Flujo",
    description: "Crea una joya geométrica: Estrella menta + Rombo lavanda. ¡Libertad creativa total!",
    hint: "Dispones de todas las herramientas y recursos infinitos. ¡Completa este nivel para desbloquear la Maestría!",
    timeLimit: null,
    quota: 30,
    stars: { gold: 96, silver: 165, bronze: 255 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'estrella_rombo_master', name: 'Estrella-Rombo Menta/Lavanda', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER), quota: 30 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER, PASTEL_COLORS.PEACH, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.GRAY), fixed: false },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: false },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // ==========================================================================
  // CAPÍTULO 2: MAESTRÍA (NIVELES 21 AL 40)
  // ==========================================================================

  // Nivel 21: Convergencia Dual
  {
    id: 21,
    name: "Convergencia Dual",
    description: "Un solo almacén recibe dos recursos diferentes: 8 Cuadrados cielo y 8 Círculos menta.",
    hint: "Entrelaza o fusiona tus cintas antes de que lleguen a la entrada del almacén.",
    timeLimit: 260,
    quota: 16,
    stars: { gold: 91, silver: 151, bronze: 229 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'cuadrado_cielo', name: 'Cuadrado Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 8 },
      { id: 'circulo_menta', name: 'Círculo Menta', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 8 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 22: Fusión Armónica
  {
    id: 22,
    name: "Fusión Armónica",
    description: "Satisface la doble demanda del almacén con 10 Triángulos durazno y 10 Estrellas lavanda.",
    hint: "Usa cintas que converjan en una cinta principal compartida hacia la salida.",
    timeLimit: 280,
    quota: 20,
    stars: { gold: 98, silver: 162, bronze: 246 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'triangulo_durazno', name: 'Triángulo Durazno', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), quota: 10 },
      { id: 'estrella_lavanda', name: 'Estrella Lavanda', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), quota: 10 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 23: Mitades Complementarias
  {
    id: 23,
    name: "Mitades Complementarias",
    description: "El almacén solicita 8 Círculos menta completos y 8 Medios Rombos cielo.",
    hint: "Corta los rombos con la cortadora y conduce la mitad requerida al almacén, descartando o desviando el resto.",
    timeLimit: 290,
    quota: 16,
    stars: { gold: 102, silver: 168, bronze: 255 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'circulo_menta_23', name: 'Círculo Menta', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 8 },
      { id: 'medio_rombo_cielo', name: 'Medio Rombo Cielo', shape: { left: { type: SHAPE_TYPES.DIAMOND, color: PASTEL_COLORS.SKY }, right: null }, quota: 8 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 24: Tríada Elemental
  {
    id: 24,
    name: "Tríada Elemental",
    description: "Tres cadenas paralelas: abastece el almacén central con 6 Círculos, 6 Cuadrados y 6 Triángulos.",
    hint: "Organiza tres líneas paralelas limpias que desemboquen en la salida.",
    timeLimit: 300,
    quota: 18,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'circulo_24', name: 'Círculo Menta', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 6 },
      { id: 'cuadrado_24', name: 'Cuadrado Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 6 },
      { id: 'triangulo_24', name: 'Triángulo Durazno', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), quota: 6 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 25: Flujo Polifónico
  {
    id: 25,
    name: "Flujo Polifónico",
    description: "Tres demandas con cuotas desiguales: 12 Cuadrados cielo, 8 Estrellas lavanda y 4 Rombos coral.",
    hint: "El almacén aceptará cualquier forma solicitada; prioriza la de mayor volumen para no quedarte sin tiempo.",
    timeLimit: 300,
    quota: 24,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'cuadrado_25', name: 'Cuadrado Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 12 },
      { id: 'estrella_25', name: 'Estrella Lavanda', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), quota: 8 },
      { id: 'rombo_25', name: 'Rombo Coral', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.CORAL), quota: 4 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.CORAL), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 26: Taller de Colorimetría
  {
    id: 26,
    name: "Taller de Colorimetría",
    description: "Transforma los recursos grises: entrega 10 Cuadrados Cielo y 10 Círculos Coral con colores exactos.",
    hint: "Pasa cada forma por un pintor con su color asignado antes de llevarlas a la salida.",
    timeLimit: 300,
    quota: 20,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'cuadrado_cielo_p', name: 'Cuadrado Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 10 },
      { id: 'circulo_coral_p', name: 'Círculo Coral', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.CORAL), quota: 10 }
    ],
    availableTools: ['belt', 'extractor', 'painter', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.SKY, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 27: Híbrido Cromático
  {
    id: 27,
    name: "Híbrido Cromático",
    description: "Crea una forma de doble color: Círculo con mitad izquierda Menta y mitad derecha Lavanda.",
    hint: "Corta el círculo gris, pinta una mitad de menta, la otra de lavanda y reúnelas en la mezcladora.",
    timeLimit: 320,
    quota: 12,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'circulo_bicolor', name: 'Círculo Menta-Lavanda', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER), quota: 12 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 28: El Laberinto Subterráneo
  {
    id: 28,
    name: "El Laberinto Subterráneo",
    description: "Una muralla central bloquea el paso: usa túneles para transportar 14 Estrellas menta y 14 Rombos cielo.",
    hint: "Los túneles pueden atravesar tanto obstáculos de roca como otras cintas transportadoras.",
    timeLimit: 340,
    quota: 28,
    stars: { gold: 119, silver: 197, bronze: 299 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT),
    demands: [
      { id: 'estrella_28', name: 'Estrella Menta', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT), quota: 14 },
      { id: 'rombo_28', name: 'Rombo Cielo', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.SKY), quota: 14 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.SKY), fixed: true },
      { x: 9, y: 4, type: 'obstacle', fixed: true },
      { x: 9, y: 5, type: 'obstacle', fixed: true },
      { x: 9, y: 6, type: 'obstacle', fixed: true },
      { x: 9, y: 7, type: 'obstacle', fixed: true },
      { x: 9, y: 9, type: 'obstacle', fixed: true },
      { x: 9, y: 10, type: 'obstacle', fixed: true },
      { x: 9, y: 11, type: 'obstacle', fixed: true },
      { x: 9, y: 12, type: 'obstacle', fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 29: Cruce Diagonal
  {
    id: 29,
    name: "Cruce Diagonal",
    description: "Lleva Cuadrados durazno a la salida Norte y Triángulos coral a la salida Sur cruzando sus trayectorias.",
    hint: "Haz que una de las dos líneas pase por un túnel subterráneo en el punto de intersección.",
    timeLimit: 320,
    quota: 20,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'cuadrado_durazno_29', name: 'Cuadrado Durazno', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.PEACH), quota: 10, deliveryIndex: 0 },
      { id: 'triangulo_coral_29', name: 'Triángulo Coral', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL), quota: 10, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL), fixed: true },
      { x: 16, y: 4, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 12, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 30: Ritmo Ágil
  {
    id: 30,
    name: "Ritmo Ágil",
    description: "Fabrica y entrega 18 piezas híbridas Círculo-Triángulo antes de que venza el cronómetro.",
    hint: "Construye rápidamente la cadena de corte y mezcla para maximizar el caudal de entregas por minuto.",
    timeLimit: 175,
    quota: 18,
    stars: { gold: 61, silver: 102, bronze: 154 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY, SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'circulo_triangulo_30', name: 'Círculo-Triángulo', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY, SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), quota: 18 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 31: Filtrado y Vidas (Activación del sistema de vidas)
  {
    id: 31,
    name: "Filtrado Selectivo",
    description: "¡Atención: Sistema de vidas activo (5 ❤️)! Entrega 15 Medios Cuadrados Menta. Desvía el rombo a la trituradora.",
    hint: "Si una forma no solicitada llega al almacén, perderás una vida. Corta la pieza y desvía la mitad residual a la trituradora.",
    hasLives: true,
    timeLimit: 300,
    quota: 15,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: { left: { type: SHAPE_TYPES.SQUARE, color: PASTEL_COLORS.MINT }, right: null },
    demands: [
      { id: 'medio_cuadrado_31', name: 'Medio Cuadrado Menta', shape: { left: { type: SHAPE_TYPES.SQUARE, color: PASTEL_COLORS.MINT }, right: null }, quota: 15 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 32: Doble Filtro Protector
  {
    id: 32,
    name: "Doble Filtro Protector",
    description: "Entrega 16 Triángulos cielo puros (5 ❤️). Los generadores expulsan impurezas que debes incinerar en la trituradora.",
    hint: "Asegúrate de que solo las formas puras lleguen al almacén para conservar todas tus vidas.",
    hasLives: true,
    timeLimit: 300,
    quota: 16,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'triangulo_cielo_32', name: 'Triángulo Cielo Puro', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY), quota: 16 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 33: Ensamble y Descarte
  {
    id: 33,
    name: "Ensamble y Descarte",
    description: "Fabrica 12 joyas compuestas (Círculo menta + Estrella lavanda) cuidando tus vidas (5 ❤️).",
    hint: "Combina las mitades requeridas y deshazte del excedente de forma segura con trituradoras.",
    hasLives: true,
    timeLimit: 320,
    quota: 12,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'circulo_estrella_33', name: 'Círculo-Estrella Menta/Lavanda', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), quota: 12 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 34: Fábrica Integral
  {
    id: 34,
    name: "Fábrica Integral",
    description: "Cadena completa: corta el círculo, pinta su mitad con coral, une con medio triángulo cielo (5 ❤️).",
    hint: "Sigue los pasos secuenciales: Spawner -> Cortadora -> Pintor -> Mezcladora -> Salida.",
    hasLives: true,
    timeLimit: 340,
    quota: 12,
    stars: { gold: 119, silver: 197, bronze: 299 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.CORAL, SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'circulo_triangulo_34', name: 'Círculo Coral / Triángulo Cielo', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.CORAL, SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY), quota: 12 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 35: Simetría Dual
  {
    id: 35,
    name: "Simetría Dual",
    description: "Entrega 10 piezas Cuadrado Cielo/Círculo Durazno y 10 piezas Círculo Durazno/Cuadrado Cielo (5 ❤️).",
    hint: "Aprovecha las dos salidas de la mezcladora o crea dos cadenas espejo paralelas.",
    hasLives: true,
    timeLimit: 340,
    quota: 20,
    stars: { gold: 119, silver: 197, bronze: 299 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'sim_a', name: 'Cuadrado / Círculo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.PEACH), quota: 10 },
      { id: 'sim_b', name: 'Círculo / Cuadrado', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.PEACH, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 10 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 36: Salidas Paralelas Exigentes
  {
    id: 36,
    name: "Salidas Paralelas",
    description: "Dos almacenes en extremos del mapa exigen 12 Rombos lavanda cada uno (24 total, 5 ❤️).",
    hint: "Divide el flujo en dos ramales equivalentes para alimentar ambas salidas equitativamente.",
    hasLives: true,
    timeLimit: 320,
    quota: 24,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'rombo_norte', name: 'Rombo Norte', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER), quota: 12, deliveryIndex: 0 },
      { id: 'rombo_sur', name: 'Rombo Sur', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER), quota: 12, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 16, y: 4, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 12, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 37: Especialización de Puertos
  {
    id: 37,
    name: "Especialización de Puertos",
    description: "Entrega 12 Estrellas coral en la salida Norte y 12 Círculos cielo en la salida Sur (5 ❤️).",
    hint: "Evita mezclar los flujos; si una estrella entra en la salida Sur perderás una vida.",
    hasLives: true,
    timeLimit: 320,
    quota: 24,
    stars: { gold: 112, silver: 186, bronze: 282 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'estrella_coral_37', name: 'Estrella Coral (Norte)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 12, deliveryIndex: 0 },
      { id: 'circulo_cielo_37', name: 'Círculo Cielo (Sur)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY), quota: 12, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 4, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 12, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 38: Depuración Extrema
  {
    id: 38,
    name: "Depuración Extrema",
    description: "Corta la forma combinada impura, destruye los componentes grises y entrega 20 Estrellas menta (5 ❤️).",
    hint: "Construye una línea de trituradoras para descartar todo residuo no deseado antes de que alcance la salida.",
    hasLives: true,
    timeLimit: 300,
    quota: 20,
    stars: { gold: 105, silver: 174, bronze: 264 },
    targetShape: { left: { type: SHAPE_TYPES.STAR, color: PASTEL_COLORS.MINT }, right: null },
    demands: [
      { id: 'estrella_pura_38', name: 'Media Estrella Menta Pura', shape: { left: { type: SHAPE_TYPES.STAR, color: PASTEL_COLORS.MINT }, right: null }, quota: 20 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'tunnel', 'trash'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 6, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 3, y: 10, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 39: Alta Presión
  {
    id: 39,
    name: "Alta Presión",
    description: "Doble demanda de alto volumen: 15 Rombos-Estrella bicolores y 15 Cuadrados cielo bajo cronómetro (5 ❤️).",
    hint: "Planifica el espacio con cuidado; la mezcladora y las cintas paralelas requerirán organización precisa.",
    hasLives: true,
    timeLimit: 260,
    quota: 30,
    stars: { gold: 91, silver: 151, bronze: 229 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'rombo_estrella_39', name: 'Rombo-Estrella Bicolor', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 15 },
      { id: 'cuadrado_cielo_39', name: 'Cuadrado Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 15 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 40: Gran Maestro Automatizador (Sandbox 4 Demandas)
  {
    id: 40,
    name: "Gran Maestro Automatizador",
    description: "El reto supremo: abastece las 4 demandas complejas en tu megacomplejo industrial definitivo.",
    hint: "Sin límite de tiempo ni vidas. ¡Demuestra tu maestría absoluta en la ingeniería de cintas de BeltFlow!",
    hasLives: false,
    timeLimit: null,
    quota: 40,
    stars: { gold: 128, silver: 220, bronze: 340 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'd40_1', name: 'Círculo / Estrella Menta-Lavanda', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), quota: 10 },
      { id: 'd40_2', name: 'Cuadrado / Rombo Cielo-Durazno', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 10 },
      { id: 'd40_3', name: 'Triángulo / Círculo Coral-Menta', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10 },
      { id: 'd40_4', name: 'Rombo / Estrella Durazno-Cielo', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH, SHAPE_TYPES.STAR, PASTEL_COLORS.SKY), quota: 10 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER, PASTEL_COLORS.PEACH, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: false },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: false },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL), fixed: false },
      { x: 3, y: 16, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: false },
      { x: 18, y: 6, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 18, y: 14, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  /* ==========================================================================
     CAPÍTULO 3: VANGUARDIA MECÁNICA (Niveles 41–60)
     ========================================================================== */

  // Nivel 41: El Divisor Equitativo (Mecánica: Splitter)
  {
    id: 41,
    chapter: 3,
    name: "El Divisor Equitativo",
    description: "Usa el Divisor para repartir el flujo de Círculos menta entre dos almacenes de forma alternada.",
    hint: "El Divisor reparte automáticamente una pieza hacia adelante y otra hacia el lateral alternativamente.",
    timeLimit: 220,
    quota: 20,
    stars: { gold: 65, silver: 105, bronze: 160 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'div_norte_41', name: 'Almacén Norte', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10, deliveryIndex: 0 },
      { id: 'div_sur_41', name: 'Almacén Sur', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'splitter'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 16, y: 5, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 11, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 42: Cruce Cuádruple (Mecánica: Crossing / Puente a nivel)
  {
    id: 42,
    chapter: 3,
    name: "Cruce Cuádruple",
    description: "Cruza dos líneas de producción sin que se mezclen utilizando la pieza de Cruce.",
    hint: "El Cruce permite que dos cintas se intercepten en ángulo recto sin mezclar sus piezas.",
    timeLimit: 230,
    quota: 20,
    stars: { gold: 70, silver: 110, bronze: 170 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'cruce_cielo_42', name: 'Cuadrados Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 10, deliveryIndex: 0 },
      { id: 'cruce_menta_42', name: 'Círculos Menta', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'crossing'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 7, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 9, y: 2, type: 'mine', dir: 1, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 16, y: 7, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 9, y: 13, type: 'delivery', dir: 3, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 43: El Fusionador (Mecánica: Merger)
  {
    id: 43,
    chapter: 3,
    name: "El Fusionador",
    description: "Combina dos líneas de extracción en una única cinta transportadora usando el Fusionador.",
    hint: "El Fusionador recibe piezas por varios lados y las entrega por su frente sin atascar la cadena.",
    timeLimit: 210,
    quota: 24,
    stars: { gold: 60, silver: 95, bronze: 150 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'fusion_43', name: 'Triángulos Lavanda', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), quota: 24 }
    ],
    availableTools: ['belt', 'extractor', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 44: Filtro de Colores (Mecánica: Filter)
  {
    id: 44,
    chapter: 3,
    name: "Filtro de Colores",
    description: "Separa la corriente mixta: envía las formas color menta hacia la salida Norte y las cielo a la Sur.",
    hint: "El Filtro deja pasar de frente las piezas coincidentes y desvía al lateral las demás.",
    hasLives: true,
    timeLimit: 260,
    quota: 20,
    stars: { gold: 80, silver: 125, bronze: 190 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'filtro_menta_44', name: 'Círculo Menta (Norte)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10, deliveryIndex: 0 },
      { id: 'filtro_cielo_44', name: 'Círculo Cielo (Sur)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY), quota: 10, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'filter', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 6, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 10, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 5, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 11, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 45: Selector Geométrico (Mecánica: Shape Filter & Trash)
  {
    id: 45,
    chapter: 3,
    name: "Selector Geométrico",
    description: "Filtra los Rombos durazno hacia el almacén y envía los Cuadrados a la trituradora.",
    hint: "Alinea la salida de desvío del filtro directamente hacia la trituradora.",
    timeLimit: 240,
    quota: 14,
    stars: { gold: 75, silver: 120, bronze: 180 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'sel_rombo_45', name: 'Rombo Durazno', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 14 }
    ],
    availableTools: ['belt', 'extractor', 'filter', 'trash', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 6, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 3, y: 10, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.PEACH), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 46: Presupuesto Ajustado (Objetivo: Piece Budget)
  {
    id: 46,
    chapter: 3,
    name: "Presupuesto Ajustado",
    description: "Entrega 12 Estrellas coral utilizando un máximo de 10 componentes colocados.",
    hint: "Cada cinta y extractor cuenta. Traza la ruta más directa y económica posible.",
    maxPieces: 10,
    timeLimit: 200,
    quota: 12,
    stars: { gold: 50, silver: 85, bronze: 140 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'presupuesto_46', name: 'Estrellas Coral (≤10 piezas)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 12 }
    ],
    availableTools: ['belt', 'extractor'],
    allowedColors: [],
    fixedGrid: [
      { x: 5, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 12, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 47: Cintas Rápidas y Lentas (Mecánica: Fast/Slow Belts)
  {
    id: 47,
    chapter: 3,
    name: "Autopista y Paseo",
    description: "Usa cintas rápidas para recorrer la larga distancia central y cintas lentas en la entrada para regular el flujo.",
    hint: "Las cintas rápidas mueven las piezas a doble velocidad, ideales para largas rectas.",
    timeLimit: 190,
    quota: 16,
    stars: { gold: 55, silver: 90, bronze: 145 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'rapida_47', name: 'Círculos Acelerados', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 16 }
    ],
    availableTools: ['belt', 'belt_fast', 'belt_slow', 'extractor'],
    allowedColors: [],
    fixedGrid: [
      { x: 2, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 18, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 48: El Estanque del Loto (Obstáculo de Agua y Puentes)
  {
    id: 48,
    chapter: 3,
    name: "El Estanque del Loto",
    description: "Un estanque de agua cristalina bloquea el paso directo. Cruza el río construyendo un cruce o túnel sobre el agua.",
    hint: "Los cruces actúan como puentes sobre el agua y los túneles permiten pasar por debajo.",
    timeLimit: 240,
    quota: 15,
    stars: { gold: 75, silver: 115, bronze: 175 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'estanque_48', name: 'Cuadrados Cielo', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 15 }
    ],
    availableTools: ['belt', 'extractor', 'crossing', 'tunnel'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 8, y: 4, type: 'water', fixed: true },
      { x: 8, y: 5, type: 'water', fixed: true },
      { x: 8, y: 6, type: 'water', fixed: true },
      { x: 8, y: 7, type: 'water', fixed: true },
      { x: 8, y: 8, type: 'water', fixed: true },
      { x: 8, y: 9, type: 'water', fixed: true },
      { x: 8, y: 10, type: 'water', fixed: true },
      { x: 8, y: 11, type: 'water', fixed: true },
      { x: 8, y: 12, type: 'water', fixed: true },
      { x: 15, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 49: Almacén Pulmón (Mecánica: Buffer)
  {
    id: 49,
    chapter: 3,
    name: "Almacén Pulmón",
    description: "Coloca un Buffer para retener formas y alimentar de manera suave y continua la estación de pintura.",
    hint: "El Buffer acumula hasta 6 piezas y las va liberando ordenadamente a medida que la salida tiene espacio.",
    timeLimit: 240,
    quota: 15,
    stars: { gold: 80, silver: 125, bronze: 185 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'buffer_49', name: 'Triángulos Coral Pintados', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.CORAL), quota: 15 }
    ],
    availableTools: ['belt', 'extractor', 'buffer', 'painter'],
    allowedColors: [PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 50: Portales Gemelos (Mecánica: Portal Teleportation)
  {
    id: 50,
    chapter: 3,
    name: "Portales Gemelos",
    description: "Una cordillera de rocas divide el mapa. Introduce las piezas en el Portal A1 para que salgan por el Portal A2.",
    hint: "Los portales enlazados transportan instantáneamente cualquier forma sin ocupar espacio en la superficie.",
    timeLimit: 220,
    quota: 16,
    stars: { gold: 70, silver: 110, bronze: 170 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'portal_50', name: 'Estrellas Lavanda Cuánticas', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), quota: 16 }
    ],
    availableTools: ['belt', 'extractor', 'splitter'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 7, y: 8, type: 'portal', portalId: 'A1', targetPortal: 'A2', dir: 0, fixed: true },
      // Muro rocoso
      { x: 9, y: 4, type: 'rock', fixed: true },
      { x: 9, y: 5, type: 'rock', fixed: true },
      { x: 9, y: 6, type: 'rock', fixed: true },
      { x: 9, y: 7, type: 'rock', fixed: true },
      { x: 9, y: 8, type: 'rock', fixed: true },
      { x: 9, y: 9, type: 'rock', fixed: true },
      { x: 9, y: 10, type: 'rock', fixed: true },
      { x: 9, y: 11, type: 'rock', fixed: true },
      { x: 9, y: 12, type: 'rock', fixed: true },
      { x: 12, y: 5, type: 'portal', portalId: 'A2', targetPortal: 'A1', dir: 0, fixed: true },
      { x: 17, y: 5, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 51: Reparación de Fábrica (Puzzle de Reparación)
  {
    id: 51,
    chapter: 3,
    name: "Línea Averiada",
    description: "Un taller antiguo tiene cintas desorientadas y tramos desconectados. ¡Repáralo y ponlo a funcionar!",
    hint: "Pulsa sobre las cintas incorrectas para corregir su orientación hacia la salida.",
    timeLimit: 200,
    quota: 12,
    stars: { gold: 50, silver: 85, bronze: 135 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'repair_51', name: 'Círculos Restaurados', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 12 }
    ],
    availableTools: ['belt', 'extractor', 'erase'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 4, y: 8, type: 'extractor', dir: 0, fixed: false },
      { x: 5, y: 8, type: 'belt', dir: 1, fixed: false }, // Apunta abajo erróneamente
      { x: 6, y: 9, type: 'belt', dir: 3, fixed: false },
      { x: 8, y: 8, type: 'belt', dir: 2, fixed: false }, // Apunta al revés
      { x: 10, y: 8, type: 'belt', dir: 0, fixed: false },
      { x: 14, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 52: Cinta Giratoria (Elemento Dinámico de Mapa)
  {
    id: 52,
    chapter: 3,
    name: "La Compuerta Giratoria",
    description: "Una cinta automática en el centro rota periódicamente. Sincroniza tus líneas para aprovechar ambas salidas.",
    hint: "La cinta central cambia cada 4 segundos; aprovecha cada ciclo o usa buffers para regular.",
    timeLimit: 260,
    quota: 20,
    stars: { gold: 85, silver: 135, bronze: 200 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'giratoria_norte_52', name: 'Salida Norte', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 10, deliveryIndex: 0 },
      { id: 'giratoria_este_52', name: 'Salida Este', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 10, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'buffer'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 9, y: 8, type: 'switching_belt', dir: 0, altDir: 3, interval: 4.0, fixed: true },
      { x: 9, y: 4, type: 'delivery', dir: 1, fixed: true, deliveryIndex: 0 },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 53: Ritmo Sostenido (Objetivo de Velocidad de Flujo)
  {
    id: 53,
    chapter: 3,
    name: "Ritmo Sostenido",
    description: "Alcanza una tasa de entrega continua de al menos 1.2 piezas/segundo durante 10 segundos.",
    hint: "Multiplica tus extractores y acelera las entregas con cintas rápidas para mantener el medidor de flujo al máximo.",
    targetRate: 1.2,
    rateDuration: 10,
    timeLimit: 240,
    quota: 25,
    stars: { gold: 60, silver: 100, bronze: 160 },
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'ritmo_53', name: 'Flujo Continuo (≥1.2/s)', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 25 }
    ],
    availableTools: ['belt', 'belt_fast', 'extractor', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 54: Laberinto Rocoso (Rocas + Divisores + Cruces)
  {
    id: 54,
    chapter: 3,
    name: "Laberinto Rocoso",
    description: "Un jardín con rocas densas exige maniobras de precisión con divisores y cruces.",
    hint: "Traza pasillos alternativos y cruza las líneas perpendicularmente.",
    timeLimit: 280,
    quota: 22,
    stars: { gold: 95, silver: 155, bronze: 235 },
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    demands: [
      { id: 'rocas_54', name: 'Triángulos Lavanda', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), quota: 22 }
    ],
    availableTools: ['belt', 'extractor', 'splitter', 'crossing', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 7, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 7, y: 6, type: 'rock', fixed: true },
      { x: 7, y: 7, type: 'rock', fixed: true },
      { x: 7, y: 8, type: 'rock', fixed: true },
      { x: 10, y: 5, type: 'rock', fixed: true },
      { x: 10, y: 9, type: 'rock', fixed: true },
      { x: 16, y: 7, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 55: Doble Portal y Filtro Mixto (Portales + Filtros)
  {
    id: 55,
    chapter: 3,
    name: "Doble Portal y Filtro Mixto",
    description: "Teletransporta las formas bicolores por portales y clasifícalas con filtros especializados hacia cada salida (5 ❤️).",
    hint: "Instala un filtro a la salida del portal para separar limpiamente cada componente sin pérdidas.",
    hasLives: true,
    timeLimit: 300,
    quota: 24,
    stars: { gold: 100, silver: 160, bronze: 245 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'portal_estrella_55', name: 'Estrellas Coral (Norte)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 12, deliveryIndex: 0 },
      { id: 'portal_circulo_55', name: 'Círculos Menta (Sur)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 12, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'filter', 'merger', 'crossing'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 6, y: 8, type: 'portal', portalId: 'B1', targetPortal: 'B2', dir: 0, fixed: true },
      { x: 11, y: 8, type: 'portal', portalId: 'B2', targetPortal: 'B1', dir: 0, fixed: true },
      { x: 17, y: 4, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 17, y: 12, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 56: Ingeniería Minimalista (Presupuesto de 14 piezas)
  {
    id: 56,
    chapter: 3,
    name: "Ingeniería Minimalista",
    description: "Abastece dos demandas con un presupuesto muy estricto de máximo 14 piezas.",
    hint: "El uso eficiente de divisores y curvas compactas es clave para no agotar el presupuesto.",
    maxPieces: 14,
    timeLimit: 240,
    quota: 18,
    stars: { gold: 75, silver: 120, bronze: 185 },
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'min_rombo_56', name: 'Rombo Norte', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 9, deliveryIndex: 0 },
      { id: 'min_rombo_sur_56', name: 'Rombo Sur', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 9, deliveryIndex: 1 }
    ],
    availableTools: ['belt', 'extractor', 'splitter'],
    allowedColors: [],
    fixedGrid: [
      { x: 4, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 14, y: 6, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 14, y: 10, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 57: Arreglo del Complejo Sur (Reparación de Pintor y Mezcladora)
  {
    id: 57,
    chapter: 3,
    name: "Arreglo del Complejo Sur",
    description: "Restaura la cadena de producción semiderruida: alinea los pintores y conecta la mezcladora.",
    hint: "Inspecciona las direcciones de entrada del pintor y la mezcladora para reactivar el proceso.",
    timeLimit: 260,
    quota: 15,
    stars: { gold: 85, silver: 135, bronze: 205 },
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    demands: [
      { id: 'rep_combo_57', name: 'Círculo-Cuadrado Reparado', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 15 }
    ],
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'erase'],
    allowedColors: [PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 3, y: 5, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 7, y: 11, type: 'painter', dir: 0, color: PASTEL_COLORS.SKY, fixed: false },
      { x: 12, y: 8, type: 'mixer', dir: 0, fixed: false },
      { x: 17, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 58: Autopista de Cintas (Cruce Múltiple y Cintas Rápidas)
  {
    id: 58,
    chapter: 3,
    name: "Autopista de Cintas",
    description: "Entrega simultánea de 3 recursos cruzando rutas a máxima velocidad sin colisiones.",
    hint: "Combina cintas rápidas en los ejes principales y cruces para evitar todo tipo de atasco.",
    timeLimit: 300,
    quota: 30,
    stars: { gold: 95, silver: 155, bronze: 235 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL),
    demands: [
      { id: 'auto_estrella_58', name: 'Estrellas Coral', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 10, deliveryIndex: 0 },
      { id: 'auto_triangulo_58', name: 'Triángulos Lavanda', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), quota: 10, deliveryIndex: 1 },
      { id: 'auto_circulo_58', name: 'Círculos Menta', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10, deliveryIndex: 2 }
    ],
    availableTools: ['belt', 'belt_fast', 'extractor', 'crossing', 'merger'],
    allowedColors: [],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 17, y: 4, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 17, y: 8, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 1 },
      { x: 17, y: 12, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 2 }
    ]
  },

  // Nivel 59: Sinfonía Pentatónica (Complejo Industrial Supremo)
  {
    id: 59,
    chapter: 3,
    name: "Sinfonía Pentatónica",
    description: "Procesa y entrega 3 obras de arte geométricas: formas cortadas, pintadas y combinadas en armonía (5 ❤️).",
    hint: "Organiza las secciones en módulos limpios: corte al norte, pintura al centro y combinación al sur.",
    hasLives: true,
    timeLimit: 340,
    quota: 30,
    stars: { gold: 110, silver: 180, bronze: 270 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    demands: [
      { id: 'sinf_1_59', name: 'Estrella-Círculo Bicolor', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), quota: 10 },
      { id: 'sinf_2_59', name: 'Cuadrado Cielo Pulido', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 10 },
      { id: 'sinf_3_59', name: 'Rombo Lavanda Pintado', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER), quota: 10 }
    ],
    availableTools: ['belt', 'belt_fast', 'extractor', 'cutter', 'painter', 'mixer', 'splitter', 'crossing', 'buffer', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.CORAL, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 4, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 8, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 12, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
      { x: 3, y: 16, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
      { x: 18, y: 6, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 18, y: 14, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 1 }
    ]
  },

  // Nivel 60: El Jardín Infinito (Gran Maestro de BeltFlow - Sandbox Zen Supremo)
  {
    id: 60,
    chapter: 3,
    name: "El Jardín Infinito",
    description: "El zenit de la automatización zen: diseña tu obra maestra con todas las herramientas de BeltFlow sin límites de tiempo.",
    hint: "Sin cronómetro ni vidas. Construye a tu propio ritmo la fábrica más relajante, armónica y perfecta del universo.",
    hasLives: false,
    timeLimit: null,
    quota: 40,
    stars: { gold: 130, silver: 220, bronze: 350 },
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    demands: [
      { id: 'd60_1', name: 'Estrella / Rombo Coral-Durazno', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), quota: 10 },
      { id: 'd60_2', name: 'Círculo / Cuadrado Menta-Cielo', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), quota: 10 },
      { id: 'd60_3', name: 'Triángulo Lavanda Puro', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), quota: 10 },
      { id: 'd60_4', name: 'Rombo / Estrella Cielo-Coral', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.SKY, SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), quota: 10 }
    ],
    availableTools: ['belt', 'belt_fast', 'belt_slow', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'splitter', 'merger', 'filter', 'crossing', 'buffer', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER, PASTEL_COLORS.PEACH, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 3, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: false },
      { x: 3, y: 7, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: false },
      { x: 3, y: 11, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: false },
      { x: 3, y: 15, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: false },
      { x: 3, y: 19, type: 'mine', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: false },
      { x: 19, y: 5, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 0 },
      { x: 19, y: 11, type: 'delivery', dir: 2, fixed: true, deliveryIndex: 1 },
      { x: 19, y: 17, type: 'delivery', dir: 2, fixed: true, secondary: true, deliveryIndex: 2 }
    ]
  }
];

/* ==========================================================================
   BIOMAS POR CAPÍTULO
   ========================================================================== */
export const BIOMES = {
  1: {
    id: 'invernadero',
    chapter: 1,
    name: "Invernadero Botánico",
    levels: "1–20",
    particleType: 'pollen',
    themeColor: '#A8D5BA',
    description: "Brisa suave, polen dorado flotante y tonos menta relajantes."
  },
  2: {
    id: 'zen',
    chapter: 2,
    name: "Taller Zen & Cristal Ártico",
    levels: "21–40",
    particleType: 'snow',
    themeColor: '#A9CCE3',
    description: "Ondas de arena zen, quietud invernal y copos translúcidos."
  },
  3: {
    id: 'cuarzo',
    chapter: 3,
    name: "Desierto de Cuarzo & Fábrica Nocturna",
    levels: "41–60",
    particleType: 'fireflies',
    themeColor: '#C9B6E4',
    description: "Tonos lavanda y cuarzo, destellos de luciérnagas y maquinaria armónica."
  }
};

/* ==========================================================================
   ASPECTOS COSMÉTICOS (Cosmetic Skins)
   ========================================================================== */
export const COSMETIC_SKINS = [
  { id: 'default', name: 'Cinta Clásica', cost: 0, desc: 'Diseño industrial estándar anti-fatiga' },
  { id: 'skin_bamboo', name: 'Bambú Zen', cost: 15, desc: 'Acabado en madera suave con vetas naturales' },
  { id: 'skin_sakura', name: 'Flor de Cerezo', cost: 25, desc: 'Tonalidades pétalo de cerezo y ribetes suaves' },
  { id: 'skin_cyber', name: 'Menta Cuántica', cost: 35, desc: 'Líneas depuradas con pulsos translúcidos de luz' },
  { id: 'skin_gold', name: 'Oro Satinado', cost: 50, desc: 'Brillo cálido mate reservado a los grandes maestros' }
];

/* ==========================================================================
   LOGROS (Achievements)
   ========================================================================== */
export const ACHIEVEMENTS = [
  { id: 'first_belt', icon: '🛤️', name: "Primeros Pasos", desc: "Coloca tu primera cinta transportadora." },
  { id: 'level_5', icon: '🌱', name: "Explorador", desc: "Supera los primeros 5 niveles." },
  { id: 'chapter_1', icon: '🌿', name: "Graduado del Invernadero", desc: "Completa el Capítulo 1 (Nivel 20)." },
  { id: 'chapter_2', icon: '❄️', name: "Maestro Zen", desc: "Completa el Capítulo 2 (Nivel 40)." },
  { id: 'chapter_3', icon: '🌌', name: "Gran Ingeniero Universal", desc: "Completa el Capítulo 3 (Nivel 60)." },
  { id: 'splitter_pro', icon: '🔀', name: "División Justa", desc: "Entrega 50 piezas divididas equitativamente." },
  { id: 'crossing_ace', icon: '➕', name: "Cruce Sin Accidentes", desc: "Transporta 100 piezas a través de cruces." },
  { id: 'filter_master', icon: '🎯', name: "Clasificador Supremo", desc: "Filtra 50 piezas usando selectores." },
  { id: 'zero_trash', icon: '🍃', name: "Cero Desperdicio", desc: "Supera un nivel sin usar trituradora." },
  { id: 'speed_demon', icon: '⚡', name: "Fiebre de Velocidad", desc: "Alcanza una tasa de producción de 1.5 piezas/s." },
  { id: 'budget_hero', icon: '📐', name: "Minimalismo Industrial", desc: "Supera un nivel cumpliendo el objetivo de presupuesto." },
  { id: 'repairman', icon: '🔧', name: "Manitas de Fábrica", desc: "Resuelve tu primer nivel de reparación." },
  { id: 'portal_traveler', icon: '🌀', name: "Salto Cuántico", desc: "Teletransporta 50 formas a través de portales." },
  { id: 'buffer_full', icon: '📦', name: "Almacén Lleno", desc: "Llena un buffer al máximo de su capacidad (6 piezas)." },
  { id: 'gold_hunter_5', icon: '🥇', name: "Buscador de Oro", desc: "Consigue calificación Oro en 5 niveles." },
  { id: 'gold_hunter_20', icon: '🏆', name: "Tesoro Brillante", desc: "Consigue calificación Oro en 20 niveles." },
  { id: 'gold_hunter_40', icon: '👑', name: "Perfeccionista Dorado", desc: "Consigue calificación Oro en 40 niveles." },
  { id: 'streak_20', icon: '✨', name: "Cadena Perfecta", desc: "Alcanza una racha continua de 20 entregas sin fallos." },
  { id: 'streak_50', icon: '💫', name: "Flujo Infinito", desc: "Alcanza una racha continua de 50 entregas." },
  { id: 'painter_guru', icon: '🎨', name: "Arcoíris Suave", desc: "Pinta piezas con los 5 colores pastel." },
  { id: 'mixer_virtuoso', icon: '⚗️', name: "Alquimista Geométrico", desc: "Combina 50 formas compuestas en la mezcladora." },
  { id: 'cutter_precision', icon: '✂️', name: "Bisturí de Precisión", desc: "Corta 50 formas en mitades perfectas." },
  { id: 'star_collector_50', icon: '⭐', name: "Cielo Estrellado", desc: "Acumula 50 estrellas en total." },
  { id: 'star_collector_120', icon: '🌟', name: "Constelación Suprema", desc: "Acumula 120 estrellas." },
  { id: 'cosmetic_enthusiast', icon: '🎀', name: "Estilo Personalizado", desc: "Desbloquea y equipa tu primer aspecto cosmético." }
];
