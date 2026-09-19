---
title: "Connect-4 heuristic"
description: "A custom Common Lisp evaluation function for Connect-4 over a minimax search with alpha-beta pruning."
date: 2018-10-15
draft: false
origin: university
repo: https://github.com/famesjranko/Connect4-Heuristic-Player
stack:
  - common-lisp
  - minimax
  - alpha-beta-pruning
---

A heuristic for the game Connect-4, written in Common Lisp on top of a textbook minimax search with alpha-beta pruning. The search harness was provided; the evaluation function, strategy maps, threat detection, and tuning are the work.

The heuristic layers three ideas. First, a positional evaluation scores each of the 69 possible four-in-a-row lines by occupancy: an immediately playable three-in-a-row scores highest, with smaller weights for latent threats and for two- and one-piece lines at playable cells, and zero for blocked lines. Second, a strategy value map weights board positions, centre-high with fall-off outward, with two diagonal-pattern alternates that switch in when the board's diagonal occupancy crosses a threshold. Third, an imminent-threat detector distinguishes threats playable right now from ones needing intermediate pieces, so the two are weighted differently.

The evaluation is biased slightly toward defence over attack. The tuning method was empirical: start with a defensive weight that clearly over-defends at search depth 1, reduce it incrementally until the engine stops defending, then keep the value just above that point.

Tested over two games at each of search depths 1 through 4, playing first each time, the heuristic won every game — including at depth 1, where only the evaluation function has any say over the immediate moves. That depth-1 result is the load-bearing evidence: the heuristic itself plays well, rather than the search carrying it.

Years later this heuristic became the AI core of a containerised web rebuild — see [Connect-4 web](/projects/connect4-lisp-web/).
