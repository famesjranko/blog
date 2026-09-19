---
title: "Tablescan"
description: "A containerised web app that detects and extracts tables from PDF documents into CSV."
date: 2026-04-10
draft: false
origin: personal
repo: https://github.com/famesjranko/tablescan
stack:
  - python
  - django
  - celery
  - redis
  - postgresql
  - htmx
  - docker
---

PDF has no semantic concept of a "table", so extracting one is a detection problem first and a parsing problem second. Tablescan is a full rewrite of an earlier table-extraction project on a modern stack: upload a PDF, pick an extraction mode, and get CSVs back.

The pipeline is detect-then-extract. A YOLO model finds table regions in page images; then a multi-extractor stage runs several PDF libraries in parallel behind one abstraction — no single library wins for all table shapes — and a scorer picks the best result per table. In review mode, a per-page Book Viewer lets the user approve or reject detections before extraction runs.

The stack is containerised across four services: Django for the web layer, Celery workers on Redis for async extraction, PostgreSQL for state, and an htmx-based frontend with server-sent events for long-running jobs instead of a single-page app. Extraction runs off the request path so the UI stays responsive; authentication is JWT with per-object ownership.

A working full-stack app and public repo — a portfolio piece showing the "earlier project → personal product" arc end to end: same problem, rebuilt from scratch with a parallel extraction pipeline, async task processing, and human-in-the-loop review the original never had.
