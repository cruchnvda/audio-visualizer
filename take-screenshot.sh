#!/bin/bash
cd /home/horde/.openclaw/workspace/audio-visualizer
python3 serve.py &
SERVER_PID=$!
sleep 2

google-chrome --headless --no-sandbox --disable-gpu --screenshot=/home/horde/.openclaw/workspace/audio-visualizer/screenshot.png --window-size=1280,800 http://localhost:8000 2>/dev/null

kill $SERVER_PID 2>/dev/null
echo "Done: screenshot.png"
ls -la /home/horde/.openclaw/workspace/audio-visualizer/screenshot.png
