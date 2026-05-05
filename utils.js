/* Pure utility functions — browser globals and Node.js require()-compatible. */
(function (exports) {
  'use strict';

  const MIN_FREQ = 20;

  /**
   * Build a lookup table mapping bar index → [loFreqBin, hiFreqBin).
   * Returns an array of (numBars + 1) bin indices.
   */
  function buildFreqBinMap(numBars, fftSize, sampleRate) {
    const nyquist = sampleRate / 2;
    const maxBin = fftSize / 2 - 1;
    const map = new Array(numBars + 1);
    for (let i = 0; i <= numBars; i++) {
      const freq = MIN_FREQ * Math.pow(nyquist / MIN_FREQ, i / numBars);
      map[i] = Math.min(maxBin, Math.round(freq * fftSize / sampleRate));
    }
    return map;
  }

  /**
   * Average the frequency bin magnitudes in [lo, hi) and normalize to [0, 1].
   * freqData is a Uint8Array from AnalyserNode.getByteFrequencyData.
   */
  function getBarAmplitude(freqData, lo, hi) {
    if (lo >= hi) return freqData[lo] / 255;
    let sum = 0;
    for (let i = lo; i < hi; i++) sum += freqData[i];
    return sum / (hi - lo) / 255;
  }

  /** Linear interpolation between two RGB triples. */
  function lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
  }

  /** Map amplitude [0,1] to an RGB triple for FFT bars (green→yellow→red→magenta). */
  function barColorRgb(amp) {
    const stops = [
      [0, 180, 0],
      [220, 220, 0],
      [255, 100, 0],
      [255, 0, 0],
      [255, 0, 255],
    ];
    const t = Math.max(0, Math.min(1, amp)) * (stops.length - 1);
    const idx = Math.min(Math.floor(t), stops.length - 2);
    return lerpColor(stops[idx], stops[idx + 1], t - idx);
  }

  /** Map amplitude [0,1] to a CSS color string for FFT bars. */
  function barColor(amp) {
    const [r, g, b] = barColorRgb(amp);
    return `rgb(${r},${g},${b})`;
  }

  /** Map amplitude [0,1] to an RGB triple for the waterfall spectrogram. */
  function waterfallColor(amp) {
    const stops = [
      [10, 10, 10],
      [0, 0, 180],
      [0, 220, 255],
      [0, 200, 0],
      [220, 220, 0],
      [255, 0, 0],
      [255, 255, 255],
    ];
    const t = Math.max(0, Math.min(1, amp)) * (stops.length - 1);
    const idx = Math.min(Math.floor(t), stops.length - 2);
    return lerpColor(stops[idx], stops[idx + 1], t - idx);
  }

  exports.MIN_FREQ = MIN_FREQ;
  exports.buildFreqBinMap = buildFreqBinMap;
  exports.getBarAmplitude = getBarAmplitude;
  exports.lerpColor = lerpColor;
  exports.barColorRgb = barColorRgb;
  exports.barColor = barColor;
  exports.waterfallColor = waterfallColor;

// UMD shim: Node.js module or browser global
})(typeof module !== 'undefined' ? module.exports : (this.VisualizerUtils = {}));
