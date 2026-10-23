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

export function createPaintDrop(paintColor = 'lavender') {
  return {
    isPaintDrop: true,
    paintColor
  };
}

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
        beltSkin: 'skin_cyber',
        shapeTheme: 'default'
      },
      unlockedCosmetics: ['default', 'skin_cyber'],
      achievements: [],
      gameMode: 'relaxed', // 'relaxed' (default) o 'challenge'
      customLevels: [],
      config: {
        modoOscuro: false,
        dayModeWhiteDefaultV4: true,
        zoom: 1.0,
        tipoDispositivo: 'auto',
        reducirMovimiento: false,
        sonido: true,
        volumen: 0.8,
        palettePreset: 'cyberpunk',
        ambientMusic: true,
        showIPMOverlay: false
      },
      upgrades: {
        beltSpeed: 0,
        extractorSpeed: 0,
        painterEfficiency: 0,
        coinValue: 0
      },
      megaFactoryPieces: [],
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
        upgrades: { ...def.upgrades, ...(parsed.upgrades || {}) },
        megaFactoryPieces: Array.isArray(parsed.megaFactoryPieces) ? parsed.megaFactoryPieces : [],
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

      // Activar el nuevo Modo Día Blanco por defecto al actualizar a v4.0
      if (!merged.config.dayModeWhiteDefaultV4) {
        merged.config.modoOscuro = false;
        merged.config.dayModeWhiteDefaultV4 = true;
        SaveManager.save(merged);
      }

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

    // Soporte para Gotas de Pintura / Materia Prima de Pigmento
    if (a.isPaintDrop || b.isPaintDrop) {
      return !!(a.isPaintDrop && b.isPaintDrop && a.paintColor === b.paintColor);
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
    if (shape.isPaintDrop) return { isPaintDrop: true, paintColor: shape.paintColor };
    return {
      left: shape.left ? { type: shape.left.type, color: shape.left.color } : null,
      right: shape.right ? { type: shape.right.type, color: shape.right.color } : null
    };
  }

  static cut(shape) {
    if (!shape) return { leftHalf: null, rightHalf: null };
    if (shape.dlcItem || shape.isPaintDrop) return { leftHalf: null, rightHalf: null };
    const leftHalf = shape.left ? { left: { ...shape.left }, right: null } : null;
    const rightHalf = shape.right ? { left: null, right: { ...shape.right } } : null;
    return { leftHalf, rightHalf };
  }

  static paint(shape, newColor) {
    if (!shape) return null;
    if (shape.dlcItem || shape.isPaintDrop) return Shapes.clone(shape);
    const painted = Shapes.clone(shape);
    if (painted.left) painted.left.color = newColor;
    if (painted.right) painted.right.color = newColor;
    return painted;
  }

  static mix(shapeA, shapeB) {
    if (!shapeA && !shapeB) return null;
    if (!shapeA) return Shapes.clone(shapeB);
    if (!shapeB) return Shapes.clone(shapeA);
    if (shapeA.isPaintDrop && !shapeB.isPaintDrop) return Shapes.paint(shapeB, shapeA.paintColor);
    if (shapeB.isPaintDrop && !shapeA.isPaintDrop) return Shapes.paint(shapeA, shapeB.paintColor);
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

    // Dibujo de Gota / Cápsula de Materia Prima de Pintura (Mena de Pintura)
    if (shape.isPaintDrop) {
      const hex = COLOR_HEX[shape.paintColor] || '#C9B6E4';
      ctx.save();
      ctx.fillStyle = hex;
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1.8;

      const r = size * 0.68;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.25);
      ctx.bezierCurveTo(r * 1.15, -r * 0.15, r * 1.1, r * 1.05, 0, r * 1.05);
      ctx.bezierCurveTo(-r * 1.1, r * 1.05, -r * 1.15, -r * 0.15, 0, -r * 1.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Brillo especular líquido
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(-r * 0.26, r * 0.18, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
    return x >= -260 && x <= 260 && y >= -260 && y <= 260;
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
          shape: piece.shape || null,
          priorityMode: piece.priorityMode,
          recipeId: piece.recipeId,
          paintTank: piece.paintTank,
          rootX: piece.rootX,
          rootY: piece.rootY
        });
      }
    }
    return pieces;
  }

  importUserPieces(piecesList) {
    if (!Array.isArray(piecesList)) return;
    for (const p of piecesList) {
      const existing = this.get(p.x, p.y);
      if (!existing || !existing.fixed) {
        let shape = p.shape || null;
        if (p.type === 'extractor') {
          const m = this.getMine(p.x, p.y);
          if (m && m.shape) shape = Shapes.clone(m.shape);
        }
        this.set(p.x, p.y, {
          x: p.x,
          y: p.y,
          type: p.type,
          dir: p.dir,
          color: p.color || null,
          shape: shape,
          priorityMode: p.priorityMode,
          recipeId: p.recipeId,
          paintTank: p.paintTank !== undefined ? p.paintTank : (p.type === 'painter' ? 6 : undefined),
          rootX: p.rootX,
          rootY: p.rootY,
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
    this.cellItems = new Map(); // O(1) spatial hash: key -> Item[]
    this.nodeThroughput = new Map(); // key -> timestamp[] (last 15s for IPM telemetry)
    this.nextItemId = 1;
    this.spawnerTimers = new Map();
    this.machineAnims = [];
    this.deliveryTimestamps = [];
    this.currentThroughputRate = 0.0;
    this.currentIPM = 0;
    this.rateSustainedTimer = 0.0;
    this.totalTrashDestroyed = 0;
    this.totalPortalsTraversed = 0;
    this.totalCrossingsTraversed = 0;
    this.totalFiltersProcessed = 0;
    this.totalSplittersProcessed = 0;
    this.totalCrossHubProcessed = 0;
  }

  reset() {
    this.items = [];
    this.cellItems.clear();
    this.nodeThroughput.clear();
    this.spawnerTimers.clear();
    this.machineAnims = [];
    this.deliveryTimestamps = [];
    this.currentThroughputRate = 0.0;
    this.currentIPM = 0;
    this.rateSustainedTimer = 0.0;
    this.totalTrashDestroyed = 0;
    this.totalPortalsTraversed = 0;
    this.totalCrossingsTraversed = 0;
    this.totalFiltersProcessed = 0;
    this.totalSplittersProcessed = 0;
    this.totalCrossHubProcessed = 0;
  }

  rebuildSpatialIndex() {
    this.cellItems.clear();
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const k = `${it.x},${it.y}`;
      let bucket = this.cellItems.get(k);
      if (!bucket) {
        bucket = [];
        this.cellItems.set(k, bucket);
      }
      bucket.push(it);
    }
  }

  isCellEntryBlocked(x, y, threshold = 0.35) {
    const bucket = this.cellItems.get(`${x},${y}`);
    if (!bucket) return false;
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].progress < threshold) return true;
    }
    return false;
  }

  recordNodePass(x, y, nowSec) {
    const k = `${x},${y}`;
    let ts = this.nodeThroughput.get(k);
    if (!ts) {
      ts = [];
      this.nodeThroughput.set(k, ts);
    }
    ts.push(nowSec);
  }

  getNodeIPM(x, y) {
    const ts = this.nodeThroughput.get(`${x},${y}`);
    if (!ts || ts.length === 0) return 0;
    const nowSec = performance.now() / 1000;
    while (ts.length > 0 && nowSec - ts[0] > 12.0) {
      ts.shift();
    }
    return Math.round((ts.length / 12.0) * 60);
  }

  moveItemToCell(item, nextX, nextY, nextInDir, nowSec) {
    const oldKey = `${item.x},${item.y}`;
    const oldBucket = this.cellItems.get(oldKey);
    if (oldBucket) {
      const idx = oldBucket.indexOf(item);
      if (idx !== -1) oldBucket.splice(idx, 1);
    }
    item.x = nextX;
    item.y = nextY;
    item.inDir = nextInDir;
    item.progress = 0.0;
    item.processingTimer = 0;

    const newKey = `${nextX},${nextY}`;
    let newBucket = this.cellItems.get(newKey);
    if (!newBucket) {
      newBucket = [];
      this.cellItems.set(newKey, newBucket);
    }
    newBucket.push(item);
    this.recordNodePass(nextX, nextY, nowSec);
  }

  triggerMachineAnim(x, y, type, data = {}) {
    if (this.machineAnims.length > 140) return; // Cap active anims for 60 FPS
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
    const upgrades = this.game?.saveData?.upgrades || {};
    const beltUpgradeMult = 1.0 + (upgrades.beltSpeed || 0) * 0.22;
    const extractorUpgradeMult = 1.0 + (upgrades.extractorSpeed || 0) * 0.25;
    const painterUpgradeMult = 1.0 + (upgrades.painterEfficiency || 0) * 0.25;
    const beltSpeed = 1.5 * beltUpgradeMult; // Celdas por segundo mejorables

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
    this.currentIPM = Math.round(this.currentThroughputRate * 60);

    this.rebuildSpatialIndex();

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

        const spawnInterval = 1.45 / extractorUpgradeMult;
        if (timer >= spawnInterval) {
          timer = 0;
          const delta = DIR_DELTA[piece.dir];
          const outX = piece.x + delta.x;
          const outY = piece.y + delta.y;
          const targetPiece = this.grid.get(outX, outY);

          if (targetPiece && this.canAcceptItem(targetPiece, piece.dir)) {
            if (!this.isCellEntryBlocked(outX, outY, 0.35)) {
              this.spawnItem(Shapes.clone(piece.shape), outX, outY, piece.dir);
              this.recordNodePass(piece.x, piece.y, nowSec);
              this.recordNodePass(outX, outY, nowSec);
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
      if (piece.type === 'belt_hyper') {
        tileSpeed = beltSpeed * 3.0; // 4.5 celdas/s (270 IPM max)
      } else if (piece.type === 'belt_fast') {
        tileSpeed = beltSpeed * 2.0; // 3.0 celdas/s (180 IPM)
      } else if (piece.type === 'belt_slow') {
        tileSpeed = beltSpeed * 0.5; // 0.75 celdas/s (45 IPM)
      }

      // Trituradora: desintegra la forma
      if (piece.type === 'trash') {
        item.progress += effectiveDt * 2.5;
        if (item.progress >= 1.0) {
          this.totalTrashDestroyed++;
          this.recordNodePass(piece.x, piece.y, nowSec);
          this.triggerMachineAnim(piece.x, piece.y, 'trash_shrink', {
            color: item.shape && item.shape.left ? item.shape.left.color : 'coral'
          });
          this.items.splice(i, 1);
        }
        continue;
      }

      // Salida / Delivery: entrega y recepción
      if (piece.type === 'delivery') {
        item.progress += effectiveDt * 3.2;
        if (item.progress >= 0.8) {
          this.deliveryTimestamps.push(nowSec);
          this.recordNodePass(piece.x, piece.y, nowSec);
          this.triggerMachineAnim(piece.x, piece.y, 'delivery_pulse', {});
          if (this.onDelivery) this.onDelivery(item.shape, piece);
          this.items.splice(i, 1);
        }
        continue;
      }

      // Absorción de Materia Prima de Pintura (isPaintDrop) en Pintor o Hub Cruzado
      if ((piece.type === 'painter' || piece.type === 'cross_hub') && item.shape && item.shape.isPaintDrop) {
        item.progress += effectiveDt * tileSpeed * 2.2;
        if (item.progress >= 0.35) {
          const chargesPerDrop = 5 + (upgrades.painterEfficiency || 0) * 3;
          piece.color = item.shape.paintColor || piece.color || PASTEL_COLORS.LAVENDER;
          piece.paintTank = Math.min(30, (piece.paintTank !== undefined ? piece.paintTank : 4) + chargesPerDrop);
          this.recordNodePass(piece.x, piece.y, nowSec);
          this.triggerMachineAnim(piece.x, piece.y, 'painter_drop', {
            color: piece.color,
            dir: piece.dir
          });
          this.items.splice(i, 1);
          this.rebuildSpatialIndex();
        }
        continue;
      }

      // Cortadora y Pintor
      if (piece.type === 'cutter' || piece.type === 'painter') {
        if (piece.type === 'painter') {
          if (piece.paintTank === undefined) piece.paintTank = 4;
          // Si el tanque de pigmento está vacío, la pieza espera en el centro hasta que llegue pintura de una Mena de Pintura
          if (piece.paintTank <= 0 && !piece.infinitePaint) {
            item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
            continue;
          }
        }

        item.processingTimer = (item.processingTimer || 0) + effectiveDt;
        const requiredTime = piece.type === 'painter' ? (0.42 / painterUpgradeMult) : 0.45;

        if (item.processingTimer < requiredTime) {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
          continue;
        }

        const handled = this.processMachineOutput(piece, item, nowSec);
        if (handled) {
          this.recordNodePass(piece.x, piece.y, nowSec);
          this.items.splice(i, 1);
        }
        continue;
      }

      // Cross-Processing Hub (cross_hub): Fusiona 2 flujos y los tiñe simultáneamente al color seleccionado
      if (piece.type === 'cross_hub') {
        item.processingTimer = (item.processingTimer || 0) + effectiveDt;
        if (item.progress < 0.5) {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed * 1.4);
        }

        const delta = DIR_DELTA[piece.dir];
        const outX = piece.x + delta.x;
        const outY = piece.y + delta.y;
        const nextPiece = this.grid.get(outX, outY);

        if (nextPiece && this.canAcceptItem(nextPiece, piece.dir) && !this.isCellEntryBlocked(outX, outY, 0.35)) {
          const cellBucket = this.cellItems.get(`${piece.x},${piece.y}`) || [];
          const other = cellBucket.find(it => it !== item);
          const hubColor = piece.color || PASTEL_COLORS.SKY;

          if (other) {
            const combined = Shapes.mix(item.shape, other.shape);
            const painted = Shapes.paint(combined, hubColor);
            const otherIdx = this.items.indexOf(other);
            if (otherIdx !== -1) this.items.splice(otherIdx, 1);
            const currentIdx = this.items.indexOf(item);
            if (currentIdx !== -1) this.items.splice(currentIdx, 1);
            this.totalCrossHubProcessed++;
            this.recordNodePass(piece.x, piece.y, nowSec);
            this.recordNodePass(outX, outY, nowSec);
            this.triggerMachineAnim(piece.x, piece.y, 'factory_crafted', { dir: piece.dir, type: 'cross_hub', color: hubColor });
            this.spawnItem(painted, outX, outY, piece.dir);
            this.rebuildSpatialIndex();
            continue;
          } else if (item.processingTimer > 1.2) {
            // Si pasa 1.2s con un solo flujo, lo tiñe y despacha para evitar bloqueo permanente
            const paintedSingle = Shapes.paint(item.shape, hubColor);
            this.items.splice(i, 1);
            this.totalCrossHubProcessed++;
            this.recordNodePass(piece.x, piece.y, nowSec);
            this.recordNodePass(outX, outY, nowSec);
            this.triggerMachineAnim(piece.x, piece.y, 'painter_drop', { dir: piece.dir, color: hubColor });
            this.spawnItem(paintedSingle, outX, outY, piece.dir);
            this.rebuildSpatialIndex();
            continue;
          }
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
          if (!this.isCellEntryBlocked(outX, outY, 0.35)) {
            const otherIdx = this.items.findIndex(it => it !== item && it.x === piece.x && it.y === piece.y);
            if (otherIdx !== -1) {
              const other = this.items[otherIdx];
              const combined = Shapes.mix(item.shape, other.shape);
              this.items.splice(otherIdx, 1);
              const currentIdx = this.items.indexOf(item);
              if (currentIdx !== -1) this.items.splice(currentIdx, 1);
              this.recordNodePass(piece.x, piece.y, nowSec);
              this.recordNodePass(outX, outY, nowSec);
              this.triggerMachineAnim(piece.x, piece.y, 'factory_crafted', { dir: piece.dir, type: piece.type });
              this.spawnItem(combined, outX, outY, piece.dir);
              this.rebuildSpatialIndex();
              continue;
            } else if (item.processingTimer > 1.8 && item.shape.left && item.shape.right) {
              this.items.splice(i, 1);
              this.recordNodePass(piece.x, piece.y, nowSec);
              this.spawnItem(item.shape, outX, outY, piece.dir);
              this.rebuildSpatialIndex();
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
              if (!this.isCellEntryBlocked(outX, outY, 0.35)) {
                item.isUnderground = false;
                this.moveItemToCell(item, outX, outY, exit.dir, nowSec);
              }
            }
          }
          continue;
        } else {
          item.progress = Math.min(0.5, item.progress + effectiveDt * tileSpeed);
          continue;
        }
      }

      // Divisor (Splitter): reparte alternadamente entre recto y lateral con prioridad configurable
      if (piece.type === 'splitter') {
        item.progress += effectiveDt * tileSpeed;
        if (item.progress >= 1.0) {
          const straightDir = piece.dir;
          const sideDir = (piece.dir + 1) % 4; // Desvío a 90°
          piece.splitPhase = piece.splitPhase || 0;
          const mode = piece.splitMode || 'balanced'; // 'balanced' | 'priority_main' | 'priority_side'

          let preferredDir = (piece.splitPhase % 2 === 0) ? straightDir : sideDir;
          let alternateDir = (piece.splitPhase % 2 === 0) ? sideDir : straightDir;

          if (mode === 'priority_main') {
            preferredDir = straightDir;
            alternateDir = sideDir;
          } else if (mode === 'priority_side') {
            preferredDir = sideDir;
            alternateDir = straightDir;
          }

          let targetDir = preferredDir;
          let delta = DIR_DELTA[targetDir];
          let nextX = item.x + delta.x;
          let nextY = item.y + delta.y;
          let nextPiece = this.grid.get(nextX, nextY);

          let canGo = nextPiece && this.canAcceptItem(nextPiece, targetDir) && !this.isCellEntryBlocked(nextX, nextY, 0.35);

          if (!canGo) {
            targetDir = alternateDir;
            delta = DIR_DELTA[targetDir];
            nextX = item.x + delta.x;
            nextY = item.y + delta.y;
            nextPiece = this.grid.get(nextX, nextY);
            canGo = nextPiece && this.canAcceptItem(nextPiece, targetDir) && !this.isCellEntryBlocked(nextX, nextY, 0.35);
          }

          if (canGo) {
            piece.splitPhase++;
            this.totalSplittersProcessed++;
            this.moveItemToCell(item, nextX, nextY, targetDir, nowSec);
            this.triggerMachineAnim(piece.x, piece.y, 'splitter_pulse', { dir: targetDir });
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Balanceador 3-Vías (balancer): reparte equitativamente en 3 salidas (izquierda, frente, derecha)
      if (piece.type === 'balancer') {
        item.progress += effectiveDt * tileSpeed * 1.25;
        if (item.progress >= 1.0) {
          const dirs = [
            piece.dir,               // Frente
            (piece.dir + 1) % 4,     // Derecha
            (piece.dir + 3) % 4      // Izquierda
          ];
          piece.balanceIdx = piece.balanceIdx || 0;

          let dispatched = false;
          for (let attempt = 0; attempt < 3; attempt++) {
            const candidateDir = dirs[(piece.balanceIdx + attempt) % 3];
            const delta = DIR_DELTA[candidateDir];
            const nextX = item.x + delta.x;
            const nextY = item.y + delta.y;
            const nextPiece = this.grid.get(nextX, nextY);

            if (nextPiece && this.canAcceptItem(nextPiece, candidateDir) && !this.isCellEntryBlocked(nextX, nextY, 0.35)) {
              piece.balanceIdx = (piece.balanceIdx + attempt + 1) % 3;
              this.totalSplittersProcessed++;
              this.moveItemToCell(item, nextX, nextY, candidateDir, nowSec);
              this.triggerMachineAnim(piece.x, piece.y, 'splitter_pulse', { dir: candidateDir });
              dispatched = true;
              break;
            }
          }

          if (!dispatched) {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Fusionador (Merger): recibe de varias entradas y entrega por el frente
      if (piece.type === 'merger') {
        item.progress += effectiveDt * tileSpeed * 1.25;
        if (item.progress >= 1.0) {
          const delta = DIR_DELTA[piece.dir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
            if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
              this.moveItemToCell(item, nextX, nextY, piece.dir, nowSec);
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
            const target = this.game?.currentLevel?.targetShape;
            matches = target ? Shapes.matches(item.shape, target) : true;
          }

          const outDir = matches ? piece.dir : (piece.dir + 1) % 4;
          const delta = DIR_DELTA[outDir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, outDir)) {
            if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
              this.totalFiltersProcessed++;
              this.moveItemToCell(item, nextX, nextY, outDir, nowSec);
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
        item.progress += effectiveDt * tileSpeed * 1.15;
        if (item.progress >= 1.0) {
          const delta = DIR_DELTA[trackDir];
          const nextX = item.x + delta.x;
          const nextY = item.y + delta.y;
          const nextPiece = this.grid.get(nextX, nextY);

          if (nextPiece && this.canAcceptItem(nextPiece, trackDir)) {
            if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
              this.totalCrossingsTraversed++;
              this.moveItemToCell(item, nextX, nextY, trackDir, nowSec);
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
          if (piece.ejectTimer >= 0.5) {
            const delta = DIR_DELTA[piece.dir];
            const nextX = piece.x + delta.x;
            const nextY = piece.y + delta.y;
            const nextPiece = this.grid.get(nextX, nextY);

            if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
              if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
                piece.ejectTimer = 0;
                piece.bufferQueue.shift();
                item.isBuffered = false;
                this.moveItemToCell(item, nextX, nextY, piece.dir, nowSec);
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
            if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
              item.hasTeleported = false;
              this.moveItemToCell(item, nextX, nextY, piece.dir, nowSec);
            } else {
              item.progress = 1.0;
            }
          } else {
            item.progress = 1.0;
          }
        }
        continue;
      }

      // Cinta transportadora (estándar, rápida, hiper MK3, lenta u oscilante)
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
          if (!this.isCellEntryBlocked(nextX, nextY, 0.35)) {
            this.moveItemToCell(item, nextX, nextY, piece.dir, nowSec);
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
    if (piece.type === 'water') return false;
    if (piece.type === 'spawner' || piece.type === 'extractor') return false;
    if (piece.type === 'trash' || piece.type === 'delivery') return true;

    // Fábricas y Cross-Hub
    if (piece.type === 'factory_1x1' || piece.type === 'cross_hub') {
      return incomingDir !== OPPOSITE_DIR[piece.dir]; // Admite por detrás y ambos laterales
    }
    if (piece.type === 'factory_2x2' || piece.type === 'factory_2x2_part') {
      return true;
    }

    // Cintas (estándar, rápida, hiper MK3, lenta y oscilante)
    if (piece.type === 'belt' || piece.type === 'belt_fast' || piece.type === 'belt_hyper' || piece.type === 'belt_slow' || piece.type === 'switching_belt') {
      return piece.dir !== OPPOSITE_DIR[incomingDir];
    }

    // Divisor (Splitter) y Balanceador 3-Vías (Balancer): entrada trasera
    if (piece.type === 'splitter' || piece.type === 'balancer') {
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

    // Cruce (Crossing)
    if (piece.type === 'crossing') {
      const exitDelta = DIR_DELTA[incomingDir];
      const exitPiece = this.grid.get(piece.x + exitDelta.x, piece.y + exitDelta.y);
      return exitPiece ? this.canAcceptItem(exitPiece, incomingDir) : true;
    }

    // Buffer
    if (piece.type === 'buffer') {
      const currentQueue = piece.bufferQueue || [];
      return incomingDir === piece.dir && currentQueue.length < 6;
    }

    // Portal
    if (piece.type === 'portal') {
      return incomingDir === piece.dir;
    }

    // Cortadora y Pintor
    if (piece.type === 'cutter') {
      return incomingDir === piece.dir;
    }
    if (piece.type === 'painter') {
      // Admite Formas por detrás y Gotas de Pintura por ambos laterales (o detrás)
      return incomingDir !== OPPOSITE_DIR[piece.dir];
    }
    if (piece.type === 'cutter_part') {
      return false;
    }

    // Mezcladora
    if (piece.type === 'mixer') {
      const leftDir = (piece.dir + 1) % 4;
      const rightDir = (piece.dir + 3) % 4;
      return incomingDir === piece.dir || incomingDir === leftDir || incomingDir === rightDir;
    }

    // Túnel
    if (piece.type === 'tunnel') {
      return incomingDir === piece.dir;
    }
    return false;
  }

  processMachineOutput(piece, item, nowSec = performance.now() / 1000) {
    if (piece.type === 'painter') {
      const paintColor = piece.color || PASTEL_COLORS.LAVENDER;
      const paintedShape = Shapes.paint(item.shape, paintColor);

      const delta = DIR_DELTA[piece.dir];
      const outX = piece.x + delta.x;
      const outY = piece.y + delta.y;
      const nextPiece = this.grid.get(outX, outY);

      if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
        if (!this.isCellEntryBlocked(outX, outY, 0.35)) {
          if (!piece.infinitePaint && piece.paintTank !== undefined && piece.paintTank > 0) {
            piece.paintTank = Math.max(0, piece.paintTank - 1);
          }
          this.triggerMachineAnim(piece.x, piece.y, 'painter_drop', {
            color: paintColor,
            dir: piece.dir
          });
          this.spawnItem(paintedShape, outX, outY, piece.dir);
          this.recordNodePass(outX, outY, nowSec);
          this.rebuildSpatialIndex();
          return true;
        }
      }
      return false;
    }

    // Cortadora de 2 Bloques (Cutter 2x1)
    if (piece.type === 'cutter') {
      const { leftHalf, rightHalf } = Shapes.cut(item.shape);

      const fDelta = DIR_DELTA[piece.dir];
      const fX = piece.x + fDelta.x;
      const fY = piece.y + fDelta.y;
      const fPiece = this.grid.get(fX, fY);

      const rVec = DIR_DELTA[(piece.dir + 1) % 4];
      const secX = piece.x + rVec.x;
      const secY = piece.y + rVec.y;
      const rOutX = secX + fDelta.x;
      const rOutY = secY + fDelta.y;
      const rPiece = this.grid.get(rOutX, rOutY);

      const canLeft = !leftHalf || (fPiece && this.canAcceptItem(fPiece, piece.dir) && !this.isCellEntryBlocked(fX, fY, 0.35));
      const canRight = !rightHalf || (rPiece && this.canAcceptItem(rPiece, piece.dir) && !this.isCellEntryBlocked(rOutX, rOutY, 0.35));

      if (canLeft && canRight) {
        this.triggerMachineAnim(piece.x, piece.y, 'cutter_flash', { dir: piece.dir });
        if (leftHalf && fPiece) {
          this.spawnItem(leftHalf, fX, fY, piece.dir);
          this.recordNodePass(fX, fY, nowSec);
        }
        if (rightHalf && rPiece) {
          this.spawnItem(rightHalf, rOutX, rOutY, piece.dir);
          this.recordNodePass(rOutX, rOutY, nowSec);
        }
        this.rebuildSpatialIndex();
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
    const bucket = this.cellItems.get(`${item.x},${item.y}`);
    if (!bucket || bucket.length <= 1) return null;
    let closest = null;
    let minDist = Infinity;
    for (let i = 0; i < bucket.length; i++) {
      const other = bucket[i];
      if (other !== item && other.progress > item.progress) {
        const dist = other.progress - item.progress;
        if (dist < minDist) {
          minDist = dist;
          closest = other;
        }
      }
    }
    return closest;
  }

  spawnItem(shape, x, y, inDir) {
    const newItem = {
      id: this.nextItemId++,
      shape: shape,
      x: x,
      y: y,
      inDir: inDir,
      progress: 0.0,
      isUnderground: false,
      processingTimer: 0
    };
    this.items.push(newItem);
    const k = `${x},${y}`;
    let bucket = this.cellItems.get(k);
    if (!bucket) {
      bucket = [];
      this.cellItems.set(k, bucket);
    }
    bucket.push(newItem);
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
    this.showIPMOverlay = false;
    this.ghost = null;
    this.particles = [];
    this.ambientParticles = [];
    this.beltAnimOffset = 0;
    this.placementEffects = new Map(); // key -> { startTime, duration, x, y, type }
    this.frustum = { minCol: -50, maxCol: 50, minRow: -50, maxRow: 50 };

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
    const isCyber = document.documentElement.getAttribute('data-palette') === 'cyberpunk';
    ctx.save();
    for (const p of this.ambientParticles) {
      let color = 'rgba(245, 208, 97, ';
      if (isCyber) {
        color = 'rgba(56, 189, 248, ';
      } else if (biomeIndex === 2) {
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    if (this.particles.length > 180) {
      this.particles.splice(0, count);
    }
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

    const isCyber = document.documentElement.getAttribute('data-palette') === 'cyberpunk';
    let bgColor = '#FFFFFF';
    if (this.isDark) {
      if (isCyber) {
        bgColor = '#0B0F17';
      } else if (biomeIndex === 1) {
        bgColor = '#19221E';
      } else if (biomeIndex === 2) {
        bgColor = '#182028';
      } else if (biomeIndex === 3) {
        bgColor = '#201C26';
      } else {
        bgColor = '#1B1F24';
      }
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawAmbientParticles(ctx, biomeIndex);

    ctx.translate(this.camX, this.camY);
    ctx.scale(this.zoom, this.zoom);

    const minCol = Math.floor(-this.camX / (this.tileSize * this.zoom)) - 2;
    const maxCol = Math.ceil((this.width - this.camX) / (this.tileSize * this.zoom)) + 2;
    const minRow = Math.floor(-this.camY / (this.tileSize * this.zoom)) - 2;
    const maxRow = Math.ceil((this.height - this.camY) / (this.tileSize * this.zoom)) + 2;
    this.frustum = { minCol, maxCol, minRow, maxRow };

    this.drawGrid(ctx);
    this.drawMines(ctx);
    this.drawTunnelGuides(ctx);

    for (const piece of this.grid.getAllPieces()) {
      if (piece.x < minCol || piece.x > maxCol || piece.y < minRow || piece.y > maxRow) continue;
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

    // Telemetría de flujo IPM por nodo
    if (this.showIPMOverlay) {
      this.drawIPMOverlay(ctx);
    }

    // Barras de progreso y avisos de ingredientes flotantes del DLC
    if (QuantumDLC.isEnabled) {
      QuantumDLC.renderFloatingStatus(this, ctx, this.tileSize);
    }

    ctx.restore();

    this.drawParticles(ctx, dt);
    this.drawMinimap(ctx);
  }

  drawMinimap(ctx) {
    if (!this.grid || this.width < 360) return;
    const isMobile = this.width <= 768;
    const mapSize = isMobile ? 114 : 154;
    const padX = 12;
    const padY = isMobile ? (this.height - mapSize - 118) : (this.height - mapSize - 108);
    if (padY < 70) return;

    const worldCenterX = 5;
    const worldCenterY = 2;
    const worldRange = 145;
    this.minimapRect = {
      x: padX,
      y: padY,
      w: mapSize,
      h: mapSize,
      size: mapSize,
      worldRange,
      worldSpan: worldRange,
      centerX: worldCenterX,
      centerY: worldCenterY
    };
    const scale = mapSize / (worldRange * 2);

    ctx.save();
    ctx.fillStyle = this.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = this.isDark ? 'rgba(56, 189, 248, 0.42)' : 'rgba(15, 23, 42, 0.22)';
    ctx.lineWidth = 1.5;

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(padX, padY, mapSize, mapSize, 12);
      ctx.fill();
      ctx.stroke();
      ctx.clip();
    } else {
      ctx.fillRect(padX, padY, mapSize, mapSize);
      ctx.strokeRect(padX, padY, mapSize, mapSize);
    }

    const toMiniX = (gx) => padX + mapSize / 2 + (gx - worldCenterX) * scale;
    const toMiniY = (gy) => padY + mapSize / 2 + (gy - worldCenterY) * scale;

    // 1. Dibujar anillos guía de distancia logística alrededor del Almacén 3x3
    ctx.strokeStyle = this.isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.07)';
    ctx.lineWidth = 1;
    [35, 75, 120].forEach(rad => {
      ctx.beginPath();
      ctx.arc(padX + mapSize / 2, padY + mapSize / 2, rad * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 2. Dibujar zonas de menas (formas, pinturas y cuánticas)
    for (const mine of this.grid.getAllMines()) {
      const mx = toMiniX(mine.x);
      const my = toMiniY(mine.y);
      if (mx < padX - 4 || mx > padX + mapSize + 4 || my < padY - 4 || my > padY + mapSize + 4) continue;
      const isPaint = !!(mine.isPaintVein || (mine.shape && mine.shape.isPaintDrop));
      const cName = isPaint ? mine.paintColor : (mine.shape?.left?.color || 'mint');
      ctx.fillStyle = mine.resourceType ? '#C084FC' : (COLOR_HEX[cName] || '#A8D5BA');
      ctx.fillRect(mx - 1.4, my - 1.4, 2.8, 2.8);
    }

    // 3. Dibujar construcciones y el Almacén Central 3x3
    for (const piece of this.grid.getAllPieces()) {
      const px = toMiniX(piece.x);
      const py = toMiniY(piece.y);
      if (px < padX || px > padX + mapSize || py < padY || py > padY + mapSize) continue;
      if (piece.type === 'delivery') {
        if (piece.isHubCenter || piece.hubRootX === undefined) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(px - 4, py - 4, 8, 8);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(px - 4, py - 4, 8, 8);
        }
      } else if (!piece.fixed) {
        ctx.fillStyle = this.isDark ? '#38BDF8' : '#0284C7';
        ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
      }
    }

    // 4. Rectángulo del viewport actual de la cámara
    const viewMinX = -this.camX / (this.tileSize * this.zoom);
    const viewMinY = -this.camY / (this.tileSize * this.zoom);
    const viewW = this.width / (this.tileSize * this.zoom);
    const viewH = this.height / (this.tileSize * this.zoom);

    const vx = toMiniX(viewMinX);
    const vy = toMiniY(viewMinY);
    const vw = Math.max(4, viewW * scale);
    const vh = Math.max(4, viewH * scale);

    ctx.strokeStyle = this.isDark ? '#F8FAFC' : '#0F172A';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(vx, vy, vw, vh);

    // Etiqueta superior del radar
    ctx.fillStyle = this.isDark ? 'rgba(15, 23, 42, 0.82)' : 'rgba(241, 245, 249, 0.92)';
    ctx.fillRect(padX, padY, mapSize, 16);
    ctx.fillStyle = this.isDark ? '#38BDF8' : '#0284C7';
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MAPA MUNDIAL (TOCA PARA IR)', padX + mapSize / 2, padY + 8.5);

    ctx.restore();
  }

  renderDemoScreensaver(ctx, dt) {
    this.beltAnimOffset = (this.beltAnimOffset + dt * 1.3) % 1.0;
    if (this.game && this.game.demoSim) {
      this.game.demoSim.update(dt, 1.0);
    }

    const isCyber = document.documentElement.getAttribute('data-palette') === 'cyberpunk';
    ctx.fillStyle = this.isDark ? (isCyber ? '#0B0F17' : '#1B1F24') : '#FFFFFF';
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
    const dotColor = this.isDark ? (isCyber ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.08)') : 'rgba(15, 23, 42, 0.08)';
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
    const useFrustum = !customGrid && this.frustum;

    for (const mine of grid.getAllMines()) {
      if (useFrustum && (mine.x < this.frustum.minCol - 1 || mine.x > this.frustum.maxCol + 1 || mine.y < this.frustum.minRow - 1 || mine.y > this.frustum.maxRow + 1)) {
        continue;
      }

      // Yacimientos naturales específicos de la Expansión Biomolecular & Cuántica
      if (mine.resourceType) {
        QuantumDLC.drawDeposit(this, ctx, mine, s);
        continue;
      }

      const cx = (mine.x + 0.5) * s;
      const cy = (mine.y + 0.5) * s;
      const isPaint = !!(mine.isPaintVein || (mine.shape && mine.shape.isPaintDrop));
      const colorName = isPaint ? (mine.paintColor || mine.shape?.paintColor || 'lavender') : ((mine.shape && mine.shape.left) ? mine.shape.left.color : 'mint');
      const hex = COLOR_HEX[colorName] || '#A8D5BA';

      ctx.save();

      // 1. Placa geológica de Zona de Mena Grande (conecta visualmente las casillas contiguas de la veta)
      ctx.fillStyle = this.isDark ? `${hex}22` : `${hex}2E`;
      ctx.strokeStyle = `${hex}66`;
      ctx.lineWidth = 1.4;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(mine.x * s + 1, mine.y * s + 1, s - 2, s - 2, 10);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(mine.x * s + 1, mine.y * s + 1, s - 2, s - 2);
      }

      // 2. Base del yacimiento (Pozo líquido si es Mena de Pintura, o Veta mineral si es Forma)
      const pulse = Math.sin(performance.now() * 0.003 + mine.x * 2 + mine.y * 2) * 2.0;

      if (isPaint) {
        // Pozo de Pintura / Pigmento Líquido
        ctx.fillStyle = this.isDark ? '#1A202C' : '#F8FAFC';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.39, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `${hex}CC`;
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.31 + pulse * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, s * 0.14, Math.PI * 0.8, Math.PI * 1.6);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = this.isDark ? '#232933' : '#F1F5F9';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.39, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `${hex}99`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.39, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Si no hay extractor colocado encima, mostrar el recurso o gota de pintura
      const pieceOnTop = grid.get(mine.x, mine.y);
      if (!pieceOnTop || pieceOnTop.type !== 'extractor') {
        ctx.save();
        ctx.translate(cx, cy);
        Shapes.draw(ctx, mine.shape, s * 0.27, this.isDark);
        ctx.restore();
      }

      // 4. Etiqueta flotante de Zona de Mena en el nodo central del yacimiento
      if (mine.clusterLabel && (!customGrid && this.zoom >= 0.42)) {
        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = mine.clusterLabel;
        const lw = Math.max(64, label.length * 5.8 + 12);
        const lh = 15;
        const lx = cx - lw / 2;
        const ly = mine.y * s - 11;

        ctx.fillStyle = this.isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = hex;
        ctx.lineWidth = 1.2;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(lx, ly, lw, lh, 6);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(lx, ly, lw, lh);
        }
        ctx.fillStyle = this.isDark ? '#F8FAFC' : '#0F172A';
        ctx.fillText(label, cx, ly + lh / 2 + 0.5);
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
      // Si forma parte del Almacén Central 3x3, dibujar únicamente 1 cartel sobre el núcleo central
      if (piece.hubRootX !== undefined && !piece.isHubCenter) continue;

      const matchingDemands = this.game.currentDemands;
      if (!matchingDemands || matchingDemands.length === 0) continue;

      const cx = (piece.x + 0.5) * s;
      const topTileY = piece.isHubCenter ? (piece.y - 1) : piece.y;
      const cy = topTileY * s - 18;

      const badgeWidth = Math.max(68, matchingDemands.length * 54 + 14);
      const badgeHeight = 24;
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

  drawIPMOverlay(ctx) {
    if (!this.sim) return;
    const s = this.tileSize;
    const { minCol, maxCol, minRow, maxRow } = this.frustum;

    ctx.save();
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const piece of this.grid.getAllPieces()) {
      if (piece.x < minCol || piece.x > maxCol || piece.y < minRow || piece.y > maxRow) continue;
      if (piece.type === 'obstacle' || piece.type === 'water' || piece.type === 'cutter_part' || piece.type === 'factory_2x2_part') continue;

      const ipm = this.sim.getNodeIPM(piece.x, piece.y);
      const isKeyNode = piece.type === 'extractor' || piece.type === 'delivery' || piece.type === 'splitter' || piece.type === 'balancer' || piece.type === 'cross_hub' || piece.type === 'painter' || piece.type === 'cutter' || piece.type === 'factory_1x1' || piece.type === 'factory_2x2';

      if (ipm <= 0 && !isKeyNode) continue;

      const cx = (piece.x + 0.5) * s;
      const cy = (piece.y + 0.5) * s + s * 0.34;
      const label = `${ipm}/m`;
      const pillW = Math.max(32, label.length * 6.2 + 8);
      const pillH = 14;

      let pillBg = 'rgba(15, 23, 42, 0.85)';
      let pillBorder = '#38BDF8';
      let textColor = '#38BDF8';

      if (ipm >= 120) {
        pillBorder = '#EC4899';
        textColor = '#F472B6';
      } else if (ipm >= 50) {
        pillBorder = '#10B981';
        textColor = '#34D399';
      } else if (ipm === 0) {
        pillBorder = 'rgba(148, 163, 184, 0.4)';
        textColor = '#94A3B8';
      }

      ctx.fillStyle = pillBg;
      ctx.strokeStyle = pillBorder;
      ctx.lineWidth = 1;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH, 4);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(cx - pillW / 2, cy - pillH / 2, pillW, pillH);
      }

      ctx.fillStyle = textColor;
      ctx.fillText(label, cx, cy + 0.5);
    }

    ctx.restore();
  }

  drawGrid(ctx) {
    const startCol = Math.floor(-this.camX / (this.tileSize * this.zoom)) - 1;
    const endCol = Math.ceil((this.width - this.camX) / (this.tileSize * this.zoom)) + 1;
    const startRow = Math.floor(-this.camY / (this.tileSize * this.zoom)) - 1;
    const endRow = Math.ceil((this.height - this.camY) / (this.tileSize * this.zoom)) + 1;

    const isCyber = document.documentElement.getAttribute('data-palette') === 'cyberpunk';
    const dotColor = this.isDark
      ? (isCyber ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.08)')
      : (isCyber ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.08)');
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
      case 'belt_hyper':
        this.renderHyperBeltTile(ctx, piece, s);
        break;
      case 'belt_slow':
        this.renderSlowBeltTile(ctx, piece, s);
        break;
      case 'splitter':
        this.renderSplitterTile(ctx, piece, s);
        break;
      case 'balancer':
        this.renderBalancerTile(ctx, piece, s);
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
      case 'cross_hub':
        this.renderCrossHubTile(ctx, piece, s);
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
        this.renderDeliveryTile(ctx, piece, s);
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

  detectBeltNeighborhood(piece) {
    let isLeftCurve = false;
    let isRightCurve = false;
    let hasBackInput = false;
    let hasFrontOutput = false;

    if (piece && piece.x !== undefined && piece.y !== undefined) {
      const dir = piece.dir || 0;
      const backDelta = DIR_DELTA[OPPOSITE_DIR[dir]];
      const backPiece = this.grid.get(piece.x + backDelta.x, piece.y + backDelta.y);
      hasBackInput = !!(backPiece && backPiece.type !== 'obstacle' && backPiece.dir === dir);

      const frontDelta = DIR_DELTA[dir];
      const frontPiece = this.grid.get(piece.x + frontDelta.x, piece.y + frontDelta.y);
      hasFrontOutput = !!(frontPiece && frontPiece.type !== 'obstacle');

      if (!hasBackInput) {
        const leftDelta = DIR_DELTA[(dir + 3) % 4];
        const leftPiece = this.grid.get(piece.x + leftDelta.x, piece.y + leftDelta.y);
        const hasLeftInput = leftPiece && leftPiece.type !== 'obstacle' && leftPiece.dir === (dir + 1) % 4;

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
    return { isLeftCurve, isRightCurve, hasBackInput, hasFrontOutput };
  }

  drawBeltTrackAndChevrons(ctx, piece, s, baseDark1, baseDark2, baseLight1, baseLight2, trackColor, arrowColor, speedMult = 1.0, count = 3) {
    const { isLeftCurve, isRightCurve, hasBackInput, hasFrontOutput } = this.detectBeltNeighborhood(piece);
    const animOffset = (this.beltAnimOffset * speedMult) % 1.0;

    if (isLeftCurve || isRightCurve) {
      this.drawTileBase(ctx, s, baseDark1, baseDark2, baseLight1, baseLight2, 6);
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = s * 0.56;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      if (isLeftCurve) {
        ctx.arc(s / 2, -s / 2, s / 2, Math.PI, Math.PI / 2, true);
      } else {
        ctx.arc(s / 2, s / 2, s / 2, Math.PI, 3 * Math.PI / 2, false);
      }
      ctx.stroke();

      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < count; i++) {
        const offset = ((i / count) + animOffset) % 1.0;
        const ang = isLeftCurve ? (Math.PI - offset * (Math.PI / 2)) : (Math.PI + offset * (Math.PI / 2));
        const ax = s / 2 + Math.cos(ang) * (s / 2);
        const ay = (isLeftCurve ? -s / 2 : s / 2) + Math.sin(ang) * (s / 2);
        const tang = isLeftCurve ? (ang - Math.PI / 2) : (ang + Math.PI / 2);

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
      this.drawBeltBase(ctx, s, baseDark1, baseDark2, baseLight1, baseLight2, hasBackInput, hasFrontOutput);

      const trackLeft = hasBackInput ? -s / 2 : -s / 2 + 3;
      const trackRight = hasFrontOutput ? s / 2 : s / 2 - 3;
      ctx.fillStyle = trackColor;
      ctx.fillRect(trackLeft, -s * 0.28, trackRight - trackLeft, s * 0.56);

      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < count; i++) {
        const offset = ((i / count) + animOffset) % 1.0;
        const x = -s / 2 + offset * s;
        ctx.beginPath();
        ctx.moveTo(x - 5, -s * 0.18);
        ctx.lineTo(x + 2, 0);
        ctx.lineTo(x - 5, s * 0.18);
        ctx.stroke();
      }
    }
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
    } else if (skin === 'skin_plasma') {
      baseLight1 = '#F3E8FF'; baseLight2 = '#E9D5FF';
      baseDark1 = '#2E1065'; baseDark2 = '#1E1B4B';
      trackColor = this.isDark ? '#3B0764' : '#D8B4FE';
      arrowColor = this.isDark ? '#F472B6' : '#9333EA';
    }

    this.drawBeltTrackAndChevrons(ctx, piece, s, baseDark1, baseDark2, baseLight1, baseLight2, trackColor, arrowColor, 1.0, 3);
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
    const colorHex = COLOR_HEX[piece.color || 'lavender'] || '#C9B6E4';
    this.drawTileBase(ctx, s, '#352C3E', '#261F2E', '#F1EBF7', '#E0D4EC', 8);

    // Boquillas laterales de entrada para Materia Prima de Pintura (Gotas de Pigmento)
    ctx.fillStyle = this.isDark ? '#4A3B5C' : '#D2C0E8';
    ctx.fillRect(-s * 0.14, -s / 2 + 2, s * 0.28, 6);
    ctx.fillRect(-s * 0.14, s / 2 - 8, s * 0.28, 6);

    const time = performance.now() * 0.003;
    const dropPulse = 1.0 + Math.sin(time * 3.5) * 0.08;

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24 * dropPulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Barra de nivel del Tanque de Tinta (paintTank)
    const tank = piece.paintTank !== undefined ? piece.paintTank : 6;
    const maxTank = 20;
    const fillRatio = Math.max(0, Math.min(1, tank / maxTank));
    const barW = s * 0.56;
    const barH = 4;
    ctx.fillStyle = this.isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(15, 23, 42, 0.15)';
    ctx.fillRect(-barW / 2, s * 0.28, barW, barH);
    ctx.fillStyle = tank > 0 ? colorHex : '#EF4444';
    ctx.fillRect(-barW / 2, s * 0.28, barW * fillRatio, barH);

    // Si el tanque se quedó sin pintura, mostrar aviso claro
    if (piece.paintTank !== undefined && piece.paintTank <= 0 && !piece.infinitePaint) {
      ctx.save();
      ctx.rotate(-(piece.dir || 0) * (Math.PI / 2));
      ctx.fillStyle = '#EF4444';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💧SIN TINTA', 0, -s * 0.34);
      ctx.restore();
    }

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

  renderDeliveryTile(ctx, piece, s) {
    // Si es parte del Almacén Central 3x3 pero no es la casilla central, el núcleo central dibuja toda la estructura 3x3
    if (piece && piece.hubRootX !== undefined && !piece.isHubCenter) {
      return;
    }

    // Si es el núcleo central del Almacén 3x3 (cubre de -1.5*s a +1.5*s con 12 bocas de entrada)
    if (piece && piece.isHubCenter) {
      const totalS = s * 3;
      const half = totalS / 2;
      const isDark = this.isDark;
      const time = performance.now() * 0.0025;

      ctx.save();
      // Deshacer rotación por si acaso
      if (piece.dir) {
        ctx.rotate(-piece.dir * (Math.PI / 2));
      }

      // 1. Plataforma industrial 3x3
      const grad = ctx.createLinearGradient(-half, -half, half, half);
      if (isDark) {
        grad.addColorStop(0, '#132A23');
        grad.addColorStop(1, '#0B1915');
      } else {
        grad.addColorStop(0, '#E6F7ED');
        grad.addColorStop(1, '#C6EBDA');
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = isDark ? '#10B981' : '#059669';
      ctx.lineWidth = 2.6;

      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-half + 2, -half + 2, totalS - 4, totalS - 4, 16);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-half + 2, -half + 2, totalS - 4, totalS - 4);
        ctx.strokeRect(-half + 2, -half + 2, totalS - 4, totalS - 4);
      }

      // 2. Las 12 Bocas de Entrada (3 Norte, 3 Sur, 3 Oeste, 3 Este)
      const portOffsets = [-s, 0, s];
      const portW = s * 0.54;
      const portDepth = 11;
      const portColor = isDark ? '#1E3F35' : '#A7F3D0';
      const arrowColor = isDark ? '#34D399' : '#047857';
      const animShift = (this.beltAnimOffset % 1.0) * 5;

      ctx.fillStyle = portColor;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      for (const ofs of portOffsets) {
        // Norte (entra hacia abajo +Y)
        ctx.fillRect(ofs - portW / 2, -half + 2, portW, portDepth);
        ctx.beginPath();
        ctx.moveTo(ofs - 4, -half + 5 + animShift);
        ctx.lineTo(ofs, -half + 10 + animShift);
        ctx.lineTo(ofs + 4, -half + 5 + animShift);
        ctx.stroke();

        // Sur (entra hacia arriba -Y)
        ctx.fillRect(ofs - portW / 2, half - 2 - portDepth, portW, portDepth);
        ctx.beginPath();
        ctx.moveTo(ofs - 4, half - 5 - animShift);
        ctx.lineTo(ofs, half - 10 - animShift);
        ctx.lineTo(ofs + 4, half - 5 - animShift);
        ctx.stroke();

        // Oeste (entra hacia la derecha +X)
        ctx.fillRect(-half + 2, ofs - portW / 2, portDepth, portW);
        ctx.beginPath();
        ctx.moveTo(-half + 5 + animShift, ofs - 4);
        ctx.lineTo(-half + 10 + animShift, ofs);
        ctx.lineTo(-half + 5 + animShift, ofs + 4);
        ctx.stroke();

        // Este (entra hacia la izquierda -X)
        ctx.fillRect(half - 2 - portDepth, ofs - portW / 2, portDepth, portW);
        ctx.beginPath();
        ctx.moveTo(half - 5 - animShift, ofs - 4);
        ctx.lineTo(half - 10 - animShift, ofs);
        ctx.lineTo(half - 5 - animShift, ofs + 4);
        ctx.stroke();
      }

      // 3. Anillo del Vórtice Central del Almacén 3x3
      ctx.fillStyle = isDark ? 'rgba(6, 78, 59, 0.55)' : 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.88, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.rotate(time);
      ctx.strokeStyle = isDark ? '#34D399' : '#10B981';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.84, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 4. Mostrar la Forma Objetivo actual y el contador en el corazón del Almacén 3x3
      const activeDemand = this.game?.currentDemands?.find(d => d.delivered < d.quota) || this.game?.currentDemands?.[0];
      if (activeDemand && activeDemand.shape) {
        ctx.save();
        ctx.translate(0, -s * 0.16);
        Shapes.draw(ctx, activeDemand.shape, s * 0.42, isDark);
        ctx.restore();

        ctx.font = '800 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? '#ECFDF5' : '#064E3B';
        const deliv = this.game?.deliveredCount || 0;
        const quota = this.game?.totalQuota || activeDemand.quota || 0;
        ctx.fillText(`${deliv}/${quota}`, 0, s * 0.46);
      } else {
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? '#A7F3D0' : '#047857';
        ctx.fillText('HUB 3×3', 0, 0);
      }

      // Etiqueta inferior sutil
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? 'rgba(167, 243, 208, 0.78)' : 'rgba(4, 120, 87, 0.82)';
      ctx.fillText(`ALMACÉN CENTRAL • 12 ENTRADAS`, 0, half - 17);

      ctx.restore();
      return;
    }

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
    const trackColor = this.isDark ? '#1E3A4B' : '#BAE6FD';
    const arrowColor = this.isDark ? '#38BDF8' : '#0284C7';
    this.drawBeltTrackAndChevrons(ctx, piece, s, '#1D2F38', '#142229', '#E0F2FE', '#BAE6FD', trackColor, arrowColor, 2.0, 4);
  }

  renderHyperBeltTile(ctx, piece, s) {
    const trackColor = this.isDark ? '#311042' : '#F3E8FF';
    const arrowColor = this.isDark ? '#F472B6' : '#DB2777';
    this.drawBeltTrackAndChevrons(ctx, piece, s, '#240B36', '#150621', '#FAE8FF', '#F5D0FE', trackColor, arrowColor, 3.2, 5);

    // Raíles laterales de neón cian para MK3 Hyper Belt
    ctx.strokeStyle = this.isDark ? 'rgba(56, 189, 248, 0.65)' : 'rgba(2, 132, 199, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s / 2 + 3, -s * 0.28);
    ctx.lineTo(s / 2 - 3, -s * 0.28);
    ctx.moveTo(-s / 2 + 3, s * 0.28);
    ctx.lineTo(s / 2 - 3, s * 0.28);
    ctx.stroke();
  }

  renderSlowBeltTile(ctx, piece, s) {
    const trackColor = this.isDark ? '#4A3B2E' : '#E8CCA8';
    const arrowColor = this.isDark ? '#F59E0B' : '#B45309';
    this.drawBeltTrackAndChevrons(ctx, piece, s, '#382E26', '#2A221B', '#FDF4EC', '#F4DEC9', trackColor, arrowColor, 0.5, 2);
  }

  renderSplitterTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#243530', '#1A2723', '#E3F4ED', '#C9E8DC', 8);

    const trackColor = this.isDark ? '#2E473F' : '#BFE3D4';
    const arrowColor = this.isDark ? '#A8D5BA' : '#2D8A5B';
    const prioMode = piece?.priorityMode || 'balanced';

    // Canal central y ramales
    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.20, s * 0.45, s * 0.40);
    ctx.fillRect(0, -s * 0.20, s / 2 - 4, s * 0.40);
    ctx.fillRect(-s * 0.20, 0, s * 0.40, s / 2 - 4);

    // Separador central (cambia de color según prioridad)
    ctx.fillStyle = prioMode === 'balanced' ? arrowColor : '#F59E0B';
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Flechas indicadoras de salida
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    // Flecha recta
    ctx.strokeStyle = prioMode === 'priority_main' ? '#F59E0B' : arrowColor;
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.12);
    ctx.lineTo(s * 0.36, 0);
    ctx.lineTo(s * 0.22, s * 0.12);
    ctx.stroke();

    // Flecha lateral
    ctx.strokeStyle = prioMode === 'priority_side' ? '#F59E0B' : arrowColor;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.22);
    ctx.lineTo(0, s * 0.36);
    ctx.lineTo(s * 0.12, s * 0.22);
    ctx.stroke();
  }

  renderBalancerTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#1B2E3C', '#12202B', '#E0F2FE', '#BAE6FD', 8);

    const trackColor = this.isDark ? '#223D50' : '#93C5FD';
    const accentColor = this.isDark ? '#38BDF8' : '#0284C7';

    // Entrada trasera + 3 salidas (frontal, izquierda -Y, derecha +Y)
    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.18, s - 8, s * 0.36);
    ctx.fillRect(-s * 0.18, -s / 2 + 4, s * 0.36, s - 8);

    // Núcleo giratorio de 3 vías
    const rot = (performance.now() * 0.0025) % (Math.PI * 2);
    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // 3 Flechas de salida (Frontal +X, Izquierda -Y, Derecha +Y)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';

    // Frontal
    ctx.beginPath();
    ctx.moveTo(s * 0.24, -4);
    ctx.lineTo(s * 0.36, 0);
    ctx.lineTo(s * 0.24, 4);
    ctx.stroke();

    // Izquierda (-Y)
    ctx.beginPath();
    ctx.moveTo(-4, -s * 0.24);
    ctx.lineTo(0, -s * 0.36);
    ctx.lineTo(4, -s * 0.24);
    ctx.stroke();

    // Derecha (+Y)
    ctx.beginPath();
    ctx.moveTo(-4, s * 0.24);
    ctx.lineTo(0, s * 0.36);
    ctx.lineTo(4, s * 0.24);
    ctx.stroke();
  }

  renderCrossHubTile(ctx, piece, s) {
    this.drawTileBase(ctx, s, '#2D1F3D', '#1D1429', '#F3E8FF', '#E9D5FF', 9);

    const colorHex = COLOR_HEX[piece.color || 'lavender'] || '#C9B6E4';
    const trackColor = this.isDark ? '#3D2952' : '#D8B4FE';

    // Entrada trasera (-X) y entrada izquierda (-Y) -> Salida frontal (+X)
    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 3, -s * 0.20, s - 6, s * 0.40);
    ctx.fillRect(-s * 0.20, -s / 2 + 3, s * 0.40, s * 0.55);

    // Anillo reactor híbrido (fusión + pigmento)
    const pulse = 1.0 + Math.sin(performance.now() * 0.004) * 0.08;
    ctx.fillStyle = this.isDark ? '#140E1D' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo de fusión cruzada en el centro
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(-3, 0, 3.2, 0, Math.PI * 2);
    ctx.arc(3, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Indicador de pieza en espera si tiene heldLeft o heldRight
    if (piece.heldLeft || piece.heldRight) {
      ctx.fillStyle = '#34D399';
      ctx.beginPath();
      ctx.arc(-s * 0.28, -s * 0.28, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boquilla de salida frontal
    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -5);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 5);
    ctx.closePath();
    ctx.fill();
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
      case 'belt_hyper':
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
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 1) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        break;

      case 'cross_hub':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: false });
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

      case 'balancer':
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 2) % 4, isExit: false });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: dir, isExit: true });
        ports.push({ x: ghost.x, y: ghost.y, borderDir: (dir + 3) % 4, isExit: true });
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
    const useFrustum = !customItems && this.frustum;

    for (const item of items) {
      if (item.isUnderground) continue;
      if (useFrustum && (item.x < this.frustum.minCol || item.x > this.frustum.maxCol || item.y < this.frustum.minRow || item.y > this.frustum.maxRow)) {
        continue;
      }

      const piece = (customItems && this.game.demoGrid) ? this.game.demoGrid.get(item.x, item.y) : this.grid.get(item.x, item.y);
      if (!piece) continue;

      const cx = (item.x + 0.5) * s;
      const cy = (item.y + 0.5) * s;
      const inDir = item.inDir !== undefined ? item.inDir : piece.dir;
      const outDir = piece.dir;
      const isBeltTier = piece.type === 'belt' || piece.type === 'belt_fast' || piece.type === 'belt_hyper' || piece.type === 'belt_slow';

      let drawX = cx;
      let drawY = cy;

      if (inDir === outDir || !isBeltTier) {
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
      if (inDir !== outDir && isBeltTier) {
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
    this.lastPinchMidX = 0;
    this.lastPinchMidY = 0;
    this.wasMultiTouch = false;
    this.touchStartCell = null;
    this.touchDownTime = 0;
    this.longPressTimer = null;
    this.longPressTriggered = false;

    this.bindEvents();
  }

  isBeltTool(tool) {
    return tool === 'belt' || tool === 'belt_fast' || tool === 'belt_hyper' || tool === 'belt_slow';
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
      return;
    }

    // Clic o toque en el Radar de Menas (Minimapa) para desplazar la cámara al instante
    if (this.game && this.game.renderer && this.game.renderer.minimapRect) {
      const r = this.game.renderer.minimapRect;
      if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
        const relX = (e.clientX - (r.x + r.w / 2)) / (r.w / 2);
        const relY = (e.clientY - (r.y + r.h / 2)) / (r.h / 2);
        const targetTileX = (r.centerX || 0) + relX * r.worldRange;
        const targetTileY = (r.centerY || 0) + relY * r.worldRange;
        this.game.renderer.centerOn(targetTileX, targetTileY);
        this.game.audio?.playTone?.(540, 'sine', 0.04, 0.015);
        return;
      }
    }

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Si hay 2 o más dedos en pantalla: MODO MOVIMIENTO Y ZOOM (bloquea colocación de cintas)
    if (this.activePointers.size >= 2) {
      clearTimeout(this.longPressTimer);
      this.wasMultiTouch = true;
      this.isDraggingMap = true;
      this.touchStartCell = null;
      this.lastPlacedCell = null;
      this.canvas.classList.add('grabbing');

      const points = Array.from(this.activePointers.values());
      this.initialPinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      this.initialPinchZoom = this.game.renderer.zoom;
      this.lastPinchMidX = (points[0].x + points[1].x) / 2;
      this.lastPinchMidY = (points[0].y + points[1].y) / 2;
      return;
    }

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
      this.wasMultiTouch = false;
      this.isPointerDown = true;
      this.button = e.button;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.isDraggingMap = false;
      this.longPressTriggered = false;
      this.lastPlacedCell = null;
      this.touchDownTime = performance.now();

      // 3. MODO VISTA: clic izquierdo o 1 dedo no coloca, desplaza la cámara libremente
      if (this.game.mode === 'view') {
        this.isDraggingMap = true;
        this.canvas.classList.add('grabbing');
        return;
      }

      // 4. MODO EDICIÓN: colocar o borrar piezas
      const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
      this.touchStartCell = { x: pos.gridX, y: pos.gridY };

      if (e.pointerType === 'touch') {
        // En táctil NO colocamos cinta en el instante 0ms por si el usuario está apoyando el 2º dedo para mover/zoom.
        // La cinta se colocará al arrastrar con 1 solo dedo en línea o al levantar el dedo (tap).
        clearTimeout(this.longPressTimer);
        this.longPressTimer = setTimeout(() => {
          if (!this.wasMultiTouch && this.activePointers.size === 1 && !this.isDraggingMap) {
            this.longPressTriggered = true;
            const p = this.game.renderer.screenToWorld(e.clientX, e.clientY);
            this.game.removePieceAt(p.gridX, p.gridY);
          }
        }, 420);
      } else {
        if (e.button === 2 || this.game.selectedTool === 'erase') {
          this.game.removePieceAt(pos.gridX, pos.gridY);
        } else if (e.button === 0) {
          if (this.isBeltTool(this.game.selectedTool)) {
            this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          } else {
            this.game.placePieceAt(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          }
        }
      }
    }
  }

  onPointerMove(e) {
    if (this.game && this.game.state === 'menu') return;

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // GESTOS DE 2 DEDOS: Mover cámara + Pinch-to-Zoom (NUNCA coloca cintas)
    if (this.activePointers.size >= 2) {
      clearTimeout(this.longPressTimer);
      this.wasMultiTouch = true;
      this.isDraggingMap = true;
      this.touchStartCell = null;
      this.lastPlacedCell = null;

      const points = Array.from(this.activePointers.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const midX = (points[0].x + points[1].x) / 2;
      const midY = (points[0].y + points[1].y) / 2;

      if (this.lastPinchMidX && this.lastPinchMidY) {
        this.game.renderer.camX += (midX - this.lastPinchMidX);
        this.game.renderer.camY += (midY - this.lastPinchMidY);
      }

      if (this.initialPinchDistance > 12 && Math.abs(currentDist - this.initialPinchDistance) > 6) {
        const factor = currentDist / this.initialPinchDistance;
        this.game.setZoom(this.initialPinchZoom * factor, midX, midY);
      }
      this.lastPinchMidX = midX;
      this.lastPinchMidY = midY;
      return;
    }

    // Si venimos de un gesto de 2 dedos y aún queda 1 dedo apoyado, seguir moviendo la cámara sin poner cintas
    if (this.wasMultiTouch) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.game.renderer.camX += dx;
      this.game.renderer.camY += dy;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      return;
    }

    const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
    this.lastHoverGrid = { x: pos.gridX, y: pos.gridY };
    this.game.updateGhost(pos.gridX, pos.gridY);

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

    // MODO EDICIÓN (1 solo dedo o ratón)
    if (e.pointerType === 'touch') {
      // Pequeña ventana de 45ms al apoyar el primer dedo para detectar si el usuario apoya el segundo dedo
      if (performance.now() - this.touchDownTime < 45) {
        return;
      }

      if (this.isBeltTool(this.game.selectedTool)) {
        // Con 1 dedo y herramienta de cinta: al arrastrar de una casilla a otra se trazan las cintas en línea recta
        const startCell = this.lastPlacedCell || this.touchStartCell;
        if (startCell && (startCell.x !== pos.gridX || startCell.y !== pos.gridY)) {
          this.game.dragDrawBelt(startCell.x, startCell.y, pos.gridX, pos.gridY);
          this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
        }
      } else if (this.game.selectedTool === 'erase') {
        this.game.removePieceAt(pos.gridX, pos.gridY);
      } else {
        // En táctil con otras máquinas (extractor, pintor, etc.), arrastrar con 1 dedo desplaza la cámara
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
        } else if (this.isBeltTool(this.game.selectedTool)) {
          if (!this.lastPlacedCell) {
            this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          } else if (this.lastPlacedCell.x !== pos.gridX || this.lastPlacedCell.y !== pos.gridY) {
            this.game.dragDrawBelt(this.lastPlacedCell.x, this.lastPlacedCell.y, pos.gridX, pos.gridY);
            this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
          }
        } else {
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

    // Si quedaba 1 dedo tras levantar el segundo en un gesto multitáctil, sincronizar su posición para evitar saltos
    if (this.activePointers.size === 1 && this.wasMultiTouch) {
      const remaining = Array.from(this.activePointers.values())[0];
      this.lastPointerX = remaining.x;
      this.lastPointerY = remaining.y;
      return;
    }

    this.canvas.classList.remove('grabbing');

    if (this.game && this.game.state === 'menu') {
      return;
    }

    if (this.activePointers.size === 0) {
      // Si fue un gesto de 2 dedos (zoom o mover mapa), salir limpiamente sin colocar ninguna cinta
      if (this.wasMultiTouch) {
        this.wasMultiTouch = false;
        this.isPointerDown = false;
        this.isDraggingMap = false;
        this.longPressTriggered = false;
        this.lastPlacedCell = null;
        this.touchStartCell = null;
        return;
      }

      const totalDist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);

      // Si es un toque limpio con 1 solo dedo
      if (!this.isDraggingMap && !this.longPressTriggered && totalDist < 14) {
        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        const clickedPiece = this.game.grid.get(pos.gridX, pos.gridY);

        if (this.game.mode === 'view') {
          if (clickedPiece) {
            if (clickedPiece.type === 'factory_1x1' || clickedPiece.type === 'factory_2x2' || clickedPiece.type === 'factory_2x2_part') {
              this.game.ui.openMachineSidebar(clickedPiece);
            } else if (clickedPiece.type === 'painter' || clickedPiece.type === 'cross_hub') {
              this.game.ui.openPainterSidebar(clickedPiece);
            } else if (clickedPiece.type === 'splitter') {
              this.game.ui.openSplitterSidebar(clickedPiece);
            }
          }
        } else if (this.game.mode === 'edit' && e.pointerType === 'touch') {
          if (this.game.selectedTool === 'erase') {
            this.game.removePieceAt(pos.gridX, pos.gridY);
          } else if (this.isBeltTool(this.game.selectedTool)) {
            if (!this.lastPlacedCell) {
              this.game.handleBeltPlacement(pos.gridX, pos.gridY);
            }
          } else {
            this.game.placePieceAt(pos.gridX, pos.gridY);
          }
        }
      }

      this.isPointerDown = false;
      this.isDraggingMap = false;
      this.longPressTriggered = false;
      this.lastPlacedCell = null;
      this.touchStartCell = null;
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

    // Tecla I para alternar telemetría IPM en vivo
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'i' || e.key === 'I')) {
      this.game.toggleIPMOverlay();
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
    // Shift+1 o ! -> Cinta Rápida MK2
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
    // Tecla H -> Cinta Hiper MK3
    if (!e.ctrlKey && !e.metaKey && (e.key === 'h' || e.key === 'H')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('belt_hyper');
      return;
    }
    // Tecla G -> Balanceador Triple (1:3)
    if (!e.ctrlKey && !e.metaKey && (e.key === 'g' || e.key === 'G')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('balancer');
      return;
    }
    // Tecla K -> Hub Cruzado (Fusión + Pintura)
    if (!e.ctrlKey && !e.metaKey && (e.key === 'k' || e.key === 'K')) {
      if (this.game.mode === 'view') this.game.toggleMode();
      this.game.selectTool('cross_hub');
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

    // Interacción y cambio de receta, prioridad o color (Tecla E) sobre máquina con el ratón encima
    if (!e.ctrlKey && !e.metaKey && (e.key === 'e' || e.key === 'E')) {
      if (this.lastHoverGrid) {
        const piece = this.game.grid.get(this.lastHoverGrid.x, this.lastHoverGrid.y);
        if (piece && (piece.type === 'factory_1x1' || piece.type === 'factory_2x2' || piece.type === 'factory_2x2_part')) {
          this.game.ui.openMachineSidebar(piece);
          return;
        } else if (piece && (piece.type === 'painter' || piece.type === 'cross_hub')) {
          this.game.ui.openPainterSidebar(piece);
          return;
        } else if (piece && piece.type === 'splitter') {
          this.game.ui.openSplitterSidebar(piece);
          return;
        }
      }
      // Si el cursor no está sobre una máquina colocada, abrir drawer para el preset activo
      if (this.game.selectedTool === 'factory_1x1' || this.game.selectedTool === 'factory_2x2') {
        this.game.ui.openMachineSidebar(null);
        return;
      } else if (this.game.selectedTool === 'painter' || this.game.selectedTool === 'cross_hub') {
        this.game.ui.openPainterSidebar(null);
        return;
      } else if (this.game.selectedTool === 'splitter') {
        this.game.ui.openSplitterSidebar(null);
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
    // 1. Menú Principal Split-Screen (con stopPropagation y control limpio de modales)
    document.getElementById('menu-btn-play')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playPlaf();
      this.game.startGameFromMenu();
    });

    document.getElementById('menu-btn-continue')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playPlaf();
      this.game.startGameFromMenu();
    });

    document.querySelector('.menu-preview-overlay')?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Solo iniciar si no hay ningún modal superpuesto abierto
      if (document.querySelector('.modal-overlay.active')) return;
      this.game.audio?.playPlaf?.();
      this.game.startGameFromMenu();
    });

    document.getElementById('menu-btn-levels')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleLevelsModal(true);
    });

    document.getElementById('menu-btn-upgrades')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(560, 'sine', 0.05, 0.02);
      this.toggleUpgradesModal(true);
    });

    document.getElementById('menu-btn-achievements')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleAchievementsModal(true);
    });

    document.getElementById('menu-btn-shop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleShopModal(true);
    });

    document.getElementById('menu-btn-editor')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleEditorModal(true);
    });

    document.getElementById('menu-btn-settings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleSettingsModal(true);
    });

    document.getElementById('menu-btn-credits')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.audio.playTone(520, 'sine', 0.05, 0.02);
      this.toggleCreditsModal(true);
    });

    document.getElementById('btn-back-menu')?.addEventListener('click', (e) => {
      e.stopPropagation();
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
    const tab5 = document.getElementById('tab-chapter-5');
    if (tab5) {
      tab5.addEventListener('click', () => {
        this.activeChapter = 5;
        this.populateLevelsGrid();
      });
    }

    // Toggle de telemetría IPM en tiempo real
    document.getElementById('btn-ipm-toggle')?.addEventListener('click', () => {
      this.game.toggleIPMOverlay();
    });

    // Pestañas de filtro de categoría en la barra de herramientas inferior
    const catBtns = document.querySelectorAll('.toolbar-cat-btn[data-cat]');
    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeToolCategory = btn.dataset.cat || 'all';
        this.filterToolbarByCategory(this.activeToolCategory);
        this.game.audio?.playTone?.(540, 'sine', 0.04, 0.015);
      });
    });

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
      } else if (this.game.selectedTool === 'painter' || this.game.selectedTool === 'cross_hub') {
        this.openPainterSidebar(null);
      } else if (this.game.selectedTool === 'splitter') {
        const splitters = this.game.grid.getAllPieces().filter(p => p.type === 'splitter');
        this.openSplitterSidebar(splitters[0] || null);
      } else {
        this.openMachineSidebar(null);
      }
    });

    // Botones de Modo Zen y Deshacer / Rehacer
    document.getElementById('btn-zen-toggle')?.addEventListener('click', () => this.game.toggleZenMode());
    document.getElementById('btn-undo')?.addEventListener('click', () => this.game.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => this.game.redo());

    // Botones de cierre y apertura de los modales
    document.getElementById('btn-upgrades-modal')?.addEventListener('click', () => this.toggleUpgradesModal(true));
    document.getElementById('btn-close-upgrades')?.addEventListener('click', () => this.toggleUpgradesModal(false));

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
    const btnResetSave = document.getElementById('btn-reset-save');
    if (btnResetSave) {
      btnResetSave.addEventListener('click', () => {
        if (btnResetSave.dataset.confirming === 'true') {
          btnResetSave.dataset.confirming = 'false';
          btnResetSave.textContent = 'Borrar progreso guardado';
          this.game.resetAllProgress();
        } else {
          btnResetSave.dataset.confirming = 'true';
          btnResetSave.textContent = '⚠️ Pulsa de nuevo para confirmar';
          this.showToast("⚠️ Pulsa otra vez para borrar todo el progreso", 2600);
          setTimeout(() => {
            if (btnResetSave.dataset.confirming === 'true') {
              btnResetSave.dataset.confirming = 'false';
              btnResetSave.textContent = 'Borrar progreso guardado';
            }
          }, 3000);
        }
      });
    }

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
        for (let i = 1; i <= 68; i++) {
          if (!this.game.saveData.nivelesCompletados.includes(i)) {
            this.game.saveData.nivelesCompletados.push(i);
          }
          this.game.saveData.estrellas[i] = 3;
        }
        this.game.autoSave();
        this.populateLevelsGrid();
        this.updateMenuStats();
        this.showToast("⭐ ¡Todos los 68 niveles desbloqueados con 3 estrellas!", 2500);
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

    if (this.activeToolCategory && this.activeToolCategory !== 'all') {
      this.filterToolbarByCategory(this.activeToolCategory);
    }

    const colorBar = document.getElementById('painter-color-bar');
    if (colorBar) {
      const isColorTool = (this.game.selectedTool === 'painter' && tools.includes('painter')) ||
                          (this.game.selectedTool === 'cross_hub' && tools.includes('cross_hub'));
      if (isColorTool) {
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

  filterToolbarByCategory(cat = 'all') {
    const logisticsTools = new Set(['belt', 'belt_fast', 'belt_hyper', 'belt_slow', 'tunnel', 'splitter', 'merger', 'balancer', 'crossing', 'filter', 'buffer', 'portal_in', 'portal_out']);
    const processTools = new Set(['extractor', 'painter', 'cutter', 'rotator', 'mixer', 'cross_hub', 'factory_1x1', 'factory_2x2', 'trash', 'erase']);
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const tool = card.dataset.tool;
      const isDlcTool = (tool === 'factory_1x1' || tool === 'factory_2x2');
      if (isDlcTool && !QuantumDLC.isEnabled && !(this.game.currentLevel?.availableTools || []).includes(tool)) {
        card.style.display = 'none';
        return;
      }
      if (cat === 'all') {
        card.style.display = '';
      } else if (cat === 'logistics') {
        card.style.display = (logisticsTools.has(tool) || tool === 'erase') ? '' : 'none';
      } else if (cat === 'process') {
        card.style.display = processTools.has(tool) ? '' : 'none';
      }
    });
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
      if (tool === 'painter' || tool === 'cross_hub') {
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
    const isCrossHub = piece ? piece.type === 'cross_hub' : this.game.selectedTool === 'cross_hub';

    const iconEl = document.getElementById('sidebar-icon');
    const titleEl = document.getElementById('sidebar-title');
    const subtitleEl = document.getElementById('sidebar-subtitle');
    const bodyEl = document.getElementById('sidebar-content');
    const presetBtn = document.getElementById('btn-sidebar-set-preset');

    if (iconEl) iconEl.textContent = isCrossHub ? '🔮' : '🎨';
    if (titleEl) titleEl.textContent = isCrossHub ? 'Hub Cruzado (Fusión + Tinte)' : 'Pintor';
    if (subtitleEl) {
      subtitleEl.textContent = piece ? `Casilla (${piece.x}, ${piece.y})` : 'Pigmento por Defecto';
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

    const tankVal = piece ? (piece.paintTank !== undefined ? piece.paintTank : 6) : 8;

    let html = `
      <div style="padding: 10px 12px; border-radius: 8px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 12px; font-size: 12px; color: var(--text-bright);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong>💧 Tanque de Pigmento: ${tankVal} / 8</strong>
          <button id="btn-refill-painter-now" style="padding: 3px 8px; border-radius: 6px; border: 1px solid #38BDF8; background: rgba(56, 189, 248, 0.2); color: var(--text-bright); cursor: pointer; font-size: 11px; font-weight: 700;">+ Recargar</button>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">
          💡 Conecta un <strong>Extractor sobre una Mena de Pintura (🎨 TINTA)</strong> a los laterales del Pintor para suministrar materia prima automática y adoptar su color.
        </div>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
        ${isCrossHub
          ? 'El Hub Cruzado fusiona la entrada trasera + izquierda y tiñe la pieza compuesta con el pigmento elegido:'
          : 'Selecciona el color de pigmento (o aliméntalo desde una Mena de Pintura del mapa):'}
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
      bodyEl.querySelector('#btn-refill-painter-now')?.addEventListener('click', () => {
        if (piece) {
          piece.paintTank = 8;
          this.game.audio?.playPlaf?.();
          this.openPainterSidebar(piece);
        }
      });
      const cards = bodyEl.querySelectorAll('.sidebar-color-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const color = card.dataset.color;
          if (piece) {
            piece.color = color;
            piece.paintTank = 8;
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

  openSplitterSidebar(piece = null) {
    const sidebar = document.getElementById('machine-config-sidebar');
    if (!sidebar) return;

    const currentMode = piece ? (piece.priorityMode || 'balanced') : (this.game.defaultSplitterMode || 'balanced');

    const iconEl = document.getElementById('sidebar-icon');
    const titleEl = document.getElementById('sidebar-title');
    const subtitleEl = document.getElementById('sidebar-subtitle');
    const bodyEl = document.getElementById('sidebar-content');
    const presetBtn = document.getElementById('btn-sidebar-set-preset');

    if (iconEl) iconEl.textContent = '🔀';
    if (titleEl) titleEl.textContent = 'Divisor Inteligente (1:2)';
    if (subtitleEl) {
      subtitleEl.textContent = piece ? `Casilla (${piece.x}, ${piece.y})` : 'Modo de Enrutamiento';
    }

    if (presetBtn) {
      presetBtn.style.display = 'block';
      presetBtn.textContent = '⭐ Guardar como Modo por Defecto';
      presetBtn.onclick = () => {
        this.game.defaultSplitterMode = piece ? (piece.priorityMode || 'balanced') : currentMode;
        this.showToast(`Modo divisor por defecto actualizado`, 1800);
      };
    }

    const modes = [
      {
        id: 'balanced',
        name: 'Alternancia Equilibrada (50/50)',
        badge: '1:1',
        desc: 'Alterna estrictamente entre la salida frontal y la lateral derecha.'
      },
      {
        id: 'priority_main',
        name: 'Prioridad Salida Frontal (▲)',
        badge: 'PRI ▲',
        desc: 'Envía siempre por el frente. Solo desvía a la derecha si el frente está lleno.'
      },
      {
        id: 'priority_side',
        name: 'Prioridad Salida Derecha (▶)',
        badge: 'PRI ▶',
        desc: 'Envía siempre por la derecha. Solo usa el frente como desbordamiento (overflow).'
      }
    ];

    let html = `
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        Configura la lógica de prioridad y desbordamiento de este divisor:
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
    `;

    for (const m of modes) {
      const isSelected = currentMode === m.id;
      html += `
        <div class="sidebar-splitter-card ${isSelected ? 'active' : ''}" data-mode="${m.id}" style="
          padding: 12px;
          border-radius: 8px;
          border: 1.5px solid ${isSelected ? '#00F0FF' : 'var(--border-color, #E5E9F0)'};
          background: ${isSelected ? 'rgba(0, 240, 255, 0.12)' : 'var(--surface-color, #FFFFFF)'};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
        ">
          <div class="mono" style="font-size: 11px; font-weight: 700; padding: 6px 8px; border-radius: 6px; background: rgba(0, 240, 255, 0.16); color: var(--text-bright);">
            ${m.badge}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-bright);">${m.name}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${m.desc}</div>
          </div>
          ${isSelected ? `<span style="color: #00F0FF; font-weight: bold;">✓</span>` : ''}
        </div>
      `;
    }
    html += '</div>';

    if (bodyEl) {
      bodyEl.innerHTML = html;
      const cards = bodyEl.querySelectorAll('.sidebar-splitter-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const mode = card.dataset.mode;
          if (piece) {
            piece.priorityMode = mode;
          }
          this.game.defaultSplitterMode = mode;
          this.game.audio?.playSplitter?.();
          this.openSplitterSidebar(piece);
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

    for (let i = 1; i <= 68; i++) {
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
    const isChapter5Unlocked = true; // Cap 5 Cyber-Industrial desbloqueado para experimentar las nuevas mecánicas

    const tab1 = document.getElementById('tab-chapter-1');
    const tab2 = document.getElementById('tab-chapter-2');
    const tab3 = document.getElementById('tab-chapter-3');
    const tab4 = document.getElementById('tab-chapter-4');
    const tab5 = document.getElementById('tab-chapter-5');
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
    if (tab5) {
      tab5.className = `level-tab-btn ${this.activeChapter === 5 ? 'active' : ''}`;
      tab5.title = "Capítulo 5: Cyber-Industrial (65–68)";
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
    } else if (this.activeChapter === 5) {
      startLevel = 65;
      endLevel = 68;
    }

    const filteredLevels = LEVELS.filter(l => l.id >= startLevel && l.id <= endLevel);

    filteredLevels.forEach(lvl => {
      const isCompleted = save.nivelesCompletados.includes(lvl.id);
      const isCurrent = save.nivelActual === lvl.id;
      const chapterUnlocked = lvl.id <= 20 || 
        (lvl.id <= 40 ? isChapter2Unlocked : 
        (lvl.id <= 60 ? isChapter3Unlocked :
        (lvl.id <= 64 ? isChapter4Unlocked : isChapter5Unlocked)));
      const isUnlocked = ((lvl.id <= maxUnlocked || lvl.id <= save.nivelActual) || (lvl.id === 61 && isChapter4Unlocked) || lvl.id >= 65) && chapterUnlocked;

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
          if (lvl.id > 60 && lvl.id <= 64 && !isChapter4Unlocked) {
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
    if (starsEl) starsEl.textContent = `⭐ ${totalStars}/204`;

    const levelsEl = document.getElementById('menu-total-levels');
    if (levelsEl) levelsEl.textContent = `🏆 ${completedCount}/68`;

    const coinsEl = document.getElementById('menu-coins');
    if (coinsEl) coinsEl.textContent = `🪙 ${coins}`;

    const hudCoinsEl = document.getElementById('hud-coins-display');
    if (hudCoinsEl) hudCoinsEl.textContent = `${coins} 🪙`;

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

  toggleUpgradesModal(show) {
    const modal = document.getElementById('upgrades-modal');
    if (!modal) return;
    if (show) {
      this.populateUpgradesModal();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  populateUpgradesModal() {
    const container = document.getElementById('upgrades-grid-container');
    const coinsEl = document.getElementById('upgrades-coins-val');
    if (!container) return;
    container.innerHTML = '';

    const save = this.game.saveData;
    save.upgrades = save.upgrades || { beltSpeed: 0, extractorSpeed: 0, painterEfficiency: 0, coinValue: 0 };
    const coins = save.coins || 0;
    if (coinsEl) coinsEl.textContent = `🪙 ${coins}`;

    const upgradeDefs = [
      {
        id: 'beltSpeed',
        icon: '⏩',
        name: 'Turbopropulsión de Cintas',
        desc: '+22% de velocidad de transporte en todas las cintas MK1, MK2 y MK3 por nivel.',
        baseCost: 15,
        maxLvl: 8
      },
      {
        id: 'extractorSpeed',
        icon: '⛏️',
        name: 'Perforadoras de Alta Frecuencia',
        desc: '+25% de velocidad de extracción en Menas de Formas y Menas de Pintura.',
        baseCost: 20,
        maxLvl: 8
      },
      {
        id: 'painterEfficiency',
        icon: '🎨',
        name: 'Inyectores de Pigmento Turbo',
        desc: '+30% de velocidad de teñido en Pintores y Hubs Cruzados.',
        baseCost: 18,
        maxLvl: 8
      },
      {
        id: 'coinValue',
        icon: '💰',
        name: 'Contratos Corporativos VIP',
        desc: '+1 🪙 moneda adicional en tiempo real por cada pieza entregada al Hub.',
        baseCost: 25,
        maxLvl: 6
      }
    ];

    upgradeDefs.forEach(u => {
      const currentLvl = save.upgrades[u.id] || 0;
      const isMax = currentLvl >= u.maxLvl;
      const cost = Math.round(u.baseCost * Math.pow(1.45, currentLvl));
      const canAfford = coins >= cost;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isMax ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="shop-item-header">
          <span class="shop-item-name">${u.icon} ${u.name}</span>
          <span class="shop-item-cost mono">NV. ${currentLvl}/${u.maxLvl}</span>
        </div>
        <p class="shop-item-desc">${u.desc}</p>
        ${isMax
          ? `<button class="shop-btn equipped-btn" disabled>Nivel Máximo Alcanzado ✓</button>`
          : `<button class="shop-btn buy-action-btn ${canAfford ? '' : 'disabled'}">${canAfford ? `Mejorar por 🪙 ${cost}` : `Faltan 🪙 ${cost - coins}`}</button>`
        }
      `;

      if (!isMax) {
        card.querySelector('.buy-action-btn')?.addEventListener('click', () => {
          if ((this.game.saveData.coins || 0) >= cost) {
            this.game.saveData.coins -= cost;
            this.game.saveData.upgrades[u.id] = currentLvl + 1;
            this.game.audio?.playVictory?.();
            this.game.autoSave();
            this.updateMenuStats();
            this.populateUpgradesModal();
            this.showToast(`⚡ ¡${u.name} mejorado a Nivel ${currentLvl + 1}!`, 2000);
          } else {
            this.showToast(`Entrega más piezas al Hub para ganar 🪙 monedas`, 1800);
          }
        });
      }

      container.appendChild(card);
    });
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

    // Estado inicial: si el menú principal está visible en el DOM, empezamos en 'menu'
    const menuEl = document.getElementById('main-menu-screen');
    const isMenuVisible = menuEl && (menuEl.classList.contains('open') || menuEl.classList.contains('visible'));
    this.state = isMenuVisible ? 'menu' : 'playing';
    document.body.classList.toggle('in-menu', this.state === 'menu');

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

    // Circuito procedural relajante y fluido de fondo para el Menú
    this.initDemoScene();

    const canvas = document.getElementById('game-canvas');
    this.sim = new Simulation(this.grid, (shape, deliveryPiece) => this.onShapeDelivered(shape, deliveryPiece));
    this.sim.game = this;
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

  // Coloca un Almacén Central 3x3 (con 12 entradas perimetrales) en (rootX..rootX+2, rootY..rootY+2)
  placeHub3x3(targetGrid, rootX = 4, rootY = 1) {
    // Primero registrar las 8 casillas exteriores del 3x3
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        if (dx === 1 && dy === 1) continue;
        const hx = rootX + dx;
        const hy = rootY + dy;
        targetGrid.set(hx, hy, {
          x: hx,
          y: hy,
          type: 'delivery',
          dir: 0,
          hubRootX: rootX,
          hubRootY: rootY,
          isHubCenter: false,
          fixed: true
        });
      }
    }
    // Registrar la casilla central al final para que renderice la plataforma 3x3 unificada por encima
    const cx = rootX + 1;
    const cy = rootY + 1;
    targetGrid.set(cx, cy, {
      x: cx,
      y: cy,
      type: 'delivery',
      dir: 0,
      hubRootX: rootX,
      hubRootY: rootY,
      isHubCenter: true,
      fixed: true
    });
  }

  initDemoScene() {
    this.demoGrid = new Grid();
    this.demoSim = new Simulation(this.demoGrid);
    this.demoSim.game = this;

    // Almacén Central 3x3 en la escena de demostración en (6..8, 1..3)
    this.placeHub3x3(this.demoGrid, 6, 1);

    // 1. Veta Grande de Formas (2x2) en (1..2, 1..2)
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        this.demoGrid.setMine(1 + dx, 1 + dy, {
          x: 1 + dx,
          y: 1 + dy,
          shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT)
        });
      }
    }

    // 2. Veta Grande de Pintura Lavanda (2x2) en (3..4, -1..0)
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        this.demoGrid.setMine(3 + dx, -1 + dy, {
          x: 3 + dx,
          y: -1 + dy,
          isPaintVein: true,
          paintColor: PASTEL_COLORS.LAVENDER,
          shape: createPaintDrop(PASTEL_COLORS.LAVENDER)
        });
      }
    }

    // Línea Oeste -> Entrada central izquierda del Almacén 3x3 (6, 2)
    this.demoGrid.set(2, 2, {
      x: 2, y: 2, type: 'extractor', dir: DIR.RIGHT,
      shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT), fixed: true
    });
    this.demoGrid.set(3, 2, { x: 3, y: 2, type: 'belt_fast', dir: DIR.RIGHT, fixed: true });

    // Extractor de Pintura en (4, 0) -> cinta (4, 1) -> Pintor en (4, 2)
    this.demoGrid.set(4, 0, {
      x: 4, y: 0, type: 'extractor', dir: DIR.DOWN,
      shape: createPaintDrop(PASTEL_COLORS.LAVENDER), fixed: true
    });
    this.demoGrid.set(4, 1, { x: 4, y: 1, type: 'belt_fast', dir: DIR.DOWN, fixed: true });
    this.demoGrid.set(4, 2, {
      x: 4, y: 2, type: 'painter', dir: DIR.RIGHT,
      color: PASTEL_COLORS.LAVENDER, paintTank: 8, fixed: true
    });
    this.demoGrid.set(5, 2, { x: 5, y: 2, type: 'belt_hyper', dir: DIR.RIGHT, fixed: true });

    // Línea Sur -> Entrada inferior central del Almacén 3x3 (7, 3)
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        this.demoGrid.setMine(1 + dx, 4 + dy, {
          x: 1 + dx,
          y: 4 + dy,
          shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.PEACH)
        });
      }
    }
    this.demoGrid.set(2, 4, {
      x: 2, y: 4, type: 'extractor', dir: DIR.RIGHT,
      shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.PEACH), fixed: true
    });
    this.demoGrid.set(3, 4, { x: 3, y: 4, type: 'belt_fast', dir: DIR.RIGHT, fixed: true });
    this.demoGrid.set(4, 4, { x: 4, y: 4, type: 'belt_fast', dir: DIR.RIGHT, fixed: true });
    this.demoGrid.set(5, 4, { x: 5, y: 4, type: 'belt_fast', dir: DIR.RIGHT, fixed: true });
    this.demoGrid.set(6, 4, { x: 6, y: 4, type: 'belt_fast', dir: DIR.RIGHT, fixed: true });
    this.demoGrid.set(7, 4, { x: 7, y: 4, type: 'belt_fast', dir: DIR.UP, fixed: true });
  }

  startGameFromMenu() {
    this.state = 'playing';
    document.body.classList.remove('in-menu');
    const menuScreen = document.getElementById('main-menu-screen');
    if (menuScreen) {
      menuScreen.classList.remove('open', 'visible');
      menuScreen.classList.add('closing');
      setTimeout(() => {
        menuScreen.style.display = 'none';
        menuScreen.classList.remove('closing');
        if (!this.hasCenteredOnce) {
          this.centerCameraOnLevel();
          this.hasCenteredOnce = true;
        }
      }, 150);
    } else if (!this.hasCenteredOnce) {
      this.centerCameraOnLevel();
      this.hasCenteredOnce = true;
    }
  }

  openMainMenu() {
    this.state = 'menu';
    document.body.classList.add('in-menu');
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
    const valid = ['suave', 'pastel-frio', 'pastel-calido', 'nordico', 'alto-contraste', 'sepia', 'cyberpunk'];
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

  toggleIPMOverlay() {
    if (!this.renderer) return;
    this.renderer.showIPMOverlay = !this.renderer.showIPMOverlay;
    const btn = document.getElementById('btn-ipm-toggle');
    if (btn) btn.classList.toggle('active', this.renderer.showIPMOverlay);
    this.audio?.playTone?.(580, 'sine', 0.05, 0.02);
    this.ui.showToast(
      this.renderer.showIPMOverlay
        ? "📊 Telemetría IPM en casillas activada (Tecla I)"
        : "📊 Telemetría IPM en casillas oculta",
      1600
    );
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

  // Expande una casilla de mina en un gran yacimiento multi-casilla (3x3, 4x4, 5x5, 6x6) sin pisar el Almacén 3x3
  expandMineCluster(cx, cy, mineTemplate, width = 3, height = 3) {
    const midDx = Math.floor(width / 2);
    const midDy = Math.floor(height / 2);
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const mx = cx + dx;
        const my = cy + dy;
        // Respetar zona de seguridad alrededor del Almacén Central 3x3 (x: 4..6, y: 1..3)
        if (mx >= 2 && mx <= 8 && my >= -1 && my <= 5) continue;
        const existingCell = this.grid.get(mx, my);
        if (existingCell && existingCell.fixed && existingCell.type !== 'extractor') continue;

        if (!this.grid.hasMine(mx, my)) {
          const isCenterTile = (dx === midDx && dy === midDy);
          if (mineTemplate.resourceType) {
            this.grid.setMine(mx, my, {
              x: mx,
              y: my,
              resourceType: mineTemplate.resourceType,
              shape: { dlcItem: mineTemplate.dlcItem }
            });
          } else {
            this.grid.setMine(mx, my, {
              x: mx,
              y: my,
              isPaintVein: !!mineTemplate.isPaintVein,
              paintColor: mineTemplate.paintColor || null,
              clusterLabel: isCenterTile ? (mineTemplate.label || (mineTemplate.isPaintVein ? `🎨 TINTA ${(mineTemplate.paintColor || '').toUpperCase()}` : `⛏️ MENA ${width}×${height}`)) : null,
              shape: Shapes.clone(mineTemplate.shape)
            });
          }
        }
      }
    }
  }

  // Crea el MAPA MUNDIAL PERMANENTE (520x520) una única vez: Almacén Central 3x3 + todos los anillos de menas hasta el último nivel
  ensurePermanentWorld() {
    if (this.worldInitialized) return;
    this.worldInitialized = true;

    this.grid.mines.clear();

    // 1. ALMACÉN CENTRAL 3x3 PERMANENTE en (4..6, 1..3) con centro en (5, 2) y 12 entradas
    this.placeHub3x3(this.grid, 4, 1);

    // 2. ANILLO 1 — ZONA INICIAL CERCANA (Radio 8 a 15 casillas): Formas base y las 5 Menas de Pintura
    const ring1Veins = [
      // Formas básicas en los 4 puntos cardinales
      { x: -6, y: 1, w: 3, h: 3, label: '⛏️ CÍRCULO MENTA', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.MINT) },
      { x: 13, y: 1, w: 3, h: 3, label: '⛏️ CUADRADO CELESTE', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.SKY) },
      { x: 4, y: -9, w: 3, h: 3, label: '⛏️ TRIÁNGULO LAVANDA', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.LAVENDER) },
      { x: 4, y: 10, w: 3, h: 3, label: '⛏️ ESTRELLA MELOCOTÓN', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.PEACH) },

      // Menas de Pintura en las 4 esquinas cercanas + Norte
      { x: -6, y: -7, w: 3, h: 3, isPaintVein: true, paintColor: PASTEL_COLORS.LAVENDER, label: '🎨 TINTA LAVANDA' },
      { x: 13, y: -7, w: 3, h: 3, isPaintVein: true, paintColor: PASTEL_COLORS.MINT, label: '🎨 TINTA MENTA' },
      { x: -6, y: 9, w: 3, h: 3, isPaintVein: true, paintColor: PASTEL_COLORS.CORAL, label: '🎨 TINTA CORAL' },
      { x: 13, y: 9, w: 3, h: 3, isPaintVein: true, paintColor: PASTEL_COLORS.SKY, label: '🎨 TINTA CELESTE' },
      { x: 4, y: -16, w: 3, h: 3, isPaintVein: true, paintColor: PASTEL_COLORS.LEMON, label: '🎨 TINTA LIMÓN' }
    ];

    // 3. ANILLO 2 — CINTURÓN INDUSTRIAL MEDIO (Radio 22 a 45 casillas): Yacimientos 4x4 de todas las geometrías
    const ring2Veins = [
      { x: -24, y: 0, w: 4, h: 4, label: '⛏️ ROMBO CORAL (4×4)', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.CORAL) },
      { x: 28, y: 0, w: 4, h: 4, label: '⛏️ HEXÁGONO CELESTE (4×4)', shape: createShape(SHAPE_TYPES.HEXAGON, PASTEL_COLORS.SKY) },
      { x: -20, y: -20, w: 4, h: 4, label: '⛏️ ESTRELLA LIMÓN (4×4)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LEMON) },
      { x: 24, y: -20, w: 4, h: 4, label: '⛏️ CÍRCULO CORAL (4×4)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.CORAL) },
      { x: -20, y: 22, w: 4, h: 4, label: '⛏️ CUADRADO MENTA (4×4)', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.MINT) },
      { x: 24, y: 22, w: 4, h: 4, label: '⛏️ TRIÁNGULO CELESTE (4×4)', shape: createShape(SHAPE_TYPES.TRIANGLE, PASTEL_COLORS.SKY) },
      { x: 3, y: 26, w: 4, h: 4, label: '⛏️ MOLINO LAVANDA (4×4)', shape: createShape(SHAPE_TYPES.WINDMILL, PASTEL_COLORS.LAVENDER) },
      { x: 3, y: -28, w: 4, h: 4, label: '⛏️ CRUZ MENTA (4×4)', shape: createShape(SHAPE_TYPES.CROSS, PASTEL_COLORS.MINT) },
      { x: -12, y: 26, w: 4, h: 4, label: '⛏️ HEXÁGONO LAVANDA (4×4)', shape: createShape(SHAPE_TYPES.HEXAGON, PASTEL_COLORS.LAVENDER) },
      { x: 18, y: -28, w: 4, h: 4, label: '⛏️ ROMBO MENTA (4×4)', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.MINT) },

      // Grandes Lagos de Pintura 4x4 en el anillo medio
      { x: -32, y: -12, w: 4, h: 4, isPaintVein: true, paintColor: PASTEL_COLORS.LEMON, label: '🎨 LAGO TINTA LIMÓN' },
      { x: 36, y: -12, w: 4, h: 4, isPaintVein: true, paintColor: PASTEL_COLORS.LAVENDER, label: '🎨 LAGO TINTA LAVANDA' },
      { x: -32, y: 14, w: 4, h: 4, isPaintVein: true, paintColor: PASTEL_COLORS.MINT, label: '🎨 LAGO TINTA MENTA' },
      { x: 36, y: 14, w: 4, h: 4, isPaintVein: true, paintColor: PASTEL_COLORS.CORAL, label: '🎨 LAGO TINTA CORAL' },
      { x: 4, y: 38, w: 4, h: 4, isPaintVein: true, paintColor: PASTEL_COLORS.SKY, label: '🎨 LAGO TINTA CELESTE' }
    ];

    // 4. ANILLO 3 — FRONTERA LOGÍSTICA LEJANA (Radio 55 a 95 casillas): Mega-Yacimientos 5x5 + Nodos Cuánticos
    const ring3Veins = [
      { x: -62, y: -6, w: 5, h: 5, label: '⛏️ CORAZÓN CORAL (5×5)', shape: createShape(SHAPE_TYPES.HEART, PASTEL_COLORS.CORAL) },
      { x: 66, y: -6, w: 5, h: 5, label: '⛏️ RAYO LIMÓN (5×5)', shape: createShape(SHAPE_TYPES.LIGHTNING, PASTEL_COLORS.LEMON) },
      { x: 3, y: 64, w: 5, h: 5, label: '⛏️ HOJA MENTA (5×5)', shape: createShape(SHAPE_TYPES.LEAF, PASTEL_COLORS.MINT) },
      { x: 3, y: -64, w: 5, h: 5, label: '⛏️ MOLINO CELESTE (5×5)', shape: createShape(SHAPE_TYPES.WINDMILL, PASTEL_COLORS.SKY) },
      { x: -50, y: -48, w: 5, h: 5, label: '⛏️ ROMBO LAVANDA (5×5)', shape: createShape(SHAPE_TYPES.DIAMOND, PASTEL_COLORS.LAVENDER) },
      { x: 56, y: -48, w: 5, h: 5, label: '⛏️ HEXÁGONO LIMÓN (5×5)', shape: createShape(SHAPE_TYPES.HEXAGON, PASTEL_COLORS.LEMON) },
      { x: -50, y: 52, w: 5, h: 5, label: '⛏️ CRUZ CORAL (5×5)', shape: createShape(SHAPE_TYPES.CROSS, PASTEL_COLORS.CORAL) },
      { x: 56, y: 52, w: 5, h: 5, label: '⛏️ ESTRELLA CELESTE (5×5)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.SKY) },
      { x: -68, y: 24, w: 5, h: 5, label: '⛏️ CÍRCULO LAVANDA (5×5)', shape: createShape(SHAPE_TYPES.CIRCLE, PASTEL_COLORS.LAVENDER) },
      { x: 74, y: 24, w: 5, h: 5, label: '⛏️ CUADRADO CORAL (5×5)', shape: createShape(SHAPE_TYPES.SQUARE, PASTEL_COLORS.CORAL) },

      // Mega-Reservas de Pintura 5x5 en la frontera lejana
      { x: -72, y: -26, w: 5, h: 5, isPaintVein: true, paintColor: PASTEL_COLORS.CORAL, label: '🎨 RESERVA CORAL (5×5)' },
      { x: 76, y: -26, w: 5, h: 5, isPaintVein: true, paintColor: PASTEL_COLORS.SKY, label: '🎨 RESERVA CELESTE (5×5)' },
      { x: -28, y: -66, w: 5, h: 5, isPaintVein: true, paintColor: PASTEL_COLORS.MINT, label: '🎨 RESERVA MENTA (5×5)' },
      { x: 34, y: -66, w: 5, h: 5, isPaintVein: true, paintColor: PASTEL_COLORS.LAVENDER, label: '🎨 RESERVA LAVANDA (5×5)' },
      { x: -28, y: 68, w: 5, h: 5, isPaintVein: true, paintColor: PASTEL_COLORS.LEMON, label: '🎨 RESERVA LIMÓN (5×5)' },

      // Yacimientos Biomoleculares y Cuánticos (4x4) para los niveles del DLC Cuántico
      { x: -44, y: -4, w: 4, h: 4, resourceType: 'SUGAR_CANE', dlcItem: 'glucose' },
      { x: -44, y: 12, w: 4, h: 4, resourceType: 'FRUCTOSE_BEET', dlcItem: 'fructose' },
      { x: 48, y: -4, w: 4, h: 4, resourceType: 'QUANTUM_GEODE', dlcItem: 'quantum_dust' },
      { x: 48, y: 12, w: 4, h: 4, resourceType: 'CRYO_VENT', dlcItem: 'stabilizer' }
    ];

    // 5. ANILLO 4 — EXPEDICIÓN CONTINENTAL EXTREMA (Radio 105 a 150 casillas): Yacimientos Madre 6x6
    const ring4Veins = [
      { x: -118, y: -110, w: 6, h: 6, label: '⛏️ VETA MADRE ESTRELLAS (6×6)', shape: createShape(SHAPE_TYPES.STAR, PASTEL_COLORS.LEMON) },
      { x: 120, y: -110, w: 6, h: 6, label: '⛏️ VETA MADRE CORAZÓN (6×6)', shape: createShape(SHAPE_TYPES.HEART, PASTEL_COLORS.CORAL) },
      { x: -118, y: 110, w: 6, h: 6, label: '⛏️ VETA MADRE RAYO (6×6)', shape: createShape(SHAPE_TYPES.LIGHTNING, PASTEL_COLORS.LEMON) },
      { x: 120, y: 110, w: 6, h: 6, label: '⛏️ VETA MADRE HOJA (6×6)', shape: createShape(SHAPE_TYPES.LEAF, PASTEL_COLORS.MINT) },
      { x: -135, y: 0, w: 6, h: 6, label: '⛏️ VETA MADRE MOLINO (6×6)', shape: createShape(SHAPE_TYPES.WINDMILL, PASTEL_COLORS.LAVENDER) },
      { x: 135, y: 0, w: 6, h: 6, label: '⛏️ VETA MADRE CRUZ (6×6)', shape: createShape(SHAPE_TYPES.CROSS, PASTEL_COLORS.SKY) },
      { x: 2, y: -135, w: 6, h: 6, isPaintVein: true, paintColor: PASTEL_COLORS.LAVENDER, label: '🎨 OCÉANO TINTA LAVANDA (6×6)' },
      { x: 2, y: 135, w: 6, h: 6, isPaintVein: true, paintColor: PASTEL_COLORS.MINT, label: '🎨 OCÉANO TINTA MENTA (6×6)' }
    ];

    const allVeins = [...ring1Veins, ...ring2Veins, ...ring3Veins, ...ring4Veins];
    for (const v of allVeins) {
      if (v.resourceType) {
        this.expandMineCluster(v.x, v.y, {
          resourceType: v.resourceType,
          dlcItem: v.dlcItem
        }, v.w, v.h);
      } else if (v.isPaintVein) {
        this.expandMineCluster(v.x, v.y, {
          isPaintVein: true,
          paintColor: v.paintColor,
          label: v.label,
          shape: createPaintDrop(v.paintColor)
        }, v.w, v.h);
      } else {
        this.expandMineCluster(v.x, v.y, {
          isPaintVein: false,
          label: v.label,
          shape: v.shape
        }, v.w, v.h);
      }
    }
  }

  loadLevel(levelId) {
    // 1. Guardar las piezas actuales de la Mega-Fábrica del jugador
    const currentUserPieces = this.grid.exportUserPieces();
    if (currentUserPieces.length > 0) {
      this.saveData.megaFactoryPieces = currentUserPieces;
    }

    const lvl = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    this.currentLevel = lvl;
    this.deliveredCount = 0;
    this.timeElapsed = 0;
    this.streak = 0;
    this.lives = 5;
    this.totalDelivered = 0;
    this.totalErrors = 0;
    this.isPaused = false;

    // 2. Asegurar que el Mapa Mundial Permanente y el Almacén Central 3x3 estén creados (NUNCA se borran ni cambian de sitio)
    this.ensurePermanentWorld();

    // 3. Normalizar demandas del nuevo nivel (todas se entregan en las 12 bocas del Almacén Central 3x3)
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

    // Sin límite artificial de piezas para permitir autopistas logísticas desde menas lejanas
    lvl.maxPieces = null;

    // Desbloquear todas las herramientas logísticas para conectar el mapa gigante libremente
    const allLogisticsTools = [
      'belt', 'belt_fast', 'belt_hyper', 'extractor', 'painter', 'cutter',
      'mixer', 'factory_1x1', 'factory_2x2', 'splitter', 'merger',
      'balancer', 'cross_hub', 'filter', 'crossing', 'tunnel', 'buffer', 'trash'
    ];
    for (const t of allLogisticsTools) {
      if (!lvl.availableTools.includes(t)) {
        lvl.availableTools.push(t);
      }
    }

    // Si es la primera carga desde localStorage, restaurar la Mega-Fábrica guardada
    if (this.grid.exportUserPieces().length === 0) {
      const savedMega = (this.saveData.megaFactoryPieces && this.saveData.megaFactoryPieces.length > 0)
        ? this.saveData.megaFactoryPieces
        : this.saveData.construcciones[lvl.id];
      if (savedMega) {
        this.grid.importUserPieces(savedMega);
      }
    }

    // Sincronizar todos los extractores colocados por el jugador con la mena permanente bajo ellos
    for (const piece of this.grid.getAllPieces()) {
      if (piece.type === 'extractor' && !piece.fixed) {
        const mine = this.grid.getMine(piece.x, piece.y);
        if (mine) {
          piece.shape = Shapes.clone(mine.shape);
        }
      }
    }

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

    if (!this.hasCenteredOnce) {
      this.centerCameraOnLevel();
      this.hasCenteredOnce = true;
    }
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

    if (userPieces.length > 0) {
      this.recordAction({
        type: 'clear',
        pieces: userPieces.map(p => ({ ...p }))
      });
    }

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
    this.ui.showToast("🧹 Mapa limpiado (Pulsa ↩️ Deshacer para restaurar)", 2200);
    this.autoSave();
    this.updateGhost();
  }

  centerCameraOnLevel() {
    // Centrar siempre sobre el Almacén Central 3x3 permanente en (5, 2)
    this.renderer.centerOn(5, 2);
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

  isBeltToolType(t) {
    return t === 'belt' || t === 'belt_fast' || t === 'belt_hyper' || t === 'belt_slow';
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
    if (this.isBeltToolType(this.selectedTool) && !existing && (!this.input || !this.input.isPointerDown)) {
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
          if (neighbor && this.isBeltToolType(neighbor.type) && !neighbor.fixed) {
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

    // Si ya existe una cinta del mismo tipo en esta celda
    if (existing && existing.type === this.selectedTool && this.isBeltToolType(existing.type)) {
      if (existing.dir !== this.placementDir) {
        existing.dir = this.placementDir;
      } else {
        existing.dir = (existing.dir + 1) % 4;
        this.placementDir = existing.dir;
      }
      this.renderer.addPlacementEffect(x, y, this.selectedTool);
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

      if (neighbor && this.isBeltToolType(neighbor.type) && !neighbor.fixed) {
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
    if (this.mode !== 'edit' || !this.isBeltToolType(this.selectedTool)) return;

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

    // Asegurar que la casilla de origen (fromX, fromY) también tenga cinta orientada en la dirección de la línea
    if (steps.length > 0) {
      const firstDir = steps[0].dir;
      this.placementDir = firstDir;
      const startPiece = this.grid.get(fromX, fromY);
      if (!startPiece) {
        this.placePieceAt(fromX, fromY);
      } else if (this.isBeltToolType(startPiece.type) && !startPiece.fixed) {
        startPiece.type = this.selectedTool;
        startPiece.dir = firstDir;
      }
    }

    let prevX = fromX;
    let prevY = fromY;

    for (const step of steps) {
      const prevPiece = this.grid.get(prevX, prevY);
      if (prevPiece && this.isBeltToolType(prevPiece.type) && !prevPiece.fixed) {
        prevPiece.dir = step.dir;
      }

      this.placementDir = step.dir;
      const targetPiece = this.grid.get(step.x, step.y);
      if (!targetPiece) {
        this.placePieceAt(step.x, step.y);
      } else if (this.isBeltToolType(targetPiece.type) && !targetPiece.fixed) {
        targetPiece.type = this.selectedTool;
        targetPiece.dir = step.dir;
        this.renderer.addPlacementEffect(step.x, step.y, this.selectedTool);
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

    const isBeltLike = (t) => t === 'belt' || t === 'belt_fast' || t === 'belt_hyper' || t === 'belt_slow';

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
      if ((this.selectedTool !== 'painter' && this.selectedTool !== 'cross_hub') || existing.color === this.painterColor) {
        return;
      }
    }

    const newPiece = {
      x: x,
      y: y,
      type: this.selectedTool,
      dir: this.placementDir,
      color: (this.selectedTool === 'painter' || this.selectedTool === 'filter' || this.selectedTool === 'cross_hub') ? this.painterColor : null,
      paintTank: (this.selectedTool === 'painter' || this.selectedTool === 'cross_hub') ? 5 : undefined,
      priorityMode: this.selectedTool === 'splitter' ? (this.defaultSplitterMode || 'balanced') : undefined,
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
    } else if (this.selectedTool === 'splitter' || this.selectedTool === 'balancer') {
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
    const clamped = Math.max(0.18, Math.min(2.2, newZoom));
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
    // Ignorar gotas de pintura pura si entran por accidente al Hub
    if (shape && shape.isPaintDrop) return;

    // El Almacén Central 3x3 acepta cualquier demanda activa por cualquiera de sus 12 entradas
    let matchedDemand = null;
    for (const demand of this.currentDemands) {
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

      // Recompensa adictiva en tiempo real: Monedas por cada entrega exitosa
      const coinBonus = 2 + (this.saveData.upgrades?.coinValue || 0);
      this.saveData.coins = (this.saveData.coins || 0) + coinBonus;
      const hudCoinsEl = document.getElementById('hud-coins-display');
      if (hudCoinsEl) hudCoinsEl.textContent = `${this.saveData.coins} 🪙`;

      if (this.streak > 0 && this.streak % 10 === 0) {
        this.audio.playStreak();
        this.renderer.addParticles(screenPos.x, screenPos.y, 25, '#F5C6A5');
        this.ui.showToast(`✨ ¡Racha x${this.streak} perfecta! (+${coinBonus * 2} 🪙)`, 1800);
        this.saveData.coins += coinBonus;
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
    if (nextId <= 68 && nextId <= LEVELS.length) {
      this.loadLevel(nextId);
    } else {
      this.ui.showToast("🎉 ¡Has completado todos los 68 niveles de BeltFlow v4.0 Cyber-Industrial!", 5000);
      this.loadLevel(68);
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
    if (this.grid.getAllPieces().some(p => this.isBeltToolType(p.type))) {
      this.unlockAchievement('first_belt');
    }

    // Capítulos
    if (completed.length >= 5) this.unlockAchievement('level_5');
    if (completed.includes(20)) this.unlockAchievement('chapter_1');
    if (completed.includes(40)) this.unlockAchievement('chapter_2');
    if (completed.includes(60)) this.unlockAchievement('chapter_3');
    if (completed.includes(64)) this.unlockAchievement('chapter_4');
    if (completed.includes(68)) this.unlockAchievement('chapter_5');

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
    if ((this.sim.totalCrossHubProcessed || 0) >= 30 || (this.sim.totalCrossHubsProcessed || 0) >= 30) this.unlockAchievement('cross_hub_architect');

    // Buffer lleno
    const anyFull = this.grid.getAllPieces().some(p => p.type === 'buffer' && (p.bufferQueue?.length || 0) >= 6);
    if (anyFull) this.unlockAchievement('buffer_full');

    // Tasa de producción
    if (this.sim.currentThroughputRate >= 1.5) this.unlockAchievement('speed_demon');
    if (this.sim.currentIPM >= 120) this.unlockAchievement('hyper_logistics');

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
    this.ui?.showToast?.(this.isDark ? "🌙 Modo Noche activado" : "☀️ Modo Día (Blanco) activado", 1500);
  }

  setTheme(isDark) {
    this.isDark = isDark;
    this.renderer.isDark = isDark;
    this.saveData.config.modoOscuro = isDark;

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.ui.setThemeIcons(isDark);
    this.autoSave();

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
    const exported = this.grid.exportUserPieces();
    this.saveData.megaFactoryPieces = exported;
    if (this.currentLevel) {
      this.saveData.construcciones[this.currentLevel.id] = exported;
    }
    SaveManager.save(this.saveData);
  }

  resetAllProgress() {
    this.saveData = SaveManager.reset();
    this.grid.clearNonFixed();
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

      // Actualizar medidor IPM global en HUD
      const ipmEl = document.getElementById('hud-ipm-display');
      if (ipmEl) {
        ipmEl.textContent = `${this.sim.currentIPM || 0} IPM`;
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

    const renderSpeed = this.state === 'menu' ? 1.0 : (this.isPaused ? 0 : this.speedMult);
    this.renderer.render(dt, renderSpeed);

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
