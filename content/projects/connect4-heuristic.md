---
title: "A Connect-4 Heuristic in Common Lisp"
description: "A heuristic evaluation function for Connect-4, written in Common Lisp for a minimax search with alpha-beta pruning."
date: 2018-10-14
draft: false
origin: university
repo: https://github.com/famesjranko/Connect4-Lisp-Web
cover: /img/projects/connect4-heuristic/cover.jpg
stack:
  - common-lisp
  - minimax
  - alpha-beta-pruning
---

![connect four](/img/projects/connect4-heuristic/cover.jpg)

In 2018, as part of an Artificial Intelligence subject at university, I developed a heuristic evaluation function for Connect-4 written in Common Lisp. The supplied implementation returned `0` for every board state, so the task was to write a `static` function that could evaluate the board when minimax reached its search depth.

I approached this heuristic in two main ways. The first was to evaluate possible winning lines based on the current board state and whether they could be played immediately or built towards a future win. The second was to implement a strategy value map, which overlays a relative value for each position on the board. I then weighted the heuristic towards defensive play.

## Evaluating a Board

The `static` function gives terminal board states fixed values: `50000` for a win, `-50000` for a loss and `0` for a draw. It passes all other board states to the `heuristic` function.

```lisp
(defun static (board player)
  (cond ((won? board player) 50000)
        ((won? board (opposite player)) -50000)
        ((drawn? board) 0)
        (t (heuristic board player))))
```

`won?` and `drawn?` are supplied functions that test the board state, while `opposite` returns the other player.

For an unfinished board, the heuristic calculates the tactical and positional values for both players, then subtracts the opponent's value from the player's value.

```text
unfinished board
       ↓
possible winning lines + board-position maps
       ↓
tactical value + positional value
       ↓
evaluate player and opponent
       ↓
player score - opponent score
```

## Evaluating Possible Wins

The first part of the heuristic evaluates possible wins. The supplied code included a global variable named `*all-c4-lines*`, which contains the 69 groups of four positions that can form a horizontal, vertical or diagonal win.

```text
horizontal        vertical          diagonal

· · · · · · ·    · · · X · · ·    · · · X · · ·
· · · · · · ·    · · · X · · ·    · · X · · · ·
· · · · · · ·    · · · X · · ·    · X · · · · ·
X X X X · · ·    · · · X · · ·    X · · · · · ·
```

Each group is stored as four `(column row)` coordinates. The `board-value` helper function passes each one to `line-score`, then adds the returned values together.

```lisp
(defun board-value (board player playable)
  (loop for line in *all-c4-lines*
        sum (line-score board player line playable)))
```

I used the `line-score` helper function to evaluate how far each group had progressed towards a possible win. It returns a numerical value after counting the player's pieces, checking whether the other player has blocked the line, and checking whether one of its open positions can be played on the next move.

An open position is not necessarily playable because a piece must fall to the lowest available row. The `playable-positions` helper function stores the next blank row in each column, or the Lisp value `nil` when the column has no available row. The heuristic calculates this once, then uses the result when evaluating the board for both players.

```lisp
(defun playable-positions (board)
  (let ((pp (make-array 7)))
    (dotimes (col 7 pp)
      (setf (svref pp col)
            (get-next-blank board col)))))
```

The `imminent-threat?` helper function returns true when a position in the line can be played on the next move. I use the same check for both players. For the opponent, a playable three-in-a-row is an imminent threat: it receives `97` and is subtracted from the player's evaluation. For the player, the same check identifies an immediately playable win.

```text
each of the 69 lines, for the player and opponent
                         │
                         ├── contains the other player's piece → 0
                         │
                         └── unblocked
                               ├── 3 pieces + playable now    → 97
                               ├── 3 pieces + future position →  9
                               ├── 2 pieces + playable now    →  3
                               └── all other lines            →  0

playable now = imminent-threat?

player's line values   → added to the evaluation
opponent's line values → subtracted from the evaluation
```

A playable three-in-a-row receives `97`, while an unsupported three-in-a-row receives `9`. I found that weighting current moves over future moves was effective, but it was also important to consider possible future wins as this allowed the heuristic to plan ahead, both defensively and offensively.

## Positional Strategy

The second part of the heuristic was a 7 × 6 strategy value map, which overlays a relative value for each position on the board. Given Connect-4 is a solved game, it is known under perfect play that the opening position affects the outcome. With that in mind, I gave the board positions starting values to improve the heuristic's game-playing ability, with the highest values placed in the centre column.

```text
1 1 1 1 1 1 1
1 1 1 1 1 1 1
1 1 1 1 1 1 1
1 1 1 3 1 1 1
1 1 1 3 1 1 1
1 2 2 3 2 2 1
```

Each occupied position contributes its corresponding value to the player's strategy score.

In addition, I implemented a second strategy based on diagonal positioning. The board is divided into alternating `A` and `B` positions, with positions of the same type forming diagonals.

```text
A B A B A B A
B A B A B A B
A B A B A B A
B A B A B A B
A B A B A B A
B A B A B A B
```

The `best-strategy?` helper function returns a numerical score by counting the player's pieces on each set. A result above `3` selects the global `*strategy-a*` map, a result below `-3` selects `*strategy-b*`, and all other results use the global `*default-board-values*` map. The `strategy` helper function applies that selection:

```lisp
(defun strategy (board player)
  (let ((bs (best-strategy? board player)))
    (cond ((> bs 3)
           (preferred-positions board player *strategy-a*))
          ((< bs -3)
           (preferred-positions board player *strategy-b*))
          (t
           (preferred-positions board player
                                *default-board-values*)))))
```

```text
best-strategy? score
        │
        ├── above 3  → strategy A
        ├── below -3 → strategy B
        └── otherwise → default map
                │
                ▼
sum the selected map values beneath the player's pieces
```

The `preferred-positions` helper function performs this final sum.

The idea was to add weight to future possible diagonal win states based on the current board. As I noted in the original assignment, this required further testing to determine how effective it was and whether other strategy types could improve game play.

## Defensive Weighting

Lastly, I weighted the heuristic towards defensive rather than offensive play. I approached this by playing at a search depth of one and adjusting the weight until the heuristic chose to defend from a loss rather than pursue an unwinnable win. Once I had this set, I incrementally reduced the value until I found the lowest factor that produced the desired defensive play without weakening its offensive play. The resulting value, `1.91000008`, is stored in the global variable `*defensive-weight*`. The `heuristic` function combines the tactical and positional values as follows:

```lisp
(defun heuristic (board player)
  (let ((playable (playable-positions board)))
    (- (+ (* *defensive-weight*
             (board-value board player playable))
          (strategy board player))
       (+ (board-value board (opposite player) playable)
          (strategy board (opposite player))))))
```

Together, the complete evaluation is:

```text
board + player
      │
      ├── player has won   →  50000
      ├── opponent has won → -50000
      ├── drawn board      →      0
      │
      └── unfinished board
              │
              ▼
       find the next playable row in each column
              │
              ▼
       tactical value + positional value
              │
              ▼
       evaluate player and opponent
              │
              ▼
player score   = (1.91000008 × tactical value) + positional value
opponent score = tactical value + positional value
              │
              ▼
heuristic value = player score - opponent score
```

## Final Game Play Testing Results

I played two games at each search depth from one through four and was unable to best the heuristic in any of them. The final board from one game at each depth is shown below.

![Final board at search depth 1](/img/projects/connect4-heuristic/connect4-depth1.svg "<span style='font-size: 0.8rem'>Search depth 1 (heuristic win, 121 nodes)</span>") ![Final board at search depth 2](/img/projects/connect4-heuristic/connect4-depth2.svg "<span style='font-size: 0.8rem'>Search depth 2 (heuristic win, 438 nodes)</span>")

![Final board at search depth 3](/img/projects/connect4-heuristic/connect4-depth3.svg "<span style='font-size: 0.8rem'>Search depth 3 (heuristic win, 1775 nodes)</span>") ![Final board at search depth 4](/img/projects/connect4-heuristic/connect4-depth4.svg "<span style='font-size: 0.8rem'>Search depth 4 (heuristic win, 6038 nodes)</span>")

Finally, a caveat. While I am not the most accomplished Connect-4 player, I did find myself improving through testing the heuristic. I eventually felt that I had reached the limit of my playing ability. The heuristic played about as well as, or better than, I could at each search depth, including depth one. With further testing of the weight factors and a better player to compare against, I feel the heuristic could be further improved.

[See this heuristic rebuilt as a web interface →](/projects/connect4-lisp-web/)
