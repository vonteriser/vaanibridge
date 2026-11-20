# VaaniBridge Web

*Bridging speech and understanding in real-time conversation.*

A modular, dependency-free website (plain HTML5, CSS3 and ES modules). The code is deliberately unminified and commented, and every page lives in its own file.

## Run it

Any static server works. ES modules need `http://`, not `file://`.

```bash
npm install        # once
npm run dev        # live development server
npm run build      # production build into dist/ (single self-contained dist/index.html)
```

## Structure

```
index.html            Entry shell: swarm canvas, page stage, bottom-up navbar
css/
  tokens.css          Colors, type scale, spacing, radii, z-index
  base.css            Reset, scrollbars, focus states
  layout.css          Containers, grids, breakpoints
  components.css      Pills, buttons, HUD cards, navbar, lock cards
  pages.css           Page 1–6 layouts
  animations.css      Construction states, keyframes, 3D flip, caret
js/
  main.js             Bootstrap: benchmark → swarm → router
  router.js           Page controller, build observer, bottom-up nav
  swarm-engine.js     20–40 micro-cursor swarm (benchmark, squads, halo)
  randomizer.js       Page 1 button shapes + Page 4 card shuffle
  speech.js           Speech-synthesis helper for "Speak this" buttons
  upgrade-hooks.js    window.VaaniBridgeHooks (+ STL viewer)
pages/                page1-home.js … page6-team.js
assets/
  icons/svg-icons.js  1.5px outline icons + Blank Tree silhouette
  models/             Drop the badge .stl here
  media/              Drop the demo video and portraits here
```

## How the swarm builds the page

Any element with `data-build-target` starts hidden. When it enters the viewport (IntersectionObserver, threshold 0.15), the router sends a squad of cursors to it:

| `data-build-type` | Behaviour |
| --- | --- |
| `text` | Cursors sweep left to right with a scanline while the text is revealed |
| `panel` (default) | Cursors latch onto the four corners, trace a 1px wireframe, then reveal |
| `soft` | Simple reveal with no squad (chips, side copy) |

Add `data-squad="12"` to change the squad size. The swarm is cosmetic: content is always revealed by timers, so the site still works if the canvas is throttled.

The cursor count is chosen by a silent benchmark (logical processors, memory, frame stability). It is always 20, 24, 28, 32, 36 or 40, so every screen edge gets the same number.

## Future upgrade hooks

Once the assets exist, run these in the console or add them to a small script:

```js
// Page 3: wearable badge model
VaaniBridgeHooks.mountWearableSTL({ stlUrl: './assets/models/badge.stl' });

// Page 5: prototype walkthrough (chapters = start times in seconds)
VaaniBridgeHooks.mountDemoVideo({
  videoSrc: './assets/media/demo.mp4',
  posterSrc: './assets/media/demo-poster.jpg',
  chapters: [0, 24, 61, 98, 140],
});

// Page 6: portraits
VaaniBridgeHooks.setTeamPhotos({
  Daksh: './assets/media/daksh.jpg',
  Shivang: './assets/media/shivang.jpg',
  Vaibhav: './assets/media/vaibhav.jpg',
  Divyansh: './assets/media/divyansh.jpg',
  Shivansh: './assets/media/shivansh.jpg',
});
```

Each hook works whether the page is currently open or opened later.

## Editing content

- Page 1 destinations: `DESTINATIONS` in `pages/page1-home.js`
- Page 2 stages: `STAGES` in `pages/page2-pipeline.js`
- Page 3 camera cuts and HUD cards: `CAMERA_CUTS` and `FEATURES` in `pages/page3-wearable.js`
- Page 4 scenarios: `SCENARIOS` in `pages/page4-scenarios.js`
- Page 6 team: `MEMBERS` in `pages/page6-team.js`

## Writing rules

- Always label raw text "WHAT WAS HEARD" and clarified text "VAANIBRIDGE MESSAGE".
- Describe the technology at the macro level only. Do not name third-party models, providers or datasets.
- Make no unsupported claims. Make no "first" claims, accuracy percentages or clinical efficacy claims.
