/**
 * BeltFlow - Juego de Puzles y Automatización con Cintas Transportadoras
 * Arquitectura modular en JavaScript Vanilla (ES Modules)
 * 
 * Estructura de Módulos:
 * - SaveManager: Persistencia en localStorage según esquema beltflow_save_v1
 * - AudioManager: Síntesis Web Audio API (anti-fatiga, frecuencias suaves)
 * - Shapes: Manejo geométrico, corte, coloreado, mezcla y renderizado
 * - Pieces: Cuadrícula lógica, componentes y conectividad
 * - Simulation: Movimiento continuo por requestAnimationFrame, colisiones y máquinas
 * - Renderer: Dibujo en Canvas 2D a 60 FPS con zoom suave, pan y partículas
 * - InputManager: Gestión unificada de puntero (PC: ratón/teclas, Táctil: tap/pan/pinza/long-press)
 * - UIManager: Control de HUD, selección de 20 niveles, modales y accesibilidad
 * - BeltFlowGame: Controlador principal del ciclo de vida del juego
 */

import { LEVELS, SHAPE_TYPES, PASTEL_COLORS, COLOR_HEX, createShape, BIOMES, ACHIEVEMENTS, COSMETIC_SKINS } from './levels.js';
import { QuantumDLC, RESOURCE_NODES, DLC_ITEMS, RECIPES } from './dlc_quantum.js';

/* ==========================================================================
   1. GESTOR DE GUARDADO (SaveManager)
   ========================================================================== */
export class SaveManager {
  static STORAGE_KEY = 'beltflow_save_v2';
  static LEGACY_KEY = 'beltflow_save_v1';

  static getDefaultSave() {
    return {
      nivelActual: 1,
      nivelesCompletados: [],
      mejoresTiempos: {},
      estrellas: {},
      coins: 0,
      cosmetics: {
        beltSkin: 'default',
        shapeTheme: 'default'
      },
      unlockedCosmetics: ['default'],
      achievements: [],
      gameMode: 'relaxed', // 'relaxed' (default) o 'challenge'
      customLevels: [],
      config: {
        modoOscuro: false,
        zoom: 1.0,
        tipoDispositivo: 'auto',
        reducirMovimiento: false,
        sonido: true,
        volumen: 0.8,
        palettePreset: 'suave',
        ambientMusic: true
      },
      construcciones: {}
    };
  }

  static load() {
    try {
      let data = localStorage.getItem(SaveManager.STORAGE_KEY);
      let isMigrated = false;

      // Migración hacia v2 desde v1 si v2 no existe aún
      if (!data) {
        const legacyData = localStorage.getItem(SaveManager.LEGACY_KEY);
        if (legacyData) {
          data = legacyData;
          isMigrated = true;
        }
      }

      if (!data) return SaveManager.getDefaultSave();
      const parsed = JSON.parse(data);
      const def = SaveManager.getDefaultSave();

      const merged = {
        ...def,
        ...parsed,
        config: { ...def.config, ...(parsed.config || {}) },
        cosmetics: { ...def.cosmetics, ...(parsed.cosmetics || {}) },
        unlockedCosmetics: parsed.unlockedCosmetics || def.unlockedCosmetics,
        achievements: parsed.achievements || [],
        coins: parsed.coins !== undefined ? parsed.coins : 0,
        gameMode: parsed.gameMode || 'relaxed',
        customLevels: parsed.customLevels || [],
        construcciones: parsed.construcciones || {},
        mejoresTiempos: parsed.mejoresTiempos || {},
        estrellas: parsed.estrellas || {},
        nivelesCompletados: parsed.nivelesCompletados || []
      };

      // Si migramos por primera vez, calcular monedas iniciales
      if (isMigrated && merged.coins === 0 && merged.estrellas) {
        let starsSum = 0;
        Object.values(merged.estrellas).forEach(s => starsSum += (s || 0));
        merged.coins = starsSum * 10;
        SaveManager.save(merged);
      }

      return merged;
    } catch (e) {
      console.warn("BeltFlow: Error al cargar de localStorage, usando valores por defecto.", e);
      return SaveManager.getDefaultSave();
    }
  }

  static save(state) {
    try {
      localStorage.setItem(SaveManager.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("BeltFlow: Error al guardar en localStorage.", e);
    }
  }

  static reset() {
    try {
      localStorage.removeItem(SaveManager.STORAGE_KEY);
      localStorage.removeItem(SaveManager.LEGACY_KEY);
    } catch (e) {
      console.warn("BeltFlow: Error al reiniciar partida.", e);
    }
    return SaveManager.getDefaultSave();
  }
}

/* ==========================================================================
   2. GESTOR DE AUDIO (AudioManager) - Web Audio API relajante
   ========================================================================== */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.8;
    this.masterGain = null;
    this.beltChainPitch = 1.0;
    this.lastPlafTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gain = 0.08, attack = 0.01) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gNode = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gNode.gain.setValueAtTime(0, now);
      gNode.gain.linearRampToValueAtTime(gain, now + attack);
      gNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gNode);
      gNode.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio seguro
    }
  }

  playPlace() {
    this.playTone(523.25, 'triangle', 0.12, 0.05); // C5
  }

  playPlaf() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 210 + (Math.random() * 20 - 10);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.05);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  playChainPlaf() {
    if (!this.enabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPlafTime < 118) return; // Limitador suave ~118ms
    this.lastPlafTime = nowMs;

    this.init();
    if (!this.ctx) return;

    try {
      const audioNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const currentPitch = this.beltChainPitch || 1.0;
      const baseFreq = (205 + (Math.random() * 12 - 6)) * currentPitch;
      osc.frequency.setValueAtTime(baseFreq, audioNow);
      osc.frequency.exponentialRampToValueAtTime(Math.max(70, baseFreq * 0.58), audioNow + 0.05);

      gain.gain.setValueAtTime(0.045, audioNow);
      gain.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.065);

      osc.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      osc.start(audioNow);
      osc.stop(audioNow + 0.07);

      // Subida sutil ascendente de frecuencia (+4.5% por cinta consecutiva)
      this.beltChainPitch = Math.min(1.85, currentPitch * 1.045);
    } catch (e) {}
  }

  resetChainPitch() {
    this.beltChainPitch = 1.0;
  }

  playDelete() {
    this.playTone(220.00, 'sine', 0.1, 0.04); // A3
  }

  playRotate() {
    this.playTone(440.00, 'sine', 0.06, 0.03); // A4
  }

  playError() {
    this.playTone(196.00, 'triangle', 0.18, 0.045); // G3 suave
  }

  playStreak() {
    const chord = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
    chord.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.22, 0.035), i * 65);
    });
  }

  playDelivery() {
    this.playTone(659.25, 'sine', 0.22, 0.07); // E5
    setTimeout(() => this.playTone(880.00, 'sine', 0.28, 0.05), 65); // A5
  }

  playStarPop(index = 0) {
    if (!this.enabled) return;
    this.init();
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    const f = freqs[index] || 523.25;
    this.playTone(f, 'triangle', 0.28, 0.07, 0.015);
    setTimeout(() => {
      this.playTone(f * 1.5, 'sine', 0.22, 0.035, 0.01);
    }, 45);
  }

  playHackerChime() {
    if (!this.enabled) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.26, 0.045), i * 65);
    });
  }

  playVictory() {
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.65, 0.07, 0.03), i * 110);
    });
  }

  playAmbientChime(biomeIndex = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const scales = {
      1: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C mayor pentatónica (Invernadero)
      2: [349.23, 392.00, 440.00, 523.25, 587.33, 698.46], // F mayor pentatónica (Zen / Nieve)
      3: [311.13, 349.23, 392.00, 466.16, 523.25, 622.25]  // Eb mayor pentatónica (Cuarzo / Noche)
    };
    const scale = scales[biomeIndex] || scales[1];
    const n1 = scale[Math.floor(Math.random() * scale.length)];
    const n2 = scale[Math.floor(Math.random() * scale.length)];
    const n3 = scale[Math.floor(Math.random() * scale.length)];

    [n1, n2, n3].forEach((freq, idx) => {
      setTimeout(() => {
        try {
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.018, now + 0.9);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

          osc.connect(gain);
          gain.connect(this.masterGain || this.ctx.destination);
          osc.start(now);
          osc.stop(now + 4.0);
        } catch (e) {}
      }, idx * 180);
    });
  }

  playSplitter() {
    this.playTone(493.88, 'sine', 0.08, 0.03);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.08, 0.025), 35);
  }

  playPortal() {
    const chord = [440, 554.37, 659.25];
    chord.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.35, 0.03, 0.05), i * 40);
    });
  }

  playAchievement() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.32, 0.05, 0.02), i * 75);
    });
  }
}

/* ==========================================================================
   3. SISTEMA DE FORMAS GEOMÉTRICAS (Shapes)
   ========================================================================== */
export class Shapes {
  static matches(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;

    // Soporte para ítems del DLC Biomolecular & Cuántico
    if (a.dlcItem || b.dlcItem) {
      return a.dlcItem === b.dlcItem;
    }

    // Si ambos son formas de media pieza (solo tienen una de las dos mitades)
    const aIsHalf = (a.left && !a.right) || (!a.left && a.right);
    const bIsHalf = (b.left && !b.right) || (!b.left && b.right);

    if (aIsHalf && bIsHalf) {
      const halfA = a.left || a.right;
      const halfB = b.left || b.right;
      return Shapes.halfMatches(halfA, halfB);
    }

    const matchLeft = Shapes.halfMatches(a.left, b.left);
    const matchRight = Shapes.halfMatches(a.right, b.right);

    return matchLeft && matchRight;
  }

  static halfMatches(hA, hB) {
    if (!hA && !hB) return true;
    if (!hA || !hB) return false;
    return hA.type === hB.type && hA.color === hB.color;
  }

  static clone(shape) {
    if (!shape) return null;
    if (shape.dlcItem) return { dlcItem: shape.dlcItem };
    return {
      left: shape.left ? { type: shape.left.type, color: shape.left.color } : null,
      right: shape.right ? { type: shape.right.type, color: shape.right.color } : null
    };
  }

  static cut(shape) {
    if (!shape) return { leftHalf: null, rightHalf: null };
    if (shape.dlcItem) return { leftHalf: null, rightHalf: null };
    const leftHalf = shape.left ? { left: { ...shape.left }, right: null } : null;
    const rightHalf = shape.right ? { left: null, right: { ...shape.right } } : null;
    return { leftHalf, rightHalf };
  }

  static paint(shape, newColor) {
    if (!shape) return null;
    if (shape.dlcItem) return Shapes.clone(shape);
    const painted = Shapes.clone(shape);
    if (painted.left) painted.left.color = newColor;
    if (painted.right) painted.right.color = newColor;
    return painted;
  }

  static mix(shapeA, shapeB) {
    if (!shapeA && !shapeB) return null;
    if (!shapeA) return Shapes.clone(shapeB);
    if (!shapeB) return Shapes.clone(shapeA);
    if (shapeA.dlcItem || shapeB.dlcItem) return Shapes.clone(shapeA.dlcItem ? shapeA : shapeB);

    // Determinar la mitad izquierda preferente de shapeA
    const leftPart = shapeA.left ? { ...shapeA.left } : (shapeB.left ? { ...shapeB.left } : (shapeA.right ? { ...shapeA.right } : null));
    // Determinar la mitad derecha preferente de shapeB
    const rightPart = shapeB.right ? { ...shapeB.right } : (shapeA.right ? { ...shapeA.right } : (shapeB.left ? { ...shapeB.left } : null));

    return {
      left: leftPart,
      right: rightPart
    };
  }

  static draw(ctx, shape, size = 20, isDark = false) {
    if (!shape) return;

    // Delegación directa y limpia a QuantumDLC si es un ítem de la expansión
    if (shape.dlcItem) {
      QuantumDLC.drawItem(ctx, shape.dlcItem, size, isDark);
      return;
    }

    if (!shape.left && !shape.right) return;

    ctx.save();

    // Mitad izquierda con recorte (clipping)
    if (shape.left) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-size * 1.5, -size * 1.5, size * 1.5, size * 3);
      ctx.clip();
      Shapes.drawGeometry(ctx, shape.left.type, shape.left.color, size, isDark);
      ctx.restore();
    }

    // Mitad derecha con recorte (clipping)
    if (shape.right) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -size * 1.5, size * 1.5, size * 3);
      ctx.clip();
      Shapes.drawGeometry(ctx, shape.right.type, shape.right.color, size, isDark);
      ctx.restore();
    }

    // Divisor sutil si son componentes distintos
    if (shape.left && shape.right) {
      const diffType = shape.left.type !== shape.right.type;
      const diffColor = shape.left.color !== shape.right.color;
      if (diffType || diffColor) {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.85);
        ctx.lineTo(0, size * 0.85);
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  static drawGeometry(ctx, type, colorName, size, isDark) {
    const hex = COLOR_HEX[colorName] || COLOR_HEX.gray;
    const strokeColor = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(46, 52, 64, 0.25)';

    ctx.fillStyle = hex;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();

    switch (type) {
      case SHAPE_TYPES.CIRCLE:
        ctx.arc(0, 0, size * 0.84, 0, Math.PI * 2);
        break;

      case SHAPE_TYPES.SQUARE: {
        const r = size * 0.78;
        if (ctx.roundRect) {
          ctx.roundRect(-r, -r, r * 2, r * 2, 4);
        } else {
          ctx.rect(-r, -r, r * 2, r * 2);
        }
        break;
      }

      case SHAPE_TYPES.TRIANGLE: {
        const h = size * 0.94;
        const w = size * 0.86;
        ctx.moveTo(0, -h * 0.84);
        ctx.lineTo(w, h * 0.7);
        ctx.lineTo(-w, h * 0.7);
        ctx.closePath();
        break;
      }

      case SHAPE_TYPES.DIAMOND: {
        const d = size * 0.88;
        ctx.moveTo(0, -d);
        ctx.lineTo(d, 0);
        ctx.lineTo(0, d);
        ctx.lineTo(-d, 0);
        ctx.closePath();
        break;
      }

      case SHAPE_TYPES.STAR: {
        const spikes = 5;
        const outerRadius = size * 0.92;
        const innerRadius = size * 0.44;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        for (let i = 0; i < spikes; i++) {
          let x = Math.cos(rot) * outerRadius;
          let y = Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = Math.cos(rot) * innerRadius;
          y = Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.closePath();
        break;
      }

      default:
        ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
        break;
    }

    ctx.fill();
    ctx.stroke();
  }
}

/* ==========================================================================
   4. CONSTANTES DE DIRECCIÓN Y CUADRÍCULA
   ========================================================================== */
export const DIR = {
  RIGHT: 0, // +X
  DOWN: 1,  // +Y
  LEFT: 2,  // -X
  UP: 3     // -Y
};

export const DIR_DELTA = [
  { x: 1, y: 0 },  // 0: RIGHT
  { x: 0, y: 1 },  // 1: DOWN
  { x: -1, y: 0 }, // 2: LEFT
  { x: 0, y: -1 }  // 3: UP
];

export const OPPOSITE_DIR = [2, 3, 0, 1];

/* ==========================================================================
   5. CUADRÍCULA Y PIEZAS (Grid)
   ========================================================================== */
export class Grid {
  constructor(size = 32) {
    this.size = size;
    this.cells = new Map();
    this.mines = new Map(); // Depósitos fijos de recursos por nivel
  }

  key(x, y) {
    return `${x},${y}`;
  }

  get(x, y) {
    return this.cells.get(this.key(x, y)) || null;
  }

  set(x, y, piece) {
    this.cells.set(this.key(x, y), piece);
  }

  getMine(x, y) {
    return this.mines.get(this.key(x, y)) || null;
  }

  setMine(x, y, mine) {
    this.mines.set(this.key(x, y), mine);
  }

  hasMine(x, y) {
    return this.mines.has(this.key(x, y));
  }

  getAllMines() {
    return Array.from(this.mines.values());
  }

  inBounds(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  remove(x, y) {
    const piece = this.get(x, y);
    if (piece && piece.fixed) return false;
    if (piece && (piece.type === 'factory_2x2' || piece.type === 'factory_2x2_part')) {
      return QuantumDLC.removeFactory2x2(this, x, y);
    }
    if (piece && (piece.type === 'cutter' || piece.type === 'cutter_part')) {
      const rx = piece.rootX !== undefined ? piece.rootX : piece.x;
      const ry = piece.rootY !== undefined ? piece.rootY : piece.y;
      const dir = piece.dir || 0;
      const rVec = DIR_DELTA[(dir + 1) % 4];
      this.cells.delete(this.key(rx, ry));
      this.cells.delete(this.key(rx + rVec.x, ry + rVec.y));
      return true;
    }
    this.cells.delete(this.key(x, y));
    return true;
  }

  clearNonFixed() {
    for (const [key, piece] of this.cells.entries()) {
      if (!piece.fixed) {
        this.cells.delete(key);
      }
    }
  }

  getAllPieces() {
    return Array.from(this.cells.values());
  }

  exportUserPieces() {
    const pieces = [];
    for (const piece of this.cells.values()) {
      if (!piece.fixed) {
        pieces.push({
          x: piece.x,
          y: piece.y,
          type: piece.type,
          dir: piece.dir,
          color: piece.color || null,
          shape: piece.shape || null
        });
      }
    }
    return pieces;
  }

  importUserPieces(piecesList) {
    if (!Array.isArray(piecesList)) return;
    for (const p of piecesList) {
      if (!this.get(p.x, p.y)) {
        let shape = p.shape || null;
        if (p.type === 'extractor' && !shape) {
          const m = this.getMine(p.x, p.y);
          if (m) shape = Shapes.clone(m.shape);
        }
        this.set(p.x, p.y, {
          x: p.x,
          y: p.y,
          type: p.type,
          dir: p.dir,
          color: p.color || null,
          shape: shape,
          fixed: false
        });
      }
    }
  }
}

/* ==========================================================================
   6. SIMULACIÓN DE FORMAS Y MÁQUINAS (Simulation)
   ========================================================================== */
export class Simulation {
  constructor(grid, onDelivery) {
    this.grid = grid;
    this.onDelivery = onDelivery;
    this.items = [];
    this.nextItemId = 1;
    this.spawnerTimers = new Map();
    this.machineAnims = [];
    this.deliveryTimestamps = [];
    this.currentThroughputRate = 0.0;
    this.rateSustainedTimer = 0.0;
    this.totalTrashDestroyed = 0;
    this.totalPortalsTraversed = 0;
    this.totalCrossingsTraversed = 0;
    this.totalFiltersProcessed = 0;
    this.totalSplittersProcessed = 0;
  }

  reset() {
    this.items = [];
    this.spawnerTimers.clear();
    this.machineAnims = [];
    this.deliveryTimestamps = [];
    this.currentThroughputRate = 0.0;
    this.rateSustainedTimer = 0.0;
    this.totalTrashDestroyed = 0;
    this.totalPortalsTraversed = 0;
    this.totalCrossingsTraversed = 0;
    this.totalFiltersProcessed = 0;
    this.totalSplittersProcessed = 0;
  }

  triggerMachineAnim(x, y, type, data = {}) {
    this.machineAnims.push({
      x,
      y,
      type,
      startTime: performance.now(),
      duration: data.duration || 320,
      data
    });
  }

  update(dt, speedMult = 1.0) {
    const effectiveDt = dt * speedMult;
    const beltSpeed = 1.5; // Celdas por segundo estándar

    // Limpiar micro-animaciones expiradas
    const nowMs = performance.now();
    for (let k = this.machineAnims.length - 1; k >= 0; k--) {
      if (nowMs - this.machineAnims[k].startTime > this.machineAnims[k].duration) {
        this.machineAnims.splice(k, 1);
      }
    }

    // Calcular tasa de entrega en ventana de 10s
    const nowSec = nowMs / 1000;
    this.deliveryTimestamps = (this.deliveryTimestamps || []).filter(t => nowSec - t <= 10.0);
    this.currentThroughputRate = this.deliveryTimestamps.length / 10.0;

    // Actualizar elementos dinámicos de mapa: Cintas Giratorias (switching_belt)
    for (const piece of this.grid.getAllPieces()) {
      if (piece.type === 'switching_belt') {
        piece.switchTimer = (piece.switchTimer || 0) + effectiveDt;
        const interval = piece.interval || 4.0;
        if (piece.switchTimer >= interval) {
          piece.switchTimer = 0;
          const origDir = piece.baseDir !== undefined ? piece.baseDir : piece.dir;
          piece.baseDir = origDir;
          const altDir = piece.altDir !== undefined ? piece.altDir : (origDir + 1) % 4;
          piece.dir = (piece.dir === origDir) ? altDir : origDir;
          this.triggerMachineAnim(piece.x, piece.y, 'switch_flip', { dir: piece.dir });
        }
      }
    }

    // 1. Extractores y Spawners: generar formas desde las minas
    for (const piece of this.grid.getAllPieces()) {
      if ((piece.type === 'extractor' || piece.type === 'spawner') && piece.shape) {
        const key = this.grid.key(piece.x, piece.y);
        let timer = (this.spawnerTimers.get(key) || 0) + effectiveDt;

        const spawnInterval = 1.8;
        if (timer >= spawnInterval) {
          timer = 0;
          const delta = DIR_DELTA[piece.dir];
          const outX = piece.x + delta.x;
          const outY = piece.y + delta.y;
          const targetPiece = this.grid.get(outX, outY);

          if (targetPiece && this.canAcceptItem(targetPiece, piece.dir)) {
            const isBlocked = this.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
            if (!isBlocked) {
              this.spawnItem(Shapes.clone(piece.shape), outX, outY, piece.dir);
              this.triggerMachineAnim(piece.x, piece.y, 'extractor_pulse', {
                dir: piece.dir,
                color: piece.shape.left ? piece.shape.left.color : null
              });
            }
          }
        }
        this.spawnerTimers.set(key, timer);
      }
    }

    // 2. Movimiento y lógica de máquinas para cada forma
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const piece = this.grid.get(item.x, item.y);

      if (!piece) {
        this.items.splice(i, 1);
        continue;
      }

      // Velocidad específica de la celda
      let tileSpeed = beltSpeed;
      if (piece.type === 'belt_fast') {
        tileSpeed = beltSpeed * 2.0; // 3.0 celdas/s
      } else if (piece.type === 'belt_slow') {
        tileSpeed = beltSpeed * 0.5; // 0.75 celdas/s
      }

      // Trituradora: desintegra la forma
      if (piece.type === 'trash') {
        item.progress += effectiveDt * 2.2;
        if (item.progress >= 1.0) {
          this.totalTrashDestroyed++;
          this.triggerMachineAnim(piece.x, piece.y, 'trash_shrink', {
            color: item.shape && item.shape.left ? item.shape.left.color : 'coral'
          });
          this.items.splice(i, 1);
        }
        continue;
      }

      // Salida / Delivery: entrega y recepción
      if (piece.type === 'delivery') {
        item.progress += effectiveDt * 3.0;
        if (item.progress >= 0.8) {
          this.deliveryTimestamps.push(performance.now() / 1000);
          this.triggerMachineAnim(piece.x, piece.y, 'delivery_pulse', {});
          if (this.onDelivery) this.onDelivery(item.shape, piece);
          this.items.splice(i, 1);
        }
        continue;
      }

      // Cortadora y Pintor
      if (piece.type === 'cutter' || piece.type === 'painter') {
        item.processingTimer = (item.processingTimer || 0) + effectiveDt;
        const requiredTime = 0.5;

        if (item.processingTimer < requiredTime) {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
          continue;
        }

        const handled = this.processMachineOutput(piece, item);
        if (handled) {
          this.items.splice(i, 1);
        }
        continue;
      }

      // Fabricador / Mezcladora (Ensamblaje y combinación de formas geométricas)
      if (piece.type === 'mixer' || (piece.type === 'factory_1x1' && (!item.shape || !item.shape.dlcItem))) {
        item.processingTimer = (item.processingTimer || 0) + effectiveDt;
        if (item.progress < 0.5) {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
        }

        const delta = DIR_DELTA[piece.dir];
        const outX = piece.x + delta.x;
        const outY = piece.y + delta.y;
        const nextPiece = this.grid.get(outX, outY);

        if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
          const outBlocked = this.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
          if (!outBlocked) {
            const otherIdx = this.items.findIndex(it => it !== item && it.x === piece.x && it.y === piece.y);
            if (otherIdx !== -1) {
              const other = this.items[otherIdx];
              const combined = Shapes.mix(item.shape, other.shape);
              this.items.splice(otherIdx, 1);
              const currentIdx = this.items.indexOf(item);
              if (currentIdx !== -1) this.items.splice(currentIdx, 1);
              this.triggerMachineAnim(piece.x, piece.y, 'factory_crafted', { dir: piece.dir, type: piece.type });
              this.spawnItem(combined, outX, outY, piece.dir);
              continue;
            } else if (item.processingTimer > 1.8 && item.shape.left && item.shape.right) {
              this.items.splice(i, 1);
              this.spawnItem(item.shape, outX, outY, piece.dir);
              continue;
            }
          }
        }
        continue;
      }

      // Túnel subterráneo
      if (piece.type === 'tunnel') {
        if (!item.isUnderground && item.progress < 0.5) {
          item.progress += effectiveDt * tileSpeed;
          continue;
        }

        const exit = this.findTunnelExit(piece.x, piece.y, piece.dir);
        if (exit) {
          item.isUnderground = true;
          item.progress += effectiveDt * tileSpeed * 1.8;

          if (item.progress >= 1.2) {
            const delta = DIR_DELTA[exit.dir];
            const outX = exit.x + delta.x;
            const outY = exit.y + delta.y;
            const nextPiece = this.grid.get(outX, outY);

            if (nextPiece && this.canAcceptItem(nextPiece, exit.dir)) {
              const blocked = this.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
              if (!blocked) {
                item.x = outX;
                item.y = outY;
                item.inDir = exit.dir;
                item.progress = 0.0;
                item.isUnderground = false;
              }
            }
          }
          continue;
        } else {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
          continue;
        }
      }

      // Divisor (Splitter): reparte alternadamente entre recto y lateral
      if (piece.type === 'splitter') {
        item.progress += effectiveDt * tileSpeed;
        if (item.progress >= 1.0) {
          const straightDir = piece.dir;
          const sideDir = (piece.dir + 1) % 4; // Desvío a 90°
          piece.splitPhase = piece.splitPhase || 0;
          const preferredDir = (piece.splitPhase % 2 === 0) ? straightDir : sideDir;
          const alternateDir = (piece.splitPhase % 2 === 0) ? sideDir : straightDir;

          let targetDir = preferredDir;
          let delta = DIR_DELTA[targetDir];
          let nextX = item.x + delta.x;
          let nextY = item.y + delta.y;
          let nextPiece = this.grid.get(nextX, nextY);

          let canGo = nextPiece && this.canAcceptItem(nextPiece, targetDir) &&
            !this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);

          if (!canGo) {
            targetDir = alternateDir;
            delta = DIR_DELTA[targetDir];
            nextX = item.x + delta.x;
            nextY = item.y + delta.y;
            nextPiece = this.grid.get(nextX, nextY);
            canGo = nextPiece && this.canAcceptItem(nextPiece, targetDir) &&
              !this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
          }

          if (canGo) {
            piece.splitPhase++;
            this.totalSplittersProcessed++;
            item.x = nextX;
            item.y = nextY;
            item.inDir = targetDir;
            item.progress = 0.0;
            this.triggerMachineAnim(piece.x, piece.y, 'splitter_pulse', { dir: targetDir });
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Fusionador (Merger): recibe de varias entradas y entrega por el frente
      if (piece.type === 'merger') {
        item.progress += effectiveDt * tileSpeed;
        if (item.progress >= 1.0) {
          const delta = DIR_DELTA[piece.dir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
            const blocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
            if (!blocked) {
              item.x = nextX;
              item.y = nextY;
              item.inDir = piece.dir;
              item.progress = 0.0;
              this.triggerMachineAnim(piece.x, piece.y, 'merger_pulse', { dir: piece.dir });
            } else {
              item.progress = 1.0;
            }
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Filtro / Selector: evalúa condición y bifurca
      if (piece.type === 'filter') {
        item.progress += effectiveDt * tileSpeed;
        if (item.progress >= 1.0) {
          let matches = false;
          const fColor = piece.filterColor || piece.color;
          const fType = piece.filterShapeType;
          const fShape = piece.filterShape || piece.shape;

          if (fColor) {
            matches = (item.shape.left && item.shape.left.color === fColor) ||
                      (item.shape.right && item.shape.right.color === fColor);
          } else if (fType) {
            matches = (item.shape.left && item.shape.left.type === fType) ||
                      (item.shape.right && item.shape.right.type === fType);
          } else if (fShape) {
            matches = Shapes.matches(item.shape, fShape);
          } else {
            // Predeterminado: compara con la primera demanda del nivel
            const target = this.game?.currentLevel?.targetShape;
            matches = target ? Shapes.matches(item.shape, target) : true;
          }

          const outDir = matches ? piece.dir : (piece.dir + 1) % 4;
          const delta = DIR_DELTA[outDir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, outDir)) {
            const blocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
            if (!blocked) {
              this.totalFiltersProcessed++;
              item.x = nextX;
              item.y = nextY;
              item.inDir = outDir;
              item.progress = 0.0;
              this.triggerMachineAnim(piece.x, piece.y, 'filter_pulse', { dir: outDir, matches });
            } else {
              item.progress = 1.0;
            }
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Cruce (Crossing): autopista de paso recto en la dirección de entrada
      if (piece.type === 'crossing') {
        const trackDir = item.inDir !== undefined ? item.inDir : piece.dir;
        item.progress += effectiveDt * tileSpeed;
        if (item.progress >= 1.0) {
          const delta = DIR_DELTA[trackDir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, trackDir)) {
            const blocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
            if (!blocked) {
              this.totalCrossingsTraversed++;
              item.x = nextX;
              item.y = nextY;
              item.inDir = trackDir;
              item.progress = 0.0;
            } else {
              item.progress = 1.0;
            }
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Buffer: retención y despacho controlado
      if (piece.type === 'buffer') {
        piece.bufferQueue = piece.bufferQueue || [];
        if (item.progress < 0.5) {
          item.progress += effectiveDt * tileSpeed * 1.5;
        } else {
          if (!piece.bufferQueue.includes(item)) {
            if (piece.bufferQueue.length < 6) {
              piece.bufferQueue.push(item);
              item.isBuffered = true;
              this.triggerMachineAnim(piece.x, piece.y, 'buffer_store', {});
            } else {
              item.progress = 0.5;
            }
          }
        }

        if (piece.bufferQueue.length > 0 && piece.bufferQueue[0] === item) {
          piece.ejectTimer = (piece.ejectTimer || 0) + effectiveDt;
          if (piece.ejectTimer >= 0.6) {
            const delta = DIR_DELTA[piece.dir];
            const nextX = piece.x + delta.x;
            const nextY = piece.y + delta.y;
            const nextPiece = this.grid.get(nextX, nextY);

            if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
              const blocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
              if (!blocked) {
                piece.ejectTimer = 0;
                piece.bufferQueue.shift();
                item.isBuffered = false;
                item.x = nextX;
                item.y = nextY;
                item.inDir = piece.dir;
                item.progress = 0.0;
                this.triggerMachineAnim(piece.x, piece.y, 'buffer_eject', { dir: piece.dir });
              }
            }
          }
        }
        continue;
      }

      // Portal Dimensional: teletransporte instantáneo entre parejas
      if (piece.type === 'portal') {
        item.progress += effectiveDt * tileSpeed * 1.5;
        if (item.progress >= 0.5 && !item.hasTeleported) {
          const targetPortalId = piece.targetPortal;
          const partner = this.grid.getAllPieces().find(p => p.type === 'portal' && p.portalId === targetPortalId);
          if (partner) {
            item.hasTeleported = true;
            this.totalPortalsTraversed++;
            item.x = partner.x;
            item.y = partner.y;
            item.inDir = partner.dir;
            item.progress = 0.5;
            this.triggerMachineAnim(piece.x, piece.y, 'portal_teleport', { color: '#C9B6E4' });
            this.triggerMachineAnim(partner.x, partner.y, 'portal_teleport', { color: '#C9B6E4' });
          }
        }

        if (item.progress >= 1.0) {
          const delta = DIR_DELTA[piece.dir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
            const blocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
            if (!blocked) {
              item.x = nextX;
              item.y = nextY;
              item.inDir = piece.dir;
              item.progress = 0.0;
              item.hasTeleported = false;
            } else {
              item.progress = 1.0;
            }
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Cinta transportadora (estándar, rápida, lenta u oscilante)
      const nextItem = this.findItemAhead(item);
      const maxProgress = nextItem ? Math.max(0, nextItem.progress - 0.45) : 1.0;

      if (item.progress < maxProgress) {
        item.progress = Math.min(maxProgress, item.progress + effectiveDt * tileSpeed);
      }

      if (item.progress >= 1.0) {
        const delta = DIR_DELTA[piece.dir];
        const nextX = item.x + delta.x;
        const nextY = item.y + delta.y;
        const nextPiece = this.grid.get(nextX, nextY);

        if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
          const destBlocked = this.items.some(it => it.x === nextX && it.y === nextY && it.progress < 0.35);
          if (!destBlocked) {
            item.x = nextX;
            item.y = nextY;
            item.inDir = piece.dir;
            item.progress = 0.0;
            item.processingTimer = 0;
          }
        }
      }
    }

    // 3. Simulación de la Expansión Biomolecular & Cuántica (Fábrica 1x1 y Mega Ensambladora 2x2)
    if (QuantumDLC.isEnabled) {
      QuantumDLC.updateSimulation(this, dt, speedMult);
    }
  }

  canAcceptItem(piece, incomingDir) {
    if (!piece) return false;
    if (piece.type === 'obstacle' || piece.type === 'rock') return false;
    if (piece.type === 'water') return false; // El agua solo se cruza por puente/cruce o túnel
    if (piece.type === 'spawner' || piece.type === 'extractor') return false;
    if (piece.type === 'trash' || piece.type === 'delivery') return true;

    // Fábricas de la Expansión Biomolecular & Cuántica (DLC)
    if (piece.type === 'factory_1x1') {
      return incomingDir !== piece.dir; // Admite entradas por detrás y laterales (no por la salida)
    }
    if (piece.type === 'factory_2x2' || piece.type === 'factory_2x2_part') {
      return true; // Admite múltiples entradas perimetrales
    }

    // Cintas (estándar, rápida, lenta y oscilante)
    if (piece.type === 'belt' || piece.type === 'belt_fast' || piece.type === 'belt_slow' || piece.type === 'switching_belt') {
      return piece.dir !== OPPOSITE_DIR[incomingDir];
    }

    // Divisor (Splitter): entrada trasera
    if (piece.type === 'splitter') {
      return incomingDir === piece.dir;
    }

    // Fusionador (Merger): trasera o laterales
    if (piece.type === 'merger') {
      const leftDir = (piece.dir + 1) % 4;
      const rightDir = (piece.dir + 3) % 4;
      return incomingDir === piece.dir || incomingDir === leftDir || incomingDir === rightDir;
    }

    // Filtro: entrada trasera
    if (piece.type === 'filter') {
      return incomingDir === piece.dir;
    }

    // Cruce (Crossing): acepta cualquier dirección si la salida recta correspondiente está libre
    if (piece.type === 'crossing') {
      const exitDelta = DIR_DELTA[incomingDir];
      const exitPiece = this.grid.get(piece.x + exitDelta.x, piece.y + exitDelta.y);
      return exitPiece ? this.canAcceptItem(exitPiece, incomingDir) : true;
    }

    // Buffer: entrada trasera y capacidad < 6
    if (piece.type === 'buffer') {
      const currentQueue = piece.bufferQueue || [];
      return incomingDir === piece.dir && currentQueue.length < 6;
    }

    // Portal: entrada trasera
    if (piece.type === 'portal') {
      return incomingDir === piece.dir;
    }

    // Cortadora (solo por detrás en celda raíz) y Pintor
    if (piece.type === 'cutter' || piece.type === 'painter') {
      return incomingDir === piece.dir;
    }
    if (piece.type === 'cutter_part') {
      return false; // la celda secundaria es solo salida
    }

    // Fabricador / Mezcladora (acepta por ambos laterales y por detrás)
    if (piece.type === 'mixer' || piece.type === 'factory_1x1') {
      const leftDir = (piece.dir + 1) % 4;
      const rightDir = (piece.dir + 3) % 4;
      return incomingDir === piece.dir || incomingDir === leftDir || incomingDir === rightDir;
    }

    // Túnel (entrada trasera)
    if (piece.type === 'tunnel') {
      return incomingDir === piece.dir;
    }

  }

  processMachineOutput(piece, item) {
    if (piece.type === 'painter') {
      const paintColor = piece.color || PASTEL_COLORS.LAVENDER;
      const paintedShape = Shapes.paint(item.shape, paintColor);

      const delta = DIR_DELTA[piece.dir];
      const outX = piece.x + delta.x;
      const outY = piece.y + delta.y;
      const nextPiece = this.grid.get(outX, outY);

      if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
        const blocked = this.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
        if (!blocked) {
          this.triggerMachineAnim(piece.x, piece.y, 'painter_drop', {
            color: paintColor,
            dir: piece.dir
          });
          this.spawnItem(paintedShape, outX, outY, piece.dir);
          return true;
        }
      }
      return false;
    }

    // Cortadora de 2 Bloques (Cutter 2x1)
    if (piece.type === 'cutter') {
      const { leftHalf, rightHalf } = Shapes.cut(item.shape);

      // Salida izquierda: recta hacia piece.dir desde celda raíz (piece.x, piece.y)
      const fDelta = DIR_DELTA[piece.dir];
      const fX = piece.x + fDelta.x;
      const fY = piece.y + fDelta.y;
      const fPiece = this.grid.get(fX, fY);

      // Salida derecha: recta hacia piece.dir desde celda secundaria (secX, secY)
      const rVec = DIR_DELTA[(piece.dir + 1) % 4];
      const secX = piece.x + rVec.x;
      const secY = piece.y + rVec.y;
      const rOutX = secX + fDelta.x;
      const rOutY = secY + fDelta.y;
      const rPiece = this.grid.get(rOutX, rOutY);

      const canLeft = !leftHalf || (fPiece && this.canAcceptItem(fPiece, piece.dir) && !this.items.some(it => it.x === fX && it.y === fY && it.progress < 0.35));
      const canRight = !rightHalf || (rPiece && this.canAcceptItem(rPiece, piece.dir) && !this.items.some(it => it.x === rOutX && it.y === rOutY && it.progress < 0.35));

      if (canLeft && canRight) {
        this.triggerMachineAnim(piece.x, piece.y, 'cutter_flash', { dir: piece.dir });
        if (leftHalf && fPiece) this.spawnItem(leftHalf, fX, fY, piece.dir);
        if (rightHalf && rPiece) this.spawnItem(rightHalf, rOutX, rOutY, piece.dir);
        return true;
      }
      return false;
    }

    return false;
  }

  findTunnelExit(x, y, dir) {
    const delta = DIR_DELTA[dir];
    for (let step = 1; step <= 4; step++) {
      const checkX = x + delta.x * step;
      const checkY = y + delta.y * step;
      const p = this.grid.get(checkX, checkY);
      if (p && p.type === 'tunnel' && p.dir === dir) {
        return p;
      }
    }
    return null;
  }

  findItemAhead(item) {
    let closest = null;
    let minDist = Infinity;
    for (const other of this.items) {
      if (other !== item && other.x === item.x && other.y === item.y) {
        if (other.progress > item.progress) {
          const dist = other.progress - item.progress;
          if (dist < minDist) {
            minDist = dist;
            closest = other;
          }
        }
      }
    }
    return closest;
  }

  spawnItem(shape, x, y, inDir) {
    this.items.push({
      id: this.nextItemId++,
      shape: shape,
      x: x,
      y: y,
      inDir: inDir,
      progress: 0.0,
      isUnderground: false,
      processingTimer: 0
    });
  }
}

/* ==========================================================================
   7. RENDERIZADOR (Renderer) - Canvas 2D a 60 FPS
   ========================================================================== */
export class Renderer {
  constructor(canvas, grid, simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = grid;
    this.sim = simulation;

    this.camX = 0;
    this.camY = 0;
    this.zoom = 1.0;
    this.tileSize = 48;

    this.isDark = false;
    this.reducedMotion = false;
    this.ghost = null;
    this.particles = [];
    this.ambientParticles = [];
    this.beltAnimOffset = 0;
    this.placementEffects = new Map(); // key -> { startTime, duration, x, y, type }

    this.initAmbientParticles();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('scroll', () => this.resize());
  }

  initAmbientParticles() {
    this.ambientParticles = [];
    for (let i = 0; i < 36; i++) {
      this.ambientParticles.push({
        x: Math.random() * (window.innerWidth || 1000),
        y: Math.random() * (window.innerHeight || 800),
        vx: (Math.random() - 0.5) * 14 + 6,
        vy: (Math.random() - 0.5) * 10 + 4,
        size: Math.random() * 2.5 + 1.2,
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.25
      });
    }
  }

  updateAmbientParticles(dt, biomeIndex) {
    if (this.reducedMotion) return;
    const w = this.width || window.innerWidth;
    const h = this.height || window.innerHeight;

    for (const p of this.ambientParticles) {
      p.phase += dt * 1.5;
      if (biomeIndex === 2) {
        p.y += dt * 20;
        p.x += Math.sin(p.phase) * dt * 10;
      } else if (biomeIndex === 3) {
        p.x += Math.cos(p.phase) * dt * 12;
        p.y += Math.sin(p.phase) * dt * 12;
      } else {
        p.x += dt * 16 + Math.sin(p.phase) * dt * 6;
        p.y += dt * 8 + Math.cos(p.phase) * dt * 4;
      }

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
    }
  }

  drawAmbientParticles(ctx, biomeIndex) {
    if (this.reducedMotion) return;
    ctx.save();
    for (const p of this.ambientParticles) {
      let color = 'rgba(245, 208, 97, ';
      if (biomeIndex === 2) {
        color = 'rgba(169, 204, 227, ';
      } else if (biomeIndex === 3) {
        color = 'rgba(201, 182, 228, ';
      }

      const pulse = Math.sin(p.phase) * 0.25 + 0.75;
      ctx.fillStyle = `${color}${p.alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  addPlacementEffect(gridX, gridY, type = 'belt') {
    if (this.reducedMotion) return;
    this.placementEffects.set(this.grid.key(gridX, gridY), {
      startTime: performance.now(),
      duration: 190,
      x: gridX,
      y: gridY,
      type: type
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    this.width = width;
    this.height = height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(dpr, dpr);
  }

  centerOn(gridX, gridY) {
    this.camX = this.width / 2 - gridX * this.tileSize * this.zoom;
    this.camY = this.height / 2 - gridY * this.tileSize * this.zoom;
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const worldX = (mouseX - this.camX) / this.zoom;
    const worldY = (mouseY - this.camY) / this.zoom;
    const gridX = Math.floor(worldX / this.tileSize);
    const gridY = Math.floor(worldY / this.tileSize);
    return {
      gridX,
      gridY,
      worldX,
      worldY,
      rawX: worldX / this.tileSize,
      rawY: worldY / this.tileSize
    };
  }

  addParticles(screenX, screenY, count = 12, color = '#A8D5BA') {
    if (this.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.4 + 1.2;
      this.particles.push({
        x: screenX,
        y: screenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 3,
        alpha: 1.0,
        color: color
      });
    }
  }

  render(dt, speedMult = 1.0) {
    if (this.game && this.game.state === 'menu') {
      this.renderDemoScreensaver(this.ctx, dt);
      return;
    }

    this.beltAnimOffset = (this.beltAnimOffset + dt * 1.5 * speedMult) % 1.0;

    const ctx = this.ctx;
    ctx.save();

    const lvlId = this.game?.currentLevel?.id || 1;
    const biomeIndex = lvlId > 40 ? 3 : (lvlId > 20 ? 2 : 1);
    this.updateAmbientParticles(dt, biomeIndex);

    let bgColor = this.isDark ? '#1B1F24' : '#F2F0EB';
    if (biomeIndex === 1) {
      bgColor = this.isDark ? '#19221E' : '#EEF3EE';
    } else if (biomeIndex === 2) {
      bgColor = this.isDark ? '#182028' : '#ECF2F6';
    } else if (biomeIndex === 3) {
      bgColor = this.isDark ? '#201C26' : '#F3EFF7';
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawAmbientParticles(ctx, biomeIndex);

    ctx.translate(this.camX, this.camY);
    ctx.scale(this.zoom, this.zoom);

    this.drawGrid(ctx);
    this.drawMines(ctx);
    this.drawTunnelGuides(ctx);

    for (const piece of this.grid.getAllPieces()) {
      this.drawPiece(ctx, piece);
    }

    if (this.ghost) {
      this.drawGhost(ctx, this.ghost);
    }

    this.drawItems(ctx);
    this.drawMachineAnims(ctx);

    // Ondas y destellos de impacto de colocación ("plaf")
    this.drawPlacementEffects(ctx);

    // Indicadores flotantes de demanda sobre los almacenes
    this.drawDeliveryBadges(ctx);

    // Barras de progreso y avisos de ingredientes flotantes del DLC
    if (QuantumDLC.isEnabled) {
      QuantumDLC.renderFloatingStatus(this, ctx, this.tileSize);
    }

    ctx.restore();

    this.drawParticles(ctx, dt);
  }

  renderDemoScreensaver(ctx, dt) {
    this.beltAnimOffset = (this.beltAnimOffset + dt * 1.3) % 1.0;
    if (this.game && this.game.demoSim) {
      this.game.demoSim.update(dt, 1.0);
    }

    ctx.fillStyle = this.isDark ? '#1B1F24' : '#F2F0EB';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();

    // En pantallas grandes (>768px), centrar en el 70% derecho; en móviles centrar abajo
    const isDesktop = this.width > 768;
    const centerX = isDesktop ? (this.width * 0.32 + this.width * 0.68 / 2) : (this.width / 2);
    const centerY = isDesktop ? (this.height / 2) : (this.height * 0.65);
    const demoZoom = Math.min(1.25, Math.max(0.75, (isDesktop ? this.width * 0.65 : this.width) / 520));

    ctx.translate(centerX, centerY);
    ctx.scale(demoZoom, demoZoom);
    // Centrar en el punto medio del circuito de demo (x: 4.5, y: 2.5)
    ctx.translate(-4.5 * this.tileSize, -2.5 * this.tileSize);

    // Cuadrícula sutil
    const dotColor = this.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.fillStyle = dotColor;
    for (let x = 0; x <= 9; x++) {
      for (let y = 0; y <= 5; y++) {
        ctx.beginPath();
        ctx.arc(x * this.tileSize + this.tileSize / 2, y * this.tileSize + this.tileSize / 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.game && this.game.demoGrid) {
      this.drawMines(ctx, this.game.demoGrid);
      for (const piece of this.game.demoGrid.getAllPieces()) {
        this.drawPiece(ctx, piece);
      }
    }

    if (this.game && this.game.demoSim) {
      this.drawItems(ctx, this.game.demoSim.items);
      this.drawMachineAnims(ctx, this.game.demoSim.machineAnims);
    }

    ctx.restore();
    this.drawParticles(ctx, dt);
  }

  drawMines(ctx, customGrid = null) {
    const grid = customGrid || this.grid;
    const s = this.tileSize;

    for (const mine of grid.getAllMines()) {
      // Yacimientos naturales específicos de la Expansión Biomolecular & Cuántica
      if (mine.resourceType) {
        QuantumDLC.drawDeposit(this, ctx, mine, s);
        continue;
      }

      const cx = (mine.x + 0.5) * s;
      const cy = (mine.y + 0.5) * s;
      const colorName = (mine.shape && mine.shape.left) ? mine.shape.left.color : 'mint';
      const hex = COLOR_HEX[colorName] || '#A8D5BA';

      ctx.save();

      // 1. Halo suave y difuso que pulsa sutilmente sin fatiga
      const pulse = Math.sin(performance.now() * 0.0028 + mine.x * 3 + mine.y * 2) * 2.2;
      const haloGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, s * 0.52 + pulse);
      haloGrad.addColorStop(0, `${hex}4D`);
      haloGrad.addColorStop(0.6, `${hex}1F`);
      haloGrad.addColorStop(1, `${hex}00`);

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.55 + pulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base del yacimiento
      ctx.fillStyle = this.isDark ? '#232933' : '#E8E3DA';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.40, 0, Math.PI * 2);
      ctx.fill();

      // Borde circular punteado relajante
      ctx.strokeStyle = `${hex}88`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Si no hay extractor colocado encima, mostrar el cristal del recurso
      const pieceOnTop = grid.get(mine.x, mine.y);
      if (!pieceOnTop || pieceOnTop.type !== 'extractor') {
        ctx.translate(cx, cy);
        Shapes.draw(ctx, mine.shape, s * 0.28, this.isDark);
      }

      ctx.restore();
    }
  }

  drawPlacementEffects(ctx) {
    if (this.placementEffects.size === 0) return;
    const now = performance.now();
    const s = this.tileSize;

    for (const [key, eff] of this.placementEffects.entries()) {
      const elapsed = now - eff.startTime;
      if (elapsed >= eff.duration) {
        this.placementEffects.delete(key);
        continue;
      }

      const t = elapsed / eff.duration;
      const cx = (eff.x + 0.5) * s;
      const cy = (eff.y + 0.5) * s;

      // 1. Destello pastel breve (flash translúcido)
      const flashAlpha = 0.35 * (1 - t);
      ctx.fillStyle = this.isDark ? `rgba(168, 213, 186, ${flashAlpha})` : `rgba(168, 213, 186, ${flashAlpha * 1.3})`;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(eff.x * s + 2, eff.y * s + 2, s - 4, s - 4, 6);
        ctx.fill();
      } else {
        ctx.fillRect(eff.x * s + 2, eff.y * s + 2, s - 4, s - 4);
      }

      // 2. Onda circular muy sutil que se expande y desvanece
      const rippleRadius = s * 0.3 + s * 0.5 * t;
      const rippleAlpha = 0.45 * (1 - t);
      ctx.strokeStyle = this.isDark ? `rgba(168, 213, 186, ${rippleAlpha})` : `rgba(168, 213, 186, ${rippleAlpha * 1.2})`;
      ctx.lineWidth = Math.max(1, 2.4 * (1 - t));
      ctx.beginPath();
      ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawDeliveryBadges(ctx) {
    if (!this.game || !this.game.currentDemands) return;
    const s = this.tileSize;
    const isDark = this.isDark;

    const deliveryPieces = this.grid.getAllPieces().filter(p => p.type === 'delivery');
    if (deliveryPieces.length === 0) return;

    for (const piece of deliveryPieces) {
      const dIdx = piece.deliveryIndex;
      const isSecondary = piece.secondary;

      const matchingDemands = this.game.currentDemands.filter(d => {
        if (d.deliveryIndex !== undefined) {
          if (dIdx !== undefined && d.deliveryIndex !== dIdx) return false;
          if (dIdx === undefined && isSecondary && d.deliveryIndex === 0) return false;
          if (dIdx === undefined && !isSecondary && d.deliveryIndex === 1) return false;
        }
        return true;
      });

      if (matchingDemands.length === 0) continue;

      const cx = (piece.x + 0.5) * s;
      const cy = piece.y * s - 16;

      const badgeWidth = Math.max(56, matchingDemands.length * 48 + 12);
      const badgeHeight = 22;
      const bx = cx - badgeWidth / 2;
      const by = cy - badgeHeight / 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = isDark ? '#232830' : '#FFFFFF';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 11);
        ctx.fill();
      } else {
        ctx.fillRect(bx, by, badgeWidth, badgeHeight);
      }

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.stroke();
      }

      const sectionW = badgeWidth / matchingDemands.length;
      for (let i = 0; i < matchingDemands.length; i++) {
        const demand = matchingDemands[i];
        const secCenter = bx + (i + 0.5) * sectionW;

        ctx.save();
        ctx.translate(secCenter - 14, cy);
        Shapes.draw(ctx, demand.shape, 6.5, isDark);
        ctx.restore();

        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const isComplete = demand.delivered >= demand.quota;
        ctx.fillStyle = isComplete ? (isDark ? '#A8D5BA' : '#4E9E6D') : (isDark ? '#E5E9F0' : '#2E3440');
        const countText = isComplete ? `${demand.quota} ✔` : `${demand.delivered}/${demand.quota}`;
        ctx.fillText(countText, secCenter - 4, cy);
      }

      ctx.restore();
    }
  }

  drawGrid(ctx) {
    const startCol = Math.floor(-this.camX / (this.tileSize * this.zoom)) - 1;
    const endCol = Math.ceil((this.width - this.camX) / (this.tileSize * this.zoom)) + 1;
    const startRow = Math.floor(-this.camY / (this.tileSize * this.zoom)) - 1;
    const endRow = Math.ceil((this.height - this.camY) / (this.tileSize * this.zoom)) + 1;

    const dotColor = this.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    ctx.fillStyle = dotColor;

    for (let x = startCol; x <= endCol; x++) {
      for (let y = startRow; y <= endRow; y++) {
        ctx.beginPath();
        ctx.arc(x * this.tileSize + this.tileSize / 2, y * this.tileSize + this.tileSize / 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawTunnelGuides(ctx) {
    ctx.save();
    ctx.strokeStyle = this.isDark ? 'rgba(168, 213, 186, 0.22)' : 'rgba(168, 213, 186, 0.38)';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);

    for (const piece of this.grid.getAllPieces()) {
      if (piece.type === 'tunnel') {
        const exit = this.sim.findTunnelExit(piece.x, piece.y, piece.dir);
        if (exit) {
          const x1 = (piece.x + 0.5) * this.tileSize;
          const y1 = (piece.y + 0.5) * this.tileSize;
          const x2 = (exit.x + 0.5) * this.tileSize;
          const y2 = (exit.y + 0.5) * this.tileSize;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Base estética con micro-gradiente y bisel interno
  drawTileBase(ctx, s, dark1, dark2, light1, light2, radius = 8) {
    const grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    if (this.isDark) {
      grad.addColorStop(0, dark1);
      grad.addColorStop(1, dark2);
    } else {
      grad.addColorStop(0, light1);
      grad.addColorStop(1, light2);
    }
    ctx.fillStyle = grad;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, radius);
      ctx.fill();
      // Bisel interno sutil
      ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-s / 2 + 2.5, -s / 2 + 2.5, s - 5, s - 5, radius - 1);
      ctx.stroke();
    } else {
      ctx.fillRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
  }

  drawPiece(ctx, piece) {
    const px = piece.x * this.tileSize;
    const py = piece.y * this.tileSize;
    const s = this.tileSize;
    const cx = px + s / 2;
    const cy = py + s / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Animación de impacto "plaf" (Escala 1.3 -> 0.95 -> 1.0 con rebote suave)
    const eff = this.placementEffects.get(this.grid.key(piece.x, piece.y));
    if (eff) {
      const now = performance.now();
      const elapsed = now - eff.startTime;
      if (elapsed < eff.duration) {
        const t = elapsed / eff.duration;
        let scale = 1.0;
        if (t < 0.38) {
          const subT = t / 0.38;
          scale = 1.3 - 0.35 * Math.sin(subT * Math.PI * 0.5); // 1.3 -> 0.95
        } else {
          const subT = (t - 0.38) / 0.62;
          scale = 0.95 + 0.05 * Math.sin(subT * Math.PI * 0.5); // 0.95 -> 1.0
        }
        ctx.scale(scale, scale);
      }
    }

    const angle = (piece.dir || 0) * (Math.PI / 2);
    ctx.rotate(angle);

    switch (piece.type) {
      case 'belt':
        this.renderBeltTile(ctx, piece, s);
        break;
      case 'belt_fast':
        this.renderFastBeltTile(ctx, piece, s);
        break;
      case 'belt_slow':
        this.renderSlowBeltTile(ctx, piece, s);
        break;
      case 'splitter':
        this.renderSplitterTile(ctx, piece, s);
        break;
      case 'merger':
        this.renderMergerTile(ctx, piece, s);
        break;
      case 'filter':
        this.renderFilterTile(ctx, piece, s);
        break;
      case 'crossing':
        this.renderCrossingTile(ctx, piece, s);
        break;
      case 'buffer':
        this.renderBufferTile(ctx, piece, s);
        break;
      case 'portal':
        this.renderPortalTile(ctx, piece, s);
        break;
      case 'switching_belt':
        this.renderSwitchingBeltTile(ctx, piece, s);
        break;
      case 'extractor':
      case 'spawner':
        this.renderExtractorTile(ctx, piece, s);
        break;
      case 'trash':
        this.renderTrashTile(ctx, s);
        break;
      case 'cutter':
        this.renderCutterTile(ctx, piece, s);
        break;
      case 'cutter_part':
        // Dibujada conjuntamente por la celda raíz de 2 bloques
        break;
      case 'painter':
        this.renderPainterTile(ctx, piece, s);
        break;
      case 'mixer':
        QuantumDLC.renderFactory1x1(this, ctx, piece, s);
        break;
      case 'tunnel':
        this.renderTunnelTile(ctx, s);
        break;
      case 'delivery':
        this.renderDeliveryTile(ctx, s);
        break;
      case 'obstacle':
      case 'rock':
        this.renderObstacleTile(ctx, s);
        break;
      case 'water':
        this.renderWaterTile(ctx, s);
        break;
      case 'factory_1x1':
        QuantumDLC.renderFactory1x1(this, ctx, piece, s);
        break;
      case 'factory_2x2':
        QuantumDLC.renderFactory2x2(this, ctx, piece, s);
        break;
      case 'factory_2x2_part':
        // Las partes esclavas del 2x2 son dibujadas conjuntamente por la raíz
        break;
    }

    ctx.restore();
  }

  renderBeltTile(ctx, piece, s) {
    const skin = this.game?.saveData?.cosmetics?.beltSkin || 'default';
    let baseDark1 = '#2B323D', baseDark2 = '#222730';
    let baseLight1 = '#EFECE6', baseLight2 = '#DDD8CE';
    let trackColor = this.isDark ? '#333C4A' : '#D5CFC4';
    let arrowColor = this.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)';

    if (skin === 'skin_bamboo') {
      baseLight1 = '#E8EFE2'; baseLight2 = '#D7E0CF';
      baseDark1 = '#232D24'; baseDark2 = '#1B241C';
      trackColor = this.isDark ? '#314234' : '#C4D3BD';
      arrowColor = this.isDark ? '#8DA399' : '#5D7769';
    } else if (skin === 'skin_sakura') {
      baseLight1 = '#FBF1F3'; baseLight2 = '#F2DFE4';
      baseDark1 = '#32252A'; baseDark2 = '#251A1F';
      trackColor = this.isDark ? '#46323A' : '#E8CBD3';
      arrowColor = this.isDark ? '#E8A0A0' : '#C47D7D';
    } else if (skin === 'skin_cyber') {
      baseLight1 = '#E6F6F6'; baseLight2 = '#CFECEC';
      baseDark1 = '#1A292D'; baseDark2 = '#131F23';
      trackColor = this.isDark ? '#233F47' : '#BCE3E3';
      arrowColor = this.isDark ? '#5EEAD4' : '#0D9488';
    } else if (skin === 'skin_gold') {
      baseLight1 = '#FBF6EA'; baseLight2 = '#F0E5CC';
      baseDark1 = '#363023'; baseDark2 = '#292419';
      trackColor = this.isDark ? '#4D422C' : '#E8D7B0';
      arrowColor = this.isDark ? '#F59E0B' : '#B45309';
    }

    this.drawTileBase(ctx, s, baseDark1, baseDark2, baseLight1, baseLight2, 6);

    // Detectar si la cinta es una curva inspeccionando vecinos
    let isLeftCurve = false;
    let isRightCurve = false;

    if (piece && piece.x !== undefined && piece.y !== undefined) {
      const dir = piece.dir || 0;
      const backDelta = DIR_DELTA[OPPOSITE_DIR[dir]];
      const backPiece = this.grid.get(piece.x + backDelta.x, piece.y + backDelta.y);
      const hasBackInput = backPiece && backPiece.type !== 'obstacle' && backPiece.dir === dir;

      if (!hasBackInput) {
        // Comprobar entrada por la izquierda relativa (dir + 3) % 4
        const leftDelta = DIR_DELTA[(dir + 3) % 4];
        const leftPiece = this.grid.get(piece.x + leftDelta.x, piece.y + leftDelta.y);
        const hasLeftInput = leftPiece && leftPiece.type !== 'obstacle' && leftPiece.dir === (dir + 1) % 4;

        // Comprobar entrada por la derecha relativa (dir + 1) % 4
        const rightDelta = DIR_DELTA[(dir + 1) % 4];
        const rightPiece = this.grid.get(piece.x + rightDelta.x, piece.y + rightDelta.y);
        const hasRightInput = rightPiece && rightPiece.type !== 'obstacle' && rightPiece.dir === (dir + 3) % 4;

        if (hasLeftInput && !hasRightInput) {
          isLeftCurve = true;
        } else if (hasRightInput && !hasLeftInput) {
          isRightCurve = true;
        }
      }
    }

    if (isLeftCurve) {
      // Curva desde la izquierda relativa (arriba en espacio local: -Y hacia +X)
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = s * 0.56;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(s / 2, -s / 2, s / 2, Math.PI, Math.PI / 2, true);
      ctx.stroke();

      // Flechas animadas a lo largo del arco
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const count = 3;
      for (let i = 0; i < count; i++) {
        const offset = ((i / count) + this.beltAnimOffset) % 1.0;
        const ang = Math.PI - offset * (Math.PI / 2);
        const ax = s / 2 + Math.cos(ang) * (s / 2);
        const ay = -s / 2 + Math.sin(ang) * (s / 2);
        const tang = ang - Math.PI / 2;

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tang);
        ctx.beginPath();
        ctx.moveTo(-5, -s * 0.18);
        ctx.lineTo(2, 0);
        ctx.lineTo(-5, s * 0.18);
        ctx.stroke();
        ctx.restore();
      }
    } else if (isRightCurve) {
      // Curva desde la derecha relativa (abajo en espacio local: +Y hacia +X)
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = s * 0.56;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, Math.PI, 3 * Math.PI / 2, false);
      ctx.stroke();

      // Flechas animadas a lo largo del arco
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const count = 3;
      for (let i = 0; i < count; i++) {
        const offset = ((i / count) + this.beltAnimOffset) % 1.0;
        const ang = Math.PI + offset * (Math.PI / 2);
        const ax = s / 2 + Math.cos(ang) * (s / 2);
        const ay = s / 2 + Math.sin(ang) * (s / 2);
        const tang = ang + Math.PI / 2;

        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tang);
        ctx.beginPath();
        ctx.moveTo(-5, -s * 0.18);
        ctx.lineTo(2, 0);
        ctx.lineTo(-5, s * 0.18);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Cinta recta estándar conectada
      const frontDelta = DIR_DELTA[dir];
      const frontPiece = (piece && piece.x !== undefined) ? this.grid.get(piece.x + frontDelta.x, piece.y + frontDelta.y) : null;
      const hasFrontOutput = frontPiece && frontPiece.type !== 'obstacle';

      this.drawBeltBase(ctx, s, baseDark1, baseDark2, baseLight1, baseLight2, hasBackInput, hasFrontOutput);

      const trackLeft = hasBackInput ? -s / 2 : -s / 2 + 3;
      const trackRight = hasFrontOutput ? s / 2 : s / 2 - 3;
      ctx.fillStyle = trackColor;
      ctx.fillRect(trackLeft, -s * 0.28, trackRight - trackLeft, s * 0.56);

      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const count = 3;
      for (let i = 0; i < count; i++) {
        const offset = ((i / count) + this.beltAnimOffset) % 1.0;
        const x = -s / 2 + offset * s;
        ctx.beginPath();
        ctx.moveTo(x - 5, -s * 0.18);
        ctx.lineTo(x + 2, 0);
        ctx.lineTo(x - 5, s * 0.18);
        ctx.stroke();
      }
    }
  }

  // Base unificada continua para cintas que conecta casillas consecutivas sin separaciones
  drawBeltBase(ctx, s, dark1, dark2, light1, light2, hasBack, hasFront) {
    const grad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    if (this.isDark) {
      grad.addColorStop(0, dark1);
      grad.addColorStop(1, dark2);
    } else {
      grad.addColorStop(0, light1);
      grad.addColorStop(1, light2);
    }
    ctx.fillStyle = grad;

    const leftX = hasBack ? -s / 2 : -s / 2 + 2;
    const rightX = hasFront ? s / 2 : s / 2 - 2;
    const w = rightX - leftX;
    const h = s - 4;
    const y = -s / 2 + 2;

    const tl = hasBack ? 0 : 6;
    const bl = hasBack ? 0 : 6;
    const tr = hasFront ? 0 : 6;
    const br = hasFront ? 0 : 6;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(leftX, y, w, h, [tl, tr, br, bl]);
      ctx.fill();

      ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(leftX, y + 0.5, w, h - 1, [tl, tr, br, bl]);
      ctx.stroke();
    } else {
      ctx.fillRect(leftX, y, w, h);
    }
  }

  renderExtractorTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#323B47', '#252B35', '#F5F2EB', '#DDD8CD', 8);

    const time = performance.now() * 0.003;
    const pumpPulse = Math.sin(time * 4) * 2.2;

    // Boquilla / Flecha de eyección al frente con pulso de bombeo
    ctx.fillStyle = this.isDark ? '#A8D5BA' : '#5CA477';
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8 + pumpPulse * 0.5, -6);
    ctx.lineTo(s / 2 - 2 + pumpPulse * 0.5, 0);
    ctx.lineTo(s / 2 - 8 + pumpPulse * 0.5, 6);
    ctx.closePath();
    ctx.fill();

    // Cámara cilíndrica central de extracción con animación rítmica
    const chamberR = s * 0.28 + pumpPulse * 0.4;
    ctx.fillStyle = this.isDark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(0, 0, chamberR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    if (piece.shape) {
      Shapes.draw(ctx, piece.shape, s * 0.25, this.isDark);
    }
  }

  renderTrashTile(ctx, s) {
    this.drawTileBase(ctx, s, '#3E2D33', '#2C2024', '#F8E2E0', '#ECD0CD', 8);

    const time = performance.now() * 0.002;
    const rot = time % (Math.PI * 2);

    ctx.strokeStyle = '#E8A0A0';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    // Cuchillas giratorias internas
    ctx.save();
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, 6);
    ctx.moveTo(6, -6);
    ctx.lineTo(-6, 6);
    ctx.stroke();
    ctx.restore();
  }

  // Cortadora de 2 Bloques (Cutter 2x1) idéntica a la vista previa del jugador
  renderCutterTile(ctx, piece, s) {
    const isDark = this.isDark;
    const time = performance.now() * 0.003;
    const snip = Math.sin(time * 5) * 0.18;

    // 1. Chasis unificado de 2 bloques (cubre raíz en y=0 y secundaria en y=s)
    const chassisGrad = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, 1.5 * s);
    if (isDark) {
      chassisGrad.addColorStop(0, '#2A3440');
      chassisGrad.addColorStop(1, '#1E252E');
    } else {
      chassisGrad.addColorStop(0, '#E6EEF5');
      chassisGrad.addColorStop(1, '#D0DFED');
    }
    ctx.fillStyle = chassisGrad;

    const x0 = -s / 2 + 2;
    const x1 = s / 2 - 2;
    const y0 = -s / 2 + 2;
    const y1 = 1.5 * s - 2;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 8);
      ctx.fill();
    } else {
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }

    ctx.strokeStyle = isDark ? '#3D4F61' : '#94B4D0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Carril izquierdo (Celda raíz: de entrada trasera a salida frontal)
    const trackColor = isDark ? '#1C232B' : '#B8D1E6';
    const accentColor = '#5DADE2';

    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s / 2 + 4, 0);
    ctx.lineTo(s / 2 - 4, 0);
    ctx.stroke();

    // Flecha indicadora en carril izquierdo
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 14, -4.5);
    ctx.lineTo(s / 2 - 5, 0);
    ctx.lineTo(s / 2 - 14, 4.5);
    ctx.fill();

    // 3. Carril derecho (Celda secundaria: ramal curvado hacia la salida derecha)
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, 0);
    ctx.lineTo(s * 0.1, s * 0.5);
    ctx.lineTo(s / 2 - 4, s);
    ctx.stroke();

    // Flecha indicadora en carril derecho
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 14, s - 4.5);
    ctx.lineTo(s / 2 - 5, s);
    ctx.lineTo(s / 2 - 14, s + 4.5);
    ctx.fill();

    // 4. Mecanismo central de tijeras en la divisoria
    ctx.save();
    ctx.translate(-2, s * 0.5);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(-8, -6, 4.5, 0, Math.PI * 2);
    ctx.arc(-8, 6, 4.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(9, snip * 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, 3);
    ctx.lineTo(9, -snip * 8);
    ctx.stroke();

    ctx.fillStyle = isDark ? '#FFFFFF' : '#2980B9';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderPainterTile(ctx, piece, s) {
    const colorHex = COLOR_HEX[piece.color || 'lavender'];
    this.drawTileBase(ctx, s, '#352C3E', '#261F2E', '#F1EBF7', '#E0D4EC', 8);

    const time = performance.now() * 0.003;
    const dropPulse = 1.0 + Math.sin(time * 3.5) * 0.08;

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26 * dropPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Gotita superior
    ctx.beginPath();
    ctx.arc(0, -s * 0.26 * dropPulse * 0.85, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -4);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 4);
    ctx.fill();
  }

  renderMixerTile(ctx, s) {
    this.drawTileBase(ctx, s, '#3C3229', '#2C241D', '#FBF0E2', '#EDDFCD', 8);

    ctx.strokeStyle = '#F5C6A5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.35, -s * 0.25);
    ctx.lineTo(s * 0.2, 0);
    ctx.lineTo(-s * 0.35, s * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#F5C6A5';
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -5);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 5);
    ctx.fill();
  }

  renderTunnelTile(ctx, s) {
    this.drawTileBase(ctx, s, '#2B3534', '#1E2625', '#E5F1EB', '#D3E4DC', 8);

    ctx.fillStyle = this.isDark ? '#14181B' : '#33373D';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, -Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();
  }

  renderDeliveryTile(ctx, s) {
    this.drawTileBase(ctx, s, '#293A2E', '#1C2920', '#E2F4E7', '#CDE9D5', 10);

    ctx.strokeStyle = '#A8D5BA';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#A8D5BA';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  renderObstacleTile(ctx, s) {
    // Roca / Obstáculo Zen suave
    ctx.fillStyle = this.isDark ? '#30343D' : '#D1CBC2';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Detalle de relieve suave de piedra
    ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-2, -2, s * 0.28, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();
  }

  renderFastBeltTile(ctx, piece, s) {
    const dir = piece?.dir || 0;
    const backDelta = DIR_DELTA[(dir + 2) % 4];
    const backPiece = (piece && piece.x !== undefined) ? this.grid.get(piece.x + backDelta.x, piece.y + backDelta.y) : null;
    const hasBackInput = backPiece && backPiece.type !== 'obstacle' && backPiece.dir === dir;

    const frontDelta = DIR_DELTA[dir];
    const frontPiece = (piece && piece.x !== undefined) ? this.grid.get(piece.x + frontDelta.x, piece.y + frontDelta.y) : null;
    const hasFrontOutput = frontPiece && frontPiece.type !== 'obstacle';

    this.drawBeltBase(ctx, s, '#1D2F38', '#142229', '#E0F2FE', '#BAE6FD', hasBackInput, hasFrontOutput);
    const trackColor = this.isDark ? '#1E3A4B' : '#BAE6FD';
    const arrowColor = this.isDark ? '#38BDF8' : '#0284C7';

    const trackLeft = hasBackInput ? -s / 2 : -s / 2 + 3;
    const trackRight = hasFrontOutput ? s / 2 : s / 2 - 3;
    ctx.fillStyle = trackColor;
    ctx.fillRect(trackLeft, -s * 0.28, trackRight - trackLeft, s * 0.56);

    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const count = 4;
    const fastOffset = (this.beltAnimOffset * 2.2) % 1.0;
    for (let i = 0; i < count; i++) {
      const offset = ((i / count) + fastOffset) % 1.0;
      const x = -s / 2 + offset * s;
      ctx.beginPath();
      ctx.moveTo(x - 6, -s * 0.20);
      ctx.lineTo(x + 2, 0);
      ctx.lineTo(x - 6, s * 0.20);
      ctx.stroke();
    }
  }

  renderSlowBeltTile(ctx, piece, s) {
    const dir = piece?.dir || 0;
    const backDelta = DIR_DELTA[(dir + 2) % 4];
    const backPiece = (piece && piece.x !== undefined) ? this.grid.get(piece.x + backDelta.x, piece.y + backDelta.y) : null;
    const hasBackInput = backPiece && backPiece.type !== 'obstacle' && backPiece.dir === dir;

    const frontDelta = DIR_DELTA[dir];
    const frontPiece = (piece && piece.x !== undefined) ? this.grid.get(piece.x + frontDelta.x, piece.y + frontDelta.y) : null;
    const hasFrontOutput = frontPiece && frontPiece.type !== 'obstacle';

    this.drawBeltBase(ctx, s, '#382E26', '#2A221B', '#FDF4EC', '#F4DEC9', hasBackInput, hasFrontOutput);
    const trackColor = this.isDark ? '#4A3B2E' : '#E8CCA8';
    const arrowColor = this.isDark ? '#F59E0B' : '#B45309';

    const trackLeft = hasBackInput ? -s / 2 : -s / 2 + 3;
    const trackRight = hasFrontOutput ? s / 2 : s / 2 - 3;
    ctx.fillStyle = trackColor;
    ctx.fillRect(trackLeft, -s * 0.28, trackRight - trackLeft, s * 0.56);

    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const count = 2;
    const slowOffset = (this.beltAnimOffset * 0.5) % 1.0;
    for (let i = 0; i < count; i++) {
      const offset = ((i / count) + slowOffset) % 1.0;
      const x = -s / 2 + offset * s;
      ctx.beginPath();
      ctx.moveTo(x - 4, -s * 0.16);
      ctx.lineTo(x + 2, 0);
      ctx.lineTo(x - 4, s * 0.16);
      ctx.stroke();
    }
  }

  renderSplitterTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#243530', '#1A2723', '#E3F4ED', '#C9E8DC', 8);

    const trackColor = this.isDark ? '#2E473F' : '#BFE3D4';
    const arrowColor = this.isDark ? '#A8D5BA' : '#2D8A5B';

    // Canal central y ramales
    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.20, s * 0.45, s * 0.40);
    ctx.fillRect(0, -s * 0.20, s / 2 - 4, s * 0.40);
    ctx.fillRect(-s * 0.20, 0, s * 0.40, s / 2 - 4);

    // Separador central
    ctx.fillStyle = arrowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Flechas indicadoras de salida
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';

    // Flecha recta
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.12);
    ctx.lineTo(s * 0.36, 0);
    ctx.lineTo(s * 0.22, s * 0.12);
    ctx.stroke();

    // Flecha lateral
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.22);
    ctx.lineTo(0, s * 0.36);
    ctx.lineTo(s * 0.12, s * 0.22);
    ctx.stroke();
  }

  renderMergerTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#363124', '#272319', '#FAF3E3', '#EDE0BD', 8);

    const trackColor = this.isDark ? '#473F2D' : '#E8D8A7';
    const arrowColor = this.isDark ? '#F5C6A5' : '#C27A3A';

    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.22, s - 8, s * 0.44);
    ctx.fillRect(-s * 0.22, -s / 2 + 4, s * 0.44, s - 8);

    ctx.fillStyle = arrowColor;
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, -s * 0.22);
    ctx.lineTo(s * 0.15, 0);
    ctx.lineTo(-s * 0.25, s * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.20, -s * 0.14);
    ctx.lineTo(s * 0.36, 0);
    ctx.lineTo(s * 0.20, s * 0.14);
    ctx.stroke();
  }

  renderFilterTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#322A3E', '#241D2E', '#F1E8FA', '#DFCEEE', 8);

    const trackColor = this.isDark ? '#433756' : '#D9C8EB';
    const mainColor = this.isDark ? '#C9B6E4' : '#7C4FB6';
    const divertColor = '#F5C6A5';

    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.20, s - 8, s * 0.40);
    ctx.fillRect(-s * 0.20, 0, s * 0.40, s / 2 - 4);

    // Lente / Glifo central
    ctx.fillStyle = this.isDark ? '#231B30' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    if (piece.filterColor) {
      ctx.fillStyle = COLOR_HEX[piece.filterColor] || mainColor;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (piece.filterShapeType) {
      Shapes.drawGeometry(ctx, piece.filterShapeType, 'lavender', s * 0.16, this.isDark);
    } else {
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, -4);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.strokeStyle = '#A8D5BA';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, -4);
    ctx.lineTo(s * 0.38, 0);
    ctx.lineTo(s * 0.28, 4);
    ctx.stroke();

    ctx.strokeStyle = divertColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-4, s * 0.28);
    ctx.lineTo(0, s * 0.38);
    ctx.lineTo(4, s * 0.28);
    ctx.stroke();
  }

  renderCrossingTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#2B323D', '#222730', '#EFECE6', '#DDD8CE', 6);

    const trackColor = this.isDark ? '#333C4A' : '#D5CFC4';
    const arrowColor = this.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)';

    // Pista inferior vertical
    ctx.fillStyle = trackColor;
    ctx.fillRect(-s * 0.26, -s / 2 + 4, s * 0.52, s - 8);

    // Sombra del puente
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Pista superior horizontal
    ctx.fillStyle = this.isDark ? '#3A4454' : '#E2DCD2';
    ctx.fillRect(-s / 2 + 4, -s * 0.28, s - 8, s * 0.56);
    ctx.restore();

    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-3, -s * 0.16);
    ctx.lineTo(4, 0);
    ctx.lineTo(-3, s * 0.16);
    ctx.stroke();

    ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + 4, -s * 0.28);
    ctx.lineTo(s / 2 - 4, -s * 0.28);
    ctx.moveTo(-s / 2 + 4, s * 0.28);
    ctx.lineTo(s / 2 - 4, s * 0.28);
    ctx.stroke();
  }

  renderBufferTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#28343F', '#1C252E', '#E4EEF7', '#CCDDEB', 8);

    const boxColor = this.isDark ? '#1F2A34' : '#FFFFFF';
    const borderColor = this.isDark ? '#5B7894' : '#97B6D2';

    ctx.fillStyle = boxColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.8;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64, 5);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
      ctx.strokeRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
    }

    const storedCount = (piece.bufferQueue || []).length;
    const dotCols = 3;
    const dotRows = 2;
    for (let r = 0; r < dotRows; r++) {
      for (let c = 0; c < dotCols; c++) {
        const dotIdx = r * dotCols + c;
        const dx = -s * 0.18 + c * (s * 0.18);
        const dy = -s * 0.12 + r * (s * 0.24);

        ctx.fillStyle = dotIdx < storedCount ? (this.isDark ? '#A9CCE3' : '#3B82F6') : (this.isDark ? '#334155' : '#CBD5E1');
        ctx.beginPath();
        ctx.arc(dx, dy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(s * 0.34, -4);
    ctx.lineTo(s * 0.44, 0);
    ctx.lineTo(s * 0.34, 4);
    ctx.stroke();
  }

  renderPortalTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#2B2338', '#1E1728', '#EFE6FB', '#DECCF4', 12);

    const time = performance.now() * 0.003;
    const portalColor = '#C9B6E4';

    const pulse = Math.sin(time * 2) * 2;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 0.40 + pulse);
    grad.addColorStop(0, 'rgba(201, 182, 228, 0.7)');
    grad.addColorStop(0.6, 'rgba(201, 182, 228, 0.2)');
    grad.addColorStop(1, 'rgba(201, 182, 228, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.42 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(time);
    ctx.strokeStyle = portalColor;
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (piece.portalId) {
      ctx.fillStyle = this.isDark ? '#FFFFFF' : '#3D2A54';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.portalId, 0, 0);
    }
  }

  renderSwitchingBeltTile(ctx, piece, s) {
    this.renderBeltTile(ctx, piece, s);

    const phase = ((piece.switchTimer || 0) / (piece.interval || 4.0)) % 1.0;
    ctx.fillStyle = this.isDark ? '#E5E9F0' : '#4C566A';
    ctx.beginPath();
    ctx.arc(s * 0.32, -s * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#F5C6A5';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(s * 0.32, -s * 0.32, 5, 0, Math.PI * 2 * (1 - phase));
    ctx.stroke();
  }

  renderWaterTile(ctx, s) {
    const isDark = this.isDark;
    const baseColor = isDark ? '#1A2936' : '#D4EAF7';
    const waveColor = isDark ? 'rgba(169, 204, 227, 0.25)' : 'rgba(255, 255, 255, 0.55)';

    ctx.fillStyle = baseColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
      ctx.fill();
    } else {
      ctx.fillRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }

    const time = performance.now() * 0.002;
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    const waveY1 = Math.sin(time) * 2 - 4;
    ctx.arc(-4, waveY1, 6, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();

    ctx.beginPath();
    const waveY2 = Math.cos(time) * 2 + 6;
    ctx.arc(4, waveY2, 6, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();
  }

  drawGhost(ctx, ghost) {
    if (this.game && this.game.mode === 'view') return;

    ctx.save();
    ctx.globalAlpha = ghost.valid ? 0.65 : 0.35;

    if (ghost.type === 'erase') {
      const s = this.tileSize;
      const px = ghost.x * s;
      const py = ghost.y * s;
      ctx.fillStyle = '#E8A0A0';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(px + 2, py + 2, s - 4, s - 4, 6);
        ctx.fill();
      } else {
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
      }
    } else {
      if (!ghost.valid && ghost.type === 'extractor') {
        // Indicador rojo translúcido si se intenta poner un extractor sin mina
        const s = this.tileSize;
        ctx.fillStyle = 'rgba(232, 160, 160, 0.38)';
        ctx.strokeStyle = '#E8A0A0';
        ctx.lineWidth = 1.5;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(ghost.x * s + 2, ghost.y * s + 2, s - 4, s - 4, 8);
          ctx.fill();
          ctx.stroke();
        }
      }
      if (ghost.type === 'cutter') {
        const s = this.tileSize;
        const dir = ghost.dir || 0;
        const rightDelta = DIR_DELTA[(dir + 1) % 4];
        const partX = ghost.x + rightDelta.x;
        const partY = ghost.y + rightDelta.y;

        ctx.fillStyle = ghost.valid ? 'rgba(93, 173, 226, 0.22)' : 'rgba(232, 160, 160, 0.35)';
        ctx.strokeStyle = ghost.valid ? '#5DADE2' : '#E8A0A0';
        ctx.lineWidth = 1.6;

        [{ x: ghost.x, y: ghost.y }, { x: partX, y: partY }].forEach(pos => {
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(pos.x * s + 2, pos.y * s + 2, s - 4, s - 4, 8);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(pos.x * s + 2, pos.y * s + 2, s - 4, s - 4);
            ctx.strokeRect(pos.x * s + 2, pos.y * s + 2, s - 4, s - 4);
          }
        });
      }
      if (ghost.type === 'factory_2x2') {
        const s = this.tileSize;
        ctx.fillStyle = ghost.valid ? 'rgba(201, 182, 228, 0.25)' : 'rgba(232, 160, 160, 0.35)';
        ctx.strokeStyle = ghost.valid ? '#AF7AC5' : '#E8A0A0';
        ctx.lineWidth = 1.8;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(ghost.x * s + 2, ghost.y * s + 2, s * 2 - 4, s * 2 - 4, 12);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(ghost.x * s + 2, ghost.y * s + 2, s * 2 - 4, s * 2 - 4);
          ctx.strokeRect(ghost.x * s + 2, ghost.y * s + 2, s * 2 - 4, s * 2 - 4);
        }
      }
      this.drawPiece(ctx, ghost);
      this.drawGhostPortArrows(ctx, ghost);
    }

    ctx.restore();
  }

  // Flechas verdes indicadoras de puertos de entrada y salida en modo Ghost / Preview
  drawGhostPortArrows(ctx, ghost) {
    if (!ghost || !ghost.type || ghost.type === 'erase' || ghost.type === 'obstacle' || ghost.type === 'water') return;

    const s = this.tileSize;
    const dir = ghost.dir || 0;
    const rightDelta = DIR_DELTA[(dir + 1) % 4];

    // Puertos a dibujar: { x, y, borderDir, isExit }
    const ports = [];

    switch (ghost.type) {
      case 'belt':
      case 'belt_fast':
      case 'belt_slow':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'extractor':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'trash':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        break;

      case 'cutter':
        // Entrada en la parte trasera de la celda raíz
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        // Dos salidas frontales paralelas (raíz y parte derecha, idéntico a screenshot)
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        ports.push({ x: ghost.x + rightDelta.x, y: ghost.y + rightDelta.y, borderDir: dir, isExit: true });
        break;

      case 'painter':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'factory_1x1':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 1) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'factory_2x2':
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            if (dir === 0 && dx === 1) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 0, isExit: true });
            if (dir === 1 && dy === 1) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 1, isExit: true });
            if (dir === 2 && dx === 0) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 2, isExit: true });
            if (dir === 3 && dy === 0) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 3, isExit: true });

            if (dir === 0 && dx === 0) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 2, isExit: false });
            if (dir === 1 && dy === 0) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 3, isExit: false });
            if (dir === 2 && dx === 1) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 0, isExit: false });
            if (dir === 3 && dy === 1) ports.push({ x: ghost.x + dx, y: ghost.y + dy, borderDir: 1, isExit: false });
          }
        }
        break;

      case 'splitter':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 1) % 4, isExit: true });
        break;

      case 'merger':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'filter':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 1) % 4, isExit: true });
        break;

      case 'tunnel':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'crossing':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 1) % 4, isExit: true });
        break;

      case 'buffer':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;
    }

    const pulse = 1.0 + Math.sin(performance.now() * 0.007) * 0.10;

    for (const p of ports) {
      const cx = (p.x + 0.5) * s;
      const cy = (p.y + 0.5) * s;
      const delta = DIR_DELTA[p.borderDir];
      const edgeDist = s * 0.44;
      const px = cx + delta.x * edgeDist;
      const py = cy + delta.y * edgeDist;

      const pointDir = p.isExit ? p.borderDir : (p.borderDir + 2) % 4;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pointDir * (Math.PI / 2));
      ctx.scale(pulse, pulse);

      const arrowSize = s * 0.22;
      ctx.fillStyle = p.isExit ? '#48C774' : '#52B788';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(arrowSize * 0.55, 0);
      ctx.lineTo(-arrowSize * 0.45, -arrowSize * 0.45);
      ctx.lineTo(-arrowSize * 0.18, 0);
      ctx.lineTo(-arrowSize * 0.45, arrowSize * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  drawItems(ctx, customItems = null) {
    const s = this.tileSize;
    const items = customItems || this.sim.items;

    for (const item of items) {
      if (item.isUnderground) continue;

      const piece = (customItems && this.game.demoGrid) ? this.game.demoGrid.get(item.x, item.y) : this.grid.get(item.x, item.y);
      if (!piece) continue;

      const cx = (item.x + 0.5) * s;
      const cy = (item.y + 0.5) * s;
      const inDir = item.inDir !== undefined ? item.inDir : piece.dir;
      const outDir = piece.dir;

      let drawX = cx;
      let drawY = cy;

      if (inDir === outDir || piece.type !== 'belt') {
        const inDelta = DIR_DELTA[inDir];
        const startX = cx - inDelta.x * s * 0.5;
        const startY = cy - inDelta.y * s * 0.5;
        const outDelta = DIR_DELTA[outDir];
        const endX = cx + outDelta.x * s * 0.5;
        const endY = cy + outDelta.y * s * 0.5;

        drawX = startX + (endX - startX) * item.progress;
        drawY = startY + (endY - startY) * item.progress;
      } else {
        const inDelta = DIR_DELTA[inDir];
        const p0x = cx - inDelta.x * s * 0.5;
        const p0y = cy - inDelta.y * s * 0.5;
        const outDelta = DIR_DELTA[outDir];
        const p1x = cx + outDelta.x * s * 0.5;
        const p1y = cy + outDelta.y * s * 0.5;
        const pcx = cx;
        const pcy = cy;

        const t = item.progress;
        const oneMinusT = 1 - t;
        drawX = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * t * pcx + t * t * p1x;
        drawY = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * t * pcy + t * t * p1y;
      }

      // Micro-vibración sutil anti-fatiga ("rodando")
      const jitter = Math.sin(performance.now() * 0.016 + item.id * 11) * 0.55;
      const moveAngle = (outDir || 0) * (Math.PI / 2);
      drawX += Math.cos(moveAngle + Math.PI / 2) * jitter;
      drawY += Math.sin(moveAngle + Math.PI / 2) * jitter;

      ctx.save();
      ctx.translate(drawX, drawY);

      // Centrifugado / bob en curvas
      if (inDir !== outDir && piece.type === 'belt') {
        const bob = Math.sin(item.progress * Math.PI) * 0.12;
        ctx.scale(1 + bob, 1 - bob * 0.5);
        ctx.rotate((item.progress - 0.5) * 0.22);
      }

      // Desvanecimiento suave en túnel
      if (piece.type === 'tunnel') {
        if (!item.isUnderground && item.progress < 0.6) {
          ctx.globalAlpha = Math.max(0, 1.0 - item.progress * 1.6);
        }
      }

      let scale = 1.0;
      if (piece.type === 'trash') {
        scale = Math.max(0.01, 1.0 - item.progress);
        ctx.scale(scale, scale);
      } else if (piece.type === 'delivery') {
        scale = Math.max(0.01, 1.0 - item.progress * 0.8);
        ctx.scale(scale, scale);
      }

      Shapes.draw(ctx, item.shape, s * 0.32, this.isDark);
      ctx.restore();
    }
  }

  drawMachineAnims(ctx, animList = null) {
    const list = animList || (this.sim ? this.sim.machineAnims : null);
    if (!list || list.length === 0 || this.reducedMotion) return;

    const s = this.tileSize;
    const nowMs = performance.now();

    for (const anim of list) {
      const elapsed = nowMs - anim.startTime;
      if (elapsed < 0 || elapsed > anim.duration) continue;
      const t = elapsed / anim.duration;
      const cx = (anim.x + 0.5) * s;
      const cy = (anim.y + 0.5) * s;

      ctx.save();

      switch (anim.type) {
        case 'extractor_pulse': {
          // Pulso rítmico + emisión
          const delta = DIR_DELTA[anim.data.dir !== undefined ? anim.data.dir : 0];
          const dist = t * s * 0.45;
          ctx.strokeStyle = this.isDark ? `rgba(168, 213, 186, ${0.75 * (1 - t)})` : `rgba(87, 158, 114, ${0.75 * (1 - t)})`;
          ctx.lineWidth = 2.2 * (1 - t);
          ctx.beginPath();
          ctx.arc(cx + delta.x * dist, cy + delta.y * dist, 5 + 14 * t, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'cutter_flash': {
          // Mini flash horizontal y separación suave
          ctx.translate(cx, cy);
          ctx.rotate((anim.data.dir !== undefined ? anim.data.dir : 0) * (Math.PI / 2));
          ctx.strokeStyle = `rgba(169, 204, 227, ${0.85 * (1 - t)})`;
          ctx.lineWidth = 3.6 * (1 - t);
          ctx.beginPath();
          ctx.moveTo(-s * 0.4, 0);
          ctx.lineTo(s * 0.4, 0);
          ctx.stroke();
          break;
        }

        case 'painter_drop': {
          // Gota animada cayendo + salpicadura translúcida
          const pCol = COLOR_HEX[anim.data.color || 'lavender'] || '#C9B6E4';
          ctx.strokeStyle = pCol;
          ctx.globalAlpha = 0.65 * (1 - t);
          ctx.lineWidth = 2.2 * (1 - t);
          ctx.beginPath();
          ctx.arc(cx, cy, 6 + 14 * t, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case 'mixer_spin': {
          // Órbita de convergencia y giro 180°
          const angle = t * Math.PI;
          const r = (1 - t) * s * 0.28;
          ctx.fillStyle = '#F5C6A5';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 3.2 * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r, 3.2 * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'trash_shrink': {
          // Desaparición con partículas pastel
          const emberColor = COLOR_HEX[anim.data.color || 'coral'] || '#E8A0A0';
          ctx.fillStyle = emberColor;
          for (let k = 0; k < 4; k++) {
            const ex = cx + Math.cos(k * 1.57) * (10 * t) + (k % 2 ? -2 : 2) * t * 6;
            const ey = cy - 14 * t + Math.sin(k * 1.57) * 4;
            ctx.globalAlpha = 0.7 * (1 - t);
            ctx.beginPath();
            ctx.arc(ex, ey, Math.max(0.5, 2.5 * (1 - t)), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'delivery_pulse': {
          // Latido suave + onda expansiva
          ctx.strokeStyle = '#A8D5BA';
          ctx.lineWidth = 2.5 * (1 - t);
          ctx.globalAlpha = 0.65 * (1 - t);
          ctx.beginPath();
          ctx.arc(cx, cy, s * 0.25 + s * 0.55 * t, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
    }
  }

  drawParticles(ctx, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 1.4;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ==========================================================================
   8. ENTRADA Y CONTROLES (InputManager)
   ========================================================================== */
export class InputManager {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    this.isPointerDown = false;
    this.button = 0;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.isDraggingMap = false;
    this.lastPlacedCell = null;

    // Estado especial para desplazamiento con botón central y Espacio
    this.isMiddleDragging = false;
    this.isSpaceDown = false;
    this.spaceDragged = false;

    this.activePointers = new Map();
    this.initialPinchDistance = 0;
    this.initialPinchZoom = 1.0;
    this.longPressTimer = null;
    this.longPressTriggered = false;

    this.bindEvents();
  }

  bindEvents() {
    const el = this.canvas;

    el.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  onPointerDown(e) {
    if (this.game && this.game.state === 'menu') {
      this.game.startGameFromMenu();
      return;
    }

    this.canvas.setPointerCapture(e.pointerId);
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 1. Desplazamiento con botón central del ratón (disponible en ambos modos)
    if (e.button === 1) {
      this.isMiddleDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.classList.add('grabbing');
      return;
    }

    // 2. Desplazamiento manteniendo pulsada la tecla Espacio (estándar Figma/Tiled)
    if (this.isSpaceDown) {
      this.isDraggingMap = true;
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.classList.add('grabbing');
      return;
    }

    if (this.activePointers.size === 1) {
      this.isPointerDown = true;
      this.button = e.button;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.isDraggingMap = false;
      this.longPressTriggered = false;
      this.lastPlacedCell = null;

      // 3. MODO VISTA: clic izquierdo no coloca, desplaza la cámara libremente
      if (this.game.mode === 'view') {
        this.isDraggingMap = true;
        this.canvas.classList.add('grabbing');
        return;
      }

      // 4. MODO EDICIÓN: colocar o borrar piezas
      if (e.pointerType === 'touch') {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          this.longPressTriggered = true;
          const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
          this.game.removePieceAt(pos.gridX, pos.gridY);
        }, 380);

        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        if (this.game.selectedTool === 'belt') {
          this.game.handleBeltPlacement(pos.gridX, pos.gridY);
          this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
        }
      } else {
        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        if (e.button === 2 || this.game.selectedTool === 'erase') {
          this.game.removePieceAt(pos.gridX, pos.gridY);
        } else if (e.button === 0) {
          if (this.game.selectedTool === 'belt') {
            this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          } else {
            this.game.placePieceAt(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          }
        }
      }
    } else if (this.activePointers.size === 2) {
      // Gesto de pinza táctil para zoom
      clearTimeout(this.longPressTimer);
      const points = Array.from(this.activePointers.values());
      this.initialPinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      this.initialPinchZoom = this.game.renderer.zoom;
    }
  }

  onPointerMove(e) {
    if (this.game && this.game.state === 'menu') return;

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
    this.lastHoverGrid = { x: pos.gridX, y: pos.gridY };
    this.game.updateGhost(pos.gridX, pos.gridY);

    // Zoom por pinza táctil (2 dedos)
    if (this.activePointers.size === 2) {
      const points = Array.from(this.activePointers.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (this.initialPinchDistance > 0) {
        const factor = currentDist / this.initialPinchDistance;
        this.game.setZoom(this.initialPinchZoom * factor, (points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
      }
      return;
    }

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;

    // Pan con botón central
    if (this.isMiddleDragging || e.buttons === 4) {
      this.game.renderer.camX += dx;
      this.game.renderer.camY += dy;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      return;
    }

    // Pan con Espacio + arrastrar
    if (this.isSpaceDown && this.isPointerDown) {
      this.spaceDragged = true;
      this.game.renderer.camX += dx;
      this.game.renderer.camY += dy;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      return;
    }

    if (!this.isPointerDown) return;

    const totalDist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);
    if (totalDist > 8) {
      clearTimeout(this.longPressTimer);
    }

    // Pan en MODO VISTA
    if (this.game.mode === 'view') {
      this.game.renderer.camX += dx;
      this.game.renderer.camY += dy;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      return;
    }

    // MODO EDICIÓN
    if (e.pointerType === 'touch') {
      if (this.game.selectedTool === 'belt') {
        // En táctil con herramienta de cinta: trazo continuo con curvas automáticas
        if (!this.lastPlacedCell) {
          this.game.handleBeltPlacement(pos.gridX, pos.gridY);
          this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
        } else if (this.lastPlacedCell.x !== pos.gridX || this.lastPlacedCell.y !== pos.gridY) {
          this.game.dragDrawBelt(this.lastPlacedCell.x, this.lastPlacedCell.y, pos.gridX, pos.gridY);
          this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
        }
      } else if (this.game.selectedTool === 'erase') {
        this.game.removePieceAt(pos.gridX, pos.gridY);
      } else {
        // En táctil con otras herramientas, arrastrar con 1 dedo desplaza la cámara si se mueve más de 10px
        if (totalDist > 10) {
          this.isDraggingMap = true;
          this.game.renderer.camX += dx;
          this.game.renderer.camY += dy;
        }
      }
    } else {
      // En PC con ratón
      if (e.buttons === 1 && !this.longPressTriggered) {
        if (this.game.selectedTool === 'erase') {
          this.game.removePieceAt(pos.gridX, pos.gridY);
        } else if (this.game.selectedTool === 'belt') {
          // Trazar cintas continuas con curvado automático de esquinas
          if (!this.lastPlacedCell) {
            this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          } else if (this.lastPlacedCell.x !== pos.gridX || this.lastPlacedCell.y !== pos.gridY) {
            this.game.dragDrawBelt(this.lastPlacedCell.x, this.lastPlacedCell.y, pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          }
        } else {
          // Otras herramientas: colocar celda a celda
          if (!this.lastPlacedCell || this.lastPlacedCell.x !== pos.gridX || this.lastPlacedCell.y !== pos.gridY) {
            this.game.placePieceAt(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          }
        }
      } else if (e.buttons === 2) {
        this.game.removePieceAt(pos.gridX, pos.gridY);
      }
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  onPointerUp(e) {
    if (this.game && this.game.audio) {
      this.game.audio.resetChainPitch();
    }

    clearTimeout(this.longPressTimer);
    this.activePointers.delete(e.pointerId);

    if (e.button === 1) {
      this.isMiddleDragging = false;
    }

    this.canvas.classList.remove('grabbing');

    if (this.game && this.game.state === 'menu') {
      this.game.startGameFromMenu();
      return;
    }

    if (this.activePointers.size === 0) {
      const totalDist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);

      // Si es un tap limpio
      if (!this.isDraggingMap && !this.longPressTriggered && totalDist < 12) {
        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        const clickedPiece = this.game.grid.get(pos.gridX, pos.gridY);

        if (this.game.mode === 'view') {
          // En modo vista, tocar abre la configuración de la máquina
          if (clickedPiece) {
            if (clickedPiece.type === 'factory_1x1' || clickedPiece.type === 'factory_2x2' || clickedPiece.type === 'factory_2x2_part') {
              this.game.ui.openMachineSidebar(clickedPiece);
            } else if (clickedPiece.type === 'painter') {
              this.game.ui.openPainterSidebar(clickedPiece);
            }
          }
        } else if (this.game.mode === 'edit' && e.pointerType === 'touch') {
          // En modo edición táctil: colocar o borrar piezas
          if (this.game.selectedTool === 'erase') {
            this.game.removePieceAt(pos.gridX, pos.gridY);
          } else if (this.game.selectedTool === 'belt') {
            if (!this.lastPlacedCell) {
              this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            }
          } else {
            // Permitir colocar todas las herramientas en táctil
            this.game.placePieceAt(pos.gridX, pos.gridY);
          }
        }
      }

      this.isPointerDown = false;
      this.isDraggingMap = false;
      this.longPressTriggered = false;
      this.lastPlacedCell = null;
    }
  }

  onWheel(e) {
    if (this.game && this.game.state === 'menu') return;
    e.preventDefault();
    if (e.ctrlKey || Math.abs(e.deltaY) > 40) {
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      this.game.setZoom(this.game.renderer.zoom * zoomFactor, e.clientX, e.clientY);
    } else {
      this.game.renderer.camX -= e.deltaX * 0.8;
      this.game.renderer.camY -= e.deltaY * 0.8;
    }
  }

  onKeyDown(e) {
    if (this.game && this.game.state === 'menu') {
      if (e.key === ' ' || e.key === 'Enter') {
        this.game.startGameFromMenu();
      }
      return;
    }

    // Atajos de Deshacer / Rehacer (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        this.game.redo();
      } else {
        this.game.undo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.game.redo();
      return;
    }

    // Alternar modo Zen con tecla Z (sin modificadores)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      this.game.toggleZenMode();
      return;
    }

    // Tecla Q para alternar entre Modo Vista y Modo Edición
    if (e.key === 'q' || e.key === 'Q') {
      this.game.toggleMode();
      return;
    }

    // Tecla Espacio: prepararse para pan si se arrastra, o pausar al soltar
    if (e.key === ' ') {
      e.preventDefault();
      if (!this.isSpaceDown) {
        this.isSpaceDown = true;
        this.spaceDragged = false;
        this.canvas.classList.add('space-grab');
      }
      return;
    }

    // Herramientas avanzadas:
    // Shift+1 o ! -> Cinta Rápida
    if (e.shiftKey && (e.key === '1' || e.key === '!')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('belt_fast');
      return;
    }
    // Alt+1 -> Cinta Lenta
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('belt_slow');
      return;
    }

    // Teclas 1 a 8 para herramientas estándar (6 es ahora Fabricador / factory_1x1)
    const tools = ['belt', 'extractor', 'trash', 'cutter', 'painter', 'factory_1x1', 'tunnel', 'erase'];
    if (e.key >= '1' && e.key <= '8' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const idx = parseInt(e.key, 10) - 1;
      if (tools[idx]) {
        if (this.game.mode === 'view') {
          this.game.toggleMode();
        }
        this.game.selectTool(tools[idx]);
      }
      return;
    }

    // Tecla 9 -> Divisor / Splitter
    if (e.key === '9' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('splitter');
      return;
    }
    // Tecla 0 -> Fusionador / Merger
    if (e.key === '0' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('merger');
      return;
    }
    // Tecla F -> Filtro / Selector
    if (!e.ctrlKey && !e.metaKey && (e.key === 'f' || e.key === 'F')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('filter');
      return;
    }
    // Tecla C -> Cruce / Puente a nivel
    if (!e.ctrlKey && !e.metaKey && (e.key === 'c' || e.key === 'C')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('crossing');
      return;
    }
    // Tecla B -> Almacén Buffer
    if (!e.ctrlKey && !e.metaKey && (e.key === 'b' || e.key === 'B')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('buffer');
      return;
    }

    // Interacción y cambio de receta o color (Tecla E) sobre máquina o pintor con el ratón encima (hover SIN clic)
    if (!e.ctrlKey && !e.metaKey && (e.key === 'e' || e.key === 'E')) {
      if (this.lastHoverGrid) {
        const piece = this.game.grid.get(this.lastHoverGrid.x, this.lastHoverGrid.y);
        if (piece && (piece.type === 'factory_1x1' || piece.type === 'factory_2x2' || piece.type === 'factory_2x2_part')) {
          this.game.ui.openMachineSidebar(piece);
          return;
        } else if (piece && piece.type === 'painter') {
          this.game.ui.openPainterSidebar(piece);
          return;
        }
      }
      // Si el cursor no está sobre una máquina colocada, abrir drawer para el preset activo
      if (this.game.selectedTool === 'factory_1x1' || this.game.selectedTool === 'factory_2x2') {
        this.game.ui.openMachineSidebar(null);
        return;
      } else if (this.game.selectedTool === 'painter') {
        this.game.ui.openPainterSidebar(null);
        return;
      }
    }

    // Tecla P -> Fábrica Estándar (1x1)
    if (!e.ctrlKey && !e.metaKey && (e.key === 'p' || e.key === 'P')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('factory_1x1');
      return;
    }

    // Tecla M -> Mega Ensambladora (2x2)
    if (!e.ctrlKey && !e.metaKey && (e.key === 'm' || e.key === 'M')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('factory_2x2');
      return;
    }

    // Atajo para reiniciar el mapa del nivel (Ctrl+R / Shift+R / Cmd+R)
    if ((e.ctrlKey || e.metaKey || e.shiftKey) && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      this.game.restartLevelMap();
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'r':
        this.game.rotatePlacement();
        break;
      case 'escape':
        if (this.game.ui?.isSidebarOpen?.()) {
          this.game.ui.closeMachineSidebar();
        } else {
          this.game.ui.toggleLevelsModal();
        }
        break;
      case '+':
      case '=':
        this.game.setZoom(this.game.renderer.zoom * 1.15);
        break;
      case '-':
      case '_':
        this.game.setZoom(this.game.renderer.zoom * 0.85);
        break;
      case 'w':
      case 'arrowup':
        this.game.renderer.camY += 40;
        break;
      case 's':
      case 'arrowdown':
        this.game.renderer.camY -= 40;
        break;
      case 'a':
      case 'arrowleft':
        this.game.renderer.camX += 40;
        break;
      case 'd':
      case 'arrowright':
        this.game.renderer.camX -= 40;
        break;
    }
  }

  onKeyUp(e) {
    if (e.key === ' ') {
      this.isSpaceDown = false;
      this.canvas.classList.remove('space-grab');
      this.canvas.classList.remove('grabbing');
      // Si fue solo una pulsación corta sin arrastre, alterna pausa/play
      if (!this.spaceDragged) {
        this.game.togglePause();
      }
      this.spaceDragged = false;
    }
  }
}

/* ==========================================================================
   9. GESTOR DE INTERFAZ DE USUARIO (UIManager)
   ========================================================================== */
export class UIManager {
  constructor(game) {
    this.game = game;
    this.activeChapter = 1;
    this.hackerClicks = 0;
    this.lastHackerClick = 0;
    this.bindDOM();
  }

  bindDOM() {
    // 1. Menú Principal Split-Screen
    document.getElementById('menu-btn-play')?.addEventListener('click', () => {
      this.game.audio.playPlaf();
      this.game.startGameFromMenu();
    });

    document.getElementById('menu-btn-continue')?.addEventListener('click', () => {
      this.game.audio.playPlaf();
      this.game.startGameFromMenu();
    });

    document.querySelector('.menu-preview-overlay')?.addEventListener('click', () => {
      this.game.audio?.playPlaf?.();
      this.game.startGameFromMenu();
    });

    document.getElementById('menu-btn-levels')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleLevelsModal(true);
    });

    document.getElementById('menu-btn-achievements')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleAchievementsModal(true);
    });

    document.getElementById('menu-btn-shop')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleShopModal(true);
    });

    document.getElementById('menu-btn-editor')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleEditorModal(true);
    });

    document.getElementById('menu-btn-settings')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleSettingsModal(true);
    });

    document.getElementById('menu-btn-credits')?.addEventListener('click', () => {
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleCreditsModal(true);
    });

    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      this.game.audio.playRotate();
      this.game.openMainMenu();
    });

    // 2. HUD y controles de juego
    const btnMode = document.getElementById('btn-mode-toggle');
    if (btnMode) btnMode.addEventListener('click', () => this.game.toggleMode());

    const btnFabMode = document.getElementById('btn-fab-mode');
    if (btnFabMode) btnFabMode.addEventListener('click', () => this.game.toggleMode());

    document.getElementById('btn-pause')?.addEventListener('click', () => this.game.togglePause());
    document.getElementById('btn-speed')?.addEventListener('click', () => this.game.cycleSpeed());
    document.getElementById('btn-restart-level')?.addEventListener('click', () => this.game.restartCurrentLevel());

    // Botón reiniciar mapa (limpiar piezas colocadas)
    const btnClearMap = document.getElementById('btn-clear-map');
    if (btnClearMap) btnClearMap.addEventListener('click', () => this.game.restartLevelMap());

    const btnFabClear = document.getElementById('btn-fab-clear');
    if (btnFabClear) btnFabClear.addEventListener('click', () => this.game.restartLevelMap());

    // Pestañas de capítulos en selector de niveles
    const tab1 = document.getElementById('tab-chapter-1');
    const tab2 = document.getElementById('tab-chapter-2');
    const tab3 = document.getElementById('tab-chapter-3');
    if (tab1) {
      tab1.addEventListener('click', () => {
        this.activeChapter = 1;
        this.populateLevelsGrid();
      });
    }
    if (tab2) {
      tab2.addEventListener('click', () => {
        const save = this.game.saveData;
        const maxUnlocked = Math.max(1, ...(save.nivelesCompletados || [0])) + 1;
        const isChapter2Unlocked = (save.nivelesCompletados && save.nivelesCompletados.includes(20)) || maxUnlocked > 20 || save.nivelActual > 20;
        if (!isChapter2Unlocked) {
          this.showToast("🔒 Completa el nivel 20 para desbloquear el Capítulo 2", 2200);
        }
        this.activeChapter = 2;
        this.populateLevelsGrid();
      });
    }
    if (tab3) {
      tab3.addEventListener('click', () => {
        const save = this.game.saveData;
        const maxUnlocked = Math.max(1, ...(save.nivelesCompletados || [0])) + 1;
        const isChapter3Unlocked = (save.nivelesCompletados && save.nivelesCompletados.includes(40)) || maxUnlocked > 40 || save.nivelActual > 40;
        if (!isChapter3Unlocked) {
          this.showToast("🔒 Completa el nivel 40 para desbloquear el Capítulo 3: Vanguardia", 2200);
        }
        this.activeChapter = 3;
        this.populateLevelsGrid();
      });
    }
    const tab4 = document.getElementById('tab-chapter-4');
    if (tab4) {
      tab4.addEventListener('click', () => {
        this.activeChapter = 4;
        this.populateLevelsGrid();
      });
    }

    // Toggle de la Expansión Biomolecular & Cuántica (DLC)
    document.getElementById('btn-dlc-toggle')?.addEventListener('click', () => {
      QuantumDLC.isEnabled = !QuantumDLC.isEnabled;
      const btn = document.getElementById('btn-dlc-toggle');
      if (btn) btn.classList.toggle('active', QuantumDLC.isEnabled);
      this.game.audio.playPlaf();
      this.showToast(QuantumDLC.isEnabled ? "🧬 Expansión Biomolecular & Cuántica Activa" : "Expansión desactivada", 1800);
      this.updateAvailableTools(this.game.currentLevel?.availableTools || ['belt', 'extractor']);
    });

    // Botón flotante para inspección y configuración de máquinas (Tecla E / Móvil)
    document.getElementById('btn-fab-recipe')?.addEventListener('click', () => {
      const factories = this.game.grid.getAllPieces().filter(p => p.type === 'factory_1x1' || p.type === 'factory_2x2');
      if (factories.length > 0) {
        this.openMachineSidebar(factories[0]);
      } else if (this.game.selectedTool === 'factory_1x1' || this.game.selectedTool === 'factory_2x2') {
        this.openMachineSidebar(null);
      } else if (this.game.selectedTool === 'painter') {
        this.openPainterSidebar(null);
      } else {
        this.openMachineSidebar(null);
      }
    });

    // Botones de Modo Zen y Deshacer / Rehacer
    document.getElementById('btn-zen-toggle')?.addEventListener('click', () => this.game.toggleZenMode());
    document.getElementById('btn-undo')?.addEventListener('click', () => this.game.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.game.redo());

    // Botones de cierre de los nuevos modales

    document.getElementById('btn-close-achievements')?.addEventListener('click', () => this.toggleAchievementsModal(false));
    document.getElementById('btn-close-shop')?.addEventListener('click', () => this.toggleShopModal(false));
    document.getElementById('btn-close-editor')?.addEventListener('click', () => this.toggleEditorModal(false));

    document.getElementById('btn-editor-export')?.addEventListener('click', () => this.exportLevelToEditor());
    document.getElementById('btn-editor-import')?.addEventListener('click', () => this.importLevelFromEditor());

    document.getElementById('btn-levels-modal')?.addEventListener('click', () => this.toggleLevelsModal(true));
    document.getElementById('btn-sound-toggle')?.addEventListener('click', () => this.game.toggleSound());
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.game.toggleTheme());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.toggleSettingsModal(true));

    document.getElementById('btn-close-levels')?.addEventListener('click', () => this.toggleLevelsModal(false));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.toggleSettingsModal(false));
    document.getElementById('btn-close-credits')?.addEventListener('click', () => this.toggleCreditsModal(false));
    document.getElementById('btn-close-hacker')?.addEventListener('click', () => this.toggleHackerModal(false));

    document.getElementById('btn-replay-level')?.addEventListener('click', () => {
      this.toggleVictoryModal(false);
      this.game.restartCurrentLevel();
    });
    document.getElementById('btn-next-level')?.addEventListener('click', () => {
      this.toggleVictoryModal(false);
      this.game.loadNextLevel();
    });
    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      if (confirm("¿Estás seguro de que deseas reiniciar todo el progreso y las mejores marcas guardadas?")) {
        this.game.resetAllProgress();
      }
    });

    // 3. Pestañas de Ajustes: Juego vs Estética
    const tabCfgGame = document.getElementById('tab-cfg-game');
    const tabCfgAesthetic = document.getElementById('tab-cfg-aesthetic');
    const panelCfgGame = document.getElementById('panel-cfg-game');
    const panelCfgAesthetic = document.getElementById('panel-cfg-aesthetic');

    if (tabCfgGame && tabCfgAesthetic) {
      tabCfgGame.addEventListener('click', () => {
        tabCfgGame.classList.add('active');
        tabCfgAesthetic.classList.remove('active');
        if (panelCfgGame) panelCfgGame.style.display = 'block';
        if (panelCfgAesthetic) panelCfgAesthetic.style.display = 'none';
      });
      tabCfgAesthetic.addEventListener('click', () => {
        tabCfgAesthetic.classList.add('active');
        tabCfgGame.classList.remove('active');
        if (panelCfgAesthetic) panelCfgAesthetic.style.display = 'block';
        if (panelCfgGame) panelCfgGame.style.display = 'none';
      });
    }

    // Slider de volumen general
    const volSlider = document.getElementById('setting-volume-slider');
    const volVal = document.getElementById('setting-volume-val');
    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (volVal) volVal.textContent = `${val}%`;
        this.game.setVolume(val / 100);
      });
    }

    // Selector de paletas de color en tiempo real
    const paletteCards = document.querySelectorAll('.palette-card[data-preset]');
    paletteCards.forEach(card => {
      card.addEventListener('click', () => {
        const preset = card.dataset.preset;
        this.game.setPalettePreset(preset);
      });
    });

    const btnResetPalette = document.getElementById('btn-reset-palette');
    if (btnResetPalette) {
      btnResetPalette.addEventListener('click', () => {
        this.game.setPalettePreset('suave');
      });
    }

    // Configuración estándar
    const darkInput = document.getElementById('setting-darkmode');
    if (darkInput) darkInput.addEventListener('change', (e) => this.game.setTheme(e.target.checked));

    const ctrlSelect = document.getElementById('setting-controls-mode');
    if (ctrlSelect) ctrlSelect.addEventListener('change', (e) => this.game.setControlsMode(e.target.value));

    const motionInput = document.getElementById('setting-reduced-motion');
    if (motionInput) motionInput.addEventListener('change', (e) => this.game.setReducedMotion(e.target.checked));

    // 4. Panel Hacker Secreto: Activación con 8 clics rápidos en la 3ª letra ('l')
    const hackerTrigger = document.getElementById('hacker-trigger');
    if (hackerTrigger) {
      hackerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const now = performance.now();
        if (now - this.lastHackerClick < 400) {
          this.hackerClicks++;
        } else {
          this.hackerClicks = 1;
        }
        this.lastHackerClick = now;

        if (this.hackerClicks >= 8) {
          this.hackerClicks = 0;
          this.game.audio.playHackerChime();
          this.toggleHackerModal(true);
        }
      });
    }

    const hackerUnlockAll = document.getElementById('hacker-btn-unlock-all');
    if (hackerUnlockAll) {
      hackerUnlockAll.addEventListener('click', () => {
        for (let i = 1; i <= 64; i++) {
          if (!this.game.saveData.nivelesCompletados.includes(i)) {
            this.game.saveData.nivelesCompletados.push(i);
          }
          this.game.saveData.estrellas[i] = 3;
        }
        this.game.autoSave();
        this.populateLevelsGrid();
        this.updateMenuStats();
        this.showToast("⭐ ¡Todos los 64 niveles desbloqueados con 3 estrellas!", 2500);
        this.toggleHackerModal(false);
      });
    }

    const hackerInstantWin = document.getElementById('hacker-btn-instant-win');
    if (hackerInstantWin) {
      hackerInstantWin.addEventListener('click', () => {
        this.toggleHackerModal(false);
        if (this.game.state === 'menu') {
          this.game.startGameFromMenu();
        }
        this.game.timeElapsed = Math.max(1, (this.game.currentLevel?.stars?.gold || 15) - 2);
        this.game.completeLevel();
      });
    }

    // 5. Botones flotantes y herramientas
    document.getElementById('btn-fab-rotate')?.addEventListener('click', () => this.game.rotatePlacement());
    document.getElementById('btn-fab-erase')?.addEventListener('click', () => {
      if (this.game.selectedTool === 'erase') {
        this.game.selectTool('belt');
      } else {
        this.game.selectTool('erase');
      }
    });
    document.getElementById('btn-fab-center')?.addEventListener('click', () => this.game.centerCameraOnLevel());
    document.getElementById('btn-fab-zoomin')?.addEventListener('click', () => this.game.setZoom(this.game.renderer.zoom * 1.2));
    document.getElementById('btn-fab-zoomout')?.addEventListener('click', () => this.game.setZoom(this.game.renderer.zoom * 0.8));

    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
      card.addEventListener('click', () => {
        const tool = card.dataset.tool;
        this.game.selectTool(tool);
      });
    });

    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.game.painterColor = swatch.dataset.color;
        this.game.updateGhost();
      });
    });

    // Selector de presets de receta para el Fabricador (Panel inferior)
    const recipeChips = document.querySelectorAll('.recipe-chip[data-recipe]');
    recipeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        recipeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const recipe = chip.dataset.recipe;
        this.game.defaultFactoryRecipe = recipe;
        this.game.audio?.playRotate?.();
        this.showToast(`Preset fábrica: ${recipe.replace(/_/g, ' ')}`, 1400);
      });
    });

    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => {
      this.closeMachineSidebar();
    });
  }

  updateLevelInfo(level, demands = null) {
    if (!level) return;
    document.getElementById('level-tag').textContent = `Nivel ${level.id}`;
    document.getElementById('level-title').textContent = level.name;
    document.getElementById('hint-text').textContent = level.hint || level.description;

    const previewCanvas = document.getElementById('target-preview-canvas');
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      const isDark = this.game.isDark;

      const activeDemands = demands || (level.demands ? level.demands : (level.targetShape ? [{ shape: level.targetShape, quota: level.quota }] : []));

      if (activeDemands.length === 1) {
        pCtx.save();
        pCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
        Shapes.draw(pCtx, activeDemands[0].shape, 22, isDark);
        pCtx.restore();
      } else if (activeDemands.length === 2) {
        pCtx.save();
        pCtx.translate(previewCanvas.width * 0.3, previewCanvas.height / 2);
        Shapes.draw(pCtx, activeDemands[0].shape, 13, isDark);
        pCtx.restore();

        pCtx.save();
        pCtx.translate(previewCanvas.width * 0.7, previewCanvas.height / 2);
        Shapes.draw(pCtx, activeDemands[1].shape, 13, isDark);
        pCtx.restore();
      } else if (activeDemands.length >= 3) {
        const step = previewCanvas.width / (activeDemands.length + 1);
        for (let i = 0; i < activeDemands.length; i++) {
          pCtx.save();
          pCtx.translate(step * (i + 1), previewCanvas.height / 2);
          Shapes.draw(pCtx, activeDemands[i].shape, 10, isDark);
          pCtx.restore();
        }
      }
    }

    const totalQuota = demands ? demands.reduce((acc, d) => acc + d.quota, 0) : level.quota;
    this.updateQuota(0, totalQuota, demands);
    this.updateAvailableTools(level.availableTools || ['belt', 'extractor']);

    // Indicador de presupuesto de piezas
    const budgetPanel = document.getElementById('hud-budget-panel');
    const budgetDisplay = document.getElementById('hud-budget-display');
    if (level.maxPieces) {
      if (budgetPanel) budgetPanel.style.display = 'flex';
      const used = this.game.grid.getAllPieces().filter(p => !p.fixed).length;
      if (budgetDisplay) {
        budgetDisplay.textContent = `${used} / ${level.maxPieces}`;
        budgetDisplay.style.color = used > level.maxPieces ? '#E8A0A0' : '';
      }
    } else {
      if (budgetPanel) budgetPanel.style.display = 'none';
    }

    // Indicador de ritmo / tasa de entrega sostenida
    const ratePanel = document.getElementById('hud-rate-panel');
    const rateDisplay = document.getElementById('hud-rate-display');
    if (level.targetRate) {
      if (ratePanel) ratePanel.style.display = 'flex';
      if (rateDisplay) rateDisplay.textContent = `0.0 / ${level.targetRate}/s`;
    } else {
      if (ratePanel) ratePanel.style.display = 'none';
    }
  }

  updateQuota(delivered, quota, demands = null) {
    document.getElementById('quota-display').textContent = `${delivered} / ${quota}`;
    const pct = quota > 0 ? Math.min(100, (delivered / quota) * 100) : 100;
    document.getElementById('quota-progress-bar').style.width = `${pct}%`;
  }

  setLivesVisible(visible, lives = 5) {
    const panel = document.getElementById('lives-panel');
    if (!panel) return;
    panel.style.display = visible ? 'flex' : 'none';
    this.updateLives(lives, false);
  }

  updateLives(lives, isLost = false) {
    const container = document.getElementById('lives-hearts-container');
    if (!container) return;
    const hearts = container.querySelectorAll('.heart-icon');
    hearts.forEach((heart, idx) => {
      if (idx < lives) {
        heart.className = 'heart-icon active';
      } else {
        heart.className = 'heart-icon lost';
      }
    });
  }

  updateTimer(secondsLeft, isWarning = false) {
    const timerEl = document.getElementById('timer-display');
    if (secondsLeft === null || secondsLeft === undefined) {
      timerEl.textContent = 'Libre';
      timerEl.classList.remove('warning');
      return;
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = Math.floor(secondsLeft % 60);
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (isWarning) {
      timerEl.classList.add('warning');
    } else {
      timerEl.classList.remove('warning');
    }
  }

  updateAvailableTools(tools) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const tool = card.dataset.tool;
      const isDlcTool = (tool === 'factory_1x1' || tool === 'factory_2x2');
      if (isDlcTool) {
        if (!QuantumDLC.isEnabled && !tools.includes(tool)) {
          card.style.display = 'none';
          card.classList.add('disabled');
          return;
        } else {
          card.style.display = '';
        }
      }

      if (tool === 'erase' || tools.includes(tool) || (isDlcTool && QuantumDLC.isEnabled)) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    });

    const colorBar = document.getElementById('painter-color-bar');
    if (colorBar) {
      if (this.game.selectedTool === 'painter' && tools.includes('painter')) {
        colorBar.classList.add('visible');
      } else {
        colorBar.classList.remove('visible');
      }
    }

    const recipeBar = document.getElementById('factory-recipe-bar');
    if (recipeBar) {
      const isFactoryActive = (this.game.selectedTool === 'factory_1x1' || this.game.selectedTool === 'factory_2x2');
      const isFactoryAvailable = tools.includes('factory_1x1') || tools.includes('factory_2x2') || QuantumDLC.isEnabled;
      if (isFactoryActive && isFactoryAvailable) {
        recipeBar.classList.add('visible');
      } else {
        recipeBar.classList.remove('visible');
      }
    }
  }

  setActiveTool(tool) {
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      if (card.dataset.tool === tool) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const eraseFab = document.getElementById('btn-fab-erase');
    if (eraseFab) {
      if (tool === 'erase') {
        eraseFab.classList.add('active');
      } else {
        eraseFab.classList.remove('active');
      }
    }

    const colorBar = document.getElementById('painter-color-bar');
    if (colorBar) {
      if (tool === 'painter') {
        colorBar.classList.add('visible');
      } else {
        colorBar.classList.remove('visible');
      }
    }

    const recipeBar = document.getElementById('factory-recipe-bar');
    if (recipeBar) {
      if (tool === 'factory_1x1' || tool === 'factory_2x2') {
        recipeBar.classList.add('visible');
        this.syncFactoryRecipeChips(this.game.defaultFactoryRecipe || 'combine_shapes');
      } else {
        recipeBar.classList.remove('visible');
      }
    }
  }

  setPlayPauseIcon(isPaused) {
    document.getElementById('icon-pause').style.display = isPaused ? 'none' : 'block';
    document.getElementById('icon-play').style.display = isPaused ? 'block' : 'none';
  }

  setSpeedText(speedMult) {
    document.getElementById('btn-speed').textContent = `${speedMult}x`;
  }

  setThemeIcons(isDark) {
    document.getElementById('icon-moon').style.display = isDark ? 'none' : 'block';
    document.getElementById('icon-sun').style.display = isDark ? 'block' : 'none';
    document.getElementById('setting-darkmode').checked = isDark;
  }

  setSoundIcons(enabled) {
    document.getElementById('icon-sound-on').style.display = enabled ? 'block' : 'none';
    document.getElementById('icon-sound-off').style.display = enabled ? 'none' : 'block';
  }

  toggleVictoryModal(show, data = {}) {
    const modal = document.getElementById('victory-modal');
    if (!modal) return;

    if (show) {
      document.getElementById('victory-time').textContent = data.time || '00:00';
      document.getElementById('victory-best').textContent = data.best || '00:00';
      const precEl = document.getElementById('victory-precision');
      if (precEl) precEl.textContent = data.precision || '100%';
      const delEl = document.getElementById('victory-delivered');
      if (delEl) delEl.textContent = data.delivered || '--';

      const starsEarned = data.starsEarned || 1;
      const starsConfig = data.starsConfig || { gold: 30, silver: 60, bronze: 120 };

      // Resetear estrellas
      const star1 = document.getElementById('victory-star-1');
      const star2 = document.getElementById('victory-star-2');
      const star3 = document.getElementById('victory-star-3');
      [star1, star2, star3].forEach(s => s && s.classList.remove('popped'));

      // Indicadores de tiempo objetivo
      const bGold = document.getElementById('bench-gold');
      const bSilver = document.getElementById('bench-silver');
      const bBronze = document.getElementById('bench-bronze');
      if (bGold) {
        bGold.textContent = `🥇 Oro ≤ ${starsConfig.gold}s`;
        bGold.className = `benchmark-pill ${starsEarned >= 3 ? 'active' : ''}`;
      }
      if (bSilver) {
        bSilver.textContent = `🥈 Plata ≤ ${starsConfig.silver}s`;
        bSilver.className = `benchmark-pill ${starsEarned === 2 ? 'active' : ''}`;
      }
      if (bBronze) {
        bBronze.textContent = `🥉 Bronce ≤ ${starsConfig.bronze}s`;
        bBronze.className = `benchmark-pill ${starsEarned === 1 ? 'active' : ''}`;
      }

      // Mensaje de feedback de tiempo
      const msgEl = document.getElementById('victory-message');
      if (msgEl) {
        if (starsEarned === 3) {
          msgEl.textContent = "⭐ ¡Tiempo oro conseguido! Máxima calificación de eficiencia.";
        } else if (starsEarned === 2) {
          const diff = (data.timeElapsed - starsConfig.gold).toFixed(1);
          msgEl.textContent = `🥈 ¡Tiempo plata! A solo ${diff}s del objetivo oro (≤${starsConfig.gold}s).`;
        } else {
          const diff = (data.timeElapsed - starsConfig.silver).toFixed(1);
          msgEl.textContent = `🥉 ¡Nivel completado! A ${diff}s del objetivo plata (≤${starsConfig.silver}s).`;
        }
      }

      modal.classList.add('active');

      // Animación de pop secuencial con sonido por cada estrella
      for (let i = 0; i < starsEarned; i++) {
        const sEl = [star1, star2, star3][i];
        setTimeout(() => {
          if (sEl) sEl.classList.add('popped');
          this.game.audio.playStarPop(i);
        }, 260 + i * 320);
      }
    } else {
      modal.classList.remove('active');
    }
  }

  toggleLevelsModal(show) {
    const modal = document.getElementById('levels-modal');
    if (!modal) return;
    if (show) {
      this.populateLevelsGrid();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  toggleSettingsModal(show) {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (show) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  toggleCreditsModal(show) {
    const modal = document.getElementById('credits-modal');
    if (!modal) return;
    if (show) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  toggleHackerModal(show) {
    const modal = document.getElementById('hacker-modal');
    if (!modal) return;
    if (show) {
      this.populateHackerGrid();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  openMachineSidebar(piece = null) {
    const sidebar = document.getElementById('machine-config-sidebar');
    if (!sidebar) return;

    // Si es una pieza 2x2 esclava, encontrar la raíz
    let target = piece;
    if (piece && piece.type === 'factory_2x2_part') {
      target = QuantumDLC.getRootPiece(this.game.grid, piece.x, piece.y);
    }

    const is2x2 = target ? target.type === 'factory_2x2' : this.game.selectedTool === 'factory_2x2';
    const currentRecipeId = target ? (target.recipeId || (is2x2 ? 'quantum_sugar_cube' : this.game.defaultFactoryRecipe || 'combine_shapes')) : (this.game.defaultFactoryRecipe || 'combine_shapes');

    const iconEl = document.getElementById('sidebar-icon');
    const titleEl = document.getElementById('sidebar-title');
    const subtitleEl = document.getElementById('sidebar-subtitle');
    const bodyEl = document.getElementById('sidebar-content');
    const presetBtn = document.getElementById('btn-sidebar-set-preset');

    if (iconEl) iconEl.textContent = is2x2 ? '⚛️' : '⚙️';
    if (titleEl) titleEl.textContent = is2x2 ? 'Mega Ensambladora (2x2)' : 'Fabricador (1x1)';
    if (subtitleEl) {
      subtitleEl.textContent = target ? `Casilla (${target.x}, ${target.y})` : 'Configuración de Nuevas Máquinas';
    }

    if (presetBtn) {
      presetBtn.style.display = 'block';
      presetBtn.textContent = '⭐ Aplicar como Preset por Defecto';
      presetBtn.onclick = () => {
        this.game.defaultFactoryRecipe = target ? target.recipeId : currentRecipeId;
        this.syncFactoryRecipeChips(this.game.defaultFactoryRecipe);
        this.showToast(`Preset establecido a "${this.game.defaultFactoryRecipe.replace(/_/g, ' ')}"`, 1800);
      };
    }

    const available = QuantumDLC.getAvailableRecipes(is2x2 ? 'factory_2x2' : 'factory_1x1');

    let html = `
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        Selecciona la receta de producción. Los ingredientes incompatibles se purgarán automáticamente:
      </div>
      <div class="sidebar-recipe-list" style="display: flex; flex-direction: column; gap: 8px;">
    `;

    for (const recipe of available) {
      const isSelected = currentRecipeId === recipe.id;
      const outDef = DLC_ITEMS[recipe.output] || {};
      const inputsText = Object.entries(recipe.inputs).map(([itemId, count]) => {
        const itemDef = DLC_ITEMS[itemId] || {};
        return `${count}x ${itemDef.icon || ''} ${itemDef.name || itemId}`;
      }).join(' + ');

      html += `
        <div class="sidebar-recipe-card ${isSelected ? 'active' : ''}" data-recipe="${recipe.id}" style="
          padding: 10px 12px;
          border-radius: 8px;
          border: 1.5px solid ${isSelected ? 'var(--pastel-mint, #A8D5BA)' : 'var(--border-color, #E5E9F0)'};
          background: ${isSelected ? 'rgba(168, 213, 186, 0.15)' : 'var(--surface-color, #FFFFFF)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
        ">
          <div style="font-size: 24px; min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-color, #F4F6F9); border-radius: 6px;">
            ${outDef.icon || '🔷'}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 13px; color: var(--text-bright);">${recipe.name}</strong>
              <span class="mono" style="font-size: 11px; color: var(--text-muted);">⏱️ ${recipe.time}s</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${inputsText}
            </div>
          </div>
          <div style="font-size: 16px; color: ${isSelected ? 'var(--pastel-mint, #A8D5BA)' : 'transparent'};">
            ✓
          </div>
        </div>
      `;
    }
    html += '</div>';

    if (bodyEl) {
      bodyEl.innerHTML = html;
      const cards = bodyEl.querySelectorAll('.sidebar-recipe-card');
      cards.forEach(c => {
        c.addEventListener('click', () => {
          const recipeId = c.dataset.recipe;
          if (target) {
            QuantumDLC.setRecipe(this.game, target, recipeId);
          }
          this.game.defaultFactoryRecipe = recipeId;
          this.syncFactoryRecipeChips(recipeId);
          this.game.audio?.playRotate?.();
          this.openMachineSidebar(target);
        });
      });
    }

    sidebar.classList.add('open', 'visible');
    sidebar.setAttribute('aria-hidden', 'false');
  }

  openPainterSidebar(piece = null) {
    const sidebar = document.getElementById('machine-config-sidebar');
    if (!sidebar) return;

    const currentColor = piece ? (piece.color || 'lavender') : (this.game.painterColor || 'lavender');

    const iconEl = document.getElementById('sidebar-icon');
    const titleEl = document.getElementById('sidebar-title');
    const subtitleEl = document.getElementById('sidebar-subtitle');
    const bodyEl = document.getElementById('sidebar-content');
    const presetBtn = document.getElementById('btn-sidebar-set-preset');

    if (iconEl) iconEl.textContent = '🎨';
    if (titleEl) titleEl.textContent = 'Pintor';
    if (subtitleEl) {
      subtitleEl.textContent = piece ? `Casilla (${piece.x}, ${piece.y})` : 'Color para Nuevos Pintores';
    }

    if (presetBtn) {
      presetBtn.style.display = 'block';
      presetBtn.textContent = '⭐ Guardar como Color por Defecto';
      presetBtn.onclick = () => {
        this.game.painterColor = piece ? piece.color : currentColor;
        this.syncPainterColorSwatches(this.game.painterColor);
        this.showToast(`Color por defecto: ${this.game.painterColor}`, 1800);
      };
    }

    const colors = [
      { id: 'lavender', name: 'Lavanda', hex: '#C9B6E4' },
      { id: 'mint', name: 'Menta', hex: '#A8D5BA' },
      { id: 'coral', name: 'Coral', hex: '#E8A0A0' },
      { id: 'azure', name: 'Celeste', hex: '#A9CCE3' },
      { id: 'lemon', name: 'Limón', hex: '#F9E79F' }
    ];

    let html = `
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        Selecciona el color de pigmento con el que este pintor teñirá las piezas:
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
    `;

    for (const c of colors) {
      const isSelected = currentColor === c.id;
      html += `
        <div class="sidebar-color-card ${isSelected ? 'active' : ''}" data-color="${c.id}" style="
          padding: 12px;
          border-radius: 8px;
          border: 2px solid ${isSelected ? c.hex : 'var(--border-color, #E5E9F0)'};
          background: ${isSelected ? `${c.hex}22` : 'var(--surface-color, #FFFFFF)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
        ">
          <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c.hex}; border: 1.5px solid rgba(0,0,0,0.15);"></div>
          <span style="font-size: 13px; font-weight: 600; color: var(--text-bright); flex: 1;">${c.name}</span>
          ${isSelected ? `<span style="color: ${c.hex}; font-weight: bold;">✓</span>` : ''}
        </div>
      `;
    }
    html += '</div>';

    if (bodyEl) {
      bodyEl.innerHTML = html;
      const cards = bodyEl.querySelectorAll('.sidebar-color-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const color = card.dataset.color;
          if (piece) {
            piece.color = color;
          }
          this.game.painterColor = color;
          this.syncPainterColorSwatches(color);
          this.game.audio?.playTone?.(620, 'sine', 0.08, 0.03);
          this.openPainterSidebar(piece);
        });
      });
    }

    sidebar.classList.add('open', 'visible');
    sidebar.setAttribute('aria-hidden', 'false');
  }

  closeMachineSidebar() {
    const sidebar = document.getElementById('machine-config-sidebar');
    if (sidebar) {
      sidebar.classList.remove('open', 'visible');
      sidebar.setAttribute('aria-hidden', 'true');
    }
  }

  isSidebarOpen() {
    const sidebar = document.getElementById('machine-config-sidebar');
    return sidebar ? (sidebar.classList.contains('open') || sidebar.classList.contains('visible')) : false;
  }

  syncFactoryRecipeChips(recipeId) {
    const chips = document.querySelectorAll('.recipe-chip[data-recipe]');
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.recipe === recipeId);
    });
  }

  syncPainterColorSwatches(color) {
    const swatches = document.querySelectorAll('.color-swatch[data-color]');
    swatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === color);
    });
  }

  populateHackerGrid() {
    const grid = document.getElementById('hacker-levels-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= 60; i++) {
      const btn = document.createElement('button');
      btn.className = `hacker-level-btn mono ${this.game.saveData.nivelActual === i ? 'current' : ''}`;
      btn.textContent = i;
      btn.title = `Saltar al Nivel ${i}`;
      btn.addEventListener('click', () => {
        this.game.loadLevel(i);
        this.toggleHackerModal(false);
        if (this.game.state === 'menu') {
          this.game.startGameFromMenu();
        }
        this.showToast(`🚀 Salto Hacker al Nivel ${i}`, 1800);
      });
      grid.appendChild(btn);
    }
  }

  populateLevelsGrid() {
    const container = document.getElementById('levels-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const save = this.game.saveData;
    const maxUnlocked = Math.max(1, ...(save.nivelesCompletados || [0])) + 1;
    const isChapter2Unlocked = (save.nivelesCompletados && save.nivelesCompletados.includes(20)) || maxUnlocked > 20 || save.nivelActual > 20;
    const isChapter3Unlocked = (save.nivelesCompletados && save.nivelesCompletados.includes(40)) || maxUnlocked > 40 || save.nivelActual > 40;
    const isChapter4Unlocked = QuantumDLC.isEnabled || (save.nivelesCompletados && save.nivelesCompletados.includes(60)) || maxUnlocked > 60 || save.nivelActual > 60;

    const tab1 = document.getElementById('tab-chapter-1');
    const tab2 = document.getElementById('tab-chapter-2');
    const tab3 = document.getElementById('tab-chapter-3');
    const tab4 = document.getElementById('tab-chapter-4');
    if (tab1) tab1.className = `level-tab-btn ${this.activeChapter === 1 ? 'active' : ''}`;
    if (tab2) {
      tab2.className = `level-tab-btn ${this.activeChapter === 2 ? 'active' : ''} ${!isChapter2Unlocked ? 'locked-tab' : ''}`;
      tab2.title = isChapter2Unlocked ? "Capítulo 2: Maestría (21–40)" : "Completa el nivel 20 para desbloquear el Capítulo 2";
    }
    if (tab3) {
      tab3.className = `level-tab-btn ${this.activeChapter === 3 ? 'active' : ''} ${!isChapter3Unlocked ? 'locked-tab' : ''}`;
      tab3.title = isChapter3Unlocked ? "Capítulo 3: Vanguardia (41–60)" : "Completa el nivel 40 para desbloquear el Capítulo 3";
    }
    if (tab4) {
      tab4.className = `level-tab-btn ${this.activeChapter === 4 ? 'active' : ''} ${!isChapter4Unlocked ? 'locked-tab' : ''}`;
      tab4.title = isChapter4Unlocked ? "Capítulo 4: DLC Cuántico (61–64)" : "Activa el DLC para jugar la Expansión Cuántica";
    }

    let startLevel = 1;
    let endLevel = 20;
    if (this.activeChapter === 2) {
      startLevel = 21;
      endLevel = 40;
    } else if (this.activeChapter === 3) {
      startLevel = 41;
      endLevel = 60;
    } else if (this.activeChapter === 4) {
      startLevel = 61;
      endLevel = 64;
    }

    const filteredLevels = LEVELS.filter(l => l.id >= startLevel && l.id <= endLevel);

    filteredLevels.forEach(lvl => {
      const isCompleted = save.nivelesCompletados.includes(lvl.id);
      const isCurrent = save.nivelActual === lvl.id;
      const chapterUnlocked = lvl.id <= 20 || 
        (lvl.id <= 40 ? isChapter2Unlocked : 
        (lvl.id <= 60 ? isChapter3Unlocked : isChapter4Unlocked));
      const isUnlocked = ((lvl.id <= maxUnlocked || lvl.id <= save.nivelActual) || (lvl.id === 61 && isChapter4Unlocked)) && chapterUnlocked;

      const btn = document.createElement('button');
      btn.className = `level-card-btn ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
      
      const bestTimeSecs = save.mejoresTiempos[lvl.id];
      const timeStr = bestTimeSecs ? `${bestTimeSecs.toFixed(1)}s` : (isUnlocked ? '--' : '🔒');

      const stars = (save.estrellas && save.estrellas[lvl.id]) || 0;
      let starsHtml = '';
      if (isUnlocked) {
        starsHtml = `<div class="level-stars-mini">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
      }

      btn.innerHTML = `
        <span class="level-card-num">${lvl.id}</span>
        <span class="level-card-time">${timeStr}</span>
        ${starsHtml}
      `;

      if (isUnlocked) {
        btn.addEventListener('click', () => {
          this.toggleLevelsModal(false);
          this.game.loadLevel(lvl.id);
          if (this.game.state === 'menu') {
            this.game.startGameFromMenu();
          }
        });
      } else {
        btn.addEventListener('click', () => {
          if (lvl.id > 60 && !isChapter4Unlocked) {
            this.showToast("🔒 Activa la Expansión DLC para desbloquear este nivel", 2000);
          } else if (lvl.id > 40 && !isChapter3Unlocked) {
            this.showToast("🔒 Completa el nivel 40 para desbloquear el Capítulo 3: Vanguardia", 2000);
          } else if (lvl.id > 20 && !isChapter2Unlocked) {
            this.showToast("🔒 Completa el nivel 20 para desbloquear el Capítulo 2", 2000);
          } else {
            this.showToast(`Completa el nivel ${lvl.id - 1} para desbloquear este nivel`, 1800);
          }
        });
      }

      container.appendChild(btn);
    });
  }

  updateMenuStats() {
    if (!this.game || !this.game.saveData) return;

    const save = this.game.saveData;
    const completedCount = (save.nivelesCompletados || []).length;
    let totalStars = 0;
    if (save.estrellas) {
      Object.values(save.estrellas).forEach(s => totalStars += (s || 0));
    }

    const coins = save.coins !== undefined ? save.coins : (save.monedas || 0);

    const starsEl = document.getElementById('menu-total-stars');
    if (starsEl) starsEl.textContent = `⭐ ${totalStars}/192`;

    const levelsEl = document.getElementById('menu-total-levels');
    if (levelsEl) levelsEl.textContent = `🏆 ${completedCount}/64`;

    const coinsEl = document.getElementById('menu-coins');
    if (coinsEl) coinsEl.textContent = `🪙 ${coins}`;

    const continueBtn = document.getElementById('menu-btn-continue');
    const continueLabel = document.getElementById('menu-continue-label');
    if (continueBtn) {
      if (completedCount > 0) {
        continueBtn.style.display = 'flex';
        if (continueLabel) continueLabel.textContent = `Continuar (Nivel ${save.nivelActual || 1})`;
      } else {
        continueBtn.style.display = 'none';
      }
    }
  }

  toggleAchievementsModal(show) {
    const modal = document.getElementById('achievements-modal');
    if (!modal) return;
    if (show) {
      this.populateAchievementsModal();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  populateAchievementsModal() {
    const container = document.getElementById('achievements-grid-container');
    const countEl = document.getElementById('achievements-count');
    const coinsEl = document.getElementById('achievements-coins');
    if (!container) return;
    container.innerHTML = '';

    const unlocked = this.game.saveData.achievements || [];
    if (countEl) countEl.textContent = `${unlocked.length} / ${ACHIEVEMENTS.length}`;
    if (coinsEl) coinsEl.textContent = `${this.game.saveData.coins || 0} 🪙`;

    ACHIEVEMENTS.forEach(ach => {
      const isDone = unlocked.includes(ach.id);
      const card = document.createElement('div');
      card.className = `achievement-item ${isDone ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-info">
          <div class="achievement-title">${ach.name} ${isDone ? '✅' : '🔒'}</div>
          <div class="achievement-desc">${ach.desc}</div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  toggleShopModal(show) {
    const modal = document.getElementById('shop-modal');
    if (!modal) return;
    if (show) {
      this.populateShopModal();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  populateShopModal() {
    const container = document.getElementById('shop-grid-container');
    const coinsEl = document.getElementById('shop-coins-val');
    if (!container) return;
    container.innerHTML = '';

    const coins = this.game.saveData.coins || 0;
    if (coinsEl) coinsEl.textContent = `🪙 ${coins}`;

    const unlocked = this.game.saveData.unlockedCosmetics || ['default'];
    const currentSkin = this.game.saveData.cosmetics?.beltSkin || 'default';

    COSMETIC_SKINS.forEach(skin => {
      const isEquipped = currentSkin === skin.id;
      const isUnlocked = unlocked.includes(skin.id);

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;
      
      let btnHtml = '';
      if (isEquipped) {
        btnHtml = `<button class="shop-btn equipped-btn" disabled>Equipado ✓</button>`;
      } else if (isUnlocked) {
        btnHtml = `<button class="shop-btn equip-action-btn" data-skin="${skin.id}">Equipar</button>`;
      } else {
        const canAfford = coins >= skin.cost;
        btnHtml = `<button class="shop-btn buy-action-btn ${canAfford ? '' : 'disabled'}" data-skin="${skin.id}">${canAfford ? 'Comprar 🪙 ' + skin.cost : 'Faltan 🪙 ' + (skin.cost - coins)}</button>`;
      }

      card.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-name">${skin.name}</span>
          <span class="shop-item-cost mono">${skin.cost > 0 ? '🪙 ' + skin.cost : 'Gratis'}</span>
        </div>
        <p class="shop-item-desc">${skin.desc}</p>
        ${btnHtml}
      `;

      card.querySelector('.equip-action-btn')?.addEventListener('click', () => {
        this.game.equipSkin(skin.id);
        this.populateShopModal();
      });

      card.querySelector('.buy-action-btn')?.addEventListener('click', () => {
        if (coins >= skin.cost) {
          this.game.buySkin(skin.id);
          this.populateShopModal();
        } else {
          this.showToast(`Necesitas ${skin.cost} monedas para este aspecto`, 2000);
        }
      });

      container.appendChild(card);
    });
  }

  toggleEditorModal(show) {
    const modal = document.getElementById('editor-modal');
    if (!modal) return;
    if (show) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  exportLevelToEditor() {
    const box = document.getElementById('editor-code-box');
    if (!box) return;
    const exportObj = {
      version: '3.0',
      id: this.game.currentLevel?.id || 1,
      name: this.game.currentLevel?.name || 'Fábrica Personalizada',
      pieces: this.game.grid.exportUserPieces(),
      demands: this.game.currentDemands
    };
    try {
      const json = JSON.stringify(exportObj);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      box.value = b64;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(b64).catch(() => {});
      }
      this.showToast("📤 Fábrica exportada a Base64 y copiada al portapapeles", 2500);
    } catch (e) {
      this.showToast("⚠️ Error al exportar la fábrica", 2000);
    }
  }

  importLevelFromEditor() {
    const box = document.getElementById('editor-code-box');
    if (!box) return;
    const code = box.value.trim();
    if (!code) {
      this.showToast("⚠️ Pega un código Base64 en el área de texto", 2000);
      return;
    }
    try {
      const json = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(json);
      if (data && data.pieces) {
        this.game.grid.clearNonFixed();
        this.game.grid.importUserPieces(data.pieces);
        this.game.sim.reset();
        this.game.updateGhost();
        this.game.updateBudgetHUD();
        this.toggleEditorModal(false);
        this.showToast(`📥 Fábrica "${data.name || 'Personalizada'}" cargada con éxito`, 2500);
      } else {
        this.showToast("⚠️ Formato de código no válido", 2200);
      }
    } catch (e) {
      this.showToast("⚠️ Código Base64 inválido o corrupto", 2200);
    }
  }

  updateZenToggleUI(gameMode) {
    const btn = document.getElementById('btn-zen-toggle');
    const icon = document.getElementById('zen-toggle-icon');
    const label = document.getElementById('zen-toggle-label');
    if (!btn) return;
    const isRelaxed = gameMode === 'relaxed';
    btn.className = `mode-toggle-btn ${isRelaxed ? 'zen' : 'challenge'}`;
    if (icon) icon.textContent = isRelaxed ? '🍃' : '⚡';
    if (label) label.textContent = isRelaxed ? 'Zen' : 'Desafío';
  }

  updateUndoRedoUI(canUndo, canRedo) {
    const uBtn = document.getElementById('btn-undo');
    const rBtn = document.getElementById('btn-redo');
    if (uBtn) {
      uBtn.style.opacity = canUndo ? '1' : '0.45';
      uBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
    }
    if (rBtn) {
      rBtn.style.opacity = canRedo ? '1' : '0.45';
      rBtn.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast-msg');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  updateModeUI(mode) {
    const isEdit = mode === 'edit';

    const btn = document.getElementById('btn-mode-toggle');
    if (btn) {
      btn.className = `mode-toggle-btn ${isEdit ? 'edit' : 'view'}`;
      const icon = document.getElementById('mode-toggle-icon');
      if (icon) icon.textContent = isEdit ? '✏️' : '👁️';
      const label = document.getElementById('mode-toggle-label');
      if (label) label.textContent = isEdit ? 'Edición' : 'Vista';
    }

    const fab = document.getElementById('btn-fab-mode');
    if (fab) {
      fab.className = `fab mode-fab ${isEdit ? '' : 'active'}`;
      const fabIcon = document.getElementById('fab-mode-icon');
      if (fabIcon) fabIcon.textContent = isEdit ? '✏️' : '👁️';
      const fabLabel = document.getElementById('fab-mode-label');
      if (fabLabel) fabLabel.textContent = isEdit ? 'EDICIÓN' : 'VISTA';
    }

    const pill = document.getElementById('mode-indicator-pill');
    if (pill) {
      pill.className = `mode-indicator-pill ${isEdit ? 'edit' : 'view'}`;
      const pillText = document.getElementById('mode-pill-text');
      if (pillText) pillText.textContent = isEdit ? 'Modo Edición' : 'Modo Vista';
    }
  }
}

/* ==========================================================================
   10. JUEGO PRINCIPAL (BeltFlowGame)
   ========================================================================== */
export class BeltFlowGame {
  constructor() {
    this.saveData = SaveManager.load();
    this.audio = new AudioManager();
    this.grid = new Grid();
    this.currentLevel = null;
    this.deliveredCount = 0;
    this.timeElapsed = 0;

    // Estado de juego: 'playing' directamente para interactuar de inmediato
    this.state = 'playing';

    // Sistema de vidas, racha y estadísticas
    this.lives = 5;
    this.streak = 0;
    this.totalDelivered = 0;
    this.totalErrors = 0;
    this.currentDemands = null;
    this.totalQuota = 0;

    this.isPaused = false;
    this.speedMult = 1.0;
    this.selectedTool = 'belt';
    this.placementDir = DIR.RIGHT;
    this.painterColor = PASTEL_COLORS.MINT;
    this.defaultFactoryRecipe = 'combine_shapes';
    this.mode = 'edit'; // 'edit' (Edición) o 'view' (Vista)

    // Pilas de Deshacer / Rehacer y Modo Zen
    this.undoStack = [];
    this.redoStack = [];
    this.gameMode = this.saveData.gameMode || 'relaxed';
    this.ambientTimer = 0;

    // Circuito procedural relajante de fondo para el Menú
    this.initDemoScene();

    const canvas = document.getElementById('game-canvas');
    this.sim = new Simulation(this.grid, (shape, deliveryPiece) => this.onShapeDelivered(shape, deliveryPiece));
    this.renderer = new Renderer(canvas, this.grid, this.sim);
    this.renderer.game = this;
    this.input = new InputManager(canvas, this);
    this.ui = new UIManager(this);

    this.applyLoadedConfig();
    this.ui.updateModeUI(this.mode);
    this.ui.updateZenToggleUI(this.gameMode);
    this.ui.updateUndoRedoUI(false, false);
    this.updateCanvasCursor();
    this.loadLevel(this.saveData.nivelActual || 1);
    this.ui.updateMenuStats();

    // Auto-guardado cada 5 segundos
    setInterval(() => this.autoSave(), 5000);
    window.addEventListener('beforeunload', () => this.autoSave());

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initDemoScene() {
    this.demoGrid = new Grid();
    this.demoSim = new Simulation(this.demoGrid);

    // Mini-fábrica relajante en bucle:
    // Mina circular en (1, 2)
    this.demoGrid.setMine(1, 2, { x: 1, y: 2, shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT) });
    // Extractor sobre la mina
    this.demoGrid.set(1, 2, {
      x: 1, y: 2, type: 'extractor', dir: DIR.RIGHT,
      shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true
    });
    // Cintas hacia la derecha
    this.demoGrid.set(2, 2, { x: 2, y: 2, type: 'belt', dir: DIR.RIGHT, fixed: true });
    // Pintor lavanda
    this.demoGrid.set(3, 2, { x: 3, y: 2, type: 'painter', dir: DIR.RIGHT, color: PASTEL_COLORS.LAVENDER, fixed: true });
    this.demoGrid.set(4, 2, { x: 4, y: 2, type: 'belt', dir: DIR.RIGHT, fixed: true });
    // Cortadora
    this.demoGrid.set(5, 2, { x: 5, y: 2, type: 'cutter', dir: DIR.RIGHT, fixed: true });
    // Salida frontal hacia abajo
    this.demoGrid.set(6, 2, { x: 6, y: 2, type: 'belt', dir: DIR.DOWN, fixed: true });
    this.demoGrid.set(6, 3, { x: 6, y: 3, type: 'belt', dir: DIR.LEFT, fixed: true });
    // Salida derecha de la cortadora ya apunta a (5, 3)
    this.demoGrid.set(5, 3, { x: 5, y: 3, type: 'belt', dir: DIR.LEFT, fixed: true });
    // Mezcladora
    this.demoGrid.set(4, 3, { x: 4, y: 3, type: 'mixer', dir: DIR.LEFT, fixed: true });
    this.demoGrid.set(3, 3, { x: 3, y: 3, type: 'belt', dir: DIR.LEFT, fixed: true });
    // Almacén receptor
    this.demoGrid.set(2, 3, { x: 2, y: 3, type: 'delivery', dir: DIR.LEFT, fixed: true });
  }

  startGameFromMenu() {
    this.state = 'playing';
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('open', 'visible');
      menuScreen.classList.add('closing');
      setTimeout(() => {
        menuScreen.style.display = 'none';
        menuScreen.classList.remove('closing');
        this.centerCameraOnLevel();
      }, 150);
    } else {
      this.centerCameraOnLevel();
    }
  }

  openMainMenu() {
    this.state = 'menu';
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.style.display = 'flex';
      menuScreen.classList.remove('closing');
      menuScreen.classList.add('open', 'visible');
      this.ui.updateMenuStats();
    }
  }

  applyLoadedConfig() {
    const cfg = this.saveData.config;
    this.setTheme(cfg.modoOscuro);
    this.setReducedMotion(cfg.reducirMovimiento);
    this.audio.enabled = cfg.sonido !== false;
    this.ui.setSoundIcons(this.audio.enabled);

    const vol = cfg.volumen !== undefined ? cfg.volumen : 0.8;
    this.setVolume(vol);
    const slider = document.getElementById('setting-volume-slider');
    if (slider) slider.value = Math.round(vol * 100);
    const sliderVal = document.getElementById('setting-volume-val');
    if (sliderVal) sliderVal.textContent = `${Math.round(vol * 100)}%`;

    this.setPalettePreset(cfg.palettePreset || 'suave');

    if (cfg.tipoDispositivo) {
      const modeEl = document.getElementById('setting-controls-mode');
      if (modeEl) modeEl.value = cfg.tipoDispositivo;
      this.detectAndApplyDeviceMode(cfg.tipoDispositivo);
    }
  }

  setVolume(vol) {
    this.audio.setVolume(vol);
    this.saveData.config.volumen = vol;
  }

  setPalettePreset(preset) {
    const valid = ['suave', 'pastel-frio', 'pastel-calido', 'nordico', 'alto-contraste', 'sepia'];
    const p = valid.includes(preset) ? preset : 'suave';
    document.documentElement.setAttribute('data-palette', p);
    this.saveData.config.palettePreset = p;

    // Actualizar clase activa en las tarjetas de la interfaz
    const cards = document.querySelectorAll('.palette-card[data-preset]');
    cards.forEach(c => c.classList.toggle('active', c.dataset.preset === p));

    if (this.currentLevel) {
      this.ui.updateLevelInfo(this.currentLevel);
    }
    this.autoSave();
  }

  detectAndApplyDeviceMode(pref = 'auto') {
    let isTouch = false;
    if (pref === 'touch') {
      isTouch = true;
    } else if (pref === 'mouse') {
      isTouch = false;
    } else {
      isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }

    const fabs = document.querySelector('.floating-actions');
    if (fabs) {
      fabs.style.display = isTouch ? 'flex' : 'flex';
    }
  }

  loadLevel(levelId) {
    const lvl = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    this.currentLevel = lvl;
    this.deliveredCount = 0;
    this.timeElapsed = 0;
    this.streak = 0;
    this.lives = 5;
    this.totalDelivered = 0;
    this.totalErrors = 0;
    this.isPaused = false;
    this.sim.reset();
    this.grid.cells.clear();
    this.grid.mines.clear();

    // Normalizar demandas del nivel
    if (lvl.demands && Array.isArray(lvl.demands)) {
      this.currentDemands = lvl.demands.map(d => ({
        ...d,
        shape: Shapes.clone(d.shape),
        delivered: 0
      }));
      this.totalQuota = this.currentDemands.reduce((sum, d) => sum + d.quota, 0);
    } else {
      this.currentDemands = [{
        shape: Shapes.clone(lvl.targetShape),
        quota: lvl.quota,
        delivered: 0,
        deliveryIndex: 0
      }];
      this.totalQuota = lvl.quota;
    }

    // Registrar piezas fijas y depósitos de minas
    if (lvl.fixedGrid) {
      for (const item of lvl.fixedGrid) {
        if (item.type === 'mine') {
          this.grid.setMine(item.x, item.y, {
            x: item.x,
            y: item.y,
            shape: Shapes.clone(item.shape)
          });
        } else {
          this.grid.set(item.x, item.y, {
            x: item.x,
            y: item.y,
            type: item.type,
            dir: item.dir !== undefined ? item.dir : DIR.RIGHT,
            shape: item.shape ? Shapes.clone(item.shape) : null,
            color: item.color || null,
            secondary: item.secondary || false,
            deliveryIndex: item.deliveryIndex !== undefined ? item.deliveryIndex : (item.secondary ? 1 : 0),
            fixed: true
          });
        }
      }
    }

    // Asegurar que el extractor está disponible en los componentes
    if (!lvl.availableTools.includes('extractor')) {
      lvl.availableTools.push('extractor');
    }

    const savedBuildings = this.saveData.construcciones[lvl.id];
    if (savedBuildings) {
      this.grid.importUserPieces(savedBuildings);
    }

    this.undoStack = [];
    this.redoStack = [];
    this.ui.updateUndoRedoUI(false, false);

    this.saveData.nivelActual = lvl.id;
    this.ui.updateLevelInfo(lvl, this.currentDemands);
    const showLives = this.gameMode === 'challenge' && !!lvl.hasLives;
    this.ui.setLivesVisible(showLives, this.lives);
    this.updateBudgetHUD();

    if (!lvl.availableTools.includes(this.selectedTool) && this.selectedTool !== 'erase') {
      this.selectTool(lvl.availableTools[0] || 'belt');
    } else {
      this.ui.setActiveTool(this.selectedTool);
    }

    this.ui.setPlayPauseIcon(this.isPaused);
    this.ui.setSpeedText(this.speedMult);

    this.centerCameraOnLevel();
    this.updateGhost();
  }

  recordAction(action) {
    this.undoStack.push(action);
    if (this.undoStack.length > 60) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.ui.updateUndoRedoUI(this.undoStack.length > 0, this.redoStack.length > 0);
  }

  undo() {
    if (this.undoStack.length === 0) {
      this.ui.showToast("No hay acciones para deshacer", 1000);
      return;
    }
    const action = this.undoStack.pop();
    if (action.type === 'place') {
      if (action.prevPiece) {
        this.grid.set(action.x, action.y, { ...action.prevPiece });
      } else {
        this.grid.remove(action.x, action.y);
      }
    } else if (action.type === 'remove') {
      if (action.prevPiece) {
        this.grid.set(action.x, action.y, { ...action.prevPiece });
      }
    } else if (action.type === 'rotate') {
      const piece = this.grid.get(action.x, action.y);
      if (piece) piece.dir = action.prevDir;
    } else if (action.type === 'place_2x2') {
      QuantumDLC.removeFactory2x2(this.grid, action.x, action.y);
    } else if (action.type === 'place_cutter') {
      const rVec = DIR_DELTA[(action.dir + 1) % 4];
      this.grid.cells.delete(this.grid.key(action.x, action.y));
      this.grid.cells.delete(this.grid.key(action.x + rVec.x, action.y + rVec.y));
    } else if (action.type === 'clear') {
      if (action.pieces) {
        action.pieces.forEach(p => this.grid.set(p.x, p.y, { ...p }));
      }
    }
    this.redoStack.push(action);
    this.ui.updateUndoRedoUI(this.undoStack.length > 0, this.redoStack.length > 0);
    this.updateBudgetHUD();
    this.updateGhost();
    this.audio.playRotate();
    this.ui.showToast("↩️ Deshecho", 800);
  }

  redo() {
    if (this.redoStack.length === 0) {
      this.ui.showToast("No hay acciones para rehacer", 1000);
      return;
    }
    const action = this.redoStack.pop();
    if (action.type === 'place') {
      this.grid.set(action.x, action.y, { ...action.newPiece });
    } else if (action.type === 'place_2x2') {
      QuantumDLC.placeFactory2x2(this.grid, action.x, action.y, action.dir);
    } else if (action.type === 'place_cutter') {
      const rVec = DIR_DELTA[(action.dir + 1) % 4];
      this.grid.set(action.x, action.y, { x: action.x, y: action.y, type: 'cutter', dir: action.dir, rootX: action.x, rootY: action.y, fixed: false });
      this.grid.set(action.x + rVec.x, action.y + rVec.y, { x: action.x + rVec.x, y: action.y + rVec.y, type: 'cutter_part', dir: action.dir, rootX: action.x, rootY: action.y, fixed: false });
    } else if (action.type === 'remove') {
      this.grid.remove(action.x, action.y);
    } else if (action.type === 'rotate') {
      const piece = this.grid.get(action.x, action.y);
      if (piece) piece.dir = action.newDir;
    } else if (action.type === 'clear') {
      this.grid.clearNonFixed();
    }
    this.undoStack.push(action);
    this.ui.updateUndoRedoUI(this.undoStack.length > 0, this.redoStack.length > 0);
    this.updateBudgetHUD();
    this.updateGhost();
    this.audio.playRotate();
    this.ui.showToast("↪️ Rehecho", 800);
  }

  updateBudgetHUD() {
    if (!this.currentLevel || !this.currentLevel.maxPieces) return;
    const used = this.grid.getAllPieces().filter(p => !p.fixed).length;
    const el = document.getElementById('hud-budget-display');
    if (el) {
      el.textContent = `${used} / ${this.currentLevel.maxPieces}`;
      el.style.color = used > this.currentLevel.maxPieces ? '#E8A0A0' : '';
    }
  }

  toggleZenMode() {
    this.gameMode = this.gameMode === 'relaxed' ? 'challenge' : 'relaxed';
    this.saveData.gameMode = this.gameMode;
    this.ui.updateZenToggleUI(this.gameMode);
    const hasLives = this.gameMode === 'challenge' && !!this.currentLevel?.hasLives;
    this.ui.setLivesVisible(hasLives, this.lives);
    this.autoSave();
    if (this.gameMode === 'relaxed') {
      this.ui.showToast("🍃 Modo Zen: Disfruta sin límite de tiempo ni pérdida de vidas", 2200);
    } else {
      this.ui.showToast("⚡ Modo Desafío: Cronómetro y vidas activados", 2200);
    }
  }

  restartLevelMap() {
    const userPieces = this.grid.getAllPieces().filter(p => !p.fixed);
    if (userPieces.length > 5) {
      if (!confirm("¿Deseas reiniciar la construcción de este nivel? Se borrarán las piezas que has colocado.")) {
        return;
      }
    }

    this.recordAction({
      type: 'clear',
      pieces: userPieces.map(p => ({ ...p }))
    });

    this.grid.clearNonFixed();
    this.sim.reset();
    this.deliveredCount = 0;
    if (this.currentDemands) {
      this.currentDemands.forEach(d => d.delivered = 0);
    }
    this.timeElapsed = 0;
    this.streak = 0;
    this.lives = 5;
    this.totalDelivered = 0;
    this.totalErrors = 0;

    this.ui.updateQuota(0, this.totalQuota, this.currentDemands);
    this.ui.updateLives(this.lives, false);
    this.updateBudgetHUD();
    this.ui.showToast("Construcción del nivel reiniciada", 1500);
    this.autoSave();
    this.updateGhost();
  }

  centerCameraOnLevel() {
    if (!this.currentLevel || !this.currentLevel.fixedGrid) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of this.currentLevel.fixedGrid) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.renderer.centerOn(midX, midY);
  }

  selectTool(tool) {
    this.selectedTool = tool;
    this.ui.setActiveTool(tool);
    this.updateGhost();
    this.audio.playTone(400, 'sine', 0.04, 0.02);
  }

  rotatePlacement() {
    if (this.renderer.ghost) {
      const existing = this.grid.get(this.renderer.ghost.x, this.renderer.ghost.y);
      if (existing && !existing.fixed) {
        const oldDir = existing.dir;
        existing.dir = (existing.dir + 1) % 4;
        this.placementDir = existing.dir;
        this.recordAction({
          type: 'rotate',
          x: existing.x,
          y: existing.y,
          prevDir: oldDir,
          newDir: existing.dir
        });
        this.audio.playRotate();
        this.updateGhost();
        return;
      }
    }

    this.placementDir = (this.placementDir + 1) % 4;
    this.audio.playRotate();
    this.updateGhost();
  }

  updateGhost(gridX, gridY) {
    if (gridX === undefined || gridY === undefined) {
      if (!this.renderer.ghost) return;
      gridX = this.renderer.ghost.x;
      gridY = this.renderer.ghost.y;
    }

    const existing = this.grid.get(gridX, gridY);
    let valid = !existing || !existing.fixed;
    let ghostShape = null;

    if (this.selectedTool === 'extractor') {
      const mine = this.grid.getMine(gridX, gridY);
      valid = !!mine && (!existing || !existing.fixed);
      ghostShape = mine ? Shapes.clone(mine.shape) : null;
    }

    if (this.selectedTool === 'cutter') {
      const rVec = DIR_DELTA[(this.placementDir + 1) % 4];
      const secX = gridX + rVec.x;
      const secY = gridY + rVec.y;
      const inBounds = this.grid.inBounds(gridX, gridY) && this.grid.inBounds(secX, secY);
      const secExisting = this.grid.get(secX, secY);
      const rootOk = !existing || (!existing.fixed && existing.type !== 'obstacle' && existing.type !== 'rock' && existing.type !== 'water');
      const secOk = !secExisting || (!secExisting.fixed && secExisting.type !== 'obstacle' && secExisting.type !== 'rock' && secExisting.type !== 'water');
      valid = inBounds && rootOk && secOk;
    }

    if (this.selectedTool === 'factory_2x2') {
      valid = QuantumDLC.canPlaceFactory2x2(this.grid, gridX, gridY);
    }

    // Anticipar y alinear la dirección de la cinta automáticamente
    if (this.selectedTool === 'belt' && !existing && (!this.input || !this.input.isPointerDown)) {
      let detectedDir = null;

      // 1. Prioridad: un vecino que ya apunte directamente hacia esta casilla
      for (let d = 0; d < 4; d++) {
        const backDelta = DIR_DELTA[OPPOSITE_DIR[d]];
        const neighbor = this.grid.get(gridX + backDelta.x, gridY + backDelta.y);
        if (neighbor && neighbor.type !== 'obstacle' && neighbor.dir === d) {
          detectedDir = d;
          break;
        }
      }

      // 2. Si no, comprobar si hay una cinta vecina abierta que pueda curvarse hacia aquí
      if (detectedDir === null) {
        for (let d = 0; d < 4; d++) {
          const neighborDelta = DIR_DELTA[OPPOSITE_DIR[d]];
          const neighbor = this.grid.get(gridX + neighborDelta.x, gridY + neighborDelta.y);
          if (neighbor && neighbor.type === 'belt' && !neighbor.fixed) {
            const frontDelta = DIR_DELTA[neighbor.dir];
            const frontPiece = this.grid.get(neighbor.x + frontDelta.x, neighbor.y + frontDelta.y);
            if (!frontPiece && d !== OPPOSITE_DIR[neighbor.dir]) {
              detectedDir = d;
              break;
            }
          }
        }
      }

      // 3. Si no, comprobar si esta casilla apunta a una salida (delivery) o trituradora cercana
      if (detectedDir === null) {
        for (let d = 0; d < 4; d++) {
          const forwardDelta = DIR_DELTA[d];
          const neighbor = this.grid.get(gridX + forwardDelta.x, gridY + forwardDelta.y);
          if (neighbor && (neighbor.type === 'delivery' || neighbor.type === 'trash')) {
            detectedDir = d;
            break;
          }
        }
      }

      if (detectedDir !== null) {
        this.placementDir = detectedDir;
      }
    }

    this.renderer.ghost = {
      x: gridX,
      y: gridY,
      type: this.selectedTool,
      dir: this.placementDir,
      color: this.painterColor,
      shape: ghostShape,
      valid: valid
    };
  }

  handleBeltPlacement(x, y) {
    if (this.mode === 'view') return;

    const existing = this.grid.get(x, y);
    if (existing && existing.fixed) return;

    // Si ya existe una cinta en esta celda
    if (existing && existing.type === 'belt') {
      if (existing.dir !== this.placementDir) {
        existing.dir = this.placementDir;
      } else {
        existing.dir = (existing.dir + 1) % 4;
        this.placementDir = existing.dir;
      }
      this.renderer.addPlacementEffect(x, y, 'belt');
      this.audio.playChainPlaf();
      this.updateGhost(x, y);
      return;
    }

    // Comprobar si hay una cinta vecina abierta que deba curvarse hacia aquí
    for (let d = 0; d < 4; d++) {
      const neighborDelta = DIR_DELTA[OPPOSITE_DIR[d]];
      const nx = x + neighborDelta.x;
      const ny = y + neighborDelta.y;
      const neighbor = this.grid.get(nx, ny);

      if (neighbor && neighbor.type === 'belt' && !neighbor.fixed) {
        const frontDelta = DIR_DELTA[neighbor.dir];
        const frontPiece = this.grid.get(neighbor.x + frontDelta.x, neighbor.y + frontDelta.y);
        if (!frontPiece && d !== OPPOSITE_DIR[neighbor.dir]) {
          neighbor.dir = d;
          this.placementDir = d;
          break;
        }
      }
    }

    this.placePieceAt(x, y);
  }

  dragDrawBelt(fromX, fromY, toX, toY) {
    if (this.mode !== 'edit' || this.selectedTool !== 'belt') return;

    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 0 && dy === 0) return;

    const steps = [];
    let cx = fromX;
    let cy = fromY;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const stepX = Math.sign(dx);
      while (cx !== toX) {
        cx += stepX;
        steps.push({ x: cx, y: cy, dir: stepX > 0 ? DIR.RIGHT : DIR.LEFT });
      }
      const stepY = Math.sign(dy);
      while (cy !== toY) {
        cy += stepY;
        steps.push({ x: cx, y: cy, dir: stepY > 0 ? DIR.DOWN : DIR.UP });
      }
    } else {
      const stepY = Math.sign(dy);
      while (cy !== toY) {
        cy += stepY;
        steps.push({ x: cx, y: cy, dir: stepY > 0 ? DIR.DOWN : DIR.UP });
      }
      const stepX = Math.sign(dx);
      while (cx !== toX) {
        cx += stepX;
        steps.push({ x: cx, y: cy, dir: stepX > 0 ? DIR.RIGHT : DIR.LEFT });
      }
    }

    let prevX = fromX;
    let prevY = fromY;

    for (const step of steps) {
      const prevPiece = this.grid.get(prevX, prevY);
      if (prevPiece && prevPiece.type === 'belt' && !prevPiece.fixed) {
        prevPiece.dir = step.dir;
      }

      this.placementDir = step.dir;
      const targetPiece = this.grid.get(step.x, step.y);
      if (!targetPiece) {
        this.placePieceAt(step.x, step.y);
      } else if (targetPiece.type === 'belt' && !targetPiece.fixed) {
        targetPiece.dir = step.dir;
        this.renderer.addPlacementEffect(step.x, step.y, 'belt');
        this.audio.playChainPlaf();
      }

      prevX = step.x;
      prevY = step.y;
    }

    this.updateGhost(toX, toY);
  }

  toggleMode() {
    this.mode = this.mode === 'edit' ? 'view' : 'edit';
    this.ui.updateModeUI(this.mode);
    this.updateCanvasCursor();
    this.updateGhost();
    this.ui.showToast(this.mode === 'view' ? "👁️ Modo Vista: Desplaza y haz zoom libremente" : "✏️ Modo Edición: Coloca y modifica piezas", 1400);
  }

  updateCanvasCursor() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    if (this.mode === 'view') {
      canvas.classList.add('view-mode');
    } else {
      canvas.classList.remove('view-mode');
    }
  }

  placePieceAt(x, y) {
    if (this.mode === 'view') return;

    const existing = this.grid.get(x, y);
    if (existing && existing.fixed) {
      return;
    }

    if (this.selectedTool === 'erase') {
      this.removePieceAt(x, y);
      return;
    }

    // Comprobación de límite de presupuesto de piezas
    if (!existing && this.currentLevel && this.currentLevel.maxPieces) {
      const currentCount = this.grid.getAllPieces().filter(p => !p.fixed).length;
      if (currentCount >= this.currentLevel.maxPieces) {
        this.audio.playError();
        this.ui.showToast(`⚠️ Límite de ${this.currentLevel.maxPieces} piezas alcanzado en este nivel`, 2000);
        return;
      }
    }

    // Regla de Minas y Extractores: el extractor solo puede colocarse sobre una mina de recursos
    if (this.selectedTool === 'extractor') {
      if (!this.grid.hasMine(x, y)) {
        this.audio.playError();
        this.ui.showToast("⚠️ Los extractores deben colocarse sobre una mina de recursos", 2200);
        return;
      }

      const mine = this.grid.getMine(x, y);
      const newPiece = {
        x: x,
        y: y,
        type: 'extractor',
        dir: this.placementDir,
        color: null,
        shape: Shapes.clone(mine.shape),
        fixed: false
      };

      this.recordAction({
        type: 'place',
        x, y,
        prevPiece: existing ? { ...existing } : null,
        newPiece: { ...newPiece }
      });

      this.grid.set(x, y, newPiece);
      this.renderer.addPlacementEffect(x, y, 'extractor');
      this.audio.playPlaf();
      this.updateBudgetHUD();
      this.updateGhost(x, y);
      this.checkAchievements();
      return;
    }

    // Cortadora de 2 Bloques (Cutter 2x1)
    if (this.selectedTool === 'cutter') {
      const rVec = DIR_DELTA[(this.placementDir + 1) % 4];
      const secX = x + rVec.x;
      const secY = y + rVec.y;

      if (!this.grid.inBounds(x, y) || !this.grid.inBounds(secX, secY)) {
        this.audio.playError();
        this.ui.showToast("⚠️ Espacio insuficiente para la cortadora (2 bloques)", 1800);
        return;
      }
      const secPiece = this.grid.get(secX, secY);
      if ((existing && existing.fixed) || (secPiece && secPiece.fixed) ||
          (existing && (existing.type === 'obstacle' || existing.type === 'rock' || existing.type === 'water')) ||
          (secPiece && (secPiece.type === 'obstacle' || secPiece.type === 'rock' || secPiece.type === 'water'))) {
        this.audio.playError();
        this.ui.showToast("⚠️ Casilla ocupada o bloqueada", 1800);
        return;
      }

      if (existing) this.grid.remove(x, y);
      if (secPiece) this.grid.remove(secX, secY);

      const rootPiece = {
        x: x,
        y: y,
        type: 'cutter',
        dir: this.placementDir,
        rootX: x,
        rootY: y,
        fixed: false
      };
      const partPiece = {
        x: secX,
        y: secY,
        type: 'cutter_part',
        dir: this.placementDir,
        rootX: x,
        rootY: y,
        fixed: false
      };

      this.grid.set(x, y, rootPiece);
      this.grid.set(secX, secY, partPiece);

      this.recordAction({
        type: 'place_cutter',
        x, y,
        secX, secY,
        dir: this.placementDir
      });

      this.renderer.addPlacementEffect(x, y, 'cutter');
      this.renderer.addPlacementEffect(secX, secY, 'cutter');
      this.audio.playPlaf();
      this.updateBudgetHUD();
      this.updateGhost(x, y);
      this.checkAchievements();
      return;
    }

    // Fabricador Estándar (1x1)
    if (this.selectedTool === 'factory_1x1') {
      const recipeToUse = this.defaultFactoryRecipe || 'combine_shapes';
      const newPiece = {
        x: x,
        y: y,
        type: 'factory_1x1',
        dir: this.placementDir,
        recipeId: recipeToUse,
        buffer: {},
        isCrafting: false,
        progress: 0.0,
        fixed: false
      };
      this.recordAction({
        type: 'place',
        x, y,
        prevPiece: existing ? { ...existing } : null,
        newPiece: { ...newPiece }
      });
      this.grid.set(x, y, newPiece);
      this.renderer.addPlacementEffect(x, y, 'factory_1x1');
      this.audio.playPlaf();
      this.updateBudgetHUD();
      this.updateGhost(x, y);
      this.checkAchievements();
      return;
    }

    // Mega Ensambladora (2x2)
    if (this.selectedTool === 'factory_2x2') {
      if (!QuantumDLC.canPlaceFactory2x2(this.grid, x, y)) {
        this.audio.playError();
        this.ui.showToast("⚠️ Espacio de 2x2 insuficiente o bloqueado", 1800);
        return;
      }
      const recipeToUse = (this.defaultFactoryRecipe === 'quantum_sugar_cube' || this.defaultFactoryRecipe === 'refined_sugar_cube')
        ? this.defaultFactoryRecipe : 'quantum_sugar_cube';
      const rootPiece = QuantumDLC.placeFactory2x2(this.grid, x, y, this.placementDir, recipeToUse);
      if (rootPiece) {
        this.recordAction({
          type: 'place_2x2',
          x, y,
          dir: this.placementDir
        });
        this.renderer.addPlacementEffect(x, y, 'factory_2x2');
        this.renderer.addPlacementEffect(x + 1, y, 'factory_2x2');
        this.renderer.addPlacementEffect(x, y + 1, 'factory_2x2');
        this.renderer.addPlacementEffect(x + 1, y + 1, 'factory_2x2');
        this.audio.playPlaf();
        this.updateBudgetHUD();
        this.updateGhost(x, y);
        this.checkAchievements();
      }
      return;
    }

    const isBeltLike = (t) => t === 'belt' || t === 'belt_fast' || t === 'belt_slow';

    // Cintas del mismo tipo sobre sí mismas: rotar dirección
    if (existing && isBeltLike(existing.type) && existing.type === this.selectedTool) {
      const oldDir = existing.dir;
      if (existing.dir !== this.placementDir) {
        existing.dir = this.placementDir;
      } else {
        existing.dir = (existing.dir + 1) % 4;
        this.placementDir = existing.dir;
      }
      this.recordAction({
        type: 'rotate',
        x, y,
        prevDir: oldDir,
        newDir: existing.dir
      });
      this.renderer.addPlacementEffect(x, y, this.selectedTool);
      this.audio.playChainPlaf();
      this.updateGhost(x, y);
      return;
    }

    // Misma pieza sin cambios
    if (existing && existing.type === this.selectedTool && existing.dir === this.placementDir) {
      if (this.selectedTool !== 'painter' || existing.color === this.painterColor) {
        return;
      }
    }

    const newPiece = {
      x: x,
      y: y,
      type: this.selectedTool,
      dir: this.placementDir,
      color: (this.selectedTool === 'painter' || this.selectedTool === 'filter') ? this.painterColor : null,
      shape: null,
      fixed: false
    };

    this.recordAction({
      type: 'place',
      x, y,
      prevPiece: existing ? { ...existing } : null,
      newPiece: { ...newPiece }
    });

    this.grid.set(x, y, newPiece);
    this.renderer.addPlacementEffect(x, y, this.selectedTool);

    if (isBeltLike(this.selectedTool)) {
      this.audio.playChainPlaf();
    } else if (this.selectedTool === 'splitter') {
      this.audio.playSplitter();
    } else {
      this.audio.playPlaf();
    }

    this.updateBudgetHUD();
    this.updateGhost(x, y);
    this.checkAchievements();
  }

  removePieceAt(x, y) {
    if (this.mode === 'view') return;
    const existing = this.grid.get(x, y);
    if (!existing || existing.fixed) return;

    this.recordAction({
      type: 'remove',
      x, y,
      prevPiece: { ...existing }
    });

    const removed = this.grid.remove(x, y);
    if (removed) {
      this.audio.playDelete();
      this.updateBudgetHUD();
      this.updateGhost(x, y);
    }
  }

  setZoom(newZoom, centerX, centerY) {
    const clamped = Math.max(0.6, Math.min(2.2, newZoom));
    if (centerX !== undefined && centerY !== undefined) {
      const worldPos = this.renderer.screenToWorld(centerX, centerY);
      this.renderer.zoom = clamped;
      this.renderer.camX = centerX - worldPos.rawX * this.renderer.tileSize * clamped;
      this.renderer.camY = centerY - worldPos.rawY * this.renderer.tileSize * clamped;
    } else {
      this.renderer.zoom = clamped;
    }
    this.saveData.config.zoom = clamped;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.ui.setPlayPauseIcon(this.isPaused);
    this.ui.showToast(this.isPaused ? "Simulación en Pausa" : "Simulación Activa", 1200);
  }

  cycleSpeed() {
    const speeds = [1.0, 2.0, 4.0];
    const nextIdx = (speeds.indexOf(this.speedMult) + 1) % speeds.length;
    this.speedMult = speeds[nextIdx];
    this.ui.setSpeedText(this.speedMult);
  }

  restartCurrentLevel() {
    this.deliveredCount = 0;
    if (this.currentDemands) {
      this.currentDemands.forEach(d => d.delivered = 0);
    }
    this.timeElapsed = 0;
    this.streak = 0;
    this.lives = 5;
    this.totalDelivered = 0;
    this.totalErrors = 0;
    this.sim.reset();
    this.ui.updateQuota(0, this.totalQuota, this.currentDemands);
    this.ui.updateLives(this.lives, false);
    this.ui.showToast("Nivel reiniciado", 1500);
  }

  onShapeDelivered(shape, deliveryPiece) {
    if (!this.currentDemands) return;

    const dIdx = deliveryPiece.deliveryIndex !== undefined 
      ? deliveryPiece.deliveryIndex 
      : (deliveryPiece.secondary ? 1 : 0);

    let matchedDemand = null;
    for (const demand of this.currentDemands) {
      if (demand.deliveryIndex !== undefined && demand.deliveryIndex !== dIdx) continue;
      if (Shapes.matches(shape, demand.shape)) {
        if (demand.delivered < demand.quota) {
          matchedDemand = demand;
          break;
        }
      }
    }

    const screenPos = {
      x: (deliveryPiece.x + 0.5) * this.renderer.tileSize * this.renderer.zoom + this.renderer.camX,
      y: (deliveryPiece.y + 0.5) * this.renderer.tileSize * this.renderer.zoom + this.renderer.camY
    };

    if (matchedDemand) {
      matchedDemand.delivered++;
      this.deliveredCount++;
      this.totalDelivered++;
      this.streak++;

      if (this.streak > 0 && this.streak % 10 === 0) {
        this.audio.playStreak();
        this.renderer.addParticles(screenPos.x, screenPos.y, 25, '#F5C6A5');
        this.ui.showToast(`✨ ¡Racha x${this.streak} perfecta!`, 1800);
      } else {
        this.audio.playDelivery();
        this.renderer.addParticles(screenPos.x, screenPos.y, 14, '#A8D5BA');
      }

      this.ui.updateQuota(this.deliveredCount, this.totalQuota, this.currentDemands);
      this.checkAchievements();

      const allComplete = this.currentDemands.every(d => d.delivered >= d.quota);
      if (allComplete) {
        this.completeLevel();
      }
    } else {
      this.totalErrors++;
      this.streak = 0;

      if (this.gameMode === 'challenge' && this.currentLevel.hasLives) {
        this.lives = Math.max(0, this.lives - 1);
        this.audio.playError();
        this.ui.updateLives(this.lives, true);
        this.renderer.addParticles(screenPos.x, screenPos.y, 16, '#E8A0A0');
        this.ui.showToast(`⚠️ Forma incorrecta (−1 vida, quedan ${this.lives})`, 1800);

        if (this.lives <= 0) {
          this.handleGameOver();
        }
      } else {
        this.audio.playTone(280, 'sine', 0.08, 0.02);
        this.renderer.addParticles(screenPos.x, screenPos.y, 8, '#E8A0A0');
        this.ui.showToast("🍃 Forma incorrecta descartada (Modo Zen sin penalización)", 1500);
      }
    }
  }

  handleGameOver() {
    this.isPaused = true;
    this.ui.setPlayPauseIcon(true);
    this.ui.showToast("¡Casi! Vuelve a intentarlo...", 3200);

    setTimeout(() => {
      this.restartCurrentLevel();
      this.isPaused = false;
      this.ui.setPlayPauseIcon(false);
    }, 1400);
  }

  completeLevel() {
    this.isPaused = true;
    this.audio.playVictory();

    const lvlId = this.currentLevel.id;
    if (!this.saveData.nivelesCompletados.includes(lvlId)) {
      this.saveData.nivelesCompletados.push(lvlId);
    }

    const currentTime = this.timeElapsed;
    const prevBest = this.saveData.mejoresTiempos[lvlId];
    if (!prevBest || currentTime < prevBest) {
      this.saveData.mejoresTiempos[lvlId] = currentTime;
    }

    // Cálculo multidimensional de estrellas (tiempo y presupuesto)
    const starsConfig = this.currentLevel.stars || { gold: 30, silver: 60, bronze: 120 };
    let starsEarned = 1;
    const usedPieces = this.grid.getAllPieces().filter(p => !p.fixed).length;
    const withinBudget = !this.currentLevel.maxPieces || (usedPieces <= this.currentLevel.maxPieces);

    if (currentTime <= starsConfig.gold && withinBudget) {
      starsEarned = 3;
    } else if (currentTime <= starsConfig.silver) {
      starsEarned = 2;
    } else {
      starsEarned = 1;
    }

    if (!this.saveData.estrellas) this.saveData.estrellas = {};
    const prevStars = this.saveData.estrellas[lvlId] || 0;
    if (starsEarned > prevStars) {
      this.saveData.estrellas[lvlId] = starsEarned;
    }

    // Monedas de Estrella
    const coinsWon = starsEarned * 10;
    this.saveData.coins = (this.saveData.coins || 0) + coinsWon;

    this.checkAchievements();
    this.autoSave();
    this.ui.updateMenuStats();

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = (secs % 60).toFixed(1);
      return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
    };

    const totalAttempts = this.totalDelivered + this.totalErrors;
    const precisionPct = totalAttempts > 0 ? Math.round((this.totalDelivered / totalAttempts) * 100) : 100;

    for (let k = 0; k < 4; k++) {
      setTimeout(() => {
        this.renderer.addParticles(
          this.renderer.width * (0.3 + Math.random() * 0.4),
          this.renderer.height * (0.3 + Math.random() * 0.4),
          20,
          ['#A8D5BA', '#A9CCE3', '#C9B6E4', '#F5C6A5'][k]
        );
      }, k * 180);
    }

    this.ui.toggleVictoryModal(true, {
      time: formatTime(currentTime),
      best: formatTime(this.saveData.mejoresTiempos[lvlId] || currentTime),
      precision: `${precisionPct}%`,
      delivered: `${this.totalDelivered} / ${this.totalQuota}`,
      starsEarned: starsEarned,
      starsConfig: starsConfig,
      timeElapsed: currentTime
    });
  }

  loadNextLevel() {
    const nextId = this.currentLevel.id + 1;
    if (nextId <= 60 && nextId <= LEVELS.length) {
      this.loadLevel(nextId);
    } else {
      this.ui.showToast("🎉 ¡Has completado todos los 60 niveles de BeltFlow v3.0! Enhorabuena maestro.", 5000);
      this.loadLevel(60);
    }
  }

  buySkin(skinId) {
    const skin = COSMETIC_SKINS.find(s => s.id === skinId);
    if (!skin) return;
    if ((this.saveData.coins || 0) >= skin.cost) {
      this.saveData.coins -= skin.cost;
      this.saveData.unlockedCosmetics = this.saveData.unlockedCosmetics || ['default'];
      if (!this.saveData.unlockedCosmetics.includes(skinId)) {
        this.saveData.unlockedCosmetics.push(skinId);
      }
      this.saveData.cosmetics = this.saveData.cosmetics || {};
      this.saveData.cosmetics.beltSkin = skinId;
      this.audio.playPlaf();
      this.ui.showToast(`🎀 ¡Aspecto "${skin.name}" desbloqueado y equipado!`, 2500);
      this.checkAchievements();
      this.autoSave();
      this.ui.updateMenuStats();
    }
  }

  equipSkin(skinId) {
    if (!this.saveData.unlockedCosmetics?.includes(skinId)) return;
    this.saveData.cosmetics = this.saveData.cosmetics || {};
    this.saveData.cosmetics.beltSkin = skinId;
    this.audio.playRotate();
    const skin = COSMETIC_SKINS.find(s => s.id === skinId);
    this.ui.showToast(`🎀 Aspecto "${skin ? skin.name : skinId}" equipado`, 1800);
    this.checkAchievements();
    this.autoSave();
  }

  unlockAchievement(achId) {
    this.saveData.achievements = this.saveData.achievements || [];
    if (this.saveData.achievements.includes(achId)) return;
    this.saveData.achievements.push(achId);
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return;

    this.saveData.coins = (this.saveData.coins || 0) + 15;
    this.audio.playAchievement();
    this.ui.showToast(`🏆 ¡Logro: ${ach.name}! (+15 🪙)`, 3200);
    this.autoSave();
    this.ui.updateMenuStats();
  }

  checkAchievements() {
    this.saveData.achievements = this.saveData.achievements || [];
    const save = this.saveData;
    const completed = save.nivelesCompletados || [];

    // Primeros pasos
    if (this.grid.getAllPieces().some(p => p.type === 'belt' || p.type === 'belt_fast' || p.type === 'belt_slow')) {
      this.unlockAchievement('first_belt');
    }

    // Capítulos
    if (completed.length >= 5) this.unlockAchievement('level_5');
    if (completed.includes(20)) this.unlockAchievement('chapter_1');
    if (completed.includes(40)) this.unlockAchievement('chapter_2');
    if (completed.includes(60)) this.unlockAchievement('chapter_3');
    if (completed.includes(64)) this.unlockAchievement('chapter_4');

    // Expansión Biomolecular & Cuántica
    if (this.sim.totalCrafted?.['sugar_cube'] || completed.includes(61)) {
      this.unlockAchievement('first_sugar_cube');
    }
    if (this.sim.totalCrafted?.['quantum_sugar_cube'] || completed.includes(64)) {
      this.unlockAchievement('quantum_master');
    }

    // Mecánicas
    if (this.sim.totalSplittersProcessed >= 50) this.unlockAchievement('splitter_pro');
    if (this.sim.totalCrossingsTraversed >= 100) this.unlockAchievement('crossing_ace');
    if (this.sim.totalFiltersProcessed >= 50) this.unlockAchievement('filter_master');
    if (this.sim.totalPortalsTraversed >= 50) this.unlockAchievement('portal_traveler');

    // Buffer lleno
    const anyFull = this.grid.getAllPieces().some(p => p.type === 'buffer' && (p.bufferQueue?.length || 0) >= 6);
    if (anyFull) this.unlockAchievement('buffer_full');

    // Tasa de producción
    if (this.sim.currentThroughputRate >= 1.5) this.unlockAchievement('speed_demon');

    // Racha
    if (this.streak >= 20) this.unlockAchievement('streak_20');
    if (this.streak >= 50) this.unlockAchievement('streak_50');

    // Reparación
    if (completed.includes(57)) this.unlockAchievement('repairman');

    // Presupuesto
    if (this.currentLevel?.maxPieces && completed.includes(this.currentLevel.id)) {
      const used = this.grid.getAllPieces().filter(p => !p.fixed).length;
      if (used <= this.currentLevel.maxPieces) this.unlockAchievement('budget_hero');
    }

    // Estrellas
    let goldCount = 0;
    let totalStars = 0;
    if (save.estrellas) {
      Object.values(save.estrellas).forEach(s => {
        if (s >= 3) goldCount++;
        totalStars += (s || 0);
      });
    }
    if (goldCount >= 5) this.unlockAchievement('gold_hunter_5');
    if (goldCount >= 20) this.unlockAchievement('gold_hunter_20');
    if (goldCount >= 40) this.unlockAchievement('gold_hunter_40');
    if (totalStars >= 50) this.unlockAchievement('star_collector_50');
    if (totalStars >= 120) this.unlockAchievement('star_collector_120');

    // Cosméticos
    if (save.cosmetics?.beltSkin && save.cosmetics.beltSkin !== 'default') {
      this.unlockAchievement('cosmetic_enthusiast');
    }
  }

  toggleTheme() {
    this.setTheme(!this.isDark);
  }

  setTheme(isDark) {
    this.isDark = isDark;
    this.renderer.isDark = isDark;
    this.saveData.config.modoOscuro = isDark;

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.ui.setThemeIcons(isDark);

    if (this.currentLevel) {
      this.ui.updateLevelInfo(this.currentLevel);
    }
  }

  toggleSound() {
    this.audio.enabled = !this.audio.enabled;
    this.saveData.config.sonido = this.audio.enabled;
    this.ui.setSoundIcons(this.audio.enabled);
    this.ui.showToast(this.audio.enabled ? "Sonido activado" : "Sonido silenciado", 1200);
  }

  setReducedMotion(reduced) {
    this.renderer.reducedMotion = reduced;
    this.saveData.config.reducirMovimiento = reduced;
    const el = document.getElementById('setting-reduced-motion');
    if (el) el.checked = reduced;
  }

  setControlsMode(mode) {
    this.saveData.config.tipoDispositivo = mode;
    this.detectAndApplyDeviceMode(mode);
  }

  autoSave() {
    if (this.currentLevel) {
      this.saveData.construcciones[this.currentLevel.id] = this.grid.exportUserPieces();
    }
    SaveManager.save(this.saveData);
  }

  resetAllProgress() {
    this.saveData = SaveManager.reset();
    this.loadLevel(1);
    this.ui.toggleSettingsModal(false);
    this.ui.updateMenuStats();
    this.ui.showToast("Progreso reiniciado correctamente", 2000);
  }

  gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
    this.lastFrameTime = currentTime;

    if (this.state === 'playing' && !this.isPaused) {
      this.timeElapsed += dt * this.speedMult;
      this.sim.update(dt, this.speedMult);

      // Música ambiental generativa (acordes pentatónicos suaves cada 8s según bioma)
      this.ambientTimer += dt;
      if (this.ambientTimer >= 8.0) {
        this.ambientTimer = 0;
        if (this.audio && this.audio.enabled && this.saveData?.config?.ambientMusic !== false) {
          const lvlId = this.currentLevel?.id || 1;
          const biomeIdx = lvlId > 40 ? 3 : (lvlId > 20 ? 2 : 1);
          this.audio.playAmbientChime(biomeIdx);
        }
      }

      // Actualizar medidor de flujo sostenido en HUD
      if (this.currentLevel && this.currentLevel.targetRate) {
        const rateEl = document.getElementById('hud-rate-display');
        if (rateEl) {
          rateEl.textContent = `${this.sim.currentThroughputRate.toFixed(1)} / ${this.currentLevel.targetRate}/s`;
        }
      }

      // Gestión de cronómetro según modo de juego
      if (this.gameMode === 'challenge' && this.currentLevel.timeLimit) {
        const timeLeft = Math.max(0, this.currentLevel.timeLimit - this.timeElapsed);
        this.ui.updateTimer(timeLeft, timeLeft <= 30);
        if (timeLeft <= 0) {
          this.handleGameOver();
        }
      } else {
        this.ui.updateTimer(null);
      }
    }

    this.renderer.render(dt, (this.state === 'menu' || this.isPaused) ? 0 : this.speedMult);

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Iniciar juego cuando el DOM esté listo o de inmediato si ya fue cargado
function initBeltFlow() {
  if (typeof window !== 'undefined' && !window.beltFlowGame) {
    window.beltFlowGame = new BeltFlowGame();
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initBeltFlow);
  } else {
    initBeltFlow();
  }
}
