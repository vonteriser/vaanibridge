/**
 * router.js
 * -----------------------------------------------------------------------------
 * State-driven page controller.
 *
 *  - Maps page ids → page modules (each exports render() and mount()).
 *  - Mounts one page at a time inside #page-stage and tears the previous one
 *    down completely (timers, listeners, swarm jobs) so nothing leaks.
 *  - Runs the build observer: every [data-build-target] element is revealed
 *    by a swarm squad when it enters the viewport (IntersectionObserver 0.15).
 *  - Controls the bottom-up secondary navigation: hidden on Page 1, pulled up
 *    by 12 swarm cursors when leaving Page 1, sent back down on return.
 *
 * Page module contract
 *   export default {
 *     id: 'team',
 *     title: 'Team',
 *     render()            → HTML string for the page
 *     mount(root, ctx)    → optional cleanup function (called on unmount)
 *   }
 *   ctx = { swarm, navigate(id), later(fn, ms), build(el), isReducedMotion }
 */

import home from '../pages/page1-home.js';
import pipeline from '../pages/page2-pipeline.js';
import wearable from '../pages/page3-wearable.js';
import scenarios from '../pages/page4-scenarios.js';
import demo from '../pages/page5-demo.js';
import team from '../pages/page6-team.js';

const PAGES = { home, pipeline, wearable, scenarios, demo, team };

const DEFAULT_PAGE = 'home';
const STAGGER_MS = 100; // delay between elements that enter the viewport together
const INITIAL_BUILD_WINDOW_MS = 1400; // builds after this window count as "scroll construction"

export function createRouter({ stage, nav, swarm }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let currentId = null;
  let navToken = 0; // guards against overlapping navigations
  let pageCleanup = null;
  let observer = null;
  let navDocked = false;
  let mountedAt = 0;
  let settleTimer = null;
  const timers = new Set();

  /* ------------------------------------------------------------------ */
  /* Timers owned by the active page                                     */
  /* ------------------------------------------------------------------ */

  /** setTimeout that is cancelled automatically when the page unmounts. */
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearTimers() {
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    clearTimeout(settleTimer);
  }

  /* ------------------------------------------------------------------ */
  /* Build observer                                                      */
  /* ------------------------------------------------------------------ */

  /** Debounced: once nothing new has been built for a moment, idle cursors join the pointer halo. */
  function scheduleSettle() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => swarm.settle(), 1200);
  }

  /**
   * Reveal one [data-build-target] element using the swarm.
   * data-build-type:
   *   "text"  – typography sweep squad with scanline
   *   "panel" – wireframe squad (default)
   *   "soft"  – simple reveal without a squad (small chips, side copy)
   * Optional: data-squad="12" overrides the squad size.
   */
  function build(el) {
    if (!el || el.classList.contains('is-built')) return;
    const type = el.dataset.buildType || 'panel';
    const reveal = () => el.classList.add('is-built');

    if (reducedMotion || type === 'soft') {
      reveal();
      scheduleSettle();
      return;
    }

    const isScrollConstruction = performance.now() - mountedAt > INITIAL_BUILD_WINDOW_MS;
    try {
      if (type === 'text') {
        swarm.sweepText(el, {
          squad: Number(el.dataset.squad) || 4,
          duration: Number(el.dataset.sweep) || 800,
          onReveal: reveal,
        });
      } else {
        const scrollSquad = 12 + Math.floor(Math.random() * 9); // 12–20 cursors
        swarm.constructElement(el, {
          squad: Number(el.dataset.squad) || (isScrollConstruction ? scrollSquad : 4),
          trace: isScrollConstruction ? 350 : 420,
          onReveal: reveal,
        });
      }
    } catch (error) {
      console.warn('Swarm build failed, revealing directly.', error);
      reveal();
    }
    // Safety net: never leave content hidden.
    later(reveal, 2600);
    scheduleSettle();
  }

  /** Re-trigger staggered construction for a list of elements (e.g. after a reshuffle). */
  function rebuild(elements, stagger = STAGGER_MS) {
    elements.forEach((el, index) => {
      el.classList.remove('is-built');
      later(() => build(el), 80 + index * stagger);
    });
  }

  function observeBuildTargets() {
    const targets = [...stage.querySelectorAll('[data-build-target]')];
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el, index) => later(() => build(el), index * STAGGER_MS));
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        entering.forEach((el, index) => {
          observer.unobserve(el);
          later(() => build(el), index * STAGGER_MS);
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Navigation bar                                                      */
  /* ------------------------------------------------------------------ */

  function setNavVisible(visible) {
    if (visible && !navDocked) {
      navDocked = true;
      if (reducedMotion) nav.classList.add('is-docked');
      else swarm.pullNav(nav, () => nav.classList.add('is-docked'));
    } else if (!visible && navDocked) {
      navDocked = false;
      nav.classList.remove('is-docked');
    }
  }

  function markActiveLink(id) {
    nav.querySelectorAll('[data-nav-page]').forEach((button) => {
      const active = button.dataset.navPage === id;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Page lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  function teardown() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (pageCleanup) {
      try {
        pageCleanup();
      } catch (error) {
        console.warn('Page cleanup failed.', error);
      }
      pageCleanup = null;
    }
    clearTimers();
    swarm.releaseAll();
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function idFromLocation() {
    const match = window.location.hash.match(/^#\/([a-z]+)/);
    return match && PAGES[match[1]] ? match[1] : DEFAULT_PAGE;
  }

  function writeLocation(id) {
    try {
      window.history.pushState(null, '', `#/${id}`);
    } catch (error) {
      /* history may be unavailable in sandboxed contexts; navigation still works */
    }
  }

  async function navigate(id, { first = false, silent = false } = {}) {
    if (!PAGES[id]) id = DEFAULT_PAGE;
    if (!first && id === currentId) return;

    const token = ++navToken;
    const page = PAGES[id];

    if (!first) {
      stage.classList.add('is-leaving');
      await wait(170);
      if (token !== navToken) return; // a newer navigation took over
    }

    teardown();

    stage.innerHTML = page.render();
    window.scrollTo(0, 0);
    stage.classList.remove('is-leaving');
    stage.dataset.page = id;
    currentId = id;
    document.title =
      id === 'home'
        ? 'VaaniBridge — Bridging speech and understanding in real-time conversation'
        : `${page.title} — VaaniBridge`;
    markActiveLink(id);
    if (!first && !silent) writeLocation(id);

    setNavVisible(id !== 'home');

    mountedAt = performance.now();
    const ctx = { swarm, navigate, later, build, rebuild, isReducedMotion: reducedMotion };
    pageCleanup = page.mount(stage, ctx) || null;

    // Wait one frame so layout exists before the observer measures intersections.
    requestAnimationFrame(observeBuildTargets);
  }

  function start() {
    nav.querySelectorAll('[data-nav-page]').forEach((button) => {
      button.addEventListener('click', () => navigate(button.dataset.navPage));
    });
    nav.querySelector('[data-nav-home]').addEventListener('click', () => navigate('home'));
    window.addEventListener('popstate', () => navigate(idFromLocation(), { silent: true }));
    return navigate(idFromLocation(), { first: true });
  }

  return { start, navigate };
}
