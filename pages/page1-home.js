/**
 * page1-home.js
 * -----------------------------------------------------------------------------
 * Page 1: Minimalist hero (top ~2/3) + randomized 5-button Launch Station
 * (bottom ~1/3). There is no navigation bar on this page; the Launch Station
 * is the primary navigation.
 *
 * To add or rename a destination, edit DESTINATIONS below. The page ids must
 * match the keys registered in js/router.js.
 */

import { icon } from '../assets/icons/svg-icons.js';
import { randomizeLaunchButtons } from '../js/randomizer.js';

const DESTINATIONS = [
  { page: 'pipeline', index: '01', title: 'How It Works', subtitle: '8-stage downward flow' },
  { page: 'wearable', index: '02', title: 'Wearable 3D', subtitle: 'Badge hardware & tour' },
  { page: 'scenarios', index: '03', title: 'Everyday Scenarios', subtitle: '9 interactive flip cards' },
  { page: 'demo', index: '04', title: 'Prototype Demo', subtitle: '[Releasing Soon]' },
  { page: 'team', index: '05', title: 'The Team', subtitle: '5 builders spotlight' },
];

const PILLARS = [
  'Speech Capture & Recognition',
  'Conservative Meaning Guardrail',
  'Listener Display & Voice Output',
];

function renderLaunchButton({ page, index, title, subtitle }) {
  return `
    <button type="button" class="launch-btn layout-split" data-build-target data-nav="${page}"
            aria-label="${index} ${title} — ${subtitle}">
      <span class="launch-index mono">${index}</span>
      <span class="launch-text">
        <span class="launch-title">${title}</span>
        <span class="launch-sub">${subtitle}</span>
      </span>
      <span class="launch-arrow">${icon('arrowRight', { size: 18 })}</span>
    </button>`;
}

export default {
  id: 'home',
  title: 'Home',

  render() {
    return `
      <section class="page page-home" aria-labelledby="home-title">
        <div class="home-hero">
          <span class="status-pill" data-status-pill data-build-target data-build-type="soft">
            <i class="dot dot-pulse"></i>
            <span class="mono">Listener-first assistive communication architecture</span>
          </span>

          <h1 id="home-title" class="t-hero home-title" data-build-target data-build-type="text" data-squad="5" data-sweep="900">
            Bridging speech and understanding<br class="br-desktop" />
            in real-time conversation.
          </h1>

          <p class="t-body home-lede" data-build-target data-build-type="text" data-squad="4" data-sweep="1000">
            VaaniBridge helps people whose speech is hard for others to understand communicate clearly
            face-to-face. By pairing atypical speech recognition with conservative meaning preservation,
            a listener-facing display, and spoken voice output, the listener understands the intended
            message without asking for repeats.
          </p>

          <ul class="pillars" data-build-target data-build-type="soft">
            ${PILLARS.map((label) => `<li class="mono">${label}</li>`).join('')}
          </ul>
        </div>

        <div class="launch-station">
          <p class="launch-label mono" data-build-target data-build-type="soft">
            Launch Station // Select destination [01—05]
          </p>
          <div class="launch-grid" id="launch-grid">
            ${DESTINATIONS.map(renderLaunchButton).join('')}
          </div>
        </div>
      </section>`;
  },

  mount(root, ctx) {
    const buttons = [...root.querySelectorAll('.launch-btn')];
    randomizeLaunchButtons(buttons); // new shapes + tilts on every load

    const orbitJobs = new Map();

    const attract = (button) => {
      if (orbitJobs.has(button)) return;
      const arrow = button.querySelector('.launch-arrow');
      orbitJobs.set(button, ctx.swarm.orbitElement(arrow, 6, 18));
    };
    const release = (button) => {
      ctx.swarm.releaseJob(orbitJobs.get(button));
      orbitJobs.delete(button);
    };

    const cleanups = buttons.map((button) => {
      const onClick = () => ctx.navigate(button.dataset.nav);
      const onEnter = () => attract(button);
      const onLeave = () => release(button);
      button.addEventListener('click', onClick);
      button.addEventListener('pointerenter', onEnter);
      button.addEventListener('pointerleave', onLeave);
      button.addEventListener('focus', onEnter);
      button.addEventListener('blur', onLeave);
      return () => {
        button.removeEventListener('click', onClick);
        button.removeEventListener('pointerenter', onEnter);
        button.removeEventListener('pointerleave', onLeave);
        button.removeEventListener('focus', onEnter);
        button.removeEventListener('blur', onLeave);
      };
    });

    return () => {
      cleanups.forEach((fn) => fn());
      orbitJobs.forEach((job) => ctx.swarm.releaseJob(job));
      orbitJobs.clear();
    };
  },
};
