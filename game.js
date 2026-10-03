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

import { LEVELS, SHAPE_TYPES, PASTEL_COLORS, COLOR_HEX, createShape } from './levels.js';

/* ==========================================================================
   1. GESTOR DE GUARDADO (SaveManager)
   ========================================================================== */
export class SaveManager {
  static STORAGE_KEY = 'beltflow_save_v1';

  static getDefaultSave() {
    return {
      nivelActual: 1,
      nivelesCompletados: [],
      mejoresTiempos: {},
      config: {
        modoOscuro: false,
        zoom: 1.0,
        tipoDispositivo: 'auto',
        reducirMovimiento: false,
        sonido: true
      },
      construcciones: {}
    };
  }

  static load() {
    try {
      const data = localStorage.getItem(SaveManager.STORAGE_KEY);
      if (!data) return SaveManager.getDefaultSave();
      const parsed = JSON.parse(data);
      return {
        ...SaveManager.getDefaultSave(),
        ...parsed,
        config: { ...SaveManager.getDefaultSave().config, ...(parsed.config || {}) },
        construcciones: parsed.construcciones || {},
        mejoresTiempos: parsed.mejoresTiempos || {},
        nivelesCompletados: parsed.nivelesCompletados || []
      };
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
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
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
      gNode.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio seguro, silenciar excepciones en entornos restringidos
    }
  }

  playPlace() {
    this.playTone(523.25, 'triangle', 0.12, 0.05); // C5
  }

  playDelete() {
    this.playTone(220.00, 'sine', 0.1, 0.04); // A3
  }

  playRotate() {
    this.playTone(440.00, 'sine', 0.06, 0.03); // A4
  }

  playDelivery() {
    this.playTone(659.25, 'sine', 0.22, 0.07); // E5
    setTimeout(() => this.playTone(880.00, 'sine', 0.28, 0.05), 65); // A5
  }

  playVictory() {
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.65, 0.07, 0.03), i * 110);
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
    return {
      left: shape.left ? { type: shape.left.type, color: shape.left.color } : null,
      right: shape.right ? { type: shape.right.type, color: shape.right.color } : null
    };
  }

  static cut(shape) {
    if (!shape) return { leftHalf: null, rightHalf: null };
    const leftHalf = shape.left ? { left: { ...shape.left }, right: null } : null;
    const rightHalf = shape.right ? { left: null, right: { ...shape.right } } : null;
    return { leftHalf, rightHalf };
  }

  static paint(shape, newColor) {
    if (!shape) return null;
    const painted = Shapes.clone(shape);
    if (painted.left) painted.left.color = newColor;
    if (painted.right) painted.right.color = newColor;
    return painted;
  }

  static mix(shapeA, shapeB) {
    if (!shapeA && !shapeB) return null;
    if (!shapeA) return Shapes.clone(shapeB);
    if (!shapeB) return Shapes.clone(shapeA);

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
    if (!shape || (!shape.left && !shape.right)) return;

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

  remove(x, y) {
    const piece = this.get(x, y);
    if (piece && piece.fixed) return false;
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
        this.set(p.x, p.y, {
          x: p.x,
          y: p.y,
          type: p.type,
          dir: p.dir,
          color: p.color || null,
          shape: p.shape || null,
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
  }

  reset() {
    this.items = [];
    this.spawnerTimers.clear();
  }

  update(dt, speedMult = 1.0) {
    const effectiveDt = dt * speedMult;
    const beltSpeed = 1.5; // Celdas por segundo

    // 1. Spawners / Extractores: generar formas
    for (const piece of this.grid.getAllPieces()) {
      if (piece.type === 'spawner' && piece.shape) {
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
            }
          }
        }
        this.spawnerTimers.set(key, timer);
      }
    }

    // 2. Movimiento de formas
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const piece = this.grid.get(item.x, item.y);

      if (!piece) {
        this.items.splice(i, 1);
        continue;
      }

      // Trituradora: desintegra la forma suavemente
      if (piece.type === 'trash') {
        item.progress += effectiveDt * 2.2;
        if (item.progress >= 1.0) {
          this.items.splice(i, 1);
        }
        continue;
      }

      // Salida / Delivery
      if (piece.type === 'delivery') {
        item.progress += effectiveDt * 3.0;
        if (item.progress >= 0.8) {
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
          item.progress = Math.min(0.5, item.progress + effectiveDt * beltSpeed);
          continue;
        }

        const handled = this.processMachineOutput(piece, item);
        if (handled) {
          this.items.splice(i, 1);
        }
        continue;
      }

      // Mezcladora: espera a tener dos elementos o combina
      if (piece.type === 'mixer') {
        item.processingTimer = (item.processingTimer || 0) + effectiveDt;

        // Centrar item en la mezcladora
        if (item.progress < 0.5) {
          item.progress = Math.min(0.5, item.progress + effectiveDt * beltSpeed);
        }

        const delta = DIR_DELTA[piece.dir];
        const outX = piece.x + delta.x;
        const outY = piece.y + delta.y;
        const nextPiece = this.grid.get(outX, outY);

        if (nextPiece && this.canAcceptItem(nextPiece, piece.dir)) {
          const outBlocked = this.items.some(it => it.x === outX && it.y === outY && it.progress < 0.35);
          if (!outBlocked) {
            // Buscar si hay otra forma en la mezcladora
            const otherIdx = this.items.findIndex(it => it !== item && it.x === piece.x && it.y === piece.y);
            if (otherIdx !== -1) {
              const other = this.items[otherIdx];
              const combined = Shapes.mix(item.shape, other.shape);
              this.items.splice(otherIdx, 1);
              // Si el índice del elemento actual se vio afectado al eliminar el otro
              const currentIdx = this.items.indexOf(item);
              if (currentIdx !== -1) this.items.splice(currentIdx, 1);
              this.spawnItem(combined, outX, outY, piece.dir);
              continue;
            } else if (item.processingTimer > 1.8 && item.shape.left && item.shape.right) {
              // Si ya es una forma completa y lleva tiempo esperando, permitir paso
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
          item.progress += effectiveDt * beltSpeed;
          continue;
        }

        const exit = this.findTunnelExit(piece.x, piece.y, piece.dir);
        if (exit) {
          item.isUnderground = true;
          item.progress += effectiveDt * beltSpeed * 1.8;

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
          item.progress = Math.min(0.5, item.progress + effectiveDt * beltSpeed);
          continue;
        }
      }

      // Cinta transportadora estándar
      const nextItem = this.findItemAhead(item);
      const maxProgress = nextItem ? Math.max(0, nextItem.progress - 0.45) : 1.0;

      if (item.progress < maxProgress) {
        item.progress = Math.min(maxProgress, item.progress + effectiveDt * beltSpeed);
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
  }

  canAcceptItem(piece, incomingDir) {
    if (!piece) return false;
    if (piece.type === 'obstacle' || piece.type === 'spawner') return false;
    if (piece.type === 'trash' || piece.type === 'delivery') return true;

    // Cinta transportadora
    if (piece.type === 'belt') {
      return piece.dir !== OPPOSITE_DIR[incomingDir];
    }

    // Cortadora y Pintor (entrada trasera en línea)
    if (piece.type === 'cutter' || piece.type === 'painter') {
      return incomingDir === piece.dir;
    }

    // Mezcladora (acepta por ambos laterales y por detrás)
    if (piece.type === 'mixer') {
      const leftDir = (piece.dir + 1) % 4;
      const rightDir = (piece.dir + 3) % 4;
      return incomingDir === piece.dir || incomingDir === leftDir || incomingDir === rightDir;
    }

    // Túnel (entrada trasera)
    if (piece.type === 'tunnel') {
      return incomingDir === piece.dir;
    }

    return false;
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
          this.spawnItem(paintedShape, outX, outY, piece.dir);
          return true;
        }
      }
      return false;
    }

    if (piece.type === 'cutter') {
      const { leftHalf, rightHalf } = Shapes.cut(item.shape);

      // Salida izquierda: recta hacia piece.dir
      const fDelta = DIR_DELTA[piece.dir];
      const fX = piece.x + fDelta.x;
      const fY = piece.y + fDelta.y;
      const fPiece = this.grid.get(fX, fY);

      // Salida derecha: giro 90° a la derecha (dir + 1) % 4
      const rightDir = (piece.dir + 1) % 4;
      const rDelta = DIR_DELTA[rightDir];
      const rX = piece.x + rDelta.x;
      const rY = piece.y + rDelta.y;
      const rPiece = this.grid.get(rX, rY);

      const canLeft = !leftHalf || (fPiece && this.canAcceptItem(fPiece, piece.dir) && !this.items.some(it => it.x === fX && it.y === fY && it.progress < 0.35));
      const canRight = !rightHalf || (rPiece && this.canAcceptItem(rPiece, rightDir) && !this.items.some(it => it.x === rX && it.y === rY && it.progress < 0.35));

      if (canLeft && canRight) {
        if (leftHalf && fPiece) this.spawnItem(leftHalf, fX, fY, piece.dir);
        if (rightHalf && rPiece) this.spawnItem(rightHalf, rX, rY, rightDir);
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
    this.beltAnimOffset = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
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
    this.beltAnimOffset = (this.beltAnimOffset + dt * 1.5 * speedMult) % 1.0;

    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = this.isDark ? '#1B1F24' : '#F2F0EB';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.translate(this.camX, this.camY);
    ctx.scale(this.zoom, this.zoom);

    this.drawGrid(ctx);
    this.drawTunnelGuides(ctx);

    for (const piece of this.grid.getAllPieces()) {
      this.drawPiece(ctx, piece);
    }

    if (this.ghost) {
      this.drawGhost(ctx, this.ghost);
    }

    this.drawItems(ctx);

    ctx.restore();

    this.drawParticles(ctx, dt);
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

  drawPiece(ctx, piece) {
    const px = piece.x * this.tileSize;
    const py = piece.y * this.tileSize;
    const s = this.tileSize;
    const cx = px + s / 2;
    const cy = py + s / 2;

    ctx.save();
    ctx.translate(cx, cy);

    const angle = (piece.dir || 0) * (Math.PI / 2);
    ctx.rotate(angle);

    switch (piece.type) {
      case 'belt':
        this.renderBeltTile(ctx, s);
        break;
      case 'spawner':
        this.renderSpawnerTile(ctx, piece, s);
        break;
      case 'trash':
        this.renderTrashTile(ctx, s);
        break;
      case 'cutter':
        this.renderCutterTile(ctx, s);
        break;
      case 'painter':
        this.renderPainterTile(ctx, piece, s);
        break;
      case 'mixer':
        this.renderMixerTile(ctx, s);
        break;
      case 'tunnel':
        this.renderTunnelTile(ctx, s);
        break;
      case 'delivery':
        this.renderDeliveryTile(ctx, s);
        break;
      case 'obstacle':
        this.renderObstacleTile(ctx, s);
        break;
    }

    ctx.restore();
  }

  renderBeltTile(ctx, s) {
    const bgColor = this.isDark ? '#252B33' : '#E6E1D8';
    const trackColor = this.isDark ? '#2E3540' : '#DED8CE';
    const arrowColor = this.isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)';

    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 6);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.fillStyle = trackColor;
    ctx.fillRect(-s / 2 + 4, -s * 0.28, s - 8, s * 0.56);

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

  renderSpawnerTile(ctx, piece, s) {
    ctx.fillStyle = this.isDark ? '#2B323D' : '#E2DFD6';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.fillStyle = this.isDark ? '#A8D5BA' : '#68B084';
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -6);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 6);
    ctx.closePath();
    ctx.fill();

    if (piece.shape) {
      Shapes.draw(ctx, piece.shape, s * 0.28, this.isDark);
    }
  }

  renderTrashTile(ctx, s) {
    ctx.fillStyle = this.isDark ? '#382A2E' : '#F5DCDA';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.strokeStyle = '#E8A0A0';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(6, 6);
    ctx.moveTo(6, -6);
    ctx.lineTo(-6, 6);
    ctx.stroke();
  }

  renderCutterTile(ctx, s) {
    ctx.fillStyle = this.isDark ? '#26303B' : '#DFE9F2';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.strokeStyle = '#A9CCE3';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.25, -s * 0.25);
    ctx.lineTo(s * 0.25, s * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#A9CCE3';
    // Delante (izq)
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -4);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 4);
    ctx.fill();

    // Derecha (der)
    ctx.beginPath();
    ctx.moveTo(-4, s / 2 - 8);
    ctx.lineTo(0, s / 2 - 2);
    ctx.lineTo(4, s / 2 - 8);
    ctx.fill();
  }

  renderPainterTile(ctx, piece, s) {
    const colorHex = COLOR_HEX[piece.color || 'lavender'];
    ctx.fillStyle = this.isDark ? '#2E2838' : '#ECE5F5';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 8, -4);
    ctx.lineTo(s / 2 - 2, 0);
    ctx.lineTo(s / 2 - 8, 4);
    ctx.fill();
  }

  renderMixerTile(ctx, s) {
    ctx.fillStyle = this.isDark ? '#352D26' : '#F7EBDC';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

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
    ctx.fillStyle = this.isDark ? '#262D2C' : '#DFEDE6';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 8);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

    ctx.fillStyle = this.isDark ? '#14181B' : '#33373D';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, -Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();
  }

  renderDeliveryTile(ctx, s) {
    ctx.fillStyle = this.isDark ? '#243329' : '#DCF0E2';
    if (ctx.roundRect) {
      ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 10);
    } else {
      ctx.rect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
    }
    ctx.fill();

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
    ctx.fillStyle = this.isDark ? '#30343D' : '#D1CBC2';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGhost(ctx, ghost) {
    // En modo Vista no se muestra la previsualización de colocación
    if (this.game && this.game.mode === 'view') return;

    ctx.save();
    ctx.globalAlpha = 0.55;

    if (ghost.type === 'erase') {
      const s = this.tileSize;
      const px = ghost.x * s;
      const py = ghost.y * s;
      ctx.fillStyle = '#E8A0A0';
      if (ctx.roundRect) {
        ctx.roundRect(px + 2, py + 2, s - 4, s - 4, 6);
      } else {
        ctx.fillRect(px + 2, py + 2, s - 4, s - 4);
      }
    } else {
      // drawPiece ya calcula la posición de mundo (piece.x + 0.5) * s y rota piece.dir
      this.drawPiece(ctx, ghost);
    }

    ctx.restore();
  }

  drawItems(ctx) {
    const s = this.tileSize;

    for (const item of this.sim.items) {
      if (item.isUnderground) continue;

      const piece = this.grid.get(item.x, item.y);
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

      ctx.save();
      ctx.translate(drawX, drawY);

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
      } else {
        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        if (e.button === 2 || this.game.selectedTool === 'erase') {
          this.game.removePieceAt(pos.gridX, pos.gridY);
        } else if (e.button === 0) {
          this.game.placePieceAt(pos.gridX, pos.gridY);
          this.lastPlacedCell = { x: pos.gridX, y: pos.gridY };
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
    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
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
      // En táctil, arrastrar con 1 dedo desplaza la cámara si se mueve más de 10px
      if (totalDist > 10) {
        this.isDraggingMap = true;
        this.game.renderer.camX += dx;
        this.game.renderer.camY += dy;
      }
    } else {
      // En PC con ratón
      if (e.buttons === 1 && !this.longPressTriggered) {
        if (this.game.selectedTool === 'erase') {
          this.game.removePieceAt(pos.gridX, pos.gridY);
        } else {
          // Colocar al arrastrar respetando SIEMPRE la rotación actual de la preview
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
    clearTimeout(this.longPressTimer);
    this.activePointers.delete(e.pointerId);

    if (e.button === 1) {
      this.isMiddleDragging = false;
    }

    this.canvas.classList.remove('grabbing');

    if (this.activePointers.size === 0) {
      const totalDist = Math.hypot(e.clientX - this.pointerStartX, e.clientY - this.pointerStartY);

      // Si es un tap limpio en pantalla táctil y en MODO EDICIÓN
      if (this.game.mode === 'edit' && !this.isDraggingMap && !this.longPressTriggered && totalDist < 12) {
        const pos = this.game.renderer.screenToWorld(e.clientX, e.clientY);
        if (e.pointerType === 'touch') {
          if (this.game.selectedTool === 'erase') {
            this.game.removePieceAt(pos.gridX, pos.gridY);
          } else {
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

    // Teclas 1 a 8 para herramientas (solo en modo edición o cambia herramienta y pasa a edición)
    const tools = ['belt', 'extractor', 'trash', 'cutter', 'painter', 'mixer', 'tunnel', 'erase'];
    if (e.key >= '1' && e.key <= '8') {
      const idx = parseInt(e.key, 10) - 1;
      if (tools[idx]) {
        if (this.game.mode === 'view') {
          this.game.toggleMode(); // Pasar a modo edición al seleccionar herramienta
        }
        this.game.selectTool(tools[idx]);
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'r':
        this.game.rotatePlacement();
        break;
      case 'escape':
        this.game.ui.toggleLevelsModal();
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
    this.bindDOM();
  }

  bindDOM() {
    // Alternar Modo Vista / Edición
    const btnMode = document.getElementById('btn-mode-toggle');
    if (btnMode) btnMode.addEventListener('click', () => this.game.toggleMode());

    const btnFabMode = document.getElementById('btn-fab-mode');
    if (btnFabMode) btnFabMode.addEventListener('click', () => this.game.toggleMode());

    document.getElementById('btn-pause').addEventListener('click', () => this.game.togglePause());
    document.getElementById('btn-speed').addEventListener('click', () => this.game.cycleSpeed());
    document.getElementById('btn-restart-level').addEventListener('click', () => this.game.restartCurrentLevel());
    document.getElementById('btn-levels-modal').addEventListener('click', () => this.toggleLevelsModal(true));
    document.getElementById('btn-sound-toggle').addEventListener('click', () => this.game.toggleSound());
    document.getElementById('btn-theme-toggle').addEventListener('click', () => this.game.toggleTheme());
    document.getElementById('btn-settings').addEventListener('click', () => this.toggleSettingsModal(true));

    document.getElementById('btn-close-levels').addEventListener('click', () => this.toggleLevelsModal(false));
    document.getElementById('btn-close-settings').addEventListener('click', () => this.toggleSettingsModal(false));
    document.getElementById('btn-replay-level').addEventListener('click', () => {
      this.toggleVictoryModal(false);
      this.game.restartCurrentLevel();
    });
    document.getElementById('btn-next-level').addEventListener('click', () => {
      this.toggleVictoryModal(false);
      this.game.loadNextLevel();
    });
    document.getElementById('btn-reset-save').addEventListener('click', () => {
      if (confirm("¿Estás seguro de que deseas reiniciar todo el progreso y las mejores marcas guardadas?")) {
        this.game.resetAllProgress();
      }
    });

    const darkInput = document.getElementById('setting-darkmode');
    darkInput.addEventListener('change', (e) => this.game.setTheme(e.target.checked));

    const ctrlSelect = document.getElementById('setting-controls-mode');
    ctrlSelect.addEventListener('change', (e) => this.game.setControlsMode(e.target.value));

    const motionInput = document.getElementById('setting-reduced-motion');
    motionInput.addEventListener('change', (e) => this.game.setReducedMotion(e.target.checked));

    document.getElementById('btn-fab-rotate').addEventListener('click', () => this.game.rotatePlacement());
    document.getElementById('btn-fab-erase').addEventListener('click', () => {
      if (this.game.selectedTool === 'erase') {
        this.game.selectTool('belt');
      } else {
        this.game.selectTool('erase');
      }
    });
    document.getElementById('btn-fab-center').addEventListener('click', () => this.game.centerCameraOnLevel());
    document.getElementById('btn-fab-zoomin').addEventListener('click', () => this.game.setZoom(this.game.renderer.zoom * 1.2));
    document.getElementById('btn-fab-zoomout').addEventListener('click', () => this.game.setZoom(this.game.renderer.zoom * 0.8));

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
  }

  updateLevelInfo(level) {
    document.getElementById('level-tag').textContent = `Nivel ${level.id}`;
    document.getElementById('level-title').textContent = level.name;
    document.getElementById('hint-text').textContent = level.hint || level.description;

    const previewCanvas = document.getElementById('target-preview-canvas');
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      pCtx.save();
      pCtx.translate(previewCanvas.width / 2, previewCanvas.height / 2);
      Shapes.draw(pCtx, level.targetShape, 22, this.game.isDark);
      pCtx.restore();
    }

    this.updateQuota(0, level.quota);
    this.updateAvailableTools(level.availableTools || ['belt']);
  }

  updateQuota(delivered, quota) {
    document.getElementById('quota-display').textContent = `${delivered} / ${quota}`;
    const pct = Math.min(100, (delivered / quota) * 100);
    document.getElementById('quota-progress-bar').style.width = `${pct}%`;
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
      if (tool === 'erase' || tools.includes(tool)) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    });

    const colorBar = document.getElementById('painter-color-bar');
    if (this.game.selectedTool === 'painter' && tools.includes('painter')) {
      colorBar.classList.add('visible');
    } else {
      colorBar.classList.remove('visible');
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
    if (tool === 'erase') {
      eraseFab.classList.add('active');
    } else {
      eraseFab.classList.remove('active');
    }

    const colorBar = document.getElementById('painter-color-bar');
    if (tool === 'painter') {
      colorBar.classList.add('visible');
    } else {
      colorBar.classList.remove('visible');
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
    if (show) {
      document.getElementById('victory-time').textContent = data.time || '00:00';
      document.getElementById('victory-best').textContent = data.best || '00:00';
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  toggleLevelsModal(show) {
    const modal = document.getElementById('levels-modal');
    if (show) {
      this.populateLevelsGrid();
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  toggleSettingsModal(show) {
    const modal = document.getElementById('settings-modal');
    if (show) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  }

  populateLevelsGrid() {
    const container = document.getElementById('levels-grid-container');
    container.innerHTML = '';

    const save = this.game.saveData;

    LEVELS.forEach(lvl => {
      const isCompleted = save.nivelesCompletados.includes(lvl.id);
      const isCurrent = save.nivelActual === lvl.id;
      const maxUnlocked = Math.max(1, ...(save.nivelesCompletados || [0])) + 1;
      const isUnlocked = lvl.id <= maxUnlocked || lvl.id <= save.nivelActual;

      const btn = document.createElement('button');
      btn.className = `level-card-btn ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}`;
      
      const bestTimeSecs = save.mejoresTiempos[lvl.id];
      const timeStr = bestTimeSecs ? `${bestTimeSecs.toFixed(1)}s` : '--';

      btn.innerHTML = `
        <span class="level-card-num">${lvl.id}</span>
        <span class="level-card-time">${timeStr}</span>
      `;

      if (isUnlocked) {
        btn.addEventListener('click', () => {
          this.toggleLevelsModal(false);
          this.game.loadLevel(lvl.id);
        });
      }

      container.appendChild(btn);
    });
  }

  showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast-msg');
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

    this.isPaused = false;
    this.speedMult = 1.0;
    this.selectedTool = 'belt';
    this.placementDir = DIR.RIGHT;
    this.painterColor = PASTEL_COLORS.MINT;
    this.mode = 'edit'; // 'edit' (Edición) o 'view' (Vista)

    const canvas = document.getElementById('game-canvas');
    this.sim = new Simulation(this.grid, (shape, deliveryPiece) => this.onShapeDelivered(shape, deliveryPiece));
    this.renderer = new Renderer(canvas, this.grid, this.sim);
    this.renderer.game = this;
    this.input = new InputManager(canvas, this);
    this.ui = new UIManager(this);

    this.applyLoadedConfig();
    this.ui.updateModeUI(this.mode);
    this.updateCanvasCursor();
    this.loadLevel(this.saveData.nivelActual || 1);

    // Auto-guardado cada 5 segundos según requerimiento
    setInterval(() => this.autoSave(), 5000);
    window.addEventListener('beforeunload', () => this.autoSave());

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  applyLoadedConfig() {
    const cfg = this.saveData.config;
    this.setTheme(cfg.modoOscuro);
    this.setReducedMotion(cfg.reducirMovimiento);
    this.audio.enabled = cfg.sonido !== false;
    this.ui.setSoundIcons(this.audio.enabled);

    if (cfg.tipoDispositivo) {
      document.getElementById('setting-controls-mode').value = cfg.tipoDispositivo;
      this.detectAndApplyDeviceMode(cfg.tipoDispositivo);
    }
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
    this.isPaused = false;
    this.sim.reset();
    this.grid.cells.clear();

    if (lvl.fixedGrid) {
      for (const item of lvl.fixedGrid) {
        this.grid.set(item.x, item.y, {
          x: item.x,
          y: item.y,
          type: item.type,
          dir: item.dir !== undefined ? item.dir : DIR.RIGHT,
          shape: item.shape ? Shapes.clone(item.shape) : null,
          color: item.color || null,
          secondary: item.secondary || false,
          fixed: true
        });
      }
    }

    const savedBuildings = this.saveData.construcciones[lvl.id];
    if (savedBuildings) {
      this.grid.importUserPieces(savedBuildings);
    }

    this.saveData.nivelActual = lvl.id;
    this.ui.updateLevelInfo(lvl);

    // Ajustar herramienta inicial disponible
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
    const valid = !existing || !existing.fixed;

    this.renderer.ghost = {
      x: gridX,
      y: gridY,
      type: this.selectedTool,
      dir: this.placementDir,
      color: this.painterColor,
      valid: valid
    };
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
    if (this.mode === 'view') return; // En modo vista no se colocan piezas

    const existing = this.grid.get(x, y);
    if (existing && existing.fixed) {
      return;
    }

    if (this.selectedTool === 'erase') {
      this.removePieceAt(x, y);
      return;
    }

    // Si ya existe la misma pieza con la misma dirección y color, no alterar
    if (existing && existing.type === this.selectedTool && existing.dir === this.placementDir) {
      if (this.selectedTool !== 'painter' || existing.color === this.painterColor) {
        return;
      }
    }

    const newPiece = {
      x: x,
      y: y,
      type: this.selectedTool,
      dir: this.placementDir, // Respetar SIEMPRE y fielmente la orientación de la preview
      color: this.selectedTool === 'painter' ? this.painterColor : null,
      shape: this.selectedTool === 'extractor' ? Shapes.clone(this.currentLevel.targetShape) : null,
      fixed: false
    };

    this.grid.set(x, y, newPiece);
    this.audio.playPlace();
    this.updateGhost(x, y);
  }

  removePieceAt(x, y) {
    if (this.mode === 'view') return; // En modo vista no se borra
    const removed = this.grid.remove(x, y);
    if (removed) {
      this.audio.playDelete();
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
    this.timeElapsed = 0;
    this.sim.reset();
    this.ui.updateQuota(0, this.currentLevel.quota);
    this.ui.showToast("Nivel reiniciado", 1500);
  }

  onShapeDelivered(shape, deliveryPiece) {
    const target = (deliveryPiece && deliveryPiece.secondary && this.currentLevel.secondaryTarget) 
      ? this.currentLevel.secondaryTarget 
      : this.currentLevel.targetShape;

    const isMatch = Shapes.matches(shape, target);

    if (isMatch) {
      this.deliveredCount++;
      this.audio.playDelivery();

      const screenPos = {
        x: (deliveryPiece.x + 0.5) * this.renderer.tileSize * this.renderer.zoom + this.renderer.camX,
        y: (deliveryPiece.y + 0.5) * this.renderer.tileSize * this.renderer.zoom + this.renderer.camY
      };
      this.renderer.addParticles(screenPos.x, screenPos.y, 14, '#A8D5BA');

      this.ui.updateQuota(this.deliveredCount, this.currentLevel.quota);

      if (this.deliveredCount >= this.currentLevel.quota) {
        this.completeLevel();
      }
    }
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

    this.autoSave();

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = (secs % 60).toFixed(1);
      return `${m.toString().padStart(2, '0')}:${s.padStart(4, '0')}`;
    };

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
      best: formatTime(this.saveData.mejoresTiempos[lvlId] || currentTime)
    });
  }

  loadNextLevel() {
    const nextId = this.currentLevel.id + 1;
    if (nextId <= LEVELS.length) {
      this.loadLevel(nextId);
    } else {
      this.ui.showToast("¡Has completado todos los niveles de BeltFlow! Enhorabuena.", 4000);
      this.loadLevel(20);
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
    document.getElementById('setting-reduced-motion').checked = reduced;
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
    this.ui.showToast("Progreso reiniciado correctamente", 2000);
  }

  gameLoop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastFrameTime) / 1000);
    this.lastFrameTime = currentTime;

    if (!this.isPaused) {
      this.timeElapsed += dt * this.speedMult;
      this.sim.update(dt, this.speedMult);

      if (this.currentLevel.timeLimit) {
        const timeLeft = Math.max(0, this.currentLevel.timeLimit - this.timeElapsed);
        this.ui.updateTimer(timeLeft, timeLeft <= 30);
      } else {
        this.ui.updateTimer(null);
      }
    }

    this.renderer.render(dt, this.isPaused ? 0 : this.speedMult);

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Iniciar juego cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  window.beltFlowGame = new BeltFlowGame();
});
