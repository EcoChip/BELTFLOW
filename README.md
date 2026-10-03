# BeltFlow 🔄

> **Puzle de automatización por cintas transportadoras con estética suave y relajante anti-fatiga.**

Inspirado en la elegancia de juegos de automatización espacial como *Shapez.io*, **BeltFlow** reimagina el género como una experiencia placentera y meditativa. Diseñado específicamente para evitar la fatiga visual con colores pastel de baja saturación, sombras difusas y un rendimiento fluido a 60 FPS en Canvas 2D, con soporte nativo para PC y pantallas táctiles (móvil y tablet).

---

## 🎨 Características Visuales (Anti-Fatiga)
- **Paleta Suave**:
  - Modo Claro: Fondo `#F2F0EB`, texto `#2E3440`.
  - Modo Oscuro: Fondo `#1B1F24`, texto `#E5E9F0`.
  - Acentos Pastel: Menta (`#A8D5BA`), Cielo (`#A9CCE3`), Lavanda (`#C9B6E4`), Durazno (`#F5C6A5`), Coral suave (`#E8A0A0`).
- **Sin fatiga visual**: Saturación máxima menor al 70%, sin rojos estridentes ni neones.
- **Tipografía**: *Nunito* e *Inter* para la interfaz, *JetBrains Mono* para métricas y cronómetro.
- **Física y Animación**: Movimiento continuo e interpolado en `requestAnimationFrame`, partículas suaves al completar niveles y respuesta háptica/visual táctil.

---

## 🧩 Mecánicas de Juego y Componentes
El objetivo en cada nivel es suministrar a la salida la cuota solicitada de formas geométricas (círculos, cuadrados, triángulos, rombos, estrellas, enteras, cortadas o bicolor) dentro del tiempo relajado disponible.

1. **Cinta Transportadora (`1`)**: Transporta piezas en línea recta o en giros suaves de 90°.
2. **Extractor / Spawner (`2`)**: Genera formas geométricas periódicamente.
3. **Trituradora / Trash (`3`)**: Destruye cualquier forma para filtrar residuos o excedentes.
4. **Cortadora / Cutter (`4`)**: Divide la forma en dos mitades (izquierda sale recta, derecha a 90°).
5. **Pintor (`5`)**: Tiñe las piezas con uno de los 5 colores pastel seleccionables.
6. **Mezcladora / Mixer (`6`)**: Fusiona dos mitades o formas en una sola entidad compuesta.
7. **Túnel Subterráneo (`7`)**: Cruza cintas sin colisionar pasando por debajo de hasta 4 celdas.
8. **Modo Borrador (`8`)**: Permite demoler piezas no deseadas.

---

## 🕹️ Controles

### Modos de Interacción (Tecla Q)
- **Modo Edición (✏️)** *(por defecto)*: Diseña y automatiza. Clic izquierdo coloca piezas con la rotación exacta previsualizada, clic derecho elimina piezas.
- **Modo Vista (👁️)**: Inspecciona fábricas complejas sin riesgo de alterar nada. Clic izquierdo y arrastrar desplaza la cámara libremente, rueda o pinza hace zoom.

### En PC (Ratón y Teclado)
- **Tecla Q**: Alternar entre Modo Edición y Modo Vista.
- **Clic Izquierdo**: Colocar componente seleccionado (en Modo Edición).
- **Clic Derecho**: Eliminar componente (en Modo Edición).
- **Botón Central del Ratón**: Desplazar la cámara (*pan*) en cualquier modo (incluso colocando piezas).
- **Espacio + Arrastrar**: Desplazar la cámara (*pan* estilo Figma/Tiled). Pulsación corta de **Espacio** sin arrastrar pausa/reanuda la simulación.
- **Rueda del ratón o teclas 1 al 8**: Seleccionar herramienta.
- **Tecla R**: Rotar orientación (90° en sentido horario).
- **Esc**: Abrir / Cerrar el menú de selección de niveles.
- **Teclas + / -**: Acercar o alejar el zoom de la cámara.
- **Teclas W / A / S / D o Flechas**: Desplazar el mapa.

### En Pantallas Táctiles (Móviles y Tablets)
- **Botón 👁️ / ✏️**: Alternar entre Modo Vista y Modo Edición con un toque en la barra o botón flotante.
- **En Modo Edición**: Toque rápido (*tap*) para colocar pieza, mantener pulsado (380ms) para eliminar pieza.
- **En Modo Vista**: Arrastrar con un dedo desplaza el mapa con seguridad absoluta sin colocar piezas accidentales.
- **Pellizcar con dos dedos (Pinch-to-zoom)**: Control de zoom fluido.
- **Botones Flotantes en pantalla**: Botón de modo, rotación rápida, alternador de demolición, centrar cámara y controles de zoom.
- **Barra de herramientas táctil**: Áreas de toque de ≥ 48px según directrices de accesibilidad.

---

## 📋 Progresión de los 20 Niveles
1. **Nivel 1: Primeros Pasos** — Cinta recta básica del extractor a la salida.
2. **Nivel 2: Ruta Directa** — Cintas de mayor longitud con cuadrados celestes.
3. **Nivel 3: Curvas Suaves** — Giros a 90° usando rotación.
4. **Nivel 4: El Laberinto** — Esquivar obstáculos naturales en el jardín zen.
5. **Nivel 5: Dos Fuentes** — Seleccionar y conectar solo la fuente correcta.
6. **Nivel 6: Convergencia** — Unir dos extractores en una sola línea para duplicar el flujo.
7. **Nivel 7: El Filtro** — Uso de la trituradora para descartar piezas no deseadas.
8. **Nivel 8: Corte Preciso** — Introducción a la Cortadora (medias formas).
9. **Nivel 9: Mitades Espejadas** — Enrutamiento selectivo de la mitad derecha.
10. **Nivel 10: Taller de Color** — Introducción al Pintor (Lavanda).
11. **Nivel 11: Pinta y Corta** — Pintar estrellas y cortar mitades.
12. **Nivel 12: Color Selectivo** — Cortar primero y pintar únicamente una mitad.
13. **Nivel 13: Paso Subterráneo** — Introducción al Túnel (cruces perpendiculares).
14. **Nivel 14: Fusión Armónica** — Introducción a la Mezcladora (unir medio círculo y medio cuadrado).
15. **Nivel 15: Círculo Bicolor** — Corte, doble tintado y fusión simétrica.
16. **Nivel 16: Línea de Montaje** — Cadena compleja con dos extractores independientes.
17. **Nivel 17: Espacio Reducido** — Ensamblaje en zona estrecha con obstáculos.
18. **Nivel 18: Doble Demanda** — Dos salidas simultáneas con objetivos distintos.
19. **Nivel 19: Eficiencia Pura** — Cuota de 25 piezas con diseño optimizado.
20. **Nivel 20: Maestro del Flujo** — Modo sandbox con todas las herramientas disponibles y objetivo monumental.

---

## 💾 Guardado Local (localStorage)
Utiliza la clave oficial `beltflow_save_v1`:
```json
{
  "nivelActual": 3,
  "nivelesCompletados": [1, 2],
  "mejoresTiempos": { "1": 42.3, "2": 55.1 },
  "config": {
    "modoOscuro": false,
    "zoom": 1,
    "tipoDispositivo": "auto",
    "reducirMovimiento": false,
    "sonido": true
  },
  "construcciones": {
    "3": [ /* piezas del usuario */ ]
  }
}
```
- **Auto-guardado**: Cada 5 segundos y al cambiar o salir del nivel.
- **Restauración completa**: Al reabrir el navegador se mantiene el nivel en curso, las construcciones colocadas y los récords.
- **Botón de reinicio**: En la ventana de configuración con confirmación segura.

---

## 🚀 Despliegue en GitHub Pages

1. Inicializa y sube los archivos al repositorio en GitHub:
```bash
git add .
git commit -m "Lanzamiento inicial de BeltFlow v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/beltflow.git
git push -u origin main
```
2. En GitHub, entra en tu repositorio y haz clic en **Settings** ➔ **Pages**.
3. En **Build and deployment**:
   - **Source**: *Deploy from a branch*.
   - **Branch**: Selecciona `main` y la carpeta `/(root)`.
   - Haz clic en **Save**.
4. En 1-2 minutos tu juego estará disponible públicamente en `https://TU_USUARIO.github.io/beltflow/`.

---

## 🛠️ Ejecución Local Inmediata
Al tratarse de módulos estándar ES6 (`type="module"`), se recomienda ejecutarlo a través de un servidor HTTP local para evitar restricciones de CORS locales:

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js
npx serve .
```
Abre en tu navegador `http://localhost:8000`.
