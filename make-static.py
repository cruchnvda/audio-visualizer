#!/usr/bin/env python3
"""Convert audio-visualizer to static-only (no server needed).
Replaces /api/tracks fetch with a hardcoded track list and adds drag-drop support."""

import os
import json

AUDIO_DIR = '/home/horde/.openclaw/workspace/audio-visualizer/audio'
AUDIO_EXTS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}

tracks = sorted(f for f in os.listdir(AUDIO_DIR) 
                if os.path.splitext(f)[1].lower() in AUDIO_EXTS)

print(f"Found tracks: {tracks}")

# Read app.js and patch the fetch call
app_js = open('/home/horde/.openclaw/workspace/audio-visualizer/app.js').read()

# Find and replace the fetch('/api/tracks') section
# Add a static fallback + drag-drop support
