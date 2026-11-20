/**
 * speech.js
 * -----------------------------------------------------------------------------
 * Tiny wrapper around the browser's built-in speech synthesis, used by the
 * "SPEAK THIS" buttons on Pages 2 and 4. It degrades gracefully: when speech
 * output is unavailable, the callback still fires after a short delay so the
 * waveform animation plays either way.
 */

/**
 * Speak a message aloud.
 * @param {string} text            message to speak
 * @param {() => void} [onDone]    called when speech (or the fallback timer) ends
 * @returns {() => void}           cancel function
 */
export function speak(text, onDone) {
  const fallbackMs = Math.min(3200, 900 + text.length * 55);
  let finished = false;
  let fallbackTimer = null;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(fallbackTimer);
    if (onDone) onDone();
  };

  try {
    if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
      fallbackTimer = setTimeout(finish, fallbackMs + 4000); // safety net
    } else {
      fallbackTimer = setTimeout(finish, fallbackMs);
    }
  } catch (error) {
    fallbackTimer = setTimeout(finish, fallbackMs);
  }

  return () => {
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (error) {
      /* ignore */
    }
    finish();
  };
}
