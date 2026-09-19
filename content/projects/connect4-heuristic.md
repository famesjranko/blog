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

The problem: build a competitive Connect-4 player on heuristic alone. Search depth is expensive, and every extra ply multiplies the game tree, so the evaluation function has to do the real work: recognise a strong position the moment it sees one, even a single move deep.

There is a shortcut. Connect-4 is a solved game: under perfect play, the first player wins by starting in the centre. Winning opening knowledge therefore exists before a single piece is played, and a heuristic can simply encode it, steering play toward known-good positions instead of rediscovering them through search. What follows is my attempt at that: a custom evaluation function in Common Lisp, written over a minimax search with alpha-beta pruning.

I approached this heuristic in two main ways.  The first was to evaluate a given board state by giving values to positional play based on whether it was the current move and if it built towards a possible solution state. I not only found that weighting current moves over future moves was effective, but that it was also important to consider possible future wins as it allows the heuristic to plan ahead, both defensively and offensively.

The second was to implement a strategy value map, which overlays a relative value for each position on the board.  The idea behind this was that given connect four is a solved game it is known under perfect play which starting positions will lead to a given game outcomes.  With that in mind I gave respective starting values to the board to improve the heuristics game playing ability.  In addition, I also implemented a second strategy type based on diagonal positioning on the board.  This was to add a weight to future possible diagonal win states given a current board state – ultimately requires further testing to determine how effective this or other strategy types would be for improved game play. 

Finally, a caveat.  While I am not the most accomplished connect-four player I did find myself improving through testing of the heuristic.  However, I feel I have effectively hit the limit of my playing ability.  The heuristic seems to play about as good or better than I can as it can best me at any given search depth. With further testing of weight factors and a better player to compare against, I feel the heuristic could be further improved. 

## Final board states

Below are the final positions from those runs, as recorded in the assignment.

**Search depth 1** (heuristic win, 121 nodes) · **Search depth 2** (heuristic win, 438 nodes)

![Final board at search depth 1, heuristic win, 121 nodes](/img/connect4-depth1.svg) ![Final board at search depth 2, heuristic win, 438 nodes](/img/connect4-depth2.svg)

**Search depth 3** (heuristic win, 1775 nodes) · **Search depth 4** (heuristic win, 6038 nodes)

![Final board at search depth 3, heuristic win, 1775 nodes](/img/connect4-depth3.svg) ![Final board at search depth 4, heuristic win, 6038 nodes](/img/connect4-depth4.svg)

Years later this heuristic became the AI core of a containerised web rebuild (see [Connect-4 web](/projects/connect4-lisp-web/)).
