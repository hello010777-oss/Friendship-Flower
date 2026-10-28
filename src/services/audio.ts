/**
 * Web Audio API synthesizer for child-friendly natural sound effects
 * (chimes, wind blow, spring bloom, gentle xylophone) and Speech Synthesis voice prompts.
 * Requires zero external audio file loading, works reliably in any browser.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * 맑은 실로폰/차임 소리 (홀씨 불 켜질 때)
 */
export function playChimeSound(pitchMultiplier = 1.0) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const baseFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const randomFreq = baseFreqs[Math.floor(Math.random() * baseFreqs.length)] * pitchMultiplier;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(randomFreq, now);
    osc.frequency.exponentialRampToValueAtTime(randomFreq * 1.5, now + 0.15);

    // Warm harmonics
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(randomFreq * 2, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.95);
    osc2.stop(now + 0.95);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * 전 조각 완성 축하 팡파르 차임
 */
export function playCompleteFanfare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.25);
    });
  } catch (err) {
    console.warn('Fanfare sound error:', err);
  }
}

/**
 * 쉬이익~ 시원한 바람 소리 (후~ 불기)
 */
export function playWindSound(duration = 3.5) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Pink/White noise generator via buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      lastOut = (lastOut * 0.95) + (white * 0.05);
      data[i] = lastOut * 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to simulate wind gust sweep
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.8);
    gain.gain.linearRampToValueAtTime(0.2, now + 2.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch (err) {
    console.warn('Wind sound error:', err);
  }
}

/**
 * 퐁! 청아한 실로폰/하프 개화 소리
 */
export function playBloomSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // "퐁!" popping bubble tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);

    // Warm sparkling arpeggio right after
    const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = now + 0.15 + idx * 0.09;
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);

      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.85);
    });
  } catch (err) {
    console.warn('Bloom sound error:', err);
  }
}

/**
 * 부드러운 유아용 음성 안내 (Web Speech API)
 */
export function speakFriendlyGuide(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.95; // slightly slower and warm
    utterance.pitch = 1.25; // cute, friendly, bright tone

    // Try finding Korean female/natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const koVoice = voices.find((v) => v.lang.includes('ko') || v.lang.includes('KO'));
    if (koVoice) utterance.voice = koVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
