---
title: "Connect-4 web"
description: "The Connect-4 Lisp heuristic rebuilt as a containerised, horizontally-scalable web service."
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

A web front end and HTTP API around the [Connect-4 heuristic](/projects/connect4-heuristic/). The original game was a terminal toy — load three files, type `(play)`, play in a REPL. This rebuild asks what it takes to put the same AI on the open internet: containerised service, horizontal-scaling story, abuse protection, and a polished UI. The heuristic's ideas are preserved, re-implemented on optimised data structures.

The AI engine was reworked for server use. The board moved from nested lists to a 7×6 array with constant-time access; win detection, move generation, and scoring were rewritten against it. Zobrist hashing with a transposition table caches evaluated positions across the search, and the root search parallelises across a worker pool. Search depth is adjustable per request, from fast-and-casual to slow-and-brutal.

Game state lives server-side in Redis rather than trusting the client: each browser session holds only a token while the board lives in a capped pool of game slots, allocated atomically with expiry for abandoned games and rate limiting per client. Five REST endpoints cover new games, moves, resignation, board evaluation, and health checks.

The frontend is framework-free HTML, CSS, and JavaScript with eight visual themes sharing one game module, full keyboard play, and a debug overlay showing the AI's per-column scores.

A working containerised service and public repo — a portfolio piece. The value is the implementation: a 2018 heuristic, unchanged in spirit, serving moves over HTTP.
