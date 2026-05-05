#!/usr/bin/env python3
"""Tests for serve.py list_tracks() and /api/tracks HTTP endpoint."""

import importlib
import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

# Make sure we import serve from the same directory as this script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import serve


class TestListTracks(unittest.TestCase):
    def _with_dir(self, d):
        """Context manager helper: patch AUDIO_DIR for the duration of a test."""
        return patch.object(serve, 'AUDIO_DIR', d)

    def test_empty_dir(self):
        with tempfile.TemporaryDirectory() as d:
            with self._with_dir(d):
                self.assertEqual(serve.list_tracks(), [])

    def test_audio_extensions_accepted(self):
        with tempfile.TemporaryDirectory() as d:
            for name in ['song.mp3', 'track.wav', 'beat.ogg', 'loop.flac',
                         'clip.aac', 'mix.m4a']:
                open(os.path.join(d, name), 'w').close()
            with self._with_dir(d):
                tracks = serve.list_tracks()
            for name in ['song.mp3', 'track.wav', 'beat.ogg', 'loop.flac',
                         'clip.aac', 'mix.m4a']:
                self.assertIn(name, tracks)

    def test_non_audio_files_excluded(self):
        with tempfile.TemporaryDirectory() as d:
            for name in ['readme.txt', 'image.png', 'notes.md', '.gitkeep']:
                open(os.path.join(d, name), 'w').close()
            with self._with_dir(d):
                tracks = serve.list_tracks()
            self.assertEqual(tracks, [])

    def test_mixed_files(self):
        with tempfile.TemporaryDirectory() as d:
            for name in ['song.mp3', 'readme.txt', 'beat.wav']:
                open(os.path.join(d, name), 'w').close()
            with self._with_dir(d):
                tracks = serve.list_tracks()
            self.assertIn('song.mp3', tracks)
            self.assertIn('beat.wav', tracks)
            self.assertNotIn('readme.txt', tracks)

    def test_sorted_output(self):
        with tempfile.TemporaryDirectory() as d:
            for name in ['c.mp3', 'a.wav', 'b.ogg']:
                open(os.path.join(d, name), 'w').close()
            with self._with_dir(d):
                tracks = serve.list_tracks()
            self.assertEqual(tracks, sorted(tracks))

    def test_nonexistent_dir_returns_empty(self):
        with patch.object(serve, 'AUDIO_DIR', '/nonexistent/path/__xyz__'):
            self.assertEqual(serve.list_tracks(), [])

    def test_case_insensitive_extensions(self):
        with tempfile.TemporaryDirectory() as d:
            for name in ['UPPER.MP3', 'mixed.Wav']:
                open(os.path.join(d, name), 'w').close()
            with self._with_dir(d):
                tracks = serve.list_tracks()
            self.assertIn('UPPER.MP3', tracks)
            self.assertIn('mixed.Wav', tracks)


class TestApiTracksEndpoint(unittest.TestCase):
    """Integration test: verify the HTTP handler returns valid JSON."""

    def _make_request(self, path, audio_files=None):
        """Simulate a GET request by calling do_GET via a mock socket."""
        from http.server import BaseHTTPRequestHandler
        from io import BytesIO

        output = BytesIO()

        class FakeSocket:
            def makefile(self, mode):
                request = f'GET {path} HTTP/1.1\r\nHost: localhost\r\n\r\n'
                return io.BytesIO(request.encode())

        class FakeWFile:
            def __init__(self):
                self._buf = BytesIO()
            def write(self, data):
                self._buf.write(data)
            def flush(self):
                pass

        with tempfile.TemporaryDirectory() as d:
            if audio_files:
                for name in audio_files:
                    open(os.path.join(d, name), 'w').close()
            with patch.object(serve, 'AUDIO_DIR', d):
                # Build a minimal handler without actually binding a socket
                handler = serve.Handler.__new__(serve.Handler)
                handler.path = path
                handler.headers = {}
                handler.wfile = FakeWFile()
                handler.rfile = io.BytesIO()
                buf = BytesIO()

                def send_response(code):
                    handler._response_code = code
                def send_header(k, v):
                    pass
                def end_headers():
                    pass

                handler.send_response = send_response
                handler.send_header = send_header
                handler.end_headers = end_headers
                handler._response_code = None

                handler.do_GET()
                return handler._response_code, handler.wfile._buf.getvalue()

    def test_api_tracks_returns_200_and_json(self):
        code, body = self._make_request('/api/tracks', ['a.mp3', 'b.wav'])
        self.assertEqual(code, 200)
        parsed = json.loads(body.decode())
        self.assertIsInstance(parsed, list)
        self.assertIn('a.mp3', parsed)
        self.assertIn('b.wav', parsed)

    def test_api_tracks_empty(self):
        code, body = self._make_request('/api/tracks', [])
        self.assertEqual(code, 200)
        self.assertEqual(json.loads(body.decode()), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
