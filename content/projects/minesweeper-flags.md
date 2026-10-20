---
title: "Minesweeper Flags"
description: "A browser recreation of the two-player Minesweeper Flags game from MSN Messenger."
date: 2026-09-21
draft: false
origin: personal
repo: https://github.com/famesjranko/minesweeper-flags
cover: /img/projects/minesweeper-flags/cover.jpg
coverAlt: "A cream-beige PC running Minesweeper Flags on a desk beneath a rain-streaked attic window at night"
stack:
  - typescript
  - react
  - node
  - websocket
  - webrtc
  - redis
---

![Minesweeper Flags on a retro PC](/img/projects/minesweeper-flags/cover.jpg)

The early-2000s internet came to life on a cream-beige PC with a big, boxy monitor. The dot-com craze was behind us. MySpace was just beginning, and YouTube was still to come. MSN Messenger sat open on the desktop, its list of names changing as friends signed in and out. I used XDCC to download files. There was a whole world behind that screen, reached through familiar windows and usernames.

*Minesweeper Flags* was a small part of that world. I played it with friends through MSN Messenger, and it still brings back the feeling of being online in those years. I miss that time, the places we went and the names we recognised. Recreating the game in a browser is my attempt to revisit a little of that early-2000s internet.

## The game

This is competitive Minesweeper for two people. Both players share a 16×16 board with 51 mines and take turns choosing cells, but the numbered clues are not there to keep you away from mines. They help you find them. Each mine is a point, and the player who claims one keeps the turn. A safe cell opens and passes the turn to the other player. The first player to claim 26 mines wins.

A player who makes several good deductions can build a scoring run while the other watches. Each player also has one bomb. It becomes available when they are at least four mines behind, and claims unclaimed mines in a 5×5 area. It ends the turn unless those mines finish the round.

Each match takes place in a room. The chat belongs to the room, so it is there while the match is played and after the result. Either player can ask for a rematch. When both do, a new board begins with the player who did not start the last round taking the first turn.

## The game window

Hidden cells are blue, revealed cells are yellow, and claimed mines carry red or blue flags for their player. The scores sit beside the board in matching colours. Chat runs beneath the match rather than being a separate screen, which keeps the room present during a game.

<div class="minesweeper-game-figure">

![A two-player Minesweeper Flags match in progress, with the board, player scores and room chat in one window.](/img/projects/minesweeper-flags/game.jpg "A two-player match in progress, with the board, player scores and room chat in one window.")

</div>

The board is a React view, but it does not decide what a click means. The rules live in a TypeScript game engine that can create a board, resolve a cell selection and return the next match state. Keeping that work outside the interface lets the same rules run wherever a match is owned.

## Where a match lives

There are two ways to run the game. In the hosted version, a Node service owns the room, match and chat state. Browsers send commands through WebSocket and receive the resulting updates. One player creates the room and sends the other an invite link or token. The browser interface can use the same command and event shapes in the direct version.

For a direct match, the host browser owns the room, match and chat. The host shares a join link with the guest, who sends commands over a WebRTC data channel and receives updates back. HTTP has a narrower job: the signaling service brokers the initial offer and answer, then helps the browsers reconnect. It does not hold gameplay state. That division keeps the game engine and the player-facing flow the same while changing where the authoritative state runs.

## Running it

`make dev` runs the hosted version locally, while `make p2p-dev` runs the direct version. For a public container deployment, the React client is built into static files and served by Nginx. The hosted Compose stack starts the client, Node game server, signaling service and Redis, while the direct stack starts the client, signaling service and Redis.

Redis is optional in local development, but these public configurations require it. The hosted configuration stores room, match and chat state. The direct configuration stores the signaling service's connection records while the match remains in the host browser.

[View on GitHub&nbsp;→](https://github.com/famesjranko/minesweeper-flags)
