'use strict';

const {
  buildFreqBinMap,
  getBarAmplitude,
  barColor,
  waterfallColor,
} = VisualizerUtils;

// ── Configuration ────────────────────────────────────────────────────────────
const FFT_SIZE = 2048;
const NUM_BARS = 128;
const BAR_FALLOFF_RATE = 2.5;   // amplitude units/second for peak decay
const CONTROLS_HIDE_DELAY = 3000;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');
const audio        = document.getElementById('audio');
const controls     = document.getElementById('controls');
const trackSelect  = document.getElementById('track-select');
const playPauseBtn = document.getElementById('play-pause');
const volumeSlider = document.getElementById('volume');

// ── Audio state ───────────────────────────────────────────────────────────────
let audioCtx  = null;
let analyser  = null;
let gainNode  = null;
let freqData  = null;
let isPlaying = false;

// ── Visualizer state ──────────────────────────────────────────────────────────
let barCount    = NUM_BARS;
let freqBinMap  = null;
let peaks       = new Float32Array(NUM_BARS);

// Offscreen canvas accumulates waterfall history
const wfCanvas = document.createElement('canvas');
let   wfCtx    = null;

// ── Performance tracking ──────────────────────────────────────────────────────
const FRAME_SAMPLE = 60;
const frameTimes   = [];
let lastFrameTime  = -1;

// ── Controls auto-hide ────────────────────────────────────────────────────────
let hideTimer = null;

function showControls() {
  controls.classList.remove('hidden');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => controls.classList.add('hidden'), CONTROLS_HIDE_DELAY);
}

document.addEventListener('mousemove', showControls);
document.addEventListener('click', showControls);

// ── Canvas / waterfall sizing ─────────────────────────────────────────────────
function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width  = w;
  canvas.height = h;
  wfCanvas.width  = w;
  wfCanvas.height = Math.floor(h * 0.6);
  wfCtx = wfCanvas.getContext('2d');
  // Re-fill background so waterfall doesn't show stale pixel data
  wfCtx.fillStyle = '#0a0a0a';
  wfCtx.fillRect(0, 0, wfCanvas.width, wfCanvas.height);
  freqBinMap = null; // force rebuild after resize
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Frequency bin map ─────────────────────────────────────────────────────────
function ensureFreqBinMap(sampleRate) {
  if (!freqBinMap) {
    freqBinMap = buildFreqBinMap(barCount, FFT_SIZE, sampleRate);
  }
}

// ── Draw FFT bars (top 40%) ───────────────────────────────────────────────────
function drawBars(dt) {
  const w = canvas.width;
  const h = Math.floor(canvas.height * 0.4);
  const decayPerFrame = (BAR_FALLOFF_RATE * dt) / 1000;

  ensureFreqBinMap(audioCtx.sampleRate);

  const barW = w / barCount;

  for (let i = 0; i < barCount; i++) {
    const lo  = freqBinMap[i];
    const hi  = freqBinMap[i + 1];
    const amp = getBarAmplitude(freqData, lo, hi);

    if (amp > peaks[i]) {
      peaks[i] = amp;
    } else {
      peaks[i] = Math.max(0, peaks[i] - decayPerFrame);
    }

    const barH = peaks[i] * h;
    const x    = i * barW;
    const y    = h - barH;

    ctx.fillStyle = barColor(peaks[i]);
    ctx.fillRect(x + 0.5, y, Math.max(barW - 1, 1), barH);
  }
}

// ── Draw waterfall (bottom 60%) ───────────────────────────────────────────────
function drawWaterfall() {
  const ww = wfCanvas.width;
  const wh = wfCanvas.height;

  ensureFreqBinMap(audioCtx.sampleRate);

  // Scroll existing content down by 1px
  wfCtx.drawImage(wfCanvas, 0, 1, ww, wh - 1);

  // Stamp a new 1px row at the top
  const row  = wfCtx.createImageData(ww, 1);
  const data = row.data;

  for (let i = 0; i < barCount; i++) {
    const lo  = freqBinMap[i];
    const hi  = freqBinMap[i + 1];
    const amp = getBarAmplitude(freqData, lo, hi);
    const [r, g, b] = waterfallColor(amp);

    const xStart = Math.round(i * ww / barCount);
    const xEnd   = Math.round((i + 1) * ww / barCount);
    for (let x = xStart; x < xEnd; x++) {
      const px = x * 4;
      data[px]     = r;
      data[px + 1] = g;
      data[px + 2] = b;
      data[px + 3] = 255;
    }
  }

  wfCtx.putImageData(row, 0, 0);

  // Blit waterfall onto main canvas below the bar panel
  const fftH = Math.floor(canvas.height * 0.4);
  ctx.drawImage(wfCanvas, 0, fftH);
}

// ── Adaptive quality ──────────────────────────────────────────────────────────
function adaptQuality(dt) {
  frameTimes.push(dt);
  if (frameTimes.length > FRAME_SAMPLE) frameTimes.shift();
  if (frameTimes.length < FRAME_SAMPLE) return;

  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  if (avg > 20 && barCount > 32) {
    barCount   = Math.max(32, Math.floor(barCount * 0.85));
    freqBinMap = null;
    peaks      = new Float32Array(barCount);
  } else if (avg < 12 && barCount < NUM_BARS) {
    barCount   = Math.min(NUM_BARS, Math.floor(barCount * 1.15));
    freqBinMap = null;
    peaks      = new Float32Array(barCount);
  }
}

// ── Animation loop ────────────────────────────────────────────────────────────
function animate(ts) {
  requestAnimationFrame(animate);

  const dt = lastFrameTime < 0 ? 16.67 : ts - lastFrameTime;
  lastFrameTime = ts;

  adaptQuality(dt);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(freqData);
    drawBars(dt);
    drawWaterfall();
  }
}

requestAnimationFrame(animate);

// ── Audio setup ───────────────────────────────────────────────────────────────
function setupAudio() {
  if (audioCtx) {
    audioCtx.resume();
    return;
  }

  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = 0.8;
  freqData = new Uint8Array(analyser.frequencyBinCount);

  gainNode = audioCtx.createGain();
  gainNode.gain.value = parseFloat(volumeSlider.value);

  const source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);
}

// ── Track list ────────────────────────────────────────────────────────────────
async function loadTracks() {
  try {
    const res    = await fetch('/api/tracks');
    const tracks = await res.json();
    for (const t of tracks) {
      const opt       = document.createElement('option');
      opt.value       = `audio/${t}`;
      opt.textContent = t;
      trackSelect.appendChild(opt);
    }
  } catch {
    // Server may not be running; silently degrade
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────
trackSelect.addEventListener('change', () => {
  const src = trackSelect.value;
  if (!src) return;
  setupAudio();
  audio.src = src;
  audio.play()
    .then(() => {
      isPlaying = true;
      playPauseBtn.textContent = 'Pause';
    })
    .catch(() => {});
});

playPauseBtn.addEventListener('click', () => {
  if (!audio.src) return;
  setupAudio();

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
  } else {
    audio.play()
      .then(() => {
        isPlaying = true;
        playPauseBtn.textContent = 'Pause';
      })
      .catch(() => {});
  }
});

volumeSlider.addEventListener('input', () => {
  if (gainNode) gainNode.gain.value = parseFloat(volumeSlider.value);
});

audio.addEventListener('ended', () => {
  isPlaying = false;
  playPauseBtn.textContent = 'Play';
});

// ── Drag & Drop support (for static hosting without /api/tracks) ─────────────
const dropOverlay = document.createElement('div');
dropOverlay.id = 'drop-overlay';
dropOverlay.innerHTML = '<p>Drop audio file here</p>';
dropOverlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:999;justify-content:center;align-items:center;font:2em sans-serif;color:#0f0;';
document.body.appendChild(dropOverlay);

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropOverlay.style.display = 'flex';
});
dropOverlay.addEventListener('dragleave', () => {
  dropOverlay.style.display = 'none';
});
document.addEventListener('drop', (e) => {
  e.preventDefault();
  dropOverlay.style.display = 'none';
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('audio/')) return;
  const url = URL.createObjectURL(file);
  setupAudio();
  audio.src = url;
  audio.play().then(() => {
    isPlaying = true;
    playPauseBtn.textContent = 'Pause';
    // Add to track list
    const opt = document.createElement('option');
    opt.value = url;
    opt.textContent = file.name;
    opt.selected = true;
    trackSelect.appendChild(opt);
  }).catch(() => {});
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadTracks();
showControls();

// Show hint if no tracks available
setTimeout(() => {
  if (trackSelect.options.length <= 1) {
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);color:#666;font:1em sans-serif;z-index:100;';
    hint.textContent = 'Drag & drop an audio file to start';
    document.body.appendChild(hint);
    // Remove hint once audio plays
    audio.addEventListener('play', () => hint.remove(), { once: true });
  }
}, 2000);
