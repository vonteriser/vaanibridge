/**
 * page5-demo.js
 * -----------------------------------------------------------------------------
 * Page 5: Prototype demo (pre-release). A dimmed two-panel dark software frame
 * with a suspended "[RELEASING SOON]" card on top.
 *
 * Future upgrade: call window.VaaniBridgeHooks.mountDemoVideo({ videoSrc, posterSrc, chapters }).
 * This page hides the lock card, undims both panels, mounts a <video controls>
 * player in the right panel and wires the five chapter rows to their timestamps.
 */

import { icon } from '../assets/icons/svg-icons.js';
import { hookState, HOOK_EVENT } from '../js/upgrade-hooks.js';

const CHAPTERS = [
  'End-to-End Pipeline Capture',
  'Side-by-Side Raw vs. Clarified',
  'Conservative Guardrail Verification',
  'Research Mode Evaluation Logging',
  'Wearable Badge Enclosure Preview',
];

export default {
  id: 'demo',
  title: 'Prototype Demo',

  render() {
    return `
      <section class="page page-padded page-demo" aria-labelledby="demo-title">
        <div class="demo-frame container-narrow" id="demo-frame" data-build-target data-build-type="panel" data-squad="8">
          <aside class="demo-panel demo-left" aria-label="Demonstration chapters">
            <h3 class="demo-heading">Demonstration Chapters</h3>
            <div class="mock-search">${icon('search', { size: 16 })}<span>Search chapters</span></div>
            <div class="mock-select">
              <span class="mono"><i class="dot dot-emerald"></i>English (en-IN) • Active</span>
              <span class="mono muted">Hindi (hi-IN) • Roadmap</span>
              ${icon('chevronDown', { size: 14 })}
            </div>
            <ol class="chapter-list" id="chapter-list">
              ${CHAPTERS.map(
                (title, i) => `
                <li>
                  <button type="button" class="chapter-row${i === 0 ? ' is-selected' : ''}" data-chapter="${i}" tabindex="-1">
                    <span class="mono">0${i + 1}</span><span>${title}</span>
                  </button>
                </li>`
              ).join('')}
            </ol>
          </aside>

          <div class="demo-panel demo-right">
            <div class="video-viewport" id="video-viewport">
              <div class="video-placeholder" aria-hidden="true">
                <span class="play-disc">${icon('play', { size: 26 })}</span>
                <div class="video-timeline"><span></span></div>
              </div>
            </div>
            <div class="transcript-bar">
              <div class="transcript-cell">
                <span class="mono">What was heard</span>
                <p class="raw-text">I want to go house</p>
              </div>
              <div class="transcript-cell is-final">
                <span class="mono"><i class="dot dot-emerald"></i>VaaniBridge message</span>
                <p>I want to go home.</p>
              </div>
            </div>
          </div>

          <div class="lock-card demo-lock" id="demo-lock">
            <span class="status-pill status-pill-accent" data-status-pill><i class="dot dot-pulse"></i><span class="mono">[Releasing Soon]</span></span>
            <h2 id="demo-title" class="demo-lock-title">Prototype Walkthrough &amp; Real-Output Capture</h2>
            <p class="demo-lock-text">
              Our full walkthrough showcasing real side-by-side application outputs, conservative interpretation
              verification, evaluation logging, and the wearable badge enclosure concept is being finalized for release.
            </p>
          </div>
        </div>
      </section>`;
  },

  mount(root) {
    const frame = root.querySelector('#demo-frame');
    const lock = root.querySelector('#demo-lock');
    const viewport = root.querySelector('#video-viewport');
    const chapterRows = [...root.querySelectorAll('.chapter-row')];
    let video = null;

    /** Replace the placeholder with a real player when the hook has data. */
    function applyDemoHook() {
      const demo = hookState.demo;
      if (!demo || !demo.videoSrc || video) return;

      lock.classList.add('is-hidden'); // hide the [RELEASING SOON] overlay card
      frame.classList.add('is-live'); // undim both panels (opacity: 1)

      video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = demo.videoSrc;
      if (demo.posterSrc) video.poster = demo.posterSrc;
      viewport.replaceChildren(video);

      const times = (demo.chapters || []).map((c) => (typeof c === 'number' ? c : Number(c && c.time) || 0));
      chapterRows.forEach((row, i) => {
        row.tabIndex = 0;
        row.dataset.time = String(times[i] ?? 0);
      });
    }

    const onChapterClick = (event) => {
      const row = event.target.closest('.chapter-row');
      if (!row || !video) return;
      chapterRows.forEach((other) => other.classList.toggle('is-selected', other === row));
      video.currentTime = Number(row.dataset.time) || 0;
      video.play().catch(() => {});
    };

    const onHookEvent = (event) => {
      if (event.detail && event.detail.type === 'demo') applyDemoHook();
    };

    root.addEventListener('click', onChapterClick);
    document.addEventListener(HOOK_EVENT, onHookEvent);
    applyDemoHook();

    return () => {
      root.removeEventListener('click', onChapterClick);
      document.removeEventListener(HOOK_EVENT, onHookEvent);
      if (video) video.pause();
    };
  },
};
