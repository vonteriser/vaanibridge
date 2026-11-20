/**
 * swarm-engine.js
 * -----------------------------------------------------------------------------
 * The Hardware-Scaled Micro-Cursor Swarm.
 *
 * What it does
 *  1. Phase 0  – Blackout + silent hardware benchmark (0.0s → 1.4s).
 *  2. Phase 1  – 20–40 micro-cursors (always a multiple of 4) glide in from all
 *                four screen edges and stop 20px inside the border.
 *  3. Phase 2+3 – "Squads" of cursors latch onto page elements, trace a 1px
 *                wireframe and reveal them (see constructElement / sweepText).
 *  4. Phase 4  – Idle cursors form a hollow-core halo (7px–18px radius) that
 *                orbits the user's real pointer.
 *
 * Design rules that keep the site robust
 *  - The swarm is purely cosmetic. Revealing page content is triggered with
 *    setTimeout callbacks, never with animation-frame state, so content always
 *    appears even if the tab is throttled or the canvas fails.
 *  - The canvas has pointer-events: none, so it can never block a click.
 *  - Cursor size is zoom-locked: ~6.5px tall x 4.5px wide in physical size,
 *    normalised against devicePixelRatio and visualViewport.scale.
 *
 * Public API (returned by createSwarm)
 *  boot()                        → Promise<number>  runs phases 0–1, resolves with cursor count
 *  dispatch(options)             → job              generic "send N cursors to targets" primitive
 *  constructElement(el, opts)    → job              wireframe + reveal for one element
 *  sweepText(el, opts)           → job              typography scanline sweep
 *  orbitElement(el, count)       → job              orbit an element until job is released
 *  grabCardEdges(el, opts)       → job              4 cursors grab a card's left/right edges
 *  leadTypewriter(getPoint, ms)  → job              cursors lead a typewriter caret
 *  pullNav(nav, onPull)          → job              12 cursors pull the bottom nav upward
 *  settle()                      → void             switch idle cursors to the pointer halo
 *  releaseJob(job) / releaseAll()
 */

const TAU = Math.PI * 2;

/** Timing of the opening choreography (ms). */
const TIMELINE = {
  benchmark: 600, // rAF stability measurement window
  blackout: 1400, // pitch-black pause before cursors spawn
  entry: 700, // edge → 20px border glide
  hold: 250, // frame held before construction starts
  borderInset: 20, // final distance from each viewport edge (px)
};

/** Physical size of one micro-cursor at 100% zoom (25% of a ~26px pointer). */
const CURSOR_HEIGHT = 13;

/** Hollow-core orbit radii around the real pointer (px). */
const ORBIT_MIN = 56;
const ORBIT_MAX = 188;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Normalised arrow outline (tip at 0,0, height 1). */
const ARROW_POINTS = [
  [0, 0],
  [0, 0.86],
  [0.2, 0.68],
  [0.34, 1.0],
  [0.5, 0.93],
  [0.36, 0.62],
  [0.66, 0.62],
];

/**
 * Measure how smoothly requestAnimationFrame runs.
 * Falls back to a conservative estimate when the tab is hidden and rAF is paused.
 */
function measureFrameStability(durationMs) {
  return new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const startedAt = last;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      resolve(deltas);
    };

    const tick = (now) => {
      deltas.push(now - last);
      last = now;
      if (now - startedAt < durationMs) requestAnimationFrame(tick);
      else finish();
    };

    requestAnimationFrame(tick);
    setTimeout(finish, durationMs + 300); // hidden-tab safety net
  });
}

/**
 * Convert hardware facts + frame stability into a cursor count in [20, 40]
 * that is divisible by 4 so every edge receives an identical number.
 */
function computeCursorCount({ threads, memory, deltas }) {
  let fps = 45; // conservative default when no frames were measured
  let jitter = 1;
  if (deltas.length > 3) {
    const sorted = [...deltas.slice(1)].sort((a, b) => a - b); // drop the first (warm-up) frame
    const median = sorted[Math.floor(sorted.length / 2)] || 16.7;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || median;
    fps = 1000 / median;
    jitter = p95 / median;
  }
  const stable = jitter < 2.4;

  if (threads >= 8 && memory >= 4 && fps >= 55 && stable) return 40;
  if (threads >= 6 && fps >= 50 && stable) return 32;
  if (threads >= 4 && fps >= 40) return 28;
  return 20;
}

export function createSwarm(canvas) {
  const ctx = canvas.getContext('2d');

  const state = {
    mode: 'blackout', // 'blackout' | 'entry' | 'perimeter' | 'follow'
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    baseDpr: window.devicePixelRatio || 1, // DPR at load = "100% zoom" reference
    unit: 1, // zoom-lock multiplier applied to every cursor dimension
    entryStart: 0,
    cursors: [],
    count: 0,
    pointer: { x: 0, y: 0, seen: false },
    pulse: true,
  };

  const jobs = new Set();
  /** Visual effects drawn under the cursors: wireframes and scanlines. */
  const fx = [];

  /* ------------------------------------------------------------------ */
  /* Canvas sizing and zoom lock                                         */
  /* ------------------------------------------------------------------ */

  function resize() {
    const viewport = window.visualViewport;
    state.width = canvas.clientWidth || window.innerWidth;
    state.height = canvas.clientHeight || window.innerHeight;
    state.dpr = window.devicePixelRatio || 1;

    // Razor-sharp edges: backing buffer scales with devicePixelRatio.
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    // Zoom lock: browser zoom changes DPR, pinch zoom changes visualViewport.scale.
    const pinchScale = (viewport && viewport.scale) || 1;
    state.unit = state.baseDpr / state.dpr / pinchScale;

    state.cursors.forEach(computeRestPosition);
  }

  /* ------------------------------------------------------------------ */
  /* Cursor creation                                                     */
  /* ------------------------------------------------------------------ */

  /** Perimeter slot (20px inside the border) for a cursor, from its side + fraction. */
  function computeRestPosition(cursor) {
    const { width: w, height: h } = state;
    const inset = TIMELINE.borderInset;
    switch (cursor.side) {
      case 'top':
        cursor.rest = { x: cursor.frac * w, y: inset };
        cursor.spawn = { x: cursor.frac * w, y: -10 };
        cursor.face = Math.PI / 2; // pointing down (inward)
        break;
      case 'bottom':
        cursor.rest = { x: cursor.frac * w, y: h - inset };
        cursor.spawn = { x: cursor.frac * w, y: h + 10 };
        cursor.face = -Math.PI / 2;
        break;
      case 'left':
        cursor.rest = { x: inset, y: cursor.frac * h };
        cursor.spawn = { x: -10, y: cursor.frac * h };
        cursor.face = 0;
        break;
      default:
        cursor.rest = { x: w - inset, y: cursor.frac * h };
        cursor.spawn = { x: w + 10, y: cursor.frac * h };
        cursor.face = Math.PI;
    }
  }

  function createCursors(total) {
    const perSide = total / 4;
    const sides = ['top', 'bottom', 'left', 'right'];
    let index = 0;
    state.cursors = [];
    sides.forEach((side) => {
      for (let n = 0; n < perSide; n++) {
        const cursor = {
          i: index++,
          side,
          frac: (n + 0.5) / perSide, // evenly spaced along the edge
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          heading: 0,
          job: null,
          jobIndex: 0,
          rest: { x: 0, y: 0 },
          spawn: { x: 0, y: 0 },
          face: 0,
          omega: 0.7 + Math.random() * 0.8, // orbital angular speed (rad/s)
          breathSpeed: 0.8 + Math.random() * 0.9,
          breathPhase: Math.random() * TAU,
          stiffnessJitter: 0.85 + Math.random() * 0.3,
        };
        computeRestPosition(cursor);
        cursor.x = cursor.spawn.x;
        cursor.y = cursor.spawn.y;
        state.cursors.push(cursor);
      }
    });
    state.count = total;
  }

  /* ------------------------------------------------------------------ */
  /* Jobs: the generic "send these cursors somewhere" primitive          */
  /* ------------------------------------------------------------------ */

  /** Choose `count` cursors. Idle ones first (nearest to `hint`), then busy ones. */
  function acquire(count, hint) {
    const byDistance = (list) =>
      hint
        ? list.sort(
            (a, b) =>
              Math.hypot(a.x - hint.x, a.y - hint.y) - Math.hypot(b.x - hint.x, b.y - hint.y)
          )
        : list.sort(() => Math.random() - 0.5);
    const idle = byDistance(state.cursors.filter((c) => !c.job));
    const busy = byDistance(state.cursors.filter((c) => c.job));
    return [...idle, ...busy].slice(0, count);
  }

  /**
   * Send cursors to dynamic targets.
   * @param {object} options
   * @param {number} options.count               cursors requested
   * @param {(i:number, t:number, cursor:object)=>{x:number,y:number}} options.target
   *        called every frame; i = squad index, t = ms since dispatch
   * @param {number} [options.duration=Infinity] auto-release after this many ms
   * @param {number} [options.stiffness=120]     spring stiffness (higher = snappier)
   * @param {{x:number,y:number}} [options.hint] prefer cursors close to this point
   * @param {Function} [options.onRelease]
   */
  function dispatch({ count, target, duration = Infinity, stiffness = 120, hint, onRelease }) {
    const picked = acquire(count, hint);
    const job = {
      start: performance.now(),
      duration,
      target,
      stiffness,
      cursors: picked,
      onRelease,
      released: false,
    };
    picked.forEach((cursor, index) => {
      cursor.job = job;
      cursor.jobIndex = index;
    });
    jobs.add(job);
    return job;
  }

  function releaseJob(job) {
    if (!job || job.released) return;
    job.released = true;
    job.cursors.forEach((cursor) => {
      if (cursor.job === job) cursor.job = null; // cursors stolen by newer jobs are untouched
    });
    jobs.delete(job);
    if (job.onRelease) job.onRelease();
  }

  function releaseAll() {
    [...jobs].forEach(releaseJob);
  }

  /* ------------------------------------------------------------------ */
  /* Choreography helpers                                                */
  /* ------------------------------------------------------------------ */

  const rectCenter = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

  /** Point `i` of a squad around a rect: four corners first, then evenly along the border. */
  function perimeterPoint(rect, i, squad) {
    const corners = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ];
    if (i < 4) return corners[i];

    const extras = Math.max(1, squad - 4);
    const perimeter = 2 * (rect.width + rect.height);
    let distance = ((i - 4 + 0.5) / extras) * perimeter;
    if (distance < rect.width) return { x: rect.left + distance, y: rect.top };
    distance -= rect.width;
    if (distance < rect.height) return { x: rect.right, y: rect.top + distance };
    distance -= rect.height;
    if (distance < rect.width) return { x: rect.right - distance, y: rect.bottom };
    distance -= rect.width;
    return { x: rect.left, y: rect.bottom - distance };
  }

  const keepOnScreen = (point) => ({
    x: clamp(point.x, 4, state.width - 4),
    y: clamp(point.y, 4, state.height - 4),
  });

  /**
   * Component / panel squad: corner cursors latch on, a 1px wireframe is traced,
   * and the element is revealed mid-trace via `onReveal`.
   */
  function constructElement(el, { squad = 4, trace = 480, onReveal } = {}) {
    const fly = 260;
    const total = fly + trace + 260;
    const first = el.getBoundingClientRect();
    const job = dispatch({
      count: squad,
      hint: rectCenter(first),
      duration: total,
      stiffness: 150,
      target: (i) => keepOnScreen(perimeterPoint(el.getBoundingClientRect(), i, squad)),
    });
    fx.push({ kind: 'frame', el, start: performance.now() + fly, trace, fade: 260 });
    setTimeout(() => onReveal && onReveal(), fly + trace * 0.55);
    return job;
  }

  /**
   * Typography squad: cursors sweep left-to-right with an electric-blue scanline
   * while CSS reveals the text behind it (see [data-build-type="text"]).
   */
  function sweepText(el, { squad = 4, duration = 800, onReveal } = {}) {
    const delay = 220;
    el.style.setProperty('--sweep-ms', `${duration}ms`);
    const job = dispatch({
      count: squad,
      hint: rectCenter(el.getBoundingClientRect()),
      duration: delay + duration + 320,
      stiffness: 170,
      target: (i, t) => {
        const rect = el.getBoundingClientRect();
        const progress = clamp((t - delay) / duration, 0, 1);
        return keepOnScreen({
          x: rect.left + progress * rect.width,
          y: rect.top + ((i + 0.5) / squad) * rect.height,
        });
      },
    });
    fx.push({ kind: 'scan', el, start: performance.now() + delay, duration });
    setTimeout(() => onReveal && onReveal(), delay);
    return job;
  }

  /** Circle an element (e.g. a launch button's arrow) until the job is released. */
  function orbitElement(el, count = 6, radius = 18) {
    return dispatch({
      count,
      hint: rectCenter(el.getBoundingClientRect()),
      stiffness: 110,
      target: (i, t) => {
        const center = rectCenter(el.getBoundingClientRect());
        const angle = (TAU * i) / count + (t / 1000) * 2.6;
        const r = radius + 3 * Math.sin(t / 380 + i);
        return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
      },
    });
  }

  /** Four cursors grab the left and right edges of a card while it flips. */
  function grabCardEdges(el, { count = 4, duration = 900 } = {}) {
    return dispatch({
      count,
      hint: rectCenter(el.getBoundingClientRect()),
      duration,
      stiffness: 160,
      target: (i) => {
        const rect = el.getBoundingClientRect();
        const rightSide = i % 2 === 1;
        const row = i < 2 ? 0.3 : 0.7;
        return keepOnScreen({
          x: rightSide ? rect.right : rect.left,
          y: rect.top + rect.height * row,
        });
      },
    });
  }

  /** A few cursors ride the typewriter caret like a precision print head. */
  function leadTypewriter(getPoint, { count = 3, duration = 1000 } = {}) {
    return dispatch({
      count,
      duration,
      stiffness: 190,
      target: (i) => {
        const point = getPoint();
        if (!point) return { x: state.width / 2, y: state.height / 2 };
        return keepOnScreen({ x: point.x + 6, y: point.y + (i - (count - 1) / 2) * 34 });
      },
    });
  }

  /** Twelve cursors dive to the bottom edge, latch the nav's top border and pull it up. */
  function pullNav(nav, onPull, { count = 12 } = {}) {
    const job = dispatch({
      count,
      hint: { x: state.width / 2, y: state.height },
      duration: 1150,
      stiffness: 130,
      target: (i) => {
        const rect = nav.getBoundingClientRect();
        return keepOnScreen({
          x: rect.left + ((i + 0.5) / count) * rect.width,
          y: rect.top,
        });
      },
    });
    setTimeout(() => onPull && onPull(), 380); // let the swarm latch on first
    return job;
  }

  /** Called when every visible element is built: idle cursors join the pointer halo. */
  function settle() {
    if (state.mode !== 'follow' && state.mode !== 'blackout') state.mode = 'follow';
  }

  /* ------------------------------------------------------------------ */
  /* Physics                                                             */
  /* ------------------------------------------------------------------ */

  /** Idle anchor used until the pointer first moves: the active status pill. */
  function getRestAnchor() {
    const pill = document.querySelector('[data-status-pill]');
    if (pill) {
      const rect = pill.getBoundingClientRect();
      if (rect.width > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: clamp(rect.top + rect.height / 2, 30, state.height - 30),
          rx: rect.width / 2 + 14,
          ry: rect.height / 2 + 12,
        };
      }
    }
    return { x: state.width / 2, y: state.height / 2, rx: 60, ry: 60 };
  }

  /** Hollow-core halo target for one cursor. */
  function orbitTarget(cursor, seconds) {
    const phase = Math.sin(seconds * cursor.breathSpeed + cursor.breathPhase) * 0.5 + 0.5;
    const angle = (TAU * cursor.i) / state.count + cursor.omega * seconds;
    const scale = state.unit;

    if (state.pointer.seen) {
      // r(t) breathes between 7px and 18px, so 0–6px around the real tip stays clear.
      const radius = (ORBIT_MIN + (ORBIT_MAX - ORBIT_MIN) * phase) * scale;
      return {
        x: state.pointer.x + Math.cos(angle) * radius,
        y: state.pointer.y + Math.sin(angle) * radius,
      };
    }
    const anchor = getRestAnchor();
    return {
      x: anchor.x + Math.cos(angle) * (anchor.rx + phase * 6),
      y: anchor.y + Math.sin(angle) * (anchor.ry + phase * 4),
    };
  }

  function stepCursor(cursor, now, dt) {
    let target;
    let stiffness = 70;
    let desiredHeading = 0;
    let faceVelocity = false;

    if (cursor.job) {
      target = cursor.job.target(cursor.jobIndex, now - cursor.job.start, cursor);
      stiffness = cursor.job.stiffness;
      faceVelocity = Math.hypot(cursor.vx, cursor.vy) > 120;
    } else if (state.mode === 'entry') {
      // Synchronised, eased glide from the screen edge to the 20px border slot.
      const t = clamp((now - state.entryStart) / TIMELINE.entry, 0, 1);
      const eased = easeInOutCubic(t);
      cursor.x = cursor.spawn.x + (cursor.rest.x - cursor.spawn.x) * eased;
      cursor.y = cursor.spawn.y + (cursor.rest.y - cursor.spawn.y) * eased;
      cursor.vx = 0;
      cursor.vy = 0;
      cursor.heading += wrapAngle(cursor.face + Math.PI * 0.75 - cursor.heading) * Math.min(1, dt * 12);
      return;
    } else if (state.mode === 'perimeter' || state.mode === 'blackout') {
      target = cursor.rest;
      stiffness = 90;
      desiredHeading = cursor.face + Math.PI * 0.75; // keep pointing inward
    } else {
      target = orbitTarget(cursor, now / 1000);
      faceVelocity = Math.hypot(cursor.vx, cursor.vy) > 260;
    }

    // Spring-damped velocity physics (slightly under-damped for a living feel).
    const k = stiffness * cursor.stiffnessJitter;
    const damping = 2 * Math.sqrt(k) * 0.82;
    cursor.vx += ((target.x - cursor.x) * k - cursor.vx * damping) * dt;
    cursor.vy += ((target.y - cursor.y) * k - cursor.vy * damping) * dt;
    cursor.x += cursor.vx * dt;
    cursor.y += cursor.vy * dt;

    if (faceVelocity) desiredHeading = Math.atan2(cursor.vy, cursor.vx) + Math.PI * 0.75;
    cursor.heading += wrapAngle(desiredHeading - cursor.heading) * Math.min(1, dt * 9);
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  function drawCursor(cursor) {
    const scale = CURSOR_HEIGHT * state.unit;
    ctx.save();
    ctx.translate(cursor.x, cursor.y);
    ctx.rotate(cursor.heading);
    ctx.scale(scale, scale);

    // Electric-blue trailing spark (1.5px) at the tail
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = (1.5 * state.unit) / scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.4, 0.96);
    ctx.lineTo(0.52, 1.42);
    ctx.stroke();

    // Crisp white arrow with a 1px dark contrast outline
    ctx.beginPath();
    ARROW_POINTS.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = '#f3f5f8';
    ctx.strokeStyle = 'rgba(9, 10, 13, 0.95)';
    ctx.lineWidth = state.unit / scale;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Trace a rectangle outline progressively (0–1) from the top-left, clockwise. */
  function strokePartialRect(rect, progress) {
    const { left, top, width, height } = rect;
    const total = 2 * (width + height);
    let remaining = clamp(progress, 0, 1) * total;
    const sides = [
      [left, top, left + width, top],
      [left + width, top, left + width, top + height],
      [left + width, top + height, left, top + height],
      [left, top + height, left, top],
    ];
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of sides) {
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (remaining <= 0) break;
      const fraction = Math.min(1, remaining / length);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * fraction, y1 + (y2 - y1) * fraction);
      remaining -= length;
    }
    ctx.stroke();
  }

  function drawEffects(now) {
    for (let index = fx.length - 1; index >= 0; index--) {
      const effect = fx[index];
      const age = now - effect.start;

      if (effect.kind === 'frame') {
        const end = effect.trace + effect.fade;
        if (age > end || !effect.el.isConnected) {
          fx.splice(index, 1);
          continue;
        }
        if (age < 0) continue;
        const rect = effect.el.getBoundingClientRect();
        const progress = age / effect.trace;
        const alpha = age <= effect.trace ? 1 : 1 - (age - effect.trace) / effect.fade;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#3b82f6';
        ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1;
        strokePartialRect(rect, progress);
        ctx.fillStyle = '#60a5fa';
        [
          [rect.left, rect.top],
          [rect.right, rect.top],
          [rect.right, rect.bottom],
          [rect.left, rect.bottom],
        ].forEach(([x, y]) => ctx.fillRect(x - 1.5, y - 1.5, 3, 3));
        ctx.restore();
      } else if (effect.kind === 'scan') {
        if (age > effect.duration + 200 || !effect.el.isConnected) {
          fx.splice(index, 1);
          continue;
        }
        if (age < 0) continue;
        const rect = effect.el.getBoundingClientRect();
        const progress = clamp(age / effect.duration, 0, 1);
        const x = rect.left + progress * rect.width;
        const fade = age > effect.duration ? 1 - (age - effect.duration) / 200 : 1;
        const gradient = ctx.createLinearGradient(x - 70, 0, x, 0);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.16)');
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 70, rect.top - 6, 70, rect.height + 12);
        ctx.fillStyle = '#3b82f6';
        ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - 0.5, rect.top - 6, 1.5, rect.height + 12);
        ctx.restore();
      }
    }
  }

  function drawPulse(now) {
    // 2x2px pulsing electric-blue pixel proves the canvas is alive during blackout.
    const alpha = 0.45 + 0.55 * (Math.sin(now / 220) * 0.5 + 0.5);
    ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
    const size = 2 * state.unit;
    ctx.fillRect(state.width / 2 - size / 2, state.height / 2 - size / 2, size, size);
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  let lastFrame = performance.now();

  function frame(now) {
    const dt = clamp((now - lastFrame) / 1000, 0.001, 1 / 30);
    lastFrame = now;

    ctx.clearRect(0, 0, state.width, state.height);

    jobs.forEach((job) => {
      if (now - job.start > job.duration) releaseJob(job);
    });

    if (state.pulse) drawPulse(now);
    drawEffects(now);
    state.cursors.forEach((cursor) => {
      stepCursor(cursor, now, dt);
      drawCursor(cursor);
    });

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Boot sequence: blackout → benchmark → perimeter                     */
  /* ------------------------------------------------------------------ */

  async function boot() {
    const bootStart = performance.now();
    const threads = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;

    resize();
    requestAnimationFrame(frame);

    const deltas = await measureFrameStability(TIMELINE.benchmark);
    const total = computeCursorCount({ threads, memory, deltas });
    createCursors(total);

    // Finish the 1.4s blackout, then hide the pulse and launch the cursors.
    await sleep(Math.max(0, TIMELINE.blackout - (performance.now() - bootStart)));
    state.pulse = false;
    state.entryStart = performance.now();
    state.mode = 'entry';
    resize();

    await sleep(TIMELINE.entry);
    state.mode = 'perimeter'; // dead stop 20px inside every border
    await sleep(TIMELINE.hold);
    return total;
  }

  /* ------------------------------------------------------------------ */
  /* Input + viewport listeners                                          */
  /* ------------------------------------------------------------------ */

  function updatePointer(event) {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.seen = true;
  }

  window.addEventListener('pointermove', updatePointer, { passive: true });
  window.addEventListener('pointerdown', updatePointer, { passive: true });
  window.addEventListener('resize', resize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }

  return {
    boot,
    dispatch,
    constructElement,
    sweepText,
    orbitElement,
    grabCardEdges,
    leadTypewriter,
    pullNav,
    settle,
    releaseJob,
    releaseAll,
    getCount: () => state.count,
  };
}
