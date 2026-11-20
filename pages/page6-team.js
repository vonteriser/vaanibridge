/**
 * page6-team.js
 * -----------------------------------------------------------------------------
 * Page 6: Team spotlight.
 *   Layer 1 (z-index 1): giant background name that types out character by character.
 *   Layer 2 (z-index 2): centered Blank Tree portrait card with name + role.
 *   Bottom: 5-member preview strip. Click, or use the Left/Right arrow keys.
 *
 * Future upgrade: window.VaaniBridgeHooks.setTeamPhotos({ Daksh: 'url', ... })
 * swaps the Blank Tree silhouette for a real photo in the card and the strip.
 */

import { blankTreeSVG } from '../assets/icons/svg-icons.js';
import { hookState, HOOK_EVENT } from '../js/upgrade-hooks.js';

const MEMBERS = [
  { name: 'Daksh', role: 'System Architecture & Core Pipeline' },
  { name: 'Shivang', role: 'Speech Recognition & Audio Engineering' },
  { name: 'Vaibhav', role: 'Conservative Interpretation & Adaptation' },
  { name: 'Divyansh', role: 'Evaluation Framework & Verification' },
  { name: 'Shivansh', role: 'Wearable Enclosure & Interface Design' },
];

const TYPE_DELAY_MS = 65; // per letter

/** Returns the portrait markup for a member: real photo if provided, else Blank Tree SVG. */
function portraitMarkup(member, className = '') {
  const photo = hookState.photos[member.name];
  return photo
    ? `<img class="portrait-photo ${className}" src="${photo}" alt="Portrait of ${member.name}" />`
    : blankTreeSVG({ className });
}

export default {
  id: 'team',
  title: 'The Team',

  render() {
    return `
      <section class="page page-team" aria-labelledby="team-title">
        <p class="team-label mono" id="team-title" data-status-pill data-build-target data-build-type="soft">
          The Builders // VaaniBridge Engineering Team [05]
        </p>

        <div class="team-stage">
          <div class="giant-name" id="giant-name" aria-hidden="true">
            <span class="giant-typed" id="giant-typed"></span><span class="caret" id="giant-caret"></span><span class="giant-ghost" id="giant-ghost"></span>
          </div>

          <figure class="portrait-card" id="portrait-card" data-build-target data-build-type="panel" data-squad="6">
            <div class="portrait-frame" id="portrait-frame"></div>
            <figcaption class="portrait-info">
              <span class="portrait-name" id="portrait-name"></span>
              <span class="portrait-role" id="portrait-role"></span>
            </figcaption>
          </figure>
          <p class="sr-only" aria-live="polite" id="team-live"></p>
        </div>

        <div class="team-strip" id="team-strip" role="tablist" aria-label="Team members" data-build-target data-build-type="panel" data-squad="6">
          ${MEMBERS.map(
            (member, i) => `
            <button type="button" class="strip-item" role="tab" aria-selected="false" data-index="${i}">
              <span class="strip-avatar">${portraitMarkup(member)}</span>
              <span class="strip-text">
                <span class="strip-name">${member.name}</span>
                <span class="mono strip-index">0${i + 1}</span>
              </span>
            </button>`
          ).join('')}
        </div>
      </section>`;
  },

  mount(root, ctx) {
    const typed = root.querySelector('#giant-typed');
    const ghost = root.querySelector('#giant-ghost');
    const caret = root.querySelector('#giant-caret');
    const portraitFrame = root.querySelector('#portrait-frame');
    const nameLabel = root.querySelector('#portrait-name');
    const roleLabel = root.querySelector('#portrait-role');
    const card = root.querySelector('#portrait-card');
    const strip = root.querySelector('#team-strip');
    const items = [...root.querySelectorAll('.strip-item')];
    const live = root.querySelector('#team-live');

    let activeIndex = -1;
    let typeTimer = null; // the one and only typewriter timer
    let leadJob = null;

    function stopTyping() {
      clearTimeout(typeTimer); // switching members rapidly never lets old characters collide
      typeTimer = null;
      ctx.swarm.releaseJob(leadJob);
      leadJob = null;
    }

    /** Type the member's name, 65ms per letter, with 3 swarm cursors riding the caret. */
    function typeName(name) {
      stopTyping();
      const upper = name.toUpperCase();
      typed.textContent = '';
      ghost.textContent = upper; // invisible text reserves the full width so the name stays centered
      let count = 0;

      leadJob = ctx.swarm.leadTypewriter(
        () => {
          const rect = caret.getBoundingClientRect();
          return { x: rect.left, y: rect.top + rect.height / 2 };
        },
        { count: 3, duration: upper.length * TYPE_DELAY_MS + 500 }
      );

      const step = () => {
        count += 1;
        typed.textContent = upper.slice(0, count);
        ghost.textContent = upper.slice(count);
        if (count < upper.length) typeTimer = setTimeout(step, TYPE_DELAY_MS);
        else typeTimer = null;
      };
      typeTimer = setTimeout(step, TYPE_DELAY_MS);
    }

    function paintMember(member) {
      portraitFrame.innerHTML = portraitMarkup(member);
      nameLabel.textContent = member.name;
      roleLabel.textContent = member.role;
    }

    function select(index, { reframe = true } = {}) {
      const next = (index + MEMBERS.length) % MEMBERS.length;
      if (next === activeIndex) return;
      activeIndex = next;
      const member = MEMBERS[next];

      items.forEach((item, i) => {
        item.classList.toggle('is-active', i === next);
        item.setAttribute('aria-selected', String(i === next));
        item.tabIndex = i === next ? 0 : -1;
      });
      paintMember(member);
      typeName(member.name);
      live.textContent = `${member.name}: ${member.role}`;

      if (reframe) {
        // Cursors re-frame the portrait card.
        ctx.swarm.grabCardEdges(card, { count: 4, duration: 800 });
        card.classList.remove('is-reframing');
        void card.offsetWidth;
        card.classList.add('is-reframing');
      }
    }

    const onStripClick = (event) => {
      const item = event.target.closest('.strip-item');
      if (item) select(Number(item.dataset.index));
    };

    const onKey = (event) => {
      if (event.key === 'ArrowRight') select(activeIndex + 1);
      else if (event.key === 'ArrowLeft') select(activeIndex - 1);
    };

    const onHookEvent = (event) => {
      if (!event.detail || event.detail.type !== 'photos') return;
      items.forEach((item, i) => (item.querySelector('.strip-avatar').innerHTML = portraitMarkup(MEMBERS[i])));
      paintMember(MEMBERS[activeIndex]);
    };

    strip.addEventListener('click', onStripClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener(HOOK_EVENT, onHookEvent);

    // Start with Daksh, with a short delay so the stage is visible while the name types.
    select(0, { reframe: false });

    return () => {
      stopTyping();
      strip.removeEventListener('click', onStripClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener(HOOK_EVENT, onHookEvent);
    };
  },
};
