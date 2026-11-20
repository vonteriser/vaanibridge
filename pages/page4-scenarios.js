/**
 * page4-scenarios.js
 * -----------------------------------------------------------------------------
 * Page 4: nine everyday scenarios as a randomized 3x3 deck of 3D flip cards.
 *   front = the listener's challenge, back = WHAT WAS HEARD → VAANIBRIDGE MESSAGE.
 *
 * To add or edit a scenario, change SCENARIOS. The grid shuffles itself on
 * every load and whenever "Reshuffle Deck" is pressed.
 */

import { icon } from '../assets/icons/svg-icons.js';
import { randomizeScenarioCards } from '../js/randomizer.js';
import { speak } from '../js/speech.js';

const SCENARIOS = [
  {
    title: 'Noisy Cafe Counter',
    icon: 'coffee',
    challenge: 'Ordering a drink in a loud cafe without having to repeat three times.',
    heard: 'one cup tea no sugar',
    message: 'One cup of tea, no sugar.',
  },
  {
    title: 'Reception & Service Desk',
    icon: 'desk',
    challenge: 'Checking in at a busy front desk where proper names and intent must be exact.',
    heard: 'me here see mister sharma',
    message: 'I am here to see Mr. Sharma.',
  },
  {
    title: 'Classroom & Study Group',
    icon: 'classroom',
    challenge: 'Jumping into a fast academic discussion before the group moves to the next topic.',
    heard: 'wait check slide three',
    message: 'Wait, check slide three.',
  },
  {
    title: 'Quick Home Request',
    icon: 'home',
    challenge: 'Communicating an everyday need at home with conservative grammar repair and zero added facts.',
    heard: 'I want to go house',
    message: 'I want to go home.',
    tag: 'Minimal Edit • Zero Added Facts',
  },
  {
    title: 'Transit & Directions',
    icon: 'transit',
    challenge: 'Giving an exact stop or gate number to a driver or transit attendant during rush hour.',
    heard: 'stop near metro gate two',
    message: 'Stop near Metro Gate 2.',
  },
  {
    title: 'First Introduction',
    icon: 'person',
    challenge: 'Introducing yourself clearly to someone new using personal phrase adaptation.',
    heard: 'hello my name john',
    message: 'Hello, my name is John.',
  },
  {
    title: 'Retail & Shop Counter',
    icon: 'bag',
    challenge: 'Requesting specific items when moderate confidence prompts a quick 1-tap "Did you mean A/B/C?" confirmation.',
    heard: 'need two water bottle',
    message: 'I need two water bottles.',
    tag: 'Confirmed [A]',
  },
  {
    title: 'Time-Sensitive Errand',
    icon: 'clock',
    challenge: 'Sharing a schedule detail at a service desk without listener guesswork altering the time.',
    heard: 'come back after five',
    message: 'I will come back after 5:00.',
  },
  {
    title: 'High-Noise Safe Fallback',
    icon: 'shield',
    challenge: 'Speaking in heavy background noise where standard AI guesses wildly and distorts meaning.',
    heard: '[unclear segment] ... help desk',
    message: 'SAFE FALLBACK: Raw text displayed • Prompting quick A/B confirmation or repeat (Zero hallucinated words).',
    spoken: 'Safe fallback. Raw text displayed. Please confirm with A or B, or repeat.',
    fallback: true,
  },
];

function renderCard(scenario, index) {
  const number = String(index + 1).padStart(2, '0');
  const spoken = scenario.spoken || scenario.message;
  return `
    <div class="flip-card scenario-card" tabindex="0" role="button" aria-pressed="false"
         aria-label="Scenario ${number}: ${scenario.title}. Press Enter or Space to flip."
         data-build-target data-build-type="panel">
      <div class="flip-inner">
        <div class="flip-face flip-front">
          <div class="front-top">
            <span class="mono scenario-index">Scenario ${number}</span>
            <span class="scenario-icon">${icon(scenario.icon, { size: 24 })}</span>
          </div>
          <h3 class="t-feature scenario-title">${scenario.title}</h3>
          <p class="scenario-text">${scenario.challenge}</p>
          <p class="mono flip-prompt">Click to flip // Inspect bridge output ${icon('arrowRight', { size: 12 })}</p>
        </div>

        <div class="flip-face flip-back">
          <div class="back-panel back-raw">
            <span class="mono back-label">What was heard</span>
            <p class="raw-text">"${scenario.heard}"</p>
          </div>
          <div class="back-panel back-final${scenario.fallback ? ' is-fallback' : ''}">
            <span class="mono back-label"><i class="dot ${scenario.fallback ? 'dot-amber' : 'dot-emerald'}"></i>VaaniBridge message</span>
            <div class="final-row">
              <p class="final-text">${scenario.message}</p>
              <button type="button" class="speak-btn speak-sm" tabindex="-1" data-speak="${spoken}" aria-label="Speak message for ${scenario.title}">${icon('speaker', { size: 18 })}</button>
            </div>
            <div class="back-foot">
              ${scenario.tag ? `<span class="mono chip">${scenario.tag}</span>` : '<span></span>'}
              <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export default {
  id: 'scenarios',
  title: 'Everyday Scenarios',

  render() {
    return `
      <section class="page page-padded page-scenarios" aria-labelledby="scenarios-title">
        <header class="scenario-head container">
          <div class="scenario-head-copy">
            <span class="status-pill" data-status-pill data-build-target data-build-type="soft">
              <i class="dot dot-pulse"></i><span class="mono">9 scenarios • Select a card to flip</span>
            </span>
            <h2 id="scenarios-title" class="t-section" data-build-target data-build-type="text" data-squad="4">Everyday Communication Scenarios</h2>
            <p class="t-body" data-build-target data-build-type="text" data-squad="3" data-sweep="900">
              See how VaaniBridge resolves real-world listener bottlenecks: every card shows what was heard, then the
              clear message the listener receives, with minimal edits and no added facts.
            </p>
          </div>
          <button type="button" class="btn btn-accent reshuffle-btn" id="reshuffle-btn" data-build-target data-build-type="soft">
            ${icon('orbit', { size: 16 })} Reshuffle Deck
          </button>
        </header>

        <div class="scenario-grid container" id="scenario-grid">
          ${SCENARIOS.map(renderCard).join('')}
        </div>
      </section>`;
  },

  mount(root, ctx) {
    const grid = root.querySelector('#scenario-grid');
    const reshuffleButton = root.querySelector('#reshuffle-btn');
    const cancels = new Map(); // card → cancel function for speech
    randomizeScenarioCards(grid); // fresh order, corners and tilts on every load

    function setFlipped(card, flipped) {
      card.classList.toggle('is-flipped', flipped);
      card.setAttribute('aria-pressed', String(flipped));
      const speakBtn = card.querySelector('.speak-btn');
      if (speakBtn) speakBtn.tabIndex = flipped ? 0 : -1;
    }

    function toggleCard(card) {
      setFlipped(card, !card.classList.contains('is-flipped'));
      ctx.swarm.grabCardEdges(card, { count: 4, duration: 900 }); // 4 cursors grab the card edges
    }

    function speakCard(card, button) {
      const previous = cancels.get(card);
      if (previous) previous();
      const equalizer = card.querySelector('.eq');
      button.classList.add('is-speaking');
      equalizer.classList.add('is-active');
      cancels.set(
        card,
        speak(button.dataset.speak, () => {
          button.classList.remove('is-speaking');
          equalizer.classList.remove('is-active');
        })
      );
    }

    const onClick = (event) => {
      const card = event.target.closest('.scenario-card');
      if (!card) return;
      const speakBtn = event.target.closest('.speak-btn');
      if (speakBtn) {
        if (card.classList.contains('is-flipped')) speakCard(card, speakBtn);
        return; // never flip when pressing the speaker
      }
      toggleCard(card);
    };

    const onKeyDown = (event) => {
      if (event.target.classList && event.target.classList.contains('scenario-card')) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleCard(event.target);
        }
      }
    };

    const onReshuffle = () => {
      const cards = [...grid.children];
      cards.forEach((card) => setFlipped(card, false));
      const shuffled = randomizeScenarioCards(grid); // new order, corners, tilts
      ctx.rebuild(shuffled, 110); // swarm re-constructs the deck live
    };

    grid.addEventListener('click', onClick);
    grid.addEventListener('keydown', onKeyDown);
    reshuffleButton.addEventListener('click', onReshuffle);

    return () => {
      grid.removeEventListener('click', onClick);
      grid.removeEventListener('keydown', onKeyDown);
      reshuffleButton.removeEventListener('click', onReshuffle);
      cancels.forEach((cancel) => cancel());
    };
  },
};
