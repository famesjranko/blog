"""Serve dist/ the way GitHub Pages does: unknown paths get 404.html with a 404 status.

Usage: python3 scripts/preview-server.py PORT [BIND]
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DIST = Path(__file__).resolve().parent.parent / "dist"


class PagesHandler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        not_found = DIST / "404.html"
        if code != 404 or not not_found.is_file():
            return super().send_error(code, message, explain)
        body = not_found.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


def main() -> None:
    port = int(sys.argv[1])
    bind = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1"
    handler = partial(PagesHandler, directory=str(DIST))
    ThreadingHTTPServer((bind, port), handler).serve_forever()


if __name__ == "__main__":
    main()
