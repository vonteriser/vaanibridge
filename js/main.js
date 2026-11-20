/**
 * main.js
 * -----------------------------------------------------------------------------
 * Application bootstrap:
 *   1. create the swarm and run the blackout + hardware benchmark,
 *   2. publish the cursor count to the navigation telemetry pill,
 *   3. start the router, which constructs Page 1 live.
 */

import { createSwarm } from './swarm-engine.js';
import { createRouter } from './router.js';
import './upgrade-hooks.js'; // registers window.VaaniBridgeHooks

async function bootstrap() {
  const canvas = document.getElementById('swarm-canvas');
  const stage = document.getElementById('page-stage');
  const nav = document.getElementById('secondary-nav');
  const countLabel = document.getElementById('swarm-count');

  const swarm = createSwarm(canvas);
  const router = createRouter({ stage, nav, swarm });

  let cursorCount = 0;
  try {
    cursorCount = await swarm.boot();
  } catch (error) {
    // The swarm is cosmetic: if it fails, the site must still work.
    console.warn('Swarm boot failed; continuing without it.', error);
  }

  countLabel.textContent = cursorCount ? `${cursorCount} BUILDERS` : 'STATIC MODE';
  document.body.classList.remove('is-booting');
  router.start();
}

bootstrap();
