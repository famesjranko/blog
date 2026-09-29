---
title: "Tablescan"
description: "A containerised web front end for my 2021 PDF table extraction engine, with a review workflow and several extraction libraries."
date: 2026-04-10
draft: true
cover: /img/projects/tablescan/cover.jpg
coverAlt: "Collage of a PDF page with a table outlined, the table lifted out, and a spreadsheet with CSV, XLSX and JSON files"
origin: personal
predecessor: extracting-pdf-tables
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

![Collage of a PDF page with a table outlined, the table lifted out, and a spreadsheet with CSV, XLSX and JSON files](/img/projects/tablescan/cover.jpg)

Tablescan gives [my 2021 PDF table extraction engine](/projects/extracting-pdf-tables/) the front end and packaging it never had. It keeps the original detector, a YOLOv3 model that finds table regions on each page image, and adds a web interface for uploading reports, reviewing detections, and downloading results. The front end uses Django templates with htmx and Alpine.js, styled with Tailwind CSS.

## Extraction modes

The upload page takes a PDF, an optional page range, and a choice of extraction mode. The advanced options select which extraction libraries run.

![The Tablescan upload page, with a file drop area, the three extraction modes, a page range, and advanced extraction options](/img/projects/tablescan/upload.jpg "The upload page.")

The mode decides where the user comes into the process:

![The three extraction modes: Automatic, Auto + Review, and Manual Selection, each with a one-line description](/img/projects/tablescan/modes.jpg "The three extraction modes.")

- Automatic: detection and extraction run in one pass, as in the 2021 engine.
- Auto + Review: detection runs, then waits for the user to check each detection before extraction.
- Manual: detection is skipped, and the user draws each table region.

## Book Viewer

The review and manual modes open the report in a Book Viewer. It renders the PDF in the browser with PDF.js as a two-page spread, with zoom and page navigation.

![The Book Viewer showing two report pages, with one approved table outlined in green, one pending table outlined in orange, and a list of table selections below with approve, reject, preview, and delete controls](/img/projects/tablescan/book-viewer.jpg "The Book Viewer, with one detection approved and others pending review.")

Each detection appears on the page as a numbered box. Approved detections are outlined in green and pending ones in orange.

![A detected table outlined in green and numbered 3, approved for extraction](/img/projects/tablescan/detection-approved.jpg "An approved detection.") ![A detected table outlined in orange and numbered 4, waiting for review](/img/projects/tablescan/detection-pending.jpg "A pending detection.")

Every detection is also listed below the spread, with its page, its position on the page, and the detector's confidence. From the list the user can approve or reject a detection, undo either decision, preview it, or delete it. In select mode, the user can draw a box around a table the detector missed. Only approved regions are extracted.

![The table selections list: four detections with page, position and confidence, one approved, and approve, reject, preview and delete controls on each row](/img/projects/tablescan/selections.jpg "The selection list, with one detection approved.")

Boxes drawn in the browser are converted to PDF coordinates for extraction, and detector boxes are converted back to be shown on the page.

## Extraction libraries

The 2021 engine read every region with Camelot in stream mode. Tablescan runs each detected region through several libraries and keeps the best result:

| Library | Methods | Suited to |
|---|---|---|
| Camelot | lattice, stream | Tables with ruled lines (lattice) or columns aligned by whitespace (stream) |
| pdfplumber | lines, text | Born-digital PDFs with a clear structure |
| PyMuPDF | lines, text | A second line and text method, with different edge cases |
| img2table | image, with Tesseract OCR | Scanned pages with no text layer |
| [Docling](https://github.com/docling-project/docling) (IBM) | TableFormer model | Complex tables; off by default because the model is heavy |

Each library can be switched on or off in the upload form's advanced options. Docling's model weights are built into the Docker image, so it needs no download at run time.

Each result is scored on five measures, weighted as follows: the library's own confidence (35%), header detection (20%), cell coverage (20%), row and column regularity (15%), and the validity of numeric values (10%). The highest-scoring result becomes the table's result, and the others remain available on its card.

After extraction, headers that run over several rows are merged into a single header, and the XLSX export keeps them as merged cells.

## Results

Each extracted table appears as a card with a preview of its contents and CSV and JSON downloads. The card lists the result from each library that read the table, and the user can switch to another if the chosen one is wrong.

## Running it

Tablescan runs under Docker Compose as four services: the Django web app, a Celery worker, Redis as the task broker, and PostgreSQL. Detection and extraction run as Celery tasks, so an upload returns at once and the report page shows the job's status while the worker processes the pages. Each report belongs to the user who uploaded it, and users see only their own reports.

To try it, clone the repository, start the containers, then open `http://localhost:8000` and register an account:

```bash
git clone https://github.com/famesjranko/tablescan.git
cd tablescan
make docker-dev
```

The Compose setup is for local use. It runs Django's development server with debug mode on.

[View Tablescan on GitHub →](https://github.com/famesjranko/tablescan)
