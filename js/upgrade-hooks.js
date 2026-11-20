/**
 * upgrade-hooks.js
 * -----------------------------------------------------------------------------
 * Plug-in APIs for the three pending assets. Call these from the browser
 * console, or from a tiny <script> once the files exist. No core code changes.
 *
 *   window.VaaniBridgeHooks.mountWearableSTL({ stlUrl, cameraStops })
 *       Page 3. Hides the [IN PROGRESS — RELEASING SOON] badge, mounts an
 *       .STL viewer inside #wearable-3d-viewport and binds the 4 camera cuts.
 *       cameraStops (all optional): { down, left, zoom, orbit }, each
 *       { pitch, yaw, zoom } in radians / scale. Example:
 *         VaaniBridgeHooks.mountWearableSTL({ stlUrl: './assets/models/badge.stl' })
 *
 *   window.VaaniBridgeHooks.mountDemoVideo({ videoSrc, posterSrc, chapters })
 *       Page 5. Hides the [RELEASING SOON] card, undims both panels, mounts a
 *       <video controls> player and wires the 5 chapter rows to timestamps.
 *       chapters: array of 5 start times in seconds, or [{ time }] objects.
 *         VaaniBridgeHooks.mountDemoVideo({
 *           videoSrc: './assets/media/demo.mp4',
 *           posterSrc: './assets/media/demo-poster.jpg',
 *           chapters: [0, 24, 61, 98, 140],
 *         })
 *
 *   window.VaaniBridgeHooks.setTeamPhotos({ Daksh, Shivang, Vaibhav, Divyansh, Shivansh })
 *       Page 6. Replaces the Blank Tree silhouette with a real portrait URL in
 *       the spotlight card and in the bottom preview strip.
 *         VaaniBridgeHooks.setTeamPhotos({ Daksh: './assets/media/daksh.jpg' })
 *
 * How it works: each hook stores its options in `hookState` and fires a
 * "vaanibridge:hooks" event. The matching page applies the state when it mounts
 * AND whenever the event fires, so hooks work before or after the page is open.
 */

export const hookState = {
  stl: null,
  demo: null,
  photos: {},
};

export const HOOK_EVENT = 'vaanibridge:hooks';

function notify(type) {
  document.dispatchEvent(new CustomEvent(HOOK_EVENT, { detail: { type } }));
}

window.VaaniBridgeHooks = {
  /** @param {{stlUrl: string, cameraStops?: object}} options */
  mountWearableSTL(options) {
    hookState.stl = options || null;
    notify('stl');
  },

  /** @param {{videoSrc: string, posterSrc?: string, chapters?: Array}} options */
  mountDemoVideo(options) {
    hookState.demo = options || null;
    notify('demo');
  },

  /** @param {Record<string, string>} photos map of member name → image URL */
  setTeamPhotos(photos) {
    hookState.photos = { ...hookState.photos, ...(photos || {}) };
    notify('photos');
  },
};

/* ==========================================================================
   Minimal .STL viewer (no dependencies): binary + ASCII parsing, flat shading,
   drag-to-rotate and animated camera stops, rendered on a 2D canvas.
   ========================================================================== */

/** Default camera stops for the four directional cuts. */
export const DEFAULT_CAMERA_STOPS = {
  home: { pitch: -0.25, yaw: 0.5, zoom: 1 },
  down: { pitch: -1.15, yaw: 0, zoom: 1.05 },
  left: { pitch: -0.15, yaw: -0.95, zoom: 1.05 },
  zoom: { pitch: -0.2, yaw: 0.2, zoom: 1.9 },
  orbit: { pitch: -0.35, yaw: 0.5 + Math.PI * 2, zoom: 1.15 },
};

/** Parse binary or ASCII STL into a flat Float32Array of triangle vertices (9 floats each). */
function parseSTL(buffer) {
  const view = new DataView(buffer);
  const faceCount = view.getUint32(80, true);
  const isBinary = buffer.byteLength === 84 + faceCount * 50;

  if (isBinary) {
    const out = new Float32Array(faceCount * 9);
    for (let f = 0; f < faceCount; f++) {
      const offset = 84 + f * 50 + 12; // skip the 12-byte normal
      for (let v = 0; v < 9; v++) out[f * 9 + v] = view.getFloat32(offset + v * 4, true);
    }
    return out;
  }

  const text = new TextDecoder().decode(buffer);
  const numbers = [];
  const pattern = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
  let match;
  while ((match = pattern.exec(text))) numbers.push(+match[1], +match[2], +match[3]);
  return new Float32Array(numbers);
}

/**
 * Mount the viewer.
 * @param {HTMLElement} container element that receives the <canvas>
 * @param {{stlUrl: string, cameraStops?: object}} options
 * @returns {Promise<{setCamera: Function, destroy: Function}>}
 */
export async function createStlViewer(container, { stlUrl, cameraStops = {} }) {
  const response = await fetch(stlUrl);
  if (!response.ok) throw new Error(`Could not load STL: ${stlUrl}`);
  let triangles = parseSTL(await response.arrayBuffer());

  // Decimate very dense meshes so painter's-algorithm sorting stays smooth.
  const maxFaces = 30000;
  if (triangles.length / 9 > maxFaces) {
    const step = Math.ceil(triangles.length / 9 / maxFaces);
    const kept = [];
    for (let f = 0; f < triangles.length / 9; f += step) kept.push(...triangles.subarray(f * 9, f * 9 + 9));
    triangles = Float32Array.from(kept);
  }
  const faceTotal = triangles.length / 9;

  // Center on the origin and normalise to a unit-sized model.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < triangles.length; i++) {
    const axis = i % 3;
    min[axis] = Math.min(min[axis], triangles[i]);
    max[axis] = Math.max(max[axis], triangles[i]);
  }
  const center = min.map((m, i) => (m + max[i]) / 2);
  const span = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
  for (let i = 0; i < triangles.length; i++) triangles[i] = (triangles[i] - center[i % 3]) / span;

  const canvas = document.createElement('canvas');
  canvas.className = 'stl-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D wearable badge model');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const stops = { ...DEFAULT_CAMERA_STOPS, ...cameraStops };
  const camera = { ...stops.home };
  let target = { ...stops.home };
  let frameId = 0;
  let dragging = null;
  let destroyed = false;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.min(w, h) * 0.5 * camera.zoom;
    const cy = Math.cos(camera.yaw);
    const sy = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch);
    const sp = Math.sin(camera.pitch);
    const projected = new Array(faceTotal);

    for (let f = 0; f < faceTotal; f++) {
      const pts = [];
      let depth = 0;
      for (let v = 0; v < 3; v++) {
        const x = triangles[f * 9 + v * 3];
        const y = triangles[f * 9 + v * 3 + 1];
        const z = triangles[f * 9 + v * 3 + 2];
        const x1 = x * cy + z * sy; // yaw
        const z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp; // pitch
        const z2 = y * sp + z1 * cp;
        const persp = 3 / (3 - z2);
        pts.push([w / 2 + x1 * scale * persp, h / 2 - y2 * scale * persp, z2]);
        depth += z2;
      }
      projected[f] = { pts, depth };
    }

    projected.sort((a, b) => a.depth - b.depth);
    ctx.lineWidth = 0.5;
    for (const { pts } of projected) {
      // Flat shading from the screen-space normal's tilt toward the viewer.
      const ux = pts[1][0] - pts[0][0];
      const uy = pts[1][1] - pts[0][1];
      const vx = pts[2][0] - pts[0][0];
      const vy = pts[2][1] - pts[0][1];
      const facing = Math.min(1, Math.abs(ux * vy - uy * vx) / (Math.hypot(ux, uy) * Math.hypot(vx, vy) + 1e-6));
      const light = 28 + facing * 52;
      ctx.fillStyle = `hsl(218 28% ${light}%)`;
      ctx.strokeStyle = 'rgba(59,130,246,0.35)';
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function tick() {
    if (destroyed) return;
    let moving = false;
    for (const key of ['pitch', 'yaw', 'zoom']) {
      const delta = target[key] - camera[key];
      if (Math.abs(delta) > 0.001) {
        camera[key] += delta * 0.07;
        moving = true;
      }
    }
    if (moving || dragging) draw();
    frameId = requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    target.yaw += (event.clientX - dragging.x) * 0.01;
    target.pitch += (event.clientY - dragging.y) * 0.01;
    camera.yaw = target.yaw;
    camera.pitch = target.pitch;
    dragging = { x: event.clientX, y: event.clientY };
  });
  const endDrag = () => (dragging = null);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', resize);

  resize();
  draw();
  tick();

  return {
    /** Fly to a named stop ('home' | 'down' | 'left' | 'zoom' | 'orbit'). */
    setCamera(name) {
      const stop = stops[name] || stops.home;
      if (name === 'orbit') camera.yaw = stops.home.yaw; // restart the orbit sweep
      target = { ...stop };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      canvas.remove();
    },
  };
}
