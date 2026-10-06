---
title: "A Connect-4 Web Interface in Common Lisp"
description: "My university Connect-4 heuristic taken out of the REPL and put behind a Common Lisp web service, with a per-column view of its scores."
date: 2026-03-15
draft: false
featured: true
origin: personal
predecessor: connect4-heuristic
repo: https://github.com/famesjranko/Connect4-Lisp-Web
cover: /img/projects/connect4-lisp-web/cover.jpg
coverAlt: "Connect-4 running on an Amiga-style computer with a joystick beside it"
stack:
  - common-lisp
  - sbcl
  - hunchentoot
  - redis
  - docker
  - javascript
---

![Connect-4 on a retro home computer](/img/projects/connect4-lisp-web/cover.jpg)

In 2018 I wrote a [heuristic evaluation function for Connect-4](/projects/connect4-heuristic/) in Common Lisp for an Artificial Intelligence subject at university. It only ran in a REPL: load three source files, call `play`, type a column number at each prompt. I was proud of it and wanted something friendlier than a terminal. I also wanted the technical challenge of doing that with Lisp tooling, rather than porting the game to another language. To this end, the server is SBCL running Hunchentoot, state is kept in Redis through cl-redis, and the search is parallelised with lparallel.

## Playing it

The interface is HTML, CSS and JavaScript with no framework. The game logic is one `game-client.js` file and eight theme pages wrap different layouts around it. You can play with mouse or keyboard and choose who moves first. The interface offers search depths from one to eight. However, the server caps the depth at six unless `LISP_AI_MAX_DEPTH` raises it. When a game ends, the four winning discs are highlighted.

The part I find most satisfying is the debug view. For every move the server searches each of the seven columns separately at the game's depth and returns a score per column. At depth one these are the values the 2018 search compared when it chose a move. The panel shows the seven scores, marks the column the AI chose, and flags whether the move came from an immediate win or block rather than the search. Being able to see the heuristic value of each available move while playing is what I wanted from this; it is also how you notice when the AI prefers a move you would not have.

![Mid-game with the debug panel open](/img/projects/connect4-lisp-web/connect4-debug-scores.jpg "The debug panel showing a score for each column and the move the AI chose.")

## Handling a move

Each browser gets a token when it starts a game. The board, turn, status, search depth and move count are stored in Redis against that token. On a move, the browser sends its token and a column; the server loads the game, checks the move is legal, applies it, runs the AI, saves the new state and returns the board with the AI's reply.

I chose this over letting the browser hold the board because minimax is expensive at depth. If the client supplied the position, anyone could post arbitrary boards and request searches for as long as they liked. With the server owning the board, a search can only run on the board of a game that already exists. There is also a cap on games open at once. A Lua script inside Redis clears expired tokens, checks the count against the cap and claims a slot as one atomic operation. Open tabs send a heartbeat every thirty seconds to renew the key's expiry; the browser enforces a thirty-minute inactivity timeout and, on tab close, uses `sendBeacon` to give the slot back. Requests are rate limited per IP.

## Porting the heuristic

The 2018 board was a list of seven column lists, and the heuristic read it with `nth`. I changed it to a 7 × 6 array and rewrote the move, win-detection and evaluation functions against it. The heuristic now reads cells with `aref`, sums with loops in place of `mapcar` and a recursive `sum`, and calculates the playable positions once per evaluation; the 2018 version recalculated them for every line it scored.

The scoring itself is unchanged. A three whose open cell can be played next is worth 97, a three that needs a later move is worth 9, and a playable two is worth 3. The strategy maps and the defensive weight of `1.91000008` are as they were, and `heuristic.lisp` still carries its September 2018 header.

## Updating the search

I added a transposition table to the minimax. The same board can be reached by different move orders, and without a table the search evaluates it each time. Each board has a Zobrist hash and its result is kept in a fixed-size table, reused if the position turns up again at a sufficient depth. The table is bound per request, and per worker thread in the parallel search, so nothing is shared between games.

Before any search, the server checks for an immediate win and then an immediate block, and plays either if found. Otherwise, at depth four and above, the root moves go through a worker pool. The centre column is searched first on its own to set an alpha-beta bound; the remaining columns are then searched in parallel against it. Below depth four the sequential search is used as is.

## Running it

The application runs in an SBCL container as a non-root user, with Redis as a second service under Docker Compose. Depth, worker count, the game cap, the timeouts and the rate limit are environment variables, so `docker compose up` is enough to play it.

Lastly, the heuristic did not get any better here, and I did not set out to make it better. What I have now is a game someone can run from the linked repository, with the numbers behind each of its moves on screen while they play.

[View Connect4-Lisp-Web on GitHub →](https://github.com/famesjranko/Connect4-Lisp-Web)
