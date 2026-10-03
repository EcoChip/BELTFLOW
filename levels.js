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
    description: "Conecta el extractor con la salida usando una cinta recta.",
    hint: "Haz clic y arrastra con la Cinta seleccionada hacia la derecha.",
    timeLimit: 180,
    quota: 5,
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 5, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 4, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 5, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 4, y: 6, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 4, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 4, y: 10, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt'],
    fixedGrid: [
      { x: 4, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 4, y: 11, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'trash'],
    fixedGrid: [
      { x: 4, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER), fixed: true },
      { x: 4, y: 9, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY, null, null), // solo izquierda
    availableTools: ['belt', 'cutter', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    targetShape: { left: null, right: { type: SHAPE_TYPES.CIRCLE, color: PASTEL_COLORS.MINT } },
    availableTools: ['belt', 'cutter', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.LAVENDER, PASTEL_COLORS.MINT, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 4, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
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
    targetShape: { left: { type: SHAPE_TYPES.STAR, color: PASTEL_COLORS.CORAL }, right: null },
    availableTools: ['belt', 'cutter', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.MINT],
    fixedGrid: [
      { x: 3, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.GRAY), fixed: true },
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
    targetShape: { left: null, right: { type: SHAPE_TYPES.DIAMOND, color: PASTEL_COLORS.PEACH } },
    availableTools: ['belt', 'cutter', 'painter', 'trash'],
    allowedColors: [PASTEL_COLORS.PEACH, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 3, y: 7, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT),
    availableTools: ['belt', 'tunnel', 'trash'],
    fixedGrid: [
      { x: 4, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 8, y: 4, type: 'spawner', dir: 1, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'cutter', 'mixer', 'trash', 'tunnel'],
    fixedGrid: [
      { x: 3, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.SKY, SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 8, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    availableTools: ['belt', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.PEACH],
    fixedGrid: [
      { x: 3, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 11, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: true },
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
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY),
    availableTools: ['belt', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.SKY],
    fixedGrid: [
      { x: 4, y: 4, type: 'spawner', dir: 1, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 4, y: 12, type: 'spawner', dir: 3, shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY), fixed: true },
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
    description: "Entrega simultáneamente medios círculos en la salida A y círculos completos en la salida B.",
    hint: "Aprovecha la cortadora: envía una mitad a una salida y recompón o usa el excedente.",
    timeLimit: 320,
    quota: 14,
    targetShape: { left: { type: SHAPE_TYPES.CIRCLE, color: PASTEL_COLORS.MINT }, right: null },
    secondaryTarget: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.LAVENDER],
    fixedGrid: [
      { x: 3, y: 6, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true },
      { x: 3, y: 10, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.GRAY), fixed: true },
      { x: 14, y: 5, type: 'delivery', dir: 2, fixed: true },
      { x: 14, y: 11, type: 'delivery', dir: 2, fixed: true, secondary: true }
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
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH),
    availableTools: ['belt', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.CORAL, PASTEL_COLORS.PEACH],
    fixedGrid: [
      { x: 3, y: 4, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 7, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.CORAL), fixed: true },
      { x: 3, y: 10, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 3, y: 13, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.PEACH), fixed: true },
      { x: 15, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  },

  // Nivel 20: Maestro del Flujo (Sandbox)
  {
    id: 20,
    name: "Maestro del Flujo",
    description: "Crea una joya geométrica: Estrella menta + Rombo lavanda. ¡Libertad creativa total!",
    hint: "Dispones de todas las herramientas y recursos infinitos. ¡Enhorabuena por llegar hasta aquí!",
    timeLimit: null, // Relajado / Sin prisa
    quota: 30,
    targetShape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.MINT, SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER),
    availableTools: ['belt', 'extractor', 'cutter', 'painter', 'mixer', 'tunnel', 'trash'],
    allowedColors: [PASTEL_COLORS.MINT, PASTEL_COLORS.SKY, PASTEL_COLORS.LAVENDER, PASTEL_COLORS.PEACH, PASTEL_COLORS.CORAL],
    fixedGrid: [
      { x: 3, y: 5, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.GRAY), fixed: false },
      { x: 3, y: 11, type: 'spawner', dir: 0, shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.GRAY), fixed: false },
      { x: 16, y: 8, type: 'delivery', dir: 2, fixed: true }
    ]
  }
];
