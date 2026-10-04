/**
 * BeltFlow - Expansión Biomolecular & Cuántica (Biomolecular & Quantum Expansion)
 * Módulo DLC desacoplado del motor central de cintas y formas geométricas.
 * 
 * Características:
 * 1. Sistema de Recursos y Nodos (Menas naturales en el grid):
 *    - 'sugar_deposit' (Mena de Azúcar)
 *    - 'protein_deposit' (Mena de Proteínas)
 *    - 'quantum_anomaly' (Anomalía Cuántica / Materia Exótica)
 * 2. Edificios de Fabricación:
 *    - Fábrica Estándar (1x1): hasta 2 entradas, 1 salida. Nivel 1 y 2.
 *    - Mega Ensambladora (2x2): ocupa 4 celdas del grid, múltiples entradas perimetrales, recetas nivel 3 y 4.
 * 3. Cadena de Recetas y Crafteo:
 *    - Nivel 1: sugar_crystal, raw_protein, subatomic_particle
 *    - Nivel 2: sugar_cube (3x sugar_crystal), protein_bar (2x raw_protein + 1x sugar_crystal)
 *    - Nivel 3: refined_sugar_cube (2x sugar_cube)
 *    - Nivel 4 (Endgame): quantum_sugar_cube (4x refined_sugar_cube + 2x protein_bar + 4x subatomic_particle)
 * 4. UI y Controles de Máquina:
 *    - Barra de progreso flotante limpia con % y preview de producto.
 *    - Alerta visual flotante si está en pausa por falta de material.
 *    - Interacción con Tecla 'E' (hover + 'E' o tap táctil) para cambio dinámico de receta.
 *    - Vaciado seguro de buffer incompatible al alternar receta.
 */

export const RESOURCE_NODES = {
  sugar_deposit: {
    id: 'sugar_deposit',
    name: 'Mena de Azúcar',
    resourceItem: 'sugar_crystal',
    color: '#E2F0D9',
    accentColor: '#A8D5BA',
    description: 'Yacimiento natural de sacarosa pura cristalizada.',
    spawnWeight: 0.50
  },
  protein_deposit: {
    id: 'protein_deposit',
    name: 'Mena de Proteínas',
    resourceItem: 'raw_protein',
    color: '#FADBD8',
    accentColor: '#E8A0A0',
    description: 'Estructura orgánica de cadenas peptídicas concentradas.',
    spawnWeight: 0.35
  },
  quantum_anomaly: {
    id: 'quantum_anomaly',
    name: 'Anomalía Cuántica',
    resourceItem: 'subatomic_particle',
    color: '#E8DAEF',
    accentColor: '#C9B6E4',
    description: 'Vórtice espaciotemporal que condensa materia subatómica exótica.',
    spawnWeight: 0.15
  }
};

export const DLC_ITEMS = {
  sugar_crystal: {
    id: 'sugar_crystal',
    name: 'Cristal de Azúcar',
    tier: 1,
    icon: '❄️',
    color: '#F4F9F4',
    border: '#A8D5BA',
    description: 'Monómero básico de sacarosa pura.'
  },
  raw_protein: {
    id: 'raw_protein',
    name: 'Proteína Pura',
    tier: 1,
    icon: '🧬',
    color: '#FCECEB',
    border: '#E8A0A0',
    description: 'Biomaterial sintético de rápida absorción.'
  },
  subatomic_particle: {
    id: 'subatomic_particle',
    name: 'Partícula Subatómica',
    tier: 1,
    icon: '⚛️',
    color: '#F2EDFA',
    border: '#C9B6E4',
    description: 'Materia exótica condensada en suspensión cuántica.'
  },
  sugar_cube: {
    id: 'sugar_cube',
    name: 'Terrón de Azúcar',
    tier: 2,
    icon: '🧊',
    color: '#FFFFFF',
    border: '#B8C5D6',
    description: 'Bloque sólido cristalizado de alta densidad.'
  },
  protein_bar: {
    id: 'protein_bar',
    name: 'Barra de Proteína',
    tier: 2,
    icon: '🍫',
    color: '#F7DC6F',
    border: '#D4AC0D',
    description: 'Compuesto nutritivo estabilizado con azúcar.'
  },
  refined_sugar_cube: {
    id: 'refined_sugar_cube',
    name: 'Terrón Procesado',
    tier: 3,
    icon: '💎',
    color: '#E8F8F5',
    border: '#73C6B6',
    description: 'Cristal hiperdenso sometido a ultra-presión.'
  },
  quantum_sugar_cube: {
    id: 'quantum_sugar_cube',
    name: 'Terrón Cuántico',
    tier: 4,
    icon: '🔮',
    color: '#F5EEF8',
    border: '#AF7AC5',
    description: 'Hipercubo cuántico resonante de poder ilimitado.'
  }
};

export const RECIPES = [
  {
    id: 'sugar_cube',
    name: 'Terrón de Azúcar',
    tier: 2,
    machineRequirement: 'any', // factory_1x1 o factory_2x2
    inputs: { sugar_crystal: 3 },
    output: 'sugar_cube',
    time: 2.2,
    description: '3x Cristal de Azúcar -> 1x Terrón'
  },
  {
    id: 'protein_bar',
    name: 'Barra de Proteína',
    tier: 2,
    machineRequirement: 'any',
    inputs: { raw_protein: 2, sugar_crystal: 1 },
    output: 'protein_bar',
    time: 2.8,
    description: '2x Proteína + 1x Azúcar -> 1x Barra'
  },
  {
    id: 'refined_sugar_cube',
    name: 'Terrón Procesado',
    tier: 3,
    machineRequirement: 'any',
    inputs: { sugar_cube: 2 },
    output: 'refined_sugar_cube',
    time: 3.8,
    description: '2x Terrón de Azúcar (alta presión) -> 1x Procesado'
  },
  {
    id: 'quantum_sugar_cube',
    name: 'Terrón Cuántico',
    tier: 4,
    machineRequirement: 'factory_2x2', // Exclusivo de la Mega Ensambladora 2x2
    inputs: { refined_sugar_cube: 4, protein_bar: 2, subatomic_particle: 4 },
    output: 'quantum_sugar_cube',
    time: 6.5,
    description: '4x Procesado + 2x Barra + 4x Subatómica -> 1x Terrón Cuántico'
  }
];

export class QuantumDLC {
  static isEnabled = true;

  // Registrar receta por ID
  static getRecipe(id) {
    return RECIPES.find(r => r.id === id) || RECIPES[0];
  }

  // Comprobar si una receta es compatible con una máquina
  static isRecipeCompatible(recipe, machineType) {
    if (!recipe) return false;
    if (recipe.machineRequirement === 'factory_2x2') {
      return machineType === 'factory_2x2';
    }
    return true; // factory_1x1 y factory_2x2 pueden hacer recetas estándar
  }

  // Recetas válidas para un tipo de edificio
  static getAvailableRecipes(machineType) {
    return RECIPES.filter(r => QuantumDLC.isRecipeCompatible(r, machineType));
  }

  /* ==========================================================================
     1. GESTIÓN DEL GRID Y COLISIONES 2X2
     ========================================================================== */

  /**
   * Comprueba si una Mega Ensambladora (2x2) cabe en las coordenadas indicadas
   */
  static canPlaceFactory2x2(grid, rootX, rootY) {
    if (rootX < 0 || rootY < 0 || rootX + 1 >= grid.size || rootY + 1 >= grid.size) {
      return false;
    }
    const coords = [
      { x: rootX, y: rootY },
      { x: rootX + 1, y: rootY },
      { x: rootX, y: rootY + 1 },
      { x: rootX + 1, y: rootY + 1 }
    ];

    for (const c of coords) {
      const piece = grid.get(c.x, c.y);
      if (piece && (piece.fixed || piece.type === 'obstacle' || piece.type === 'rock' || piece.type === 'water')) {
        return false;
      }
    }
    return true;
  }

  /**
   * Coloca una Mega Ensambladora 2x2 ocupando exactamente 4 celdas lógicas
   */
  static placeFactory2x2(grid, rootX, rootY, dir = 0, recipeId = 'quantum_sugar_cube') {
    if (!QuantumDLC.canPlaceFactory2x2(grid, rootX, rootY)) return null;

    const rootPiece = {
      x: rootX,
      y: rootY,
      type: 'factory_2x2',
      dir: dir,
      recipeId: recipeId,
      buffer: {},
      isCrafting: false,
      progress: 0.0,
      fixed: false,
      rootX: rootX,
      rootY: rootY
    };

    // Registrar celda raíz
    grid.set(rootX, rootY, rootPiece);

    // Registrar las otras 3 celdas esclavas
    const parts = [
      { x: rootX + 1, y: rootY, relX: 1, relY: 0 },
      { x: rootX, y: rootY + 1, relX: 0, relY: 1 },
      { x: rootX + 1, y: rootY + 1, relX: 1, relY: 1 }
    ];

    for (const p of parts) {
      grid.set(p.x, p.y, {
        x: p.x,
        y: p.y,
        type: 'factory_2x2_part',
        rootX: rootX,
        rootY: rootY,
        relX: p.relX,
        relY: p.relY,
        dir: dir,
        fixed: false
      });
    }

    return rootPiece;
  }

  /**
   * Elimina completamente un edificio 2x2 desde cualquiera de sus 4 celdas
   */
  static removeFactory2x2(grid, cellX, cellY) {
    const piece = grid.get(cellX, cellY);
    if (!piece) return false;
    if (piece.type !== 'factory_2x2' && piece.type !== 'factory_2x2_part') return false;

    const rootX = piece.rootX !== undefined ? piece.rootX : piece.x;
    const rootY = piece.rootY !== undefined ? piece.rootY : piece.y;

    const coords = [
      { x: rootX, y: rootY },
      { x: rootX + 1, y: rootY },
      { x: rootX, y: rootY + 1 },
      { x: rootX + 1, y: rootY + 1 }
    ];

    for (const c of coords) {
      grid.cells.delete(grid.key(c.x, c.y));
    }
    return true;
  }

  /**
   * Obtiene la pieza raíz 2x2 a partir de cualquier coordenada que ocupe
   */
  static getRootPiece(grid, x, y) {
    const piece = grid.get(x, y);
    if (!piece) return null;
    if (piece.type === 'factory_2x2') return piece;
    if (piece.type === 'factory_2x2_part') {
      return grid.get(piece.rootX, piece.rootY);
    }
    return null;
  }

  /* ==========================================================================
     2. GESTIÓN DE MENAS PROCEDURALES Y EXTRACTORES
     ========================================================================== */

  /**
   * Genera yacimientos procedurales del DLC en el mapa
   */
  static generateDeposits(grid, count = 6, options = {}) {
    const types = ['sugar_deposit', 'protein_deposit', 'quantum_anomaly'];
    const bounds = options.bounds || { minX: 3, maxX: grid.size - 4, minY: 3, maxY: grid.size - 4 };
    const placed = [];

    let attempts = 0;
    while (placed.length < count && attempts < 200) {
      attempts++;
      const rx = Math.floor(Math.random() * (bounds.maxX - bounds.minX + 1)) + bounds.minX;
      const ry = Math.floor(Math.random() * (bounds.maxY - bounds.minY + 1)) + bounds.minY;

      if (grid.hasMine(rx, ry) || grid.get(rx, ry)) continue;

      // Probabilidad ponderada
      const rand = Math.random();
      let chosenType = 'sugar_deposit';
      if (rand > 0.85) {
        chosenType = 'quantum_anomaly'; // 15% baja probabilidad
      } else if (rand > 0.50) {
        chosenType = 'protein_deposit'; // 35%
      } else {
        chosenType = 'sugar_deposit';   // 50%
      }

      const info = RESOURCE_NODES[chosenType];
      const depositMine = {
        x: rx,
        y: ry,
        type: 'mine',
        resourceType: chosenType,
        shape: { dlcItem: info.resourceItem },
        fixed: true
      };

      grid.setMine(rx, ry, depositMine);
      placed.push(depositMine);
    }

    return placed;
  }

  /* ==========================================================================
     3. SIMULACIÓN DE MÁQUINAS (Core loop update)
     ========================================================================== */

  /**
   * Actualiza el crafteo y admisión de materiales de todas las fábricas
   */
  static updateSimulation(sim, dt, speedMult) {
    const effectiveDt = dt * speedMult;
    const grid = sim.grid;

    // Obtener todas las fábricas activas (Fábrica 1x1 y raíces de Fábrica 2x2)
    const factories = grid.getAllPieces().filter(p => p.type === 'factory_1x1' || p.type === 'factory_2x2');

    for (const factory of factories) {
      // 1. Inicializar estado si es necesario
      if (!factory.buffer) factory.buffer = {};
      if (factory.progress === undefined) factory.progress = 0.0;
      if (!factory.recipeId) {
        factory.recipeId = factory.type === 'factory_2x2' ? 'quantum_sugar_cube' : 'sugar_cube';
      }

      const recipe = QuantumDLC.getRecipe(factory.recipeId);
      if (!recipe) continue;

      // 2. Admisión de materiales desde cintas adyacentes
      QuantumDLC.processMaterialIntake(sim, factory, recipe);

      // 3. Comprobar si hay suficientes ingredientes para craftear
      let hasAllInputs = true;
      for (const [inItem, requiredCount] of Object.entries(recipe.inputs)) {
        const curCount = factory.buffer[inItem] || 0;
        if (curCount < requiredCount) {
          hasAllInputs = false;
          break;
        }
      }

      // 4. Lógica de crafteo progresivo
      if (hasAllInputs) {
        factory.isCrafting = true;
        factory.progress += effectiveDt / recipe.time;

        if (factory.progress >= 1.0) {
          // Intentar expulsar el ítem producido
          const success = QuantumDLC.ejectProducedItem(sim, factory, recipe.output);
          if (success) {
            // Descontar del buffer
            for (const [inItem, requiredCount] of Object.entries(recipe.inputs)) {
              factory.buffer[inItem] = Math.max(0, (factory.buffer[inItem] || 0) - requiredCount);
            }
            factory.progress = 0.0;
            sim.triggerMachineAnim(factory.x, factory.y, 'factory_crafted', {
              item: recipe.output,
              type: factory.type
            });
          } else {
            // Salida bloqueada: retener al 100% hasta que la cinta se despeje
            factory.progress = 1.0;
          }
        }
      } else {
        factory.isCrafting = false;
      }
    }
  }

  /**
   * Ingesta de materiales perimetrales hacia el buffer de la máquina
   */
  static processMaterialIntake(sim, factory, recipe) {
    const grid = sim.grid;
    const maxBufferPerItem = 8;

    // Detectar qué celdas del mundo constituyen entradas válidas
    const inputCells = [];

    if (factory.type === 'factory_1x1') {
      // Fábrica 1x1: hasta 2 entradas (por detrás y laterales)
      const rearDir = (factory.dir + 2) % 4;
      const leftDir = (factory.dir + 3) % 4;
      const rightDir = (factory.dir + 1) % 4;

      const rearDelta = sim.game ? sim.game.constructor.DIR_DELTA?.[rearDir] : null;
      // Añadir vecinos que apunten hacia factory.x, factory.y
      for (const d of [rearDir, leftDir, rightDir]) {
        const delta = QuantumDLC.getDirDelta(d);
        inputCells.push({
          x: factory.x + delta.x,
          y: factory.y + delta.y,
          expectedInDir: (d + 2) % 4,
          targetX: factory.x,
          targetY: factory.y
        });
      }
    } else if (factory.type === 'factory_2x2') {
      // Mega Ensambladora 2x2: admite hasta 4 inserciones perimetrales alrededor de sus 4 celdas
      const rx = factory.rootX;
      const ry = factory.rootY;

      // Perímetro norte
      inputCells.push({ x: rx, y: ry - 1, targetX: rx, targetY: ry });
      inputCells.push({ x: rx + 1, y: ry - 1, targetX: rx + 1, targetY: ry });
      // Perímetro sur
      inputCells.push({ x: rx, y: ry + 2, targetX: rx, targetY: ry + 1 });
      inputCells.push({ x: rx + 1, y: ry + 2, targetX: rx + 1, targetY: ry + 1 });
      // Perímetro oeste
      inputCells.push({ x: rx - 1, y: ry, targetX: rx, targetY: ry });
      inputCells.push({ x: rx - 1, y: ry + 1, targetX: rx, targetY: ry + 1 });
      // Perímetro este
      inputCells.push({ x: rx + 2, y: ry, targetX: rx + 1, targetY: ry });
      inputCells.push({ x: rx + 2, y: ry + 1, targetX: rx + 1, targetY: ry + 1 });
    }

    // Comprobar ítems en sim.items que hayan alcanzado el final de su trayecto hacia la fábrica
    for (let i = sim.items.length - 1; i >= 0; i--) {
      const item = sim.items[i];
      if (!item.shape || !item.shape.dlcItem) continue;

      const itemId = item.shape.dlcItem;
      const isNeeded = recipe.inputs[itemId] !== undefined;

      // Si el ítem no pertenece a la receta activa, no lo admitimos
      if (!isNeeded) continue;

      // Comprobar capacidad de buffer
      const curBuffer = factory.buffer[itemId] || 0;
      if (curBuffer >= maxBufferPerItem) continue;

      // Comprobar si el ítem está sobre una celda vecina y apunta a la fábrica
      const matchCell = inputCells.find(c => c.x === item.x && c.y === item.y);
      if (matchCell && item.progress >= 0.85) {
        // Absorber ítem
        factory.buffer[itemId] = curBuffer + 1;
        sim.items.splice(i, 1);
        sim.triggerMachineAnim(factory.x, factory.y, 'factory_intake', { item: itemId });
      }
    }
  }

  /**
   * Expulsa el producto crafteado hacia la cinta conectada en la salida
   */
  static ejectProducedItem(sim, factory, outputItemId) {
    const grid = sim.grid;
    let outX, outY;

    if (factory.type === 'factory_1x1') {
      const delta = QuantumDLC.getDirDelta(factory.dir);
      outX = factory.x + delta.x;
      outY = factory.y + delta.y;
    } else {
      // Mega Ensambladora 2x2: salida frontal según factory.dir
      const rx = factory.rootX;
      const ry = factory.rootY;
      const delta = QuantumDLC.getDirDelta(factory.dir);

      if (factory.dir === 0) { // Derecha (+X)
        outX = rx + 2;
        outY = ry;
      } else if (factory.dir === 1) { // Abajo (+Y)
        outX = rx;
        outY = ry + 2;
      } else if (factory.dir === 2) { // Izquierda (-X)
        outX = rx - 1;
        outY = ry;
      } else { // Arriba (-Y)
        outX = rx;
        outY = ry - 1;
      }
    }

    const nextPiece = grid.get(outX, outY);
    if (!nextPiece || !sim.canAcceptItem(nextPiece, factory.dir)) {
      return false;
    }

    // Comprobar si el punto de salida está obstruido por otro ítem
    const isBlocked = sim.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
    if (isBlocked) {
      return false;
    }

    // Generar el ítem del DLC
    sim.spawnItem({ dlcItem: outputItemId }, outX, outY, factory.dir);
    if (!sim.totalCrafted) sim.totalCrafted = {};
    sim.totalCrafted[outputItemId] = (sim.totalCrafted[outputItemId] || 0) + 1;
    if (sim.game && typeof sim.game.checkAchievements === 'function') {
      sim.game.checkAchievements();
    }
    return true;
  }

  static getDirDelta(dir) {
    const deltas = [
      { x: 1, y: 0 },  // 0: RIGHT
      { x: 0, y: 1 },  // 1: DOWN
      { x: -1, y: 0 }, // 2: LEFT
      { x: 0, y: -1 }  // 3: UP
    ];
    return deltas[dir] || deltas[0];
  }

  /* ==========================================================================
     4. RENDERIZADO VISUAL DEL DLC (Canvas 2D)
     ========================================================================== */

  /**
   * Renderiza el ítem del DLC con alta fidelidad y estética anti-fatiga pastel
   */
  static drawItem(ctx, itemId, size = 20, isDark = false) {
    const def = DLC_ITEMS[itemId];
    if (!def) return;

    ctx.save();

    switch (itemId) {
      case 'sugar_crystal': {
        // Octaedro cristalino facetado menta y blanco perla
        const r = size * 0.72;
        ctx.fillStyle = isDark ? '#E8F5E9' : '#FFFFFF';
        ctx.strokeStyle = '#A8D5BA';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.75, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.75, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Facetas internas con reflejo sutil
        ctx.strokeStyle = 'rgba(168, 213, 186, 0.45)';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.moveTo(-r * 0.75, 0);
        ctx.lineTo(r * 0.75, 0);
        ctx.stroke();
        break;
      }

      case 'raw_protein': {
        // Estructura bio-orgánica globular / doble lazo suave pastel coral
        const r = size * 0.65;
        ctx.fillStyle = '#E8A0A0';
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(232, 160, 160, 0.7)';
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        ctx.arc(-r * 0.35, 0, r * 0.55, 0, Math.PI * 2);
        ctx.arc(r * 0.35, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Núcleo celular
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'subatomic_particle': {
        // Núcleo cuántico radiante con orbitales giratorios
        const r = size * 0.75;
        const time = performance.now() * 0.003;

        // Órbita 1
        ctx.save();
        ctx.rotate(time);
        ctx.strokeStyle = '#C9B6E4';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Órbita 2
        ctx.save();
        ctx.rotate(-time * 1.2 + 1.0);
        ctx.strokeStyle = '#A9CCE3';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Núcleo radiante
        ctx.fillStyle = '#C9B6E4';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'sugar_cube': {
        // Cubo isométrico 3D facetado blanco azúcar
        const r = size * 0.68;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isDark ? '#A0AEC0' : '#CBD5E1';

        // Cara superior
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.85, -r * 0.45);
        ctx.lineTo(0, 0);
        ctx.lineTo(-r * 0.85, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cara izquierda
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, -r * 0.45);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, r * 0.85);
        ctx.lineTo(-r * 0.85, r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cara derecha
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 0.85, -r * 0.45);
        ctx.lineTo(r * 0.85, r * 0.4);
        ctx.lineTo(0, r * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'protein_bar': {
        // Barra bio-energética rectangular dividida en bloques
        const w = size * 1.25;
        const h = size * 0.65;
        ctx.fillStyle = '#F5C6A5';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.6;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, 4);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        // Divisiones de barrita
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
        ctx.beginPath();
        ctx.moveTo(-w / 6, -h / 2);
        ctx.lineTo(-w / 6, h / 2);
        ctx.moveTo(w / 6, -h / 2);
        ctx.lineTo(w / 6, h / 2);
        ctx.stroke();
        break;
      }

      case 'refined_sugar_cube': {
        // Cubo hiper-procesado con halo prismático y brillo de diamante
        const r = size * 0.72;
        const pulse = Math.sin(performance.now() * 0.005) * 1.5;

        // Halo radiante
        ctx.fillStyle = 'rgba(115, 198, 182, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.15 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Cubo isométrico con reflejo turquesa
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#73C6B6';

        ctx.fillStyle = '#E8F8F5';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.85, -r * 0.45);
        ctx.lineTo(0, 0);
        ctx.lineTo(-r * 0.85, -r * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#D1F2EB';
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, -r * 0.45);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, r * 0.85);
        ctx.lineTo(-r * 0.85, r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#A3E4D7';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 0.85, -r * 0.45);
        ctx.lineTo(r * 0.85, r * 0.4);
        ctx.lineTo(0, r * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'quantum_sugar_cube': {
        // Hipercubo cuántico (Tesseract) con rotación y anillo dimensional
        const r = size * 0.85;
        const time = performance.now() * 0.002;

        // Corona cuántica pulsante
        const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.3);
        auraGrad.addColorStop(0, 'rgba(201, 182, 228, 0.55)');
        auraGrad.addColorStop(0.7, 'rgba(169, 204, 227, 0.25)');
        auraGrad.addColorStop(1, 'rgba(201, 182, 228, 0.0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Cubo exterior
        ctx.save();
        ctx.rotate(time * 0.5);
        ctx.strokeStyle = '#AF7AC5';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
        ctx.restore();

        // Cubo interior contra-rotatorio
        ctx.save();
        ctx.rotate(-time * 0.8);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#5499C7';
        ctx.lineWidth = 1.6;
        ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
        ctx.strokeRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
        ctx.restore();

        // Núcleo cuántico
        ctx.fillStyle = '#C9B6E4';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default:
        ctx.fillStyle = '#A8D5BA';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renderiza el aspecto físico de una Mena/Yacimiento natural del DLC
   */
  static drawDeposit(renderer, ctx, mine, s) {
    const cx = (mine.x + 0.5) * s;
    const cy = (mine.y + 0.5) * s;
    const info = RESOURCE_NODES[mine.resourceType] || RESOURCE_NODES.sugar_deposit;
    const isDark = renderer.isDark;

    ctx.save();

    // Halo palpitante suave
    const pulse = Math.sin(performance.now() * 0.0028 + mine.x * 2.5 + mine.y * 3.5) * 2.0;
    const haloGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, s * 0.55 + pulse);
    haloGrad.addColorStop(0, `${info.accentColor}55`);
    haloGrad.addColorStop(0.65, `${info.accentColor}20`);
    haloGrad.addColorStop(1, `${info.accentColor}00`);

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.55 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Base del yacimiento
    ctx.fillStyle = isDark ? '#232933' : '#E8E3DA';
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Borde delimitador orgánico
    ctx.strokeStyle = info.accentColor;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Si no hay extractor, dibujar el recurso brillante
    const pieceOnTop = renderer.grid.get(mine.x, mine.y);
    if (!pieceOnTop || pieceOnTop.type !== 'extractor') {
      ctx.translate(cx, cy);
      QuantumDLC.drawItem(ctx, info.resourceItem, s * 0.32, isDark);
    }

    ctx.restore();
  }

  /**
   * Renderiza la Fábrica Estándar (1x1)
   */
  static renderFactory1x1(renderer, ctx, piece, s) {
    const isDark = renderer.isDark;
    const baseColor1 = isDark ? '#2B333E' : '#FFFFFF';
    const baseColor2 = isDark ? '#212730' : '#EFECE6';
    const strokeColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(46, 52, 64, 0.16)';

    renderer.drawTileBase(ctx, s, baseColor1, baseColor2, '#FFFFFF', '#EDE9E2', 8);

    // Chasis metálico y compuertas
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8, 6);
      ctx.stroke();
    }

    // Cámara de síntesis circular central
    ctx.fillStyle = isDark ? '#1C2127' : '#F4F1EA';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Núcleo rotatorio cuando está crafteando
    ctx.save();
    const rotSpeed = piece.isCrafting ? performance.now() * 0.004 : 0;
    ctx.rotate(rotSpeed);
    ctx.strokeStyle = piece.isCrafting ? '#A8D5BA' : 'rgba(168, 213, 186, 0.4)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    // Flecha de salida hacia piece.dir
    ctx.save();
    ctx.rotate((piece.dir || 0) * (Math.PI / 2));
    ctx.fillStyle = '#A8D5BA';
    ctx.beginPath();
    ctx.moveTo(s * 0.32, 0);
    ctx.lineTo(s * 0.22, -s * 0.1);
    ctx.lineTo(s * 0.22, s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renderiza la Mega Ensambladora (2x2)
   */
  static renderFactory2x2(renderer, ctx, rootPiece, s) {
    const isDark = renderer.isDark;
    const w = s * 2;
    const h = s * 2;

    ctx.save();
    // Centrar en el centro del bloque 2x2
    ctx.translate(s * 0.5, s * 0.5);

    // 1. Sombra amplia envolvente
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(46, 52, 64, 0.10)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-w * 0.48, -h * 0.48 + 4, w * 0.96, h * 0.96, 14);
      ctx.fill();
    }

    // 2. Base estructural 2x2
    const bgGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    bgGrad.addColorStop(0, isDark ? '#2E3744' : '#FFFFFF');
    bgGrad.addColorStop(1, isDark ? '#202630' : '#EAE6DF');

    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(46, 52, 64, 0.20)';
    ctx.lineWidth = 2.2;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-w * 0.47, -h * 0.47, w * 0.94, h * 0.94, 14);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-w * 0.47, -h * 0.47, w * 0.94, h * 0.94);
      ctx.strokeRect(-w * 0.47, -h * 0.47, w * 0.94, h * 0.94);
    }

    // 3. Bobinas cuánticas en las 4 esquinas
    const cornerOffsets = [
      { x: -w * 0.35, y: -h * 0.35 },
      { x: w * 0.35, y: -h * 0.35 },
      { x: -w * 0.35, y: h * 0.35 },
      { x: w * 0.35, y: h * 0.35 }
    ];

    for (const c of cornerOffsets) {
      ctx.fillStyle = isDark ? '#1A1E24' : '#D5D1C8';
      ctx.beginPath();
      ctx.arc(c.x, c.y, s * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rootPiece.isCrafting ? '#C9B6E4' : '#A9CCE3';
      ctx.beginPath();
      ctx.arc(c.x, c.y, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Gran Reactor de Fusión Cuántica Central
    const reactorR = s * 0.45;
    const reactorGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, reactorR);
    reactorGrad.addColorStop(0, rootPiece.isCrafting ? 'rgba(201, 182, 228, 0.65)' : 'rgba(169, 204, 227, 0.35)');
    reactorGrad.addColorStop(1, isDark ? '#161A20' : '#F2EFEB');

    ctx.fillStyle = reactorGrad;
    ctx.strokeStyle = rootPiece.isCrafting ? '#C9B6E4' : 'rgba(201, 182, 228, 0.4)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, reactorR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 5. Anillos giratorios de aceleración de partículas
    const time = performance.now() * (rootPiece.isCrafting ? 0.003 : 0.0008);
    ctx.save();
    ctx.rotate(time);
    ctx.strokeStyle = '#AF7AC5';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, reactorR * 0.72, 0, Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.4);
    ctx.strokeStyle = '#73C6B6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, reactorR * 0.48, 0, Math.PI * 1.2);
    ctx.stroke();
    ctx.restore();

    // Mini holograma del producto objetivo flotando en el centro
    const recipe = QuantumDLC.getRecipe(rootPiece.recipeId);
    if (recipe) {
      QuantumDLC.drawItem(ctx, recipe.output, s * 0.26, isDark);
    }

    // Flecha indicadora de salida frontal
    ctx.save();
    ctx.rotate((rootPiece.dir || 0) * (Math.PI / 2));
    ctx.fillStyle = '#C9B6E4';
    ctx.beginPath();
    ctx.moveTo(w * 0.44, 0);
    ctx.lineTo(w * 0.36, -s * 0.12);
    ctx.lineTo(w * 0.36, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Renderiza el estado flotante (Barra de progreso + Alerta de ingredientes faltantes)
   */
  static renderFloatingStatus(renderer, ctx, s) {
    const isDark = renderer.isDark;
    const factories = renderer.grid.getAllPieces().filter(p => p.type === 'factory_1x1' || p.type === 'factory_2x2');

    for (const factory of factories) {
      const isMega = factory.type === 'factory_2x2';
      const rootX = isMega ? factory.rootX : factory.x;
      const rootY = isMega ? factory.rootY : factory.y;
      const cx = (rootX + (isMega ? 1.0 : 0.5)) * s;
      const cy = (rootY - (isMega ? 0.15 : 0.25)) * s;

      const recipe = QuantumDLC.getRecipe(factory.recipeId);
      if (!recipe) continue;

      ctx.save();
      ctx.translate(cx, cy);

      // 1. Barra de progreso flotante limpia
      const barW = isMega ? 64 : 44;
      const barH = 7;
      const pct = Math.max(0, Math.min(1.0, factory.progress || 0.0));

      // Contenedor de la barra
      ctx.fillStyle = isDark ? 'rgba(27, 31, 36, 0.85)' : 'rgba(255, 255, 255, 0.90)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1.0;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-barW / 2 - 1, -barH / 2 - 1, barW + 2, barH + 2, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-barW / 2, -barH / 2, barW, barH);
        ctx.strokeRect(-barW / 2, -barH / 2, barW, barH);
      }

      // Relleno de progreso
      if (pct > 0) {
        ctx.fillStyle = factory.isCrafting ? '#A8D5BA' : '#C9B6E4';
        const fillW = Math.max(4, barW * pct);
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(-barW / 2, -barH / 2, fillW, barH, 3);
          ctx.fill();
        } else {
          ctx.fillRect(-barW / 2, -barH / 2, fillW, barH);
        }
      }

      // Mini icono del ítem que se fabrica sobre la barra
      ctx.save();
      ctx.translate(barW / 2 + 10, 0);
      QuantumDLC.drawItem(ctx, recipe.output, 10, isDark);
      ctx.restore();

      // 2. Si está en pausa por falta de ingredientes: alerta flotante suave
      if (!factory.isCrafting && pct < 1.0) {
        const missing = [];
        for (const [inItem, req] of Object.entries(recipe.inputs)) {
          const cur = (factory.buffer && factory.buffer[inItem]) || 0;
          if (cur < req) {
            const def = DLC_ITEMS[inItem];
            missing.push(`${req - cur}x ${def ? def.icon : '•'}`);
          }
        }

        if (missing.length > 0) {
          ctx.save();
          ctx.translate(0, -14);
          const badgeText = missing.join(' ');
          ctx.font = '600 9px "JetBrains Mono", monospace';
          const textW = ctx.measureText(badgeText).width + 8;

          ctx.fillStyle = isDark ? 'rgba(46, 52, 64, 0.92)' : 'rgba(254, 243, 199, 0.95)';
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-textW / 2, -7, textW, 14, 4);
            ctx.fill();
            ctx.stroke();
          }

          ctx.fillStyle = isDark ? '#FDE68A' : '#B45309';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, 0, 0);
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  /* ==========================================================================
     5. INTERACCIÓN Y SELECTOR DE RECETA (Tecla 'E' y Tap)
     ========================================================================== */

  /**
   * Abre el selector contextual de recetas para una fábrica
   */
  static openRecipeSelector(game, factoryPiece) {
    if (!factoryPiece) return;

    // Obtener la raíz si es parte de un 2x2
    const target = factoryPiece.type === 'factory_2x2_part'
      ? QuantumDLC.getRootPiece(game.grid, factoryPiece.x, factoryPiece.y)
      : factoryPiece;

    if (!target) return;

    const available = QuantumDLC.getAvailableRecipes(target.type);
    let modal = document.getElementById('dlc-recipe-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dlc-recipe-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const currentRecipe = QuantumDLC.getRecipe(target.recipeId);

    modal.innerHTML = `
      <div class="modal-card dlc-recipe-card" style="max-width: 480px; padding: 24px;">
        <div class="modal-header" style="margin-bottom: 16px;">
          <div>
            <h2 class="modal-title heading" style="font-size: 18px; display: flex; align-items: center; gap: 8px;">
              <span>🧪</span> ${target.type === 'factory_2x2' ? 'Mega Ensambladora (2x2)' : 'Fábrica Estándar (1x1)'}
            </h2>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Selecciona la receta de fabricación activa (Tecla E / Tap)
            </p>
          </div>
          <button class="modal-close-btn" id="btn-close-dlc-recipe" aria-label="Cerrar">✕</button>
        </div>

        <div class="dlc-recipe-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 55vh; overflow-y: auto;">
          ${available.map(recipe => {
            const outDef = DLC_ITEMS[recipe.output] || {};
            const isSelected = target.recipeId === recipe.id;
            const inputBadges = Object.entries(recipe.inputs).map(([itemId, count]) => {
              const inDef = DLC_ITEMS[itemId] || {};
              return `<span class="mono" style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                ${count}x ${inDef.icon || ''} ${inDef.name || itemId}
              </span>`;
            }).join(' ');

            return `
              <div class="dlc-recipe-item ${isSelected ? 'active' : ''}" data-recipe="${recipe.id}" style="
                border: 2px solid ${isSelected ? 'var(--pastel-mint)' : 'var(--border-color)'};
                background: ${isSelected ? 'rgba(168, 213, 186, 0.12)' : 'var(--surface-color)'};
                border-radius: 10px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 12px;
              ">
                <div style="font-size: 26px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--bg-color); border-radius: 8px;">
                  ${outDef.icon || '📦'}
                </div>
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; justify-content: space-between;">
                    <strong style="color: var(--text-bright); font-size: 14px;">${recipe.name}</strong>
                    <span class="mono" style="font-size: 11px; color: var(--text-muted);">⏱️ ${recipe.time}s</span>
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${inputBadges}
                  </div>
                </div>
                <div style="font-size: 18px; color: ${isSelected ? 'var(--pastel-mint)' : 'transparent'};">
                  ✓
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: var(--text-muted);">
            ⚠️ Al cambiar la receta, los ingredientes incompatibles del buffer se purgan para evitar atascos.
          </span>
          <button id="btn-done-dlc-recipe" class="btn btn-primary" style="padding: 6px 16px; font-size: 13px;">Listo</button>
        </div>
      </div>
    `;

    modal.classList.add('visible');

    // Bindeo de eventos
    const closeBtn = modal.querySelector('#btn-close-dlc-recipe');
    const doneBtn = modal.querySelector('#btn-done-dlc-recipe');
    const closeHandler = () => modal.classList.remove('visible');

    closeBtn?.addEventListener('click', closeHandler);
    doneBtn?.addEventListener('click', closeHandler);

    const recipeItems = modal.querySelectorAll('.dlc-recipe-item');
    recipeItems.forEach(item => {
      item.addEventListener('click', () => {
        const recipeId = item.dataset.recipe;
        QuantumDLC.setRecipe(game, target, recipeId);
        game.audio.playPlaf();
        game.ui.showToast(`Receta cambiada a: ${QuantumDLC.getRecipe(recipeId).name}`, 1800);
        modal.classList.remove('visible');
      });
    });
  }

  /**
   * Cambia la receta de una fábrica y vacía los ingredientes incompatibles
   */
  static setRecipe(targetOrGame, recipeOrTarget, optionalRecipeId) {
    let target = targetOrGame;
    let newRecipeId = recipeOrTarget;
    if (optionalRecipeId !== undefined) {
      target = recipeOrTarget;
      newRecipeId = optionalRecipeId;
    }
    if (!target || target.recipeId === newRecipeId) return;

    const newRecipe = QuantumDLC.getRecipe(newRecipeId);
    if (!newRecipe) return;

    target.recipeId = newRecipeId;
    target.progress = 0.0;
    target.isCrafting = false;

    // Vaciar ingredientes incompatibles del buffer para evitar bloqueos
    if (target.buffer) {
      const validInputs = Object.keys(newRecipe.inputs);
      for (const curItem of Object.keys(target.buffer)) {
        if (!validInputs.includes(curItem)) {
          delete target.buffer[curItem]; // Purgado para evitar bloqueo
        }
      }
    }
  }
}
