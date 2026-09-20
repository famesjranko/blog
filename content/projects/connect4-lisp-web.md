---
title: "A Connect-4 Web Interface in Common Lisp"
description: "My university Connect-4 heuristic taken out of the REPL and put behind a Common Lisp web service, with a per-column view of its scores."
date: 2026-03-15
draft: false
featured: true
origin: personal
predecessor: connect4-heuristic
repo: https://github.com/famesjranko/Connect4-Lisp-Web
cover: /img/projects/connect4-lisp-web/connect4-debug-scores.jpg
coverAlt: "Connect-4 board mid-game with the debug panel showing a score for each column"
stack:
  - common-lisp
  - sbcl
  - hunchentoot
  - redis
  - docker
  - javascript
---

In 2018 I wrote a [heuristic evaluation function for Connect-4](/projects/connect4-heuristic/) in Common Lisp for an Artificial Intelligence subject at university. It only ran in a REPL: load three source files, call `play`, type a column number at each prompt. I was proud of it and wanted something more user friendly than a terminal, and I wanted the technical challenge of doing that with Lisp tooling rather than porting the game to something else. So the server is SBCL running Hunchentoot, state is kept in Redis through cl-redis, and the search is parallelised with lparallel. The heuristic is the 2018 file.

## What stayed the same

`heuristic.lisp` still carries its September 2018 header. The line values are unchanged, 97 for a playable three, 9 for a three that needs a future position, 3 for a playable two; so are the strategy maps and the defensive weight of `1.91000008`. The only edit is that the board is now read with `aref` on an array instead of nested list access.

## Playing it

The interface is HTML, CSS and JavaScript with no framework. The game logic is one `game-client.js` file and eight theme pages wrap different layouts around it. You can play with mouse or keyboard, set the depth from one to eight, and choose who moves first. The four winning positions are highlighted when a game ends.

The part I find most satisfying is the debug view. For every move the server searches each of the seven columns separately at the game's depth and returns a score per column. At depth one these are exactly what the 2018 `heuristic` function returns for that move. The panel shows the seven scores, marks the column the AI chose, and flags whether the move came from an immediate win or block rather than the search. Being able to see the heuristic value of each available move while playing is what I wanted from this; it is also how you notice when the AI prefers a move you would not have.

![Mid-game with the debug panel open](/img/projects/connect4-lisp-web/connect4-debug-scores.jpg "The debug panel showing a score for each column and the move the AI chose.")

## Handling a move

Each browser gets a token when it starts a game. The board, turn, status, search depth and move count are stored in Redis against that token. On a move, the browser sends its token and a column; the server loads the game, checks the move is legal, applies it, runs the AI, saves the new state and returns the board with the AI's reply.

I chose this over letting the browser hold the board because minimax is expensive at depth. If the client supplied the position, anyone could post arbitrary boards and request searches for as long as they liked. With the server owning the board, a search can only run on the board of a game that already exists. There is also a cap on games open at once. A Lua script inside Redis clears expired tokens, checks the count against the cap and claims a slot as one atomic operation. Open tabs send a heartbeat every thirty seconds to renew the key's expiry; the browser enforces a thirty minute inactivity timeout and, on tab close, uses `sendBeacon` to give the slot back. Requests are rate limited per IP.

## Updating the search

The board moved from nested lists to a 7 × 6 array, and the move, win-detection and evaluation functions were rewritten against it.

I added a transposition table to the minimax. The same board can be reached by different move orders, and without a table the search evaluates it each time. Each board has a Zobrist hash and its result is kept in a fixed-size table, reused if the position turns up again at a sufficient depth. The table is bound per request, and per worker thread in the parallel search, so nothing is shared between games.

For depth four and above the root moves are searched through a worker pool. The centre column is searched first on its own to set an alpha-beta bound; the remaining columns are searched in parallel against it. Below depth four the sequential search is used as is. Before choosing a move, the server checks for an immediate win and an immediate block, and plays it if found.

## Running it

The application runs in an SBCL container as a non-root user, with Redis as a second service under Docker Compose. Depth, worker count, the game cap, the timeouts and the rate limit are environment variables, so `docker compose up` is enough to play it.

Lastly, the heuristic did not get any better here, and I did not set out to make it better. What I have now is a game I can hand to someone as a link, with the numbers behind each of its moves on screen while they play.

[View Connect4-Lisp-Web on GitHub →](https://github.com/famesjranko/Connect4-Lisp-Web)
