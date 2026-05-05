'use strict';
/**
 * Node.js tests for utils.js pure functions.
 * Run with: node tests/test_utils.js
 */

const path = require('path');
const {
  buildFreqBinMap,
  getBarAmplitude,
  lerpColor,
  barColorRgb,
  barColor,
  waterfallColor,
  MIN_FREQ,
} = require(path.join(__dirname, '..', 'utils.js'));

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

function assertDeepEqual(a, b, msg) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
    failed++;
  }
}

// ── lerpColor ─────────────────────────────────────────────────────────────────
console.log('\nlerpColor');

assert(
  JSON.stringify(lerpColor([0, 0, 0], [255, 255, 255], 0)) === '[0,0,0]',
  't=0 returns first color'
);
assert(
  JSON.stringify(lerpColor([0, 0, 0], [255, 255, 255], 1)) === '[255,255,255]',
  't=1 returns second color'
);
{
  const mid = lerpColor([0, 0, 0], [100, 200, 50], 0.5);
  assert(mid[0] === 50 && mid[1] === 100 && mid[2] === 25, 't=0.5 midpoint');
}

// ── barColorRgb ───────────────────────────────────────────────────────────────
console.log('\nbarColorRgb');

{
  const low = barColorRgb(0);
  assert(low[1] > low[0] && low[1] > low[2], 'amp=0 is greenish (G > R and G > B)');
}
{
  const high = barColorRgb(1);
  assert(high[0] > 0 && high[2] > 0, 'amp=1 is magenta-ish (R and B present)');
}
{
  const mid = barColorRgb(0.5);
  assert(Array.isArray(mid) && mid.length === 3, 'amp=0.5 returns 3-channel array');
  assert(mid.every(v => v >= 0 && v <= 255), 'all channels in [0,255]');
}
{
  // Clamp: amp outside [0,1] should not produce NaN or out-of-range values
  const over = barColorRgb(1.5);
  assert(over.every(v => Number.isFinite(v) && v >= 0 && v <= 255), 'amp>1 clamped');
  const under = barColorRgb(-0.5);
  assert(under.every(v => Number.isFinite(v) && v >= 0 && v <= 255), 'amp<0 clamped');
}

// ── barColor (CSS string) ─────────────────────────────────────────────────────
console.log('\nbarColor');

assert(typeof barColor(0) === 'string', 'returns a string');
assert(barColor(0).startsWith('rgb('), 'starts with rgb(');
assert(barColor(0).endsWith(')'), 'ends with )');

// ── waterfallColor ────────────────────────────────────────────────────────────
console.log('\nwaterfallColor');

{
  const silence = waterfallColor(0);
  // Should be near-black (#0a0a0a = [10,10,10])
  assert(silence[0] <= 15 && silence[1] <= 15 && silence[2] <= 15, 'amp=0 near black');
}
{
  const loud = waterfallColor(1);
  // Should be near white
  assert(loud[0] > 240 && loud[1] > 240 && loud[2] > 240, 'amp=1 near white');
}
{
  const mid = waterfallColor(0.5);
  assert(Array.isArray(mid) && mid.length === 3, 'returns 3-channel array');
  assert(mid.every(v => v >= 0 && v <= 255), 'all channels in [0,255]');
}
{
  const over = waterfallColor(2);
  assert(over.every(v => Number.isFinite(v) && v >= 0 && v <= 255), 'amp>1 clamped');
}

// ── buildFreqBinMap ───────────────────────────────────────────────────────────
console.log('\nbuildFreqBinMap');

{
  const fftSize = 2048;
  const sampleRate = 44100;
  const numBars = 128;
  const map = buildFreqBinMap(numBars, fftSize, sampleRate);

  assert(map.length === numBars + 1, 'returns numBars+1 boundaries');
  assert(map[0] >= 0, 'first boundary >= 0');
  assert(map[numBars] <= fftSize / 2 - 1, 'last boundary <= maxBin');

  // Monotonically non-decreasing
  let mono = true;
  for (let i = 1; i < map.length; i++) {
    if (map[i] < map[i - 1]) { mono = false; break; }
  }
  assert(mono, 'boundaries are monotonically non-decreasing');

  // Low frequencies map to low bin numbers
  assert(map[0] < map[numBars], 'first boundary < last boundary');
}

{
  // Different sample rate should produce proportionally different map
  const map44 = buildFreqBinMap(64, 2048, 44100);
  const map48 = buildFreqBinMap(64, 2048, 48000);
  // Higher sample rate → higher Nyquist → different bin mapping
  assert(
    JSON.stringify(map44) !== JSON.stringify(map48),
    'different sample rates produce different maps'
  );
}

// ── getBarAmplitude ───────────────────────────────────────────────────────────
console.log('\ngetBarAmplitude');

{
  const freq = new Uint8Array(1024);
  freq.fill(0);
  assert(getBarAmplitude(freq, 0, 10) === 0, 'all-zero data returns 0');
}
{
  const freq = new Uint8Array(1024);
  freq.fill(255);
  assert(getBarAmplitude(freq, 0, 10) === 1, 'all-max data returns 1');
}
{
  const freq = new Uint8Array(1024);
  freq[5] = 128;
  const amp = getBarAmplitude(freq, 5, 6); // single bin
  assert(Math.abs(amp - 128 / 255) < 0.001, 'single bin normalized correctly');
}
{
  const freq = new Uint8Array(1024);
  freq[0] = 0;
  freq[1] = 255;
  const amp = getBarAmplitude(freq, 0, 2);
  assert(Math.abs(amp - 0.5) < 0.005, 'average of two bins');
}
{
  // lo >= hi edge case
  const freq = new Uint8Array(1024);
  freq[3] = 100;
  const amp = getBarAmplitude(freq, 3, 3);
  assert(Math.abs(amp - 100 / 255) < 0.001, 'lo==hi returns that single bin');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
