"""Static file server that delays HTML and CSS responses, to imitate a real network.

Usage: python3 slow.py --dir DIST --port 8950 --delay-ms 60 [--css-delay-ms 300]
Document requests (paths ending in "/" or ".html") wait --delay-ms. Stylesheets wait
--css-delay-ms, which stretches the time before first paint on a cold load. Other assets
are served at once.
Binds to 127.0.0.1 only. Stop it with Ctrl-C or by killing its PID.
"""

import argparse
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def handler(delay: float, css_delay: float) -> type[SimpleHTTPRequestHandler]:
    class DelayedHtml(SimpleHTTPRequestHandler):
        def do_GET(self) -> None:
            path = self.path.split("?", 1)[0]
            if path.endswith(("/", ".html")):
                time.sleep(delay)
            elif path.endswith(".css"):
                time.sleep(css_delay)
            super().do_GET()

        def log_message(self, format: str, *args: object) -> None:
            pass

    return DelayedHtml


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dir", required=True, help="directory to serve, for example a built dist/ copy")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--delay-ms", type=float, default=0.0, help="delay for each HTML response")
    parser.add_argument("--css-delay-ms", type=float, default=0.0, help="delay for each CSS response")
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(handler(args.delay_ms / 1000, args.css_delay_ms / 1000), directory=args.dir))
    print(
        f"serving {args.dir} on http://127.0.0.1:{args.port}/ with {args.delay_ms:g} ms HTML"
        f" and {args.css_delay_ms:g} ms CSS delay",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
