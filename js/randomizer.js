/**
 * randomizer.js
 * -----------------------------------------------------------------------------
 * Reload randomizers.
 *  - Page 1: gives each of the 5 launch buttons a unique shape + tilt + layout.
 *  - Page 4: shuffles the 9 scenario cards and assigns corners/tilts.
 *
 * Both are called every time the page mounts, so each reload (or revisit)
 * produces a fresh composition.
 */

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Random float in [min, max). */
export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** Random float with a random sign whose magnitude lies in [minAbs, maxAbs]. */
function randomSigned(minAbs, maxAbs) {
  return (Math.random() < 0.5 ? -1 : 1) * randomBetween(minAbs, maxAbs);
}

/* ---------- Page 1: launch buttons ---------- */

/** The five geometric shape archetypes for launch buttons. */
export const LAUNCH_SHAPES = [
  { name: 'capsule', borderRadius: '999px', clipPath: 'none' },
  { name: 'leaf', borderRadius: '32px 6px 32px 6px', clipPath: 'none' },
  {
    name: 'chamfer',
    borderRadius: '4px',
    clipPath:
      'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
  },
  { name: 'arch', borderRadius: '28px 28px 6px 6px', clipPath: 'none' },
  { name: 'reverse-cut', borderRadius: '6px 28px 6px 28px', clipPath: 'none' },
];

/**
 * Assign every launch button a unique shape, a non-zero tilt (±3.2deg max),
 * a vertical shift (±7px) and an internal layout (split or stack).
 * @param {HTMLElement[]} buttons
 */
export function randomizeLaunchButtons(buttons) {
  const shapes = shuffle(LAUNCH_SHAPES);
  buttons.forEach((button, index) => {
    const shape = shapes[index % shapes.length];
    // Keep tilt clearly visible but never exactly 0deg.
    const tilt = randomSigned(0.8, 3.2).toFixed(2);
    const shift = randomSigned(1, 7).toFixed(1);

    button.dataset.shape = shape.name;
    button.style.setProperty('--shape-radius', shape.borderRadius);
    button.style.setProperty('--shape-clip', shape.clipPath);
    button.style.setProperty('--tilt', `${tilt}deg`);
    button.style.setProperty('--shift', `${shift}px`);
    button.classList.toggle('layout-split', Math.random() < 0.5);
    button.classList.toggle('layout-stack', !button.classList.contains('layout-split'));
  });
}

/* ---------- Page 4: scenario cards ---------- */

export const CARD_CORNERS = [
  '12px',
  '26px',
  '28px 6px 28px 6px',
  '6px 26px 6px 26px',
  '22px 22px 6px 6px',
];

/**
 * Shuffle the DOM order of the cards in `grid` and give each a randomized
 * corner radius, resting tilt (±2.2deg) and vertical offset (±5px).
 * @param {HTMLElement} grid
 */
export function randomizeScenarioCards(grid) {
  const cards = shuffle([...grid.children]);
  cards.forEach((card) => {
    grid.appendChild(card); // re-appending moves the node into its new position
    const corner = CARD_CORNERS[Math.floor(Math.random() * CARD_CORNERS.length)];
    const tilt = randomBetween(-2.2, 2.2).toFixed(2);
    const offset = randomBetween(-5, 5).toFixed(1);
    card.style.setProperty('--card-radius', corner);
    card.style.setProperty('--tilt', `${tilt}deg`);
    card.style.setProperty('--dy', `${offset}px`);
  });
  return cards;
}
