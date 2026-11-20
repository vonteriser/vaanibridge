/**
 * page2-pipeline.js
 * -----------------------------------------------------------------------------
 * Page 2: How It Works. Eight full-viewport stages flowing downward.
 * Each stage = left note | dark software UI preview + ↓ arrow | right note.
 *
 * To edit a stage, change its entry in STAGES (copy lives in `left`/`right`,
 * the center mock-up is produced by the `preview` function).
 */

import { icon } from '../assets/icons/svg-icons.js';
import { speak } from '../js/speech.js';

/* ---------- Small helpers for the mock interfaces ---------- */

/** Deterministic pseudo-random bar heights so waveforms look organic but stable. */
function waveBars(count, seedOffset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const height = 22 + Math.abs(Math.sin((i + seedOffset) * 1.7) * 0.6 + Math.sin(i * 0.55) * 0.4) * 78;
    const delay = ((i * 83) % 700) / 1000;
    const peak = height > 72 ? ' is-peak' : '';
    return `<i class="${peak.trim()}" style="--h:${height.toFixed(0)}%;--d:${delay}s"></i>`;
  }).join('');
}

function previewShell(label, body, tag = '') {
  return `
    <div class="mock-head">
      <span class="panel-label"><i class="dot"></i>${label}</span>
      ${tag ? `<span class="mono mock-tag">${tag}</span>` : ''}
    </div>
    ${body}`;
}

/* ---------- The eight stages ---------- */

const STAGES = [
  {
    title: 'Voice-Triggered Microphone Capture',
    left: 'Starts recording automatically after a visual countdown when the speaker begins talking, and stops cleanly after a natural ~1.8s silence pause.',
    rightLabel: 'Listener impact',
    right: 'Removes the physical burden of holding down a record button and prevents clipped opening words.',
    preview: () =>
      previewShell(
        'Capture HUD',
        `
        <div class="mic-status"><span class="status-pill status-pill-accent"><i class="dot dot-pulse"></i><span class="mono">Mic ready • Auto-silence trigger</span></span></div>
        <div class="wave" aria-hidden="true">${waveBars(24)}</div>
        <div class="progress-block">
          <div class="progress-meta mono"><span>Pause detection</span><span>1.8s</span></div>
          <div class="progress"><span class="progress-fill silence-fill"></span></div>
        </div>`
      ),
  },
  {
    title: 'Acoustic Pre-Processing & Conditioning',
    left: 'Filters ambient background noise and prepares the raw voice signal from real room environments before recognition begins.',
    rightLabel: 'Listener impact',
    right: 'Bridges the acoustic gap between quiet rooms and everyday public spaces like reception desks or busy hallways.',
    preview: () =>
      previewShell(
        'Signal monitor',
        `
        <div class="signal-row">
          <div class="signal-meta mono"><span>Raw room acoustic input</span><span class="muted">−18 dB</span></div>
          <div class="wave wave-noisy" aria-hidden="true">${waveBars(32, 5)}</div>
          <div class="meter"><span class="meter-fill is-warn" style="--w:78%"></span></div>
        </div>
        <div class="signal-arrow" aria-hidden="true">${icon('arrowDown', { size: 16 })}</div>
        <div class="signal-row">
          <div class="signal-meta mono"><span>Conditioned voice frame (16kHz normalized)</span><span class="ok">−6 dB</span></div>
          <div class="wave wave-clean" aria-hidden="true">${waveBars(32, 2)}</div>
          <div class="meter"><span class="meter-fill" style="--w:54%"></span></div>
        </div>`
      ),
  },
  {
    title: 'Atypical Speech Recognition Engine',
    left: 'Interprets irregular speech cadence, uneven pacing, and atypical consonant articulation through a modular recognition layer.',
    rightLabel: 'Architecture note',
    right: 'Swappable modular architecture keeps recognition backends flexible without altering the user experience.',
    preview: () =>
      previewShell(
        'Acoustic-to-token alignment',
        `
        <div class="frame-strip" aria-hidden="true">
          ${['f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07', 'f08', 'f09', 'f10'].map((f) => `<span class="mono">${f}</span>`).join('')}
        </div>
        <div class="token-flow" aria-hidden="true">${icon('arrowDown', { size: 16 })}</div>
        <div class="token-row">
          <span class="token">I</span><span class="token">want</span><span class="token">to</span><span class="token">go</span><span class="token is-uncertain">house</span>
        </div>
        <div class="latency mono"><span><i class="dot dot-emerald"></i>Candidate words aligned</span><span class="ok">&lt; 1.0s pass</span></div>`
      ),
  },
  {
    title: 'Raw Capture Logging',
    left: 'Logs and displays the unmodified initial hypothesis under "WHAT WAS HEARD" before any correction layer touches the text.',
    rightLabel: 'Guardrail rule',
    right: 'Preserving the raw hypothesis guarantees transparency and provides a safe fallback whenever downstream certainty is low.',
    preview: () =>
      previewShell(
        'What was heard (raw hypothesis)',
        `
        <div class="terminal">
          <div class="terminal-bar mono"><i></i><i></i><i></i><span>raw-capture.log</span></div>
          <p class="terminal-line"><span class="prompt">&gt;</span> I want to go house<span class="caret terminal-caret"></span></p>
        </div>
        <div class="mock-status mono"><i class="dot dot-amber"></i>Unmodified raw capture • Fallback ready</div>`
      ),
  },
  {
    title: 'Phonetic & Personal Phrase Matching',
    left: "Compares unclear phonetic segments against an everyday phrase bank and the speaker's previously confirmed personal expressions.",
    rightLabel: 'Guardrail rule',
    right: 'Because a transcript-only language model cannot recover acoustic detail already lost, phonetic matching anchors interpretations to phrases the speaker actually uses.',
    preview: () =>
      previewShell(
        'Phrase matching',
        `
        <div class="split-mock">
          <div class="panel-inner">
            <div class="mono sub-label">Personal phrase bank &amp; phonetic neighbors</div>
            <ul class="phrase-list">
              <li class="is-selected"><span>I want to go home</span><em class="mono">×4</em></li>
              <li><span>house ≈ home</span><em class="mono">sim</em></li>
              <li><span>I need some water</span><em class="mono">×2</em></li>
              <li><span>Please wait</span><em class="mono">×1</em></li>
            </ul>
          </div>
          <div class="panel-inner">
            <div class="mono sub-label">Matched candidate expressions</div>
            <ul class="match-list">
              <li><span>I want to go home</span><div class="meter"><span class="meter-fill" style="--w:92%"></span></div><em class="mono">92</em></li>
              <li><span>I want to go out</span><div class="meter"><span class="meter-fill is-dim" style="--w:41%"></span></div><em class="mono">41</em></li>
              <li><span>I want to go house</span><div class="meter"><span class="meter-fill is-dim" style="--w:18%"></span></div><em class="mono">18</em></li>
            </ul>
          </div>
        </div>`
      ),
  },
  {
    title: 'Conservative Meaning Guardrail',
    left: 'Polishes minor grammar gaps while enforcing strict non-hallucination rules: minimal changes, never invent facts, and zero conversational fluff.',
    rightLabel: 'Guardrail rule',
    right: "Deterministic validation automatically rejects over-expanded or invented text, protecting the speaker's exact intended meaning.",
    preview: () =>
      previewShell(
        'Guardrail diff inspection',
        `
        <div class="diff">
          <div class="diff-row">
            <span class="mono diff-label">Raw input</span>
            <p>I want to go house</p>
          </div>
          <div class="diff-row is-approved">
            <span class="mono diff-label">${icon('check', { size: 14 })} Approved minimal edit</span>
            <p>I want to go <mark>home</mark></p>
          </div>
          <div class="diff-row is-rejected">
            <span class="mono diff-label">${icon('cross', { size: 14 })} Rejected hallucination</span>
            <p><s>I want to go home tomorrow afternoon</s></p>
            <small class="mono">Blocked: added unstated time &amp; filler</small>
          </div>
        </div>`
      ),
  },
  {
    title: 'Speaker Confirmation & Confidence Tiers',
    left: 'Adapts to certainty levels: high confidence passes straight through, moderate confidence prompts a quick "Did you mean A / B / C?" choice, and low confidence falls back to raw text or asks to repeat.',
    rightLabel: 'Listener impact',
    right: "Every confirmed selection updates the speaker's confirmation memory so recurring phrases resolve faster next time.",
    preview: () =>
      previewShell(
        'Did you mean?',
        `
        <div class="mic-status"><span class="status-pill"><i class="dot dot-amber"></i><span class="mono">Confidence: moderate • Verify intent</span></span></div>
        <div class="choices" role="radiogroup" aria-label="Did you mean?">
          <button type="button" class="choice-row" role="radio" aria-checked="false" data-choice="A"><b class="mono">[A]</b><span>I need two water bottles</span></button>
          <button type="button" class="choice-row" role="radio" aria-checked="false" data-choice="B"><b class="mono">[B]</b><span>I need warm water</span></button>
          <button type="button" class="choice-row" role="radio" aria-checked="false" data-choice="C"><b class="mono">[C]</b><span>Keep raw / Repeat</span></button>
        </div>
        <div class="mock-status mono" data-choice-status><i class="dot dot-amber"></i>Waiting for speaker selection</div>`
      ),
  },
  {
    title: 'Listener Display & Spoken Voice Output',
    left: 'Delivers the verified "VAANIBRIDGE MESSAGE" on a high-contrast listener-facing display and speaks it aloud via clear voice output.',
    rightLabel: 'Listener impact',
    right: 'The listener reads and hears the intended message effortlessly, completing the bridge without awkward repetition.',
    preview: () =>
      previewShell(
        'Listener display',
        `
        <div class="device-frame">
          <div class="device-raw">
            <span class="mono">What was heard</span>
            <p>I want to go house</p>
          </div>
          <div class="device-message">
            <span class="mono"><i class="dot dot-emerald"></i>VaaniBridge message</span>
            <p class="device-text">I want to go home.</p>
          </div>
          <div class="device-actions">
            <button type="button" class="speak-btn" data-speak="I want to go home." aria-label="Speak this message">${icon('speaker', { size: 20 })}</button>
            <span class="mono speak-label">Speak this</span>
            <span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          </div>
        </div>`
      ),
  },
];

function renderStage(stage, index) {
  const step = String(index + 1).padStart(2, '0');
  const isLast = index === STAGES.length - 1;
  return `
    <article class="stage" aria-labelledby="stage-title-${step}">
      <div class="stage-grid">
        <div class="stage-side stage-left" data-build-target data-build-type="soft" data-build-from="left">
          <span class="mono step-badge">Step ${step}</span>
          <h3 id="stage-title-${step}" class="stage-title">${stage.title}</h3>
          <p class="t-body">${stage.left}</p>
        </div>

        <div class="stage-center">
          <div class="stage-preview panel mock" data-build-target data-build-type="panel">
            ${stage.preview()}
          </div>
          ${
            isLast
              ? ''
              : `<div class="flow-spine" aria-hidden="true" data-build-target data-build-type="soft">
                  <span class="spine-line"></span>
                  <span class="spine-node">${icon('arrowDown', { size: 18 })}</span>
                </div>`
          }
        </div>

        <div class="stage-side stage-right" data-build-target data-build-type="soft" data-build-from="right">
          <span class="mono side-tag">${stage.rightLabel}</span>
          <p class="t-body">${stage.right}</p>
        </div>
      </div>
    </article>`;
}

export default {
  id: 'pipeline',
  title: 'How It Works',

  render() {
    return `
      <section class="page page-padded page-pipeline" aria-labelledby="pipeline-title">
        <header class="page-header container">
          <span class="status-pill" data-status-pill data-build-target data-build-type="soft">
            <i class="dot dot-pulse"></i><span class="mono">8 stages • Speaker to listener</span>
          </span>
          <h2 id="pipeline-title" class="t-section" data-build-target data-build-type="text" data-squad="4">End-to-End Interpretation Pipeline</h2>
          <p class="t-body" data-build-target data-build-type="text" data-squad="3" data-sweep="900">
            Speech recognition alone does not complete the product. A transcript can be almost right and still
            change what a listener understands. VaaniBridge adds phonetic matching, a conservative guardrail and
            speaker confirmation, so the message that reaches the listener is the one the speaker meant, and nothing more.
          </p>
        </header>
        <div class="stages">${STAGES.map(renderStage).join('')}</div>
      </section>`;
  },

  mount(root, ctx) {
    const cleanups = [];
    let cancelSpeech = null;

    /* Stage 07: clickable confirmation choices */
    const choiceRows = [...root.querySelectorAll('.choice-row')];
    const choiceStatus = root.querySelector('[data-choice-status]');
    const choiceMessages = {
      A: 'Selected [A] • Saved to confirmation memory',
      B: 'Selected [B] • Saved to confirmation memory',
      C: 'Raw text kept • Speaker may repeat',
    };
    choiceRows.forEach((row) => {
      const onClick = () => {
        choiceRows.forEach((other) => {
          other.classList.toggle('is-selected', other === row);
          other.setAttribute('aria-checked', String(other === row));
        });
        if (choiceStatus) {
          choiceStatus.innerHTML = `<i class="dot dot-emerald"></i>${choiceMessages[row.dataset.choice]}`;
        }
      };
      row.addEventListener('click', onClick);
      cleanups.push(() => row.removeEventListener('click', onClick));
    });

    /* Stage 08: speak button + waveform pulse */
    const speakButton = root.querySelector('[data-speak]');
    if (speakButton) {
      const equalizer = root.querySelector('.device-actions .eq');
      const onSpeak = () => {
        if (cancelSpeech) cancelSpeech();
        speakButton.classList.add('is-speaking');
        equalizer.classList.add('is-active');
        cancelSpeech = speak(speakButton.dataset.speak, () => {
          speakButton.classList.remove('is-speaking');
          equalizer.classList.remove('is-active');
        });
      };
      speakButton.addEventListener('click', onSpeak);
      cleanups.push(() => speakButton.removeEventListener('click', onSpeak));
    }

    // ctx is unused here but kept in the signature for consistency with other pages.
    void ctx;

    return () => {
      cleanups.forEach((fn) => fn());
      if (cancelSpeech) cancelSpeech();
    };
  },
};
