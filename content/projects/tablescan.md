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

PDF has no semantic concept of a "table", so extracting one is a detection problem first and a parsing problem second. Tablescan is a web app for that pipeline: upload a PDF, pick an extraction mode, and get CSVs back.

The pipeline is detect-then-extract. A YOLOv3 model finds table regions in page images; then a multi-extractor stage runs several PDF libraries (Camelot, pdfplumber, PyMuPDF, and img2table, with Docling as an opt-in heavier model) and picks the best result per table. Three modes cover the workflow: auto runs straight through, auto+review pauses in a per-page Book Viewer where the user approves, rejects, or hand-draws regions before extraction, and manual skips detection entirely. Exports come back as CSV, JSON, or a ZIP archive.

The stack is containerised: Django for the web layer with an htmx frontend, Celery workers on Redis for async extraction, and PostgreSQL for state. Extraction runs off the request path so the UI stays responsive while jobs process in the background.
