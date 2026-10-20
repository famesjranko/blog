---
title: "Minesweeper Flags"
description: "A browser recreation of MSN Messenger's social two-player Minesweeper Flags game."
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

MSN Messenger and its games have gone. I used to play *Minesweeper Flags* with friends through Messenger, where the game sat beside the conversation. It was a way to keep talking while we played. I wanted to recreate that small piece of the early-2000s internet in a browser.

The remake keeps its shared-game premise: two people act on one board and try to claim its mines before the other player does. A turn can be quick, but it can also leave one player making selection after selection while the other waits to see whether the run will continue.

## Playing together

The remake has a 16×16 board with 51 mines. The first player to claim 26 wins the round. Finding a mine earns a point and keeps the turn; a safe square hands it over. A player can claim several mines before the next safe square gives the other player a move.

Each player also has one bomb. It becomes available when they are trailing by four or more mines, and claims unclaimed mines in a 5×5 area. It can turn a growing gap into a close score, but it is a single chance to change the round. The bomb passes the turn unless it supplies the winning points.

Chat belongs to the room beside the board. When a round ends, both players can request a rematch there; the player who started the last round waits for the first move in the next one. The room keeps the conversation with the players while it starts the fresh game.

## Keeping the game consistent

The project is a React and TypeScript application, but the rules do not live in the interface. A shared TypeScript game engine creates the board, resolves a selected cell, tracks scores and turns, and finishes the round. This gives the two connection designs the same answer to a move. A player sends a selected-cell command to the match authority; the engine resolves it as a mine claim or safe reveal, and the authority sends the resulting event back to the clients for the React interface to display.

Keeping the rules in that engine matters because the game is about a common board. Both players need to see the same score and the same turn after every move. The same engine also resolves a bomb in either build, including its score and the next turn.

Room orchestration handles chat and rematch requests around that engine. The match authority keeps the room state and relays its events to both players. When both players request another game, it creates a fresh match with the other player starting; the room chat remains with them.

## Two ways to run it

The repository builds the project in two forms. In the hosted form, a Node service owns the room, match and chat state. Browsers send commands over WebSocket, and the service applies the shared engine before broadcasting the result. This is the conventional browser-and-server shape, with one service keeping the board for both players.

The direct-match form moves that authority into the host player's browser. The guest sends the same kinds of commands over a WebRTC data channel, and the host runs the same engine before returning the updated match to both players. A small HTTP signaling service helps the browsers establish the connection; it is not another version of the game rules. The React client uses the same command and event flow in each form, so the board and room behaviour do not depend on which one runs underneath.

These are build choices for running the project, rather than controls inside a room. `make dev` starts the hosted development setup and `make p2p-dev` starts the direct-match setup. The repository also includes deployment configuration for each form.

[View on GitHub&nbsp;→](https://github.com/famesjranko/minesweeper-flags)
