---
title: "Minesweeper Flags"
description: "A realtime two-player Minesweeper Flags, the MSN Messenger game from the early 2000s, rebuilt with both a hosted-server mode and a browser-to-browser WebRTC mode from one monorepo."
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

Minesweeper Flags was the two-player version of Minesweeper that ran over MSN Messenger: two people share a board, and instead of clearing safe squares, whoever flags the most mines first wins. This project rebuilds that game as a realtime web app, on a 16x16 board with 51 mines, first to 26 claimed. It ships in two shapes from one monorepo: a hosted-server build that talks to a Node WebSocket backend, and a "direct match" build where one browser holds gameplay authority and a small HTTP signaling service only brokers the WebRTC offer/answer rendezvous and reconnects.

Both shapes share nearly everything except which side owns the truth. The server routes websocket input through a transport-neutral command layer before binding it back to sockets and room broadcasts. The client separates controller logic, a runtime store, transport wiring and a thin React provider around them. In direct-match mode, a `P2PHostOrchestrator` holds room, match and chat state in the host browser instead, and the same controller/store/transport stack runs over an `RTCDataChannel` in place of a websocket.

Each player gets one 5x5 bomb move that unlocks only while trailing by four or more mines, for a way back into a losing game. Room chat and match state survive reconnects and rematches, backed by an optional Redis layer for rooms, match state, chat history and reconnect sessions; a public deployment requires that Redis backend, along with an explicit allowed-origins list and trust-proxy configuration, while local development just keeps state in memory.

[View minesweeper-flags on GitHub →](https://github.com/famesjranko/minesweeper-flags)
