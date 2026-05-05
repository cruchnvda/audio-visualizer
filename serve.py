#!/usr/bin/env python3
"""Minimal static file server with /api/tracks endpoint."""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
AUDIO_EXTS = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}


def list_tracks():
    """Return sorted list of audio filenames from the audio/ directory."""
    if not os.path.isdir(AUDIO_DIR):
        return []
    tracks = []
    for name in sorted(os.listdir(AUDIO_DIR)):
        if os.path.splitext(name)[1].lower() in AUDIO_EXTS:
            tracks.append(name)
    return tracks


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path == '/api/tracks':
            body = json.dumps(list_tracks()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def log_message(self, fmt, *args):
        pass  # Suppress per-request logs; startup message is enough


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    server = HTTPServer(('', port), Handler)
    print(f'Serving on http://localhost:{port}')
    server.serve_forever()
