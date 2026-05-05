# Grill Session: Audio FFT Visualizer with Waterfall

**Status:** complete
**Started:** 2026-05-05
**Completed:** 2026-05-05

## Summary

A single-page web app that plays a local audio file and renders a real-time FFT spectrum analyzer with a scrolling waterfall (spectrogram) display below it. Pure browser-side (Web Audio API + Canvas), no frameworks, no build step. Served by a minimal static file server (Python http.server is fine). The goal is visual entertainment, not scientific accuracy.

## Decisions

### Tech Stack
- **Status:** DECIDED
- **Decision:** Vanilla HTML/CSS/JS + Web Audio API + Canvas 2D. No frameworks, no build tools, no npm.
- **Rationale:** This is a single-page toy. Adding React or bundlers would be absurd. Web Audio API gives us AnalyserNode for free. Canvas 2D is plenty fast for this.
- **Date:** 2026-05-05

### Audio Source
- **Status:** DECIDED
- **Decision:** Audio files served statically from an `audio/` directory on the webserver. User picks from a list of available files (no upload, no streaming URLs).
- **Rationale:** Keeps it simple. Local files avoid CORS headaches. A dropdown or clickable list is enough UI.
- **Date:** 2026-05-05

### FFT Display (Top Panel)
- **Status:** DECIDED
- **Decision:** Classic bar-style spectrum analyzer. Logarithmic frequency scale (bass on left, treble on right). Bars colored with a gradient from green (low amplitude) through yellow to red/magenta (high amplitude). Smooth falloff animation (bars drop at a fixed rate, not instant).
- **Rationale:** Looks good, classic aesthetic. Log scale matches how humans perceive pitch. Gradient gives immediate visual feedback of energy distribution.
- **Date:** 2026-05-05

### FFT Size
- **Status:** DECIDED
- **Decision:** 2048 samples. Display ~128 bars (bin the 1024 frequency bins into ~128 visual bars on log scale).
- **Rationale:** 2048 gives good frequency resolution without noticeable latency. 128 bars looks dense enough to be interesting without being noisy.
- **Date:** 2026-05-05

### Waterfall Display (Bottom Panel)
- **Status:** DECIDED
- **Decision:** Scrolling spectrogram below the FFT bars. Time flows downward (newest at top, history scrolls down). Same frequency axis as the FFT (log scale, aligned). Color mapped from amplitude: dark blue/black (silence) → cyan → green → yellow → red → white (loudest). Fixed history depth of ~5 seconds visible.
- **Rationale:** Waterfall shows temporal patterns that the instantaneous FFT misses — you can see rhythmic patterns, melody lines, drops. Downward scroll is the standard convention. ~5s gives enough history to see musical phrases.
- **Date:** 2026-05-05

### Layout
- **Status:** DECIDED
- **Decision:** Full viewport. FFT bars take top 40% of screen height. Waterfall takes bottom 60%. No visible border between them — they share the frequency axis seamlessly. Dark background (#0a0a0a).
- **Rationale:** Maximize visual impact. The two displays reinforce each other. Dark background makes colors pop.
- **Date:** 2026-05-05

### Controls
- **Status:** DECIDED
- **Decision:** Minimal: file selector (dropdown of available tracks), play/pause button, volume slider. Semi-transparent overlay in top-left corner that fades out after 3 seconds of inactivity, reappears on mouse move.
- **Rationale:** Don't clutter the visualization. Auto-hide keeps the display clean during playback.
- **Date:** 2026-05-05

### Server
- **Status:** DECIDED
- **Decision:** Python `http.server` (or a 10-line Python script if we need the file listing endpoint). A single `serve.py` that lists audio files as JSON on `/api/tracks` and serves static files from the project root.
- **Rationale:** Zero dependencies. Everyone has Python. The only dynamic endpoint is listing the audio directory.
- **Date:** 2026-05-05

### Audio Format Support
- **Status:** DECIDED
- **Decision:** Whatever the browser supports natively — MP3, WAV, OGG, FLAC. No transcoding. Just serve the file and let the browser decode.
- **Rationale:** Web Audio API handles decoding. We don't need to care about formats beyond letting the `<audio>` element play them.
- **Date:** 2026-05-05

### Responsiveness / Resize
- **Status:** DECIDED
- **Decision:** Canvas resizes with viewport (listen to resize event, update canvas dimensions). No mobile-specific layout — this is a desktop toy.
- **Rationale:** Resize handling is trivial and prevents the canvas from looking blurry or clipped.
- **Date:** 2026-05-05

### Performance Target
- **Status:** DECIDED
- **Decision:** Solid 60fps on any modern desktop browser. Use requestAnimationFrame. If dropped frames detected, reduce bar count rather than skip frames.
- **Rationale:** Smooth animation is the whole point. Adaptive quality is better than stuttering.
- **Date:** 2026-05-05

## Deferred Items

### Multiple Visualization Modes
- **Status:** DEFERRED
- **Risk:** Low. Current scope is one mode (bars + waterfall). Could add circular, waveform, or 3D later. Not needed for v1.
- **Open question:** If we add modes later, do we want a mode switcher? Probably keyboard shortcut.

### Fullscreen API
- **Status:** DEFERRED
- **Risk:** Low. Nice to have, easy to add later. Double-click to toggle would be intuitive.
