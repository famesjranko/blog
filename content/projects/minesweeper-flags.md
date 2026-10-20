---
title: "Minesweeper Flags"
description: "A browser recreation of the two-player Minesweeper Flags game from MSN Messenger."
date: 2026-09-21
draft: true
origin: personal
repo: https://github.com/famesjranko/minesweeper-flags
stack:
  - typescript
  - react
  - node
  - websocket
  - webrtc
  - redis
---

*Minesweeper Flags* takes me back to the early 2000s, when I played it with friends through MSN Messenger. I miss the internet I knew in those years, and this game is one of the things I still associate with it. That was what made me want to recreate it in a browser: a chance to revisit a small piece of that time.

## Playing it

Two players share a 16×16 board containing 51 mines, and the first to claim 26 wins. Selecting a mine adds a point and keeps the turn, so one player can clear several mines while the other watches the score climb. A safe square ends that run and passes the turn to the other player.

Each player has one bomb. It becomes available when they are four or more mines behind and claims any unclaimed mines in a 5×5 area. It ends the turn unless those mines finish the round.

After a round, the chat stays open and either player can request a rematch. When both have done so, they get a fresh board, with the player who did not start the last round taking the first turn.

## Resolving a move

I put the rules in a TypeScript game engine outside the React interface. The Node service uses it in a hosted game, and the host browser uses it in a direct match. When a player selects a cell, the engine receives it with the current match and returns a mine claim or safe reveal with the updated score and turn.

After each move, the server or host browser sends the result to both players for React to display. Bombs follow the same route. The room layer coordinates chat and rematch requests outside the game engine.

## Two ways to connect

The repository builds the game in two forms. In the hosted form, a Node service holds the room, match and chat state. Browsers send commands over WebSocket, and the service returns the updates.

In the direct-match form, the host player's browser holds that state. The guest sends commands over a WebRTC data channel, and the host sends back the updates. A small HTTP signaling service helps the two browsers establish that connection.

They are separate build choices, not a switch inside a room. `make dev` starts the hosted development setup, while `make p2p-dev` starts the direct-match setup. The repository also includes deployment configuration for both.

[View on GitHub&nbsp;→](https://github.com/famesjranko/minesweeper-flags)
