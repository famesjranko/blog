#!/usr/bin/env python3
"""Draw the MediaStack wiring figure as an SVG from a character grid.

The drawing is composed on a text grid with box-drawing characters, then
rendered so that every box character becomes a line segment and every word
a text run pinned to its cells. Fonts cannot break the boxes, and the
figure follows the site's diagram contract: no colours here, only classes
that styles/terminal-diagram.css paints from the site tokens.

Usage:
    python3 scripts/figures/mediastack-stack.py > static/img/projects/mediastack/stack.svg

Facts come from MediaStack's docs/design/architecture.md (the network
drawing and its port table) and docker-compose.yml.
"""

import html
import re

CELL_W, CELL_H = 8, 18  # SVG units per character cell; text is 13px mono

SEGMENTS = {  # which half-edges of the cell each box character covers
    "─": "lr", "│": "ud", "┌": "rd", "┐": "ld", "└": "ru", "┘": "lu",
    "┬": "lrd", "┴": "lru", "├": "rud", "┤": "lud", "┼": "lrud",
}
DOUBLE = {"═": "lr", "╪": "lr+ud"}
ARROWS = {"▼": "d", "▲": "u", "◄": "l", "►": "r"}

# Text classes, painted by the stylesheet. Later patterns do not override
# an earlier match except "muted", which only fills unclaimed cells.
PAINT = [
    (r"THE INTERNET|DEBIAN HOST|ONE FILESYSTEM|HOME LAN|YOUR ROUTER|"
     r"DOCKER-USER chain|docker bridge|never from the internet", "heading"),
    (r"80 · 443|:80 :443|6881 peers|:6881|51820/udp|:51820/udp", "ok"),
    (r"never forwarded:|81 · 3001 · 8000|51821, and every|other admin port|"
     r"No chain, no Docker\.", "no"),
    (r"(?<![\w\"]):\d{2,5}(?!\w)", "muted"),
]

TITLE = "How MediaStack is wired, from the internet to the filesystem"
DESC = (
    "The internet reaches the router, which forwards only ports 80 and 443 to "
    "the reverse proxy, 6881 to qBittorrent peers and 51820 UDP to WireGuard; "
    "every admin port stays unforwarded. On the Debian host a DOCKER-USER chain "
    "lets the forwarded ports through, lets only LAN, loopback and Tailscale "
    "addresses reach the admin ports, and drops every other source; fail2ban "
    "adds a ban to the same chain after repeated failed logins to the published "
    "pages; without the chain Docker does not start. Home LAN devices reach "
    "every port. On the Docker bridge the proxy publishes Jellyfin and Seerr, "
    "and WireGuard gives each device one tier: the whole LAN, the server, the "
    "containers, Jellyfin only, or Jellyfin and Seerr. Sonarr, Radarr, Jackett, "
    "FlareSolverr, Bazarr, the qBittorrent UI, Portainer, Homepage, Uptime Kuma, "
    "Beszel and the proxy and VPN admin pages are never reachable from the "
    "internet: only from the LAN, or from VPN devices on the LAN, server or "
    "containers tier. Downloads and media share one filesystem, so a finished "
    "download is hardlinked into the library."
)


class Canvas:
    def __init__(self, width, height):
        self.width, self.height = width, height
        self.grid = [[" "] * width for _ in range(height)]

    def put(self, x, y, text):
        for i, ch in enumerate(text):
            if 0 <= x + i < self.width and 0 <= y < self.height:
                self.grid[y][x + i] = ch

    def box(self, x, y, w, h, lines=(), align="c"):
        self.put(x, y, "┌" + "─" * (w - 2) + "┐")
        self.put(x, y + h - 1, "└" + "─" * (w - 2) + "┘")
        for r in range(1, h - 1):
            self.put(x, y + r, "│")
            self.put(x + w - 1, y + r, "│")
        for i, line in enumerate(lines):
            left = x + (w - len(line)) // 2 if align == "c" else x + 2
            self.put(left, y + 1 + i, line)

    def vline(self, x, y1, y2):
        for y in range(y1, y2 + 1):
            self.put(x, y, "│")

    def hline(self, y, x1, x2):
        for x in range(x1, x2 + 1):
            self.put(x, y, "─")

    def lines(self):
        rows = [("".join(row)).rstrip() for row in self.grid]
        while rows and not rows[-1]:
            rows.pop()
        return rows


def draw():
    c = Canvas(78, 46)
    L, M, R = 17, 33, 49  # the three forwarded paths, by column
    c.put(29, 0, "THE INTERNET")
    c.put(34, 1, "│")
    c.box(22, 2, 25, 5, ["YOUR ROUTER", "forwards four ports", "nothing else"])
    c.put(25, 6, "┬"); c.put(M, 6, "┬"); c.put(45, 6, "┬")
    c.vline(M, 7, 10)
    c.put(25, 7, "│"); c.put(45, 7, "│")
    c.put(L, 8, "┌"); c.hline(8, L + 1, 24); c.put(25, 8, "┘")
    c.put(45, 8, "└"); c.hline(8, 46, R - 1); c.put(R, 8, "┐")
    c.vline(L, 9, 10); c.vline(R, 9, 10)
    c.put(L - 10, 9, "80 · 443"); c.put(M + 2, 9, "6881 peers"); c.put(R + 2, 9, "51820/udp")
    c.put(L - 7, 10, "https"); c.put(R + 2, 10, "wireguard")
    c.put(55, 2, "never forwarded:"); c.put(55, 3, "81 · 3001 · 8000")
    c.put(55, 4, "51821, and every"); c.put(55, 5, "other admin port")
    c.put(0, 11, "═" * 78); c.put(2, 11, " DEBIAN HOST ")
    for x in (L, M, R):
        c.put(x, 11, "╪"); c.put(x, 12, "│")
    c.box(3, 13, 53, 7, [
        "DOCKER-USER chain",
        "forwarded ports pass through; admin ports answer",
        "LAN, loopback and Tailscale only; others dropped.",
        "fail2ban bans an address here after repeated",
        "failed logins. No chain, no Docker.",
    ], align="l")
    for x in (L, M, R):
        c.put(x, 13, "┴"); c.put(x, 19, "┬")
    c.box(58, 13, 18, 7, ["HOME LAN", "phones, TVs,", "laptops reach", "every port", "(host bindings)"])
    c.put(66, 19, "┬")
    Y = 20
    c.put(0, Y, "─" * 78); c.put(2, Y, " docker bridge ")
    for x in (L, M, R, 66):
        c.put(x, Y, "┼"); c.put(x, Y + 1, "▼")
    c.box(L - 7, Y + 2, 15, 4, ["proxy", ":80 :443"])
    c.box(M - 7, Y + 2, 15, 4, ["qbittorrent", ":6881"])
    c.box(R - 7, Y + 2, 15, 4, ["wireguard", ":51820/udp"])
    c.put(60, Y + 3, "every service"); c.put(60, Y + 4, "by host port")
    c.put(L, Y + 6, "│"); c.put(L + 2, Y + 6, "publishes")
    c.put(L, Y + 7, "├"); c.hline(Y + 7, L + 1, L + 12); c.put(L + 13, Y + 7, "┐")
    c.put(L, Y + 8, "▼"); c.put(L + 13, Y + 8, "▼")
    c.box(L - 6, Y + 9, 13, 4, ["jellyfin", ":8096"])
    c.box(L + 8, Y + 9, 11, 4, ["seerr", ":5055"])
    c.put(R, Y + 6, "│"); c.put(R + 2, Y + 6, "one tier per device")
    c.put(R, Y + 7, "▼")
    c.box(R - 9, Y + 8, 30, 5, ["whole LAN · the server ·", "the containers · jellyfin ·", "jellyfin + seerr"])
    c.put(0, Y + 14, "─" * 78); c.put(2, Y + 14, " never from the internet ")
    c.put(2, Y + 15, "the LAN, and VPN devices on the LAN, server or containers tier")
    c.put(2, Y + 17, "sonarr :8989   radarr :7878   jackett :9117   flaresolverr :8191")
    c.put(2, Y + 18, "bazarr :6767   qbittorrent ui :8080   portainer :9000   homepage :3000")
    c.put(2, Y + 19, "uptime-kuma :3001   beszel :8090   proxy admin :81   vpn admin :51821")
    c.put(0, Y + 21, "═" * 78); c.put(2, Y + 21, " ONE FILESYSTEM ")
    c.put(2, Y + 23, "media/{tv,movies}  ◄── hardlinked: one file on disk ──  torrents/{tv,movies}")
    c.put(2, Y + 24, "jellyfin plays it        sonarr · radarr file it       qbittorrent writes it")
    return c.lines()


def classes_for(line):
    classes = ["label"] * len(line)
    for pattern, name in PAINT:
        for m in re.finditer(pattern, line):
            for i in range(m.start(), m.end()):
                if classes[i] == "label" or name != "muted":
                    classes[i] = name
    return classes


def merge(segments):
    """Join touching collinear segments so each box edge is one line."""
    def join(items, fixed, lo, hi):
        out = []
        for seg in sorted(items, key=lambda s: (s[fixed], s[lo])):
            if out and out[-1][fixed] == seg[fixed] and out[-1][hi] == seg[lo]:
                last = list(out[-1]); last[hi] = seg[hi]; out[-1] = tuple(last)
            else:
                out.append(seg)
        return out
    horizontal = [s for s in segments if s[1] == s[3]]
    vertical = [s for s in segments if s[0] == s[2]]
    return join(horizontal, 1, 0, 2) + join(vertical, 0, 1, 3)


def path(segments):
    return " ".join(f"M{a:g} {b:g} L{c:g} {d:g}" for a, b, c, d in merge(segments))


def render(lines):
    cols = max(len(line) for line in lines)
    width, height = cols * CELL_W, len(lines) * CELL_H
    single, double, arrows, texts = [], [], [], []

    def flush(run, row):
        if run is None or not run["s"].strip():
            return
        s = run["s"]
        lead = len(s) - len(s.lstrip())
        body = s.rstrip()[lead:]
        x = (run["c"] + lead) * CELL_W
        y = row * CELL_H + CELL_H * 0.72
        texts.append(
            f'<text x="{x}" y="{y:.1f}" textLength="{len(body) * CELL_W}" '
            f'lengthAdjust="spacingAndGlyphs" class="{run["k"]}">{html.escape(body)}</text>'
        )

    for row, line in enumerate(lines):
        classes = classes_for(line)
        cy, y0, y1 = row * CELL_H + CELL_H / 2, row * CELL_H, (row + 1) * CELL_H
        run = None
        for col, ch in enumerate(line):
            cx, x0, x1 = col * CELL_W + CELL_W / 2, col * CELL_W, (col + 1) * CELL_W
            if ch in SEGMENTS or ch in DOUBLE or ch in ARROWS:
                flush(run, row); run = None
                if ch in SEGMENTS:
                    edges = SEGMENTS[ch]
                    if "l" in edges: single.append((x0, cy, cx, cy))
                    if "r" in edges: single.append((cx, cy, x1, cy))
                    if "u" in edges: single.append((cx, y0, cx, cy))
                    if "d" in edges: single.append((cx, cy, cx, y1))
                elif ch in DOUBLE:
                    double.append((x0, cy - 2, x1, cy - 2))
                    double.append((x0, cy + 2, x1, cy + 2))
                    if "ud" in DOUBLE[ch]:
                        single.append((cx, y0, cx, y1))
                else:
                    w, h = CELL_W * 0.45, CELL_H * 0.3
                    points = {
                        "d": f"{cx - w},{cy - h} {cx + w},{cy - h} {cx},{cy + h}",
                        "u": f"{cx - w},{cy + h} {cx + w},{cy + h} {cx},{cy - h}",
                        "l": f"{cx + w},{cy - h} {cx + w},{cy + h} {cx - w},{cy}",
                        "r": f"{cx - w},{cy - h} {cx - w},{cy + h} {cx + w},{cy}",
                    }[ARROWS[ch]]
                    arrows.append(f'<polygon class="arrow" points="{points}"/>')
                continue
            # Two spaces end a run, so columns of words stay separate runs.
            if run and ch == " " and run["s"].endswith(" "):
                flush(run, row); run = None
                continue
            if run and run["k"] == classes[col]:
                run["s"] += ch
            else:
                flush(run, row)
                run = {"c": col, "k": classes[col], "s": ch}
        flush(run, row)

    body = [f'<path class="rule" d="{path(single)}"/>', f'<path class="rule" d="{path(double)}"/>']
    body += arrows + texts
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" class="diagram diagram-terminal" '
        f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="stack-title stack-desc">\n'
        f"<title id=\"stack-title\">{html.escape(TITLE)}</title>\n"
        f"<desc id=\"stack-desc\">{html.escape(DESC)}</desc>\n" + "\n".join(body) + "\n</svg>\n"
    )


if __name__ == "__main__":
    print(render(draw()), end="")
