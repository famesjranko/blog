---
title: "Musicmeta"
description: "A Kotlin library unifying eleven public music APIs behind one enrichment engine."
date: 2026-03-20
draft: false
featured: true
origin: personal
repo: https://github.com/famesjranko/musicmeta
stack:
  - kotlin
  - jvm
  - android
  - gradle
---

Music apps that want rich metadata without a commercial API must stitch together free public APIs themselves, each with its own identity scheme, rate limits, and quirks. Musicmeta does that reconciliation once: eleven providers (MusicBrainz, Cover Art Archive, Wikidata, Wikipedia, LRCLIB, Deezer, iTunes, Last.fm, ListenBrainz, Fanart.tv, Discogs) behind a single enrichment engine, eight of them usable without API keys.

One call returns a typed profile: `engine.artistProfile("Radiohead")` yields artwork, biography, genres, members, discography, similar artists, and popularity. Partial failure is first-class: a provider that fails, rate-limits, or times out costs only its own types, never the whole profile.

Three design decisions carry the weight. Identity resolution comes first: MusicBrainz canonical identifiers pin the entity so downstream lookups use precise IDs instead of fuzzy text search, with music-specific fuzzy matching for the rest. Multi-provider merging combines overlapping coverage (artwork from five sources, similar artists from three) with confidence scores attached. And the engine is provider-agnostic behind one interface, so adding the next source is a day's work, not a refactor.

Published to Maven Central and JitPack as three artefacts: a pure-JVM core, an OkHttp adapter, and an Android module with persistent cache and dependency-injection support, with per-provider rate limiting, circuit breaking, and pluggable HTTP and cache interfaces. A solo-authored, Apache-2.0 library with a live web demo.
