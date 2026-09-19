---
title: "Connect-4 web"
description: "The Connect-4 Lisp heuristic rebuilt as a containerised web service with a browser UI."
date: 2026-03-15
draft: false
featured: true
origin: personal
predecessor: connect4-heuristic
repo: https://github.com/famesjranko/Connect4-Lisp-Web
stack:
  - common-lisp
  - sbcl
  - hunchentoot
  - redis
  - docker
  - javascript
---

A web interface around the [Connect-4 heuristic](/projects/connect4-heuristic/). The original game is a terminal toy: load three files, type `(play)`, play in a REPL. This rebuild puts the same AI behind an SBCL + Hunchentoot HTTP API with a vanilla-JS browser frontend, keeping the heuristic's ideas while reworking the engine for server use.

The AI engine was reworked for performance. The board moved from nested lists to an array with constant-time access, with win detection, move generation, and scoring rewritten against it. A Zobrist-hashed transposition table caches evaluated positions, and the root search parallelises across a worker pool. Search depth is adjustable per request, from fast-and-casual up to depth 7–8.

Game state lives server-side in Redis rather than trusting the client: each browser session holds only a token while the board lives in a capped pool of game slots, allocated atomically via a Lua script with heartbeat and inactivity expiry, plus per-client rate limiting. Five endpoints cover new games, moves, resignation, board evaluation, and health checks.

The frontend is framework-free HTML, CSS, and JavaScript with eight visual themes sharing one game module, full keyboard play, and a debug overlay showing the AI's per-column scores.
