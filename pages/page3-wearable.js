/**
 * page3-wearable.js
 * -----------------------------------------------------------------------------
 * Page 3: Wearable 3D showcase (pre-release studio state).
 *
 * Shows a layered technical wireframe of the 85mm x 54mm badge inside a CSS 3D
 * perspective stage, four directional camera cuts, and four inspection HUD cards.
 *
 * Future upgrade: call window.VaaniBridgeHooks.mountWearableSTL({ stlUrl }).
 * This page listens for that hook, hides the "releasing soon" badge, mounts the
 * STL viewer inside #wearable-3d-viewport and re-binds the same four camera cuts.
 */

import { icon } from '../assets/icons/svg-icons.js';
import { hookState, HOOK_EVENT, createStlViewer } from '../js/upgrade-hooks.js';

/** The four camera cuts. `vars` drive the CSS 3D transform of the wireframe badge. */
const CAMERA_CUTS = [
  {
    key: 'down',
    label: 'Downward Pitch',
    glyph: 'pitchDown',
    part: 'mic',
    vars: { rx: '-46deg', ry: '-8deg', rz: '0deg', s: 1.08, tx: '0px', ty: '46px' },
  },
  {
    key: 'left',
    label: 'Left Swipe',
    glyph: 'swipeLeft',
    part: 'display',
    vars: { rx: '6deg', ry: '40deg', rz: '0deg', s: 1.08, tx: '-30px', ty: '0px' },
  },
  {
    key: 'zoom',
    label: 'Macro Zoom-In',
    glyph: 'zoomIn',
    part: 'speaker',
    vars: { rx: '8deg', ry: '-12deg', rz: '0deg', s: 2.15, tx: '-250px', ty: '-150px' },
  },
  {
    key: 'orbit',
    label: 'Angled Orbit',
    glyph: 'orbit',
    part: 'body',
    vars: { rx: '16deg', ry: '388deg', rz: '-4deg', s: 1.12, tx: '0px', ty: '0px' }, // full 360° sweep
  },
];

const HOME_VARS = { rx: '14deg', ry: '-24deg', rz: '0deg', s: 1, tx: '0px', ty: '0px' };

const FEATURES = [
  {
    cut: 'down',
    title: 'Top Microphone Intake',
    body: 'Positioned along the upper rim for clear voice pickup while worn at neck or chest level.',
  },
  {
    cut: 'left',
    title: 'Listener-Facing High-Contrast Display',
    body: 'Oriented outward so the listener reads "VAANIBRIDGE MESSAGE" naturally while maintaining eye contact.',
  },
  {
    cut: 'zoom',
    title: 'Integrated Speaker Output',
    body: 'Projects the clarified spoken message cleanly in face-to-face settings.',
  },
  {
    cut: 'orbit',
    title: 'Compact Badge Enclosure & Roadmap',
    body: 'ID-card footprint paired with portable compute, plus roadmap milestones for Hindi (hi-IN) expansion and personalized voice preservation.',
    chips: ['Hindi (hi-IN)', 'Voice preservation', 'Speaker adaptation'],
  },
];

/** Technical wireframe badge: three SVG layers separated in Z for real parallax. */
function badgeWireframe() {
  const micDots = Array.from({ length: 9 }, (_, i) => `<circle cx="${172 + i * 10.5}" cy="38" r="2.3"/>`).join('');
  const speakerDots = Array.from({ length: 24 }, (_, i) => {
    const col = i % 8;
    const row = Math.floor(i / 8);
    return `<circle cx="${306 + col * 10}" cy="${214 + row * 10}" r="1.8"/>`;
  }).join('');

  return `
    <div class="badge-3d" id="badge-3d" data-focus="">
      <svg class="badge-layer layer-back" viewBox="0 0 425 270" aria-hidden="true">
        <rect x="6" y="6" width="413" height="258" rx="26" class="wire-dash"/>
      </svg>

      <svg class="badge-layer layer-body" viewBox="0 0 425 270" role="img" aria-label="Technical wireframe of the wearable badge, 85 by 54 millimetres">
        <rect x="6" y="6" width="413" height="258" rx="26" class="wire-body"/>
        <rect x="14" y="14" width="397" height="242" rx="20" class="wire-thin"/>
        <rect x="170" y="12" width="85" height="9" rx="4.5" class="wire-thin"/>
        <g class="badge-part part-body">
          <path d="M6 150H419" class="wire-guide"/>
          <path d="M212 6V264" class="wire-guide"/>
        </g>
        <!-- Dimension callouts -->
        <g class="wire-dim">
          <path d="M6 280H419M6 274V286M419 274V286"/>
          <text x="212" y="296" text-anchor="middle">85 mm</text>
        </g>
      </svg>

      <svg class="badge-layer layer-front" viewBox="0 0 425 270" aria-hidden="true">
        <g class="badge-part part-mic">
          <rect x="160" y="26" width="105" height="24" rx="12" class="wire-thin"/>
          <g class="wire-dots">${micDots}</g>
          <text x="212" y="66" text-anchor="middle" class="wire-label">MIC INTAKE</text>
        </g>
        <g class="badge-part part-display">
          <rect x="34" y="78" width="357" height="124" rx="12" class="wire-body"/>
          <rect x="44" y="88" width="337" height="104" rx="7" class="wire-thin"/>
          <text x="60" y="110" class="wire-label">VAANIBRIDGE MESSAGE</text>
          <rect x="60" y="124" width="250" height="9" rx="4.5" class="wire-fill"/>
          <rect x="60" y="142" width="190" height="9" rx="4.5" class="wire-fill"/>
          <rect x="60" y="160" width="120" height="9" rx="4.5" class="wire-fill dim"/>
          <circle cx="356" cy="104" r="3" class="wire-led"/>
        </g>
        <g class="badge-part part-speaker">
          <rect x="298" y="206" width="88" height="34" rx="9" class="wire-thin"/>
          <g class="wire-dots">${speakerDots}</g>
        </g>
        <g class="badge-part part-status">
          <text x="38" y="232" class="wire-label">54 mm • ID-CARD FOOTPRINT</text>
          <circle cx="40" cy="244" r="2.6" class="wire-led"/>
        </g>
        <g class="wire-dim">
          <path d="M437 6V264M431 6H443M431 264H443"/>
          <text x="437" y="138" transform="rotate(90 437 138)" text-anchor="middle" dy="-8">54 mm</text>
        </g>
      </svg>
    </div>`;
}

function renderHudCard(feature, index) {
  const cut = CAMERA_CUTS.find((c) => c.key === feature.cut);
  const number = String(index + 1).padStart(2, '0');
  return `
    <button type="button" class="hud-card hud-${index + 1}" data-cut="${feature.cut}" data-build-target data-build-type="panel">
      <span class="mono hud-tag"><i class="dot"></i>Feature ${number} • ${cut.label}</span>
      <span class="t-feature hud-title">${feature.title}</span>
      <span class="hud-body">${feature.body}</span>
      ${feature.chips ? `<span class="chip-row">${feature.chips.map((c) => `<span class="mono chip">${c}</span>`).join('')}</span>` : ''}
    </button>`;
}

export default {
  id: 'wearable',
  title: 'Wearable 3D',

  render() {
    return `
      <section class="page page-padded page-wearable" aria-labelledby="wearable-title">
        <header class="page-header container">
          <span class="status-pill" data-status-pill data-build-target data-build-type="soft">
            <i class="dot dot-pulse"></i><span class="mono">Listener-facing hardware • Pre-release studio</span>
          </span>
          <h2 id="wearable-title" class="t-section" data-build-target data-build-type="text" data-squad="4">The Wearable Badge</h2>
          <p class="t-body" data-build-target data-build-type="text" data-squad="3">
            A compact, ID-card-style badge worn at neck or chest level. The listener reads the clarified message on the
            outward-facing display while the speaker keeps eye contact.
          </p>
        </header>

        <div class="wearable-layout container">
          <div class="wearable-stage-wrap">
            <div id="wearable-3d-viewport" class="studio" data-build-target data-build-type="panel" data-squad="8">
              <div class="studio-grid" aria-hidden="true"></div>
              <div class="badge-stage" id="badge-stage">${badgeWireframe()}</div>
              <span class="mono studio-readout" id="studio-readout">CAM // HOME</span>

              <div class="lock-card studio-lock" id="wearable-lock">
                <span class="status-pill status-pill-accent"><i class="dot dot-pulse"></i><span class="mono">[IN PROGRESS — RELEASING SOON]</span></span>
                <p class="lock-sub">Interactive 3D .STL Hardware Model &amp; Automated Camera Tour Pending Final Enclosure Upload</p>
              </div>

              <div class="studio-bar" role="group" aria-label="Camera transitions">
                ${CAMERA_CUTS.map(
                  (cut, i) => `
                  <button type="button" class="cam-btn" data-cut="${cut.key}">
                    <span class="mono cam-index">0${i + 1}</span>
                    <span>${cut.label}</span>
                    ${icon(cut.glyph, { size: 14 })}
                  </button>`
                ).join('')}
              </div>
            </div>
          </div>
          ${FEATURES.map(renderHudCard).join('')}
        </div>
      </section>`;
  },

  mount(root, ctx) {
    const badge = root.querySelector('#badge-3d');
    const readout = root.querySelector('#studio-readout');
    const viewport = root.querySelector('#wearable-3d-viewport');
    const badgeStage = root.querySelector('#badge-stage');
    const lock = root.querySelector('#wearable-lock');
    const hudCards = [...root.querySelectorAll('.hud-card')];
    const camButtons = [...root.querySelectorAll('.cam-btn')];

    let viewer = null; // set once a real .STL is mounted via the hook
    let orbitReset = null;
    let destroyed = false;

    function applyVars(vars) {
      Object.entries(vars).forEach(([key, value]) => badge.style.setProperty(`--${key}`, value));
    }

    /** Move the camera to one of the four cuts (or back to 'home'). */
    function setCamera(key) {
      const cut = CAMERA_CUTS.find((c) => c.key === key);
      clearTimeout(orbitReset);

      camButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.cut === key));
      hudCards.forEach((card) => card.classList.toggle('is-active', card.dataset.cut === key));
      badge.dataset.focus = cut ? cut.part : '';
      readout.textContent = cut ? `CAM // ${cut.label.toUpperCase()}` : 'CAM // HOME';

      if (viewer) viewer.setCamera(key);
      if (!cut) {
        applyVars(HOME_VARS);
        return;
      }
      applyVars(cut.vars);

      // After the 360° orbit finishes, silently normalise the angle so later cuts don't spin backwards.
      if (key === 'orbit') {
        orbitReset = setTimeout(() => {
          if (destroyed) return;
          badge.style.transition = 'none';
          applyVars({ ...cut.vars, ry: '28deg' });
          void badge.offsetWidth; // flush so the jump is not animated
          badge.style.transition = '';
        }, 1700);
      }
    }

    /** Apply a mounted .STL (hook) when available. */
    async function applyStlHook() {
      if (!hookState.stl || viewer) return;
      try {
        viewer = await createStlViewer(badgeStage, hookState.stl);
        if (destroyed) {
          viewer.destroy();
          return;
        }
        lock.classList.add('is-hidden'); // hide the [IN PROGRESS — RELEASING SOON] badge
        badge.style.display = 'none'; // the real model replaces the wireframe placeholder
        viewport.classList.add('has-model');
      } catch (error) {
        console.warn('STL could not be mounted; keeping the studio placeholder.', error);
      }
    }

    const onHookEvent = (event) => {
      if (event.detail && event.detail.type === 'stl') applyStlHook();
    };
    document.addEventListener(HOOK_EVENT, onHookEvent);

    const onClick = (event) => {
      const trigger = event.target.closest('[data-cut]');
      if (!trigger) return;
      setCamera(trigger.dataset.cut);
      // Short cursor escort along the badge stage for each camera cut.
      ctx.swarm.grabCardEdges(viewport, { count: 4, duration: 900 });
    };
    root.addEventListener('click', onClick);

    applyVars(HOME_VARS);
    applyStlHook();

    return () => {
      destroyed = true;
      clearTimeout(orbitReset);
      document.removeEventListener(HOOK_EVENT, onHookEvent);
      root.removeEventListener('click', onClick);
      if (viewer) viewer.destroy();
    };
  },
};
