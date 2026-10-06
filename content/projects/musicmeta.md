---
title: "Musicmeta"
description: "A Kotlin library unifying eleven public music APIs behind one enrichment engine."
date: 2026-03-21
draft: true
cover: /img/projects/musicmeta/cover.jpg
coverAlt: "A vinyl record whose music fans out into a row of image panels, joined by thin lines that converge on a single artist profile card"
featured: true
origin: personal
repo: https://github.com/famesjranko/musicmeta
stack:
  - kotlin
  - jvm
  - android
  - gradle
---

![A vinyl record whose music fans out into a row of image panels, joined by thin lines that converge on a single artist profile card](/img/projects/musicmeta/cover.jpg)

Musicmeta began as the metadata code inside Cascade, a DLNA music player for Android that I started first. A player like Cascade needs more than the tags stored in a music file: it needs album art, artist photos, biographies, genres and similar artists. Public music APIs supply all of this for free. However, each one identifies artists and albums in its own way and limits how often it may be called, so an app that wants the data has to reconcile those sources itself.

Musicmeta does that work once, as a Kotlin library. It draws on eleven providers: MusicBrainz, Cover Art Archive, Wikidata, Wikipedia, LRCLIB, Deezer, iTunes, Last.fm, ListenBrainz, Fanart.tv and Discogs. Eight of them need no API key. Together they answer 36 types of enrichment, from a single album cover to a timeline of an artist's career.

## What a call returns

A caller builds an engine once and asks it for a profile:

```kotlin
val engine = EnrichmentEngine.Builder()
    .withDefaultProviders()
    .build()

val profile = engine.artistProfile("Radiohead")

println(profile.bio?.text)
profile.genres.forEach { println("${it.name} (${it.confidence})") }
```

By default, `artistProfile()` requests sixteen types, among them the photo, biography, genres, members, discography and similar artists. `albumProfile()` and `trackProfile()` work the same way for albums and tracks, and a caller who needs less can pass a smaller set of types and skip the calls behind the rest.

The profile is the simplest of three ways to read the result. Beneath it, `EnrichmentResults` offers named accessors such as `albumArt()` and `genreTags()`, and beneath those sits a raw map from each type to its outcome. Each outcome is one of four cases: `Success`, `NotFound`, `RateLimited` or `Error`. Meaning, an app can always tell an artist with no photo apart from a photo that could not be fetched, and decide for itself whether to ask again later.

![The demo's result for Radiohead: a photo, genre tags, the opening of the Wikipedia biography with its credits, and a row of artwork from Fanart.tv, Discogs and Wikipedia](/img/projects/musicmeta/radiohead-summary.jpg "The live demo's profile for Radiohead. Genres marked ✦ are MusicBrainz's curated genres, and each text and image credits its source.")

## Identity first

Before any provider is asked for data, Musicmeta settles which artist the request means. MusicBrainz searches for the name, and the engine accepts the best match only if MusicBrainz scores it at 80 or more out of 100. The identifiers that come back, the MusicBrainz ID and the Wikidata ID among them, are then added to the request. From that point, providers such as Cover Art Archive and Fanart.tv look up the artist or album by its MusicBrainz ID and do not search by name at all.

This step matters because names are not unique. A search for "Nirvana" returns the American grunge band, but also a 1960s band from the UK and French, Finnish and Croatian bands of the same name. MusicBrainz tells them apart with a short note on each, and the [live demo](https://musicmeta-demo-354377080055.us-central1.run.app) shows these notes when a user searches before enriching. When no match reaches the threshold, the call still runs. If MusicBrainz found near misses, the result is marked ambiguous and carries up to three of them as suggestions, so an app can ask the user which artist they meant.

![The demo's search results for "Nirvana": eight artists, most with a MusicBrainz note such as "1980s–1990s US grunge band" or "60s band from the UK", and a match score](/img/projects/musicmeta/nirvana-search.jpg "Searching for Nirvana in the demo. MusicBrainz's notes tell the acts apart.")

Some providers can only be searched by name, and for these the same problem returns in another form. Deezer once ranked an empty "Radiohead" entry, with no albums and 470 fans, above the real band, and an early version of the library took Deezer's first result as the answer. The search now fetches a pool of results, ranks them by how well the name matches, and uses popularity only to break a tie. However, two different acts can share an exact name, and then popularity is only a guess. So when an album request carries nothing else to tell two such acts apart, Deezer's similar-albums lookup declines to answer, because its whole answer would rest on that guess.

An identifier supplied by the caller raises a different problem. A caller who already knows an artist's MusicBrainz ID can pass it in and skip the search, and until version 0.13.0 the engine trusted it. A request for "Radiohead" carrying Coldplay's ID returned Coldplay's genres at full confidence, with Radiohead's name still on the request. The lookups now compare that name with the entity the ID points to. When the two clearly disagree, the engine falls back to a search by name and marks the result as contradicted, so the caller learns that the ID was wrong.

## One request, start to finish

The engine's work for a call such as `artistProfile("Radiohead")` falls into six steps:

1. The engine reads the cache for each requested type. If every type is already cached, the call returns at once and makes no network request.
2. MusicBrainz resolves the artist, as described above. This step and the three after it run inside a deadline of 30 seconds by default.
3. Every type then starts at once, as one of three kinds. A regular type asks its providers in order of priority and keeps the first success. Each of the eight mergeable types asks every eligible provider at the same time and merges their answers. Each of the two composite types waits for its inputs: the artist timeline for the discography and the band members, and genre discovery for the genres.
4. Each answer must pass a gate. Its confidence must be at least 0.5 by default, and its data must answer the type it was asked for.
5. A type settles as soon as its answer passes, without waiting for the others, and the engine emits a snapshot of the results so far.
6. When every type has settled, the engine writes the cache once and then returns the final results.

If the deadline passes first, every type still open is reported as timed out, and nothing is cached. The deadline can fire while a type is part-way through being finished, so the results at that moment mix finished and unfinished work. The caller still receives them, but a cache entry would carry that damage into later calls.

![The six steps of an enrich call](/img/projects/musicmeta/pipeline.svg "One call from cache read to result. Steps 2 to 5 run inside the deadline.")

![The demo's table for Radiohead, listing seventeen types with the provider that answered each, its status and its confidence](/img/projects/musicmeta/how-we-got-this.jpg "The demo's record of a repeat request for Radiohead. Some types name the merger or synthesizer that combined their answers in place of a single provider.")

## Merging and confidence

For most types one good answer is enough, and the first provider to give one wins. Eight types are different, because no single provider covers them well: genres, similar artists, similar tracks, top tracks, artist and track popularity, artist photos and album art. For these, the engine asks every eligible provider at once and hands their answers to a merger written for that type.

Album art is the simplest case. Five providers can supply it: Cover Art Archive, Deezer, iTunes, Fanart.tv and Discogs. The image with the highest confidence becomes the primary one, and the others are kept as alternatives, so an app can offer a choice of covers. Genres need more care. Last.fm and MusicBrainz often name the same genre in different ways, so the merger normalises each name, joins the duplicates and adds their confidences, capped at 1.0. However, because confidences add up, a tag that several providers happened to use could outrank a genre that MusicBrainz editors have accepted into their curated list. The merger therefore puts curated genres first, whatever their score.

Confidence itself has a narrow meaning in Musicmeta. It scores how an answer was obtained: a lookup by exact ID scores 1.0, and a search by name scores lower. It says nothing about how complete the data is. A recording can match perfectly and still carry no genre tags, which is why the gate in step 4 checks the data separately. The rule across the engine is that confidence may understate the evidence but must never overstate it. Apps make decisions on these scores, so an error is only allowed in the safe direction.

## When providers fail

Free APIs fail often, so each provider call passes through three layers of protection. The outermost is a circuit breaker for each provider. After five failures in a row, the engine stops calling that provider for 60 seconds, and its types fall through to the next provider in line. Inside the breaker sits a rate limiter, one for each host. MusicBrainz publishes a limit of one request per second, so its limiter keeps requests at least 1.1 seconds apart. Most hosts publish no figure, so their intervals are my own estimates. Innermost, the HTTP request gets up to three attempts when a failure is likely to pass, such as a 503 or a 429 from a busy host. A retry that would wait past the deadline is not made.

The engine also keeps a strict line between a failure and an absence. `NotFound` means the provider answered and had no data, and `Error` means it could not answer. Confusing the two has a real cost: a provider that reports a missing image as an `Error` counts as failing, and its circuit breaker opens against a healthy service. The rule here mirrors the one for confidence: an absence must never be reported where a failure occurred. It also decides what happens when MusicBrainz itself fails. The engine marks the identifiers it could not obtain as temporarily missing, so every type that needed them reports an error and not an empty result, since the data may well exist.

## Results as they arrive

An app should not have to wait for the slowest type before it shows anything. `enrichProgressive()` returns a stream of snapshots, each carrying every type settled so far. A new snapshot goes out when the identity is resolved and each time a type settles, and the last one comes after the cache write. In one demo request for Radiohead, the first results appeared after 3.4 seconds, and the last arrived after 21.8.

![Timeline of one enrich call for an artist](/img/projects/musicmeta/timeline.svg "One artist request over time, with six of its sixteen types. Each dot is a snapshot, and the last goes out after the cache write. Bar lengths are illustrative.")

Streaming was not cheap to add. `enrich()` returns the last snapshot of that same stream, so both calls run one pipeline. My first version was a separate, streamed copy of the pipeline, and when I measured it against the test suite, it disagreed with `enrich()` on how it classified errors. Where `enrich()` returned a typed `Error` for a composite type, the streamed copy left the type out of the results altogether. Nothing about streaming forces that difference, but nothing would have caught it either, so there is now only one path.

Sharing that path also changed what happens when a caller leaves. If an app stops listening, the run is not cancelled. It keeps going until it settles or times out, and it still writes its results to the cache, so the next request for that artist is fast.

## Packaging and the demo

Musicmeta is published as three packages. `musicmeta-core` holds the engine, the providers and the cache contract, and runs on any JVM. `musicmeta-okhttp` lets an app that already uses OkHttp send the engine's requests through it, and `musicmeta-android` adds a persistent cache built on Room, with support for Hilt and WorkManager. The core depends on neither of the other two, so a server or desktop app can use the engine without pulling in an HTTP client or Android code it does not need. The OkHttp adapter also uses the core's retry logic and adds none of its own, because an OkHttp interceptor cannot see the engine's deadline, and a retry made there could run past it.

All three packages are on [Maven Central](https://central.sonatype.com/artifact/io.github.famesjranko/musicmeta-core) from version 0.8.1, and on [JitPack](https://jitpack.io/#famesjranko/musicmeta), under the Apache 2.0 licence. Downloads, as counted by Maven Central and Scarf, have been steady and have grown since the first release.

The demo is a small web app in the same repository. It builds against the library from outside, as any app would, so a change that breaks the public API also breaks the demo. Its server runs on Google Cloud Run.

[Try the live demo →](https://musicmeta-demo-354377080055.us-central1.run.app)

[View Musicmeta on GitHub →](https://github.com/famesjranko/musicmeta)
