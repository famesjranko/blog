---
title: "Tablescan"
description: "A containerised web app for reviewing PDF table regions and comparing extraction results."
date: 2026-04-10
draft: true
origin: personal
predecessor: pdf-table-extraction-capstone
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

Tablescan began with the [PDF table extraction system](/projects/pdf-table-extraction-capstone/) I built with my university team in 2021. I later [republished its backend and extraction engine](https://github.com/famesjranko/automated-PDF-tabulated-data-extractor-api). That system detected table boxes with YOLOv3 and passed them to Camelot. It could return data, but a wrong box or a poor reading of the cells was hard to correct within the workflow. I built Tablescan so I could inspect the page, change the selected regions, and compare the data produced by different extractors.

## What Carried Over

The application still uses Django and the basic sequence of finding a table region, then extracting its cells. It retains a YOLOv3 detection path and the original Camelot `stream` method. The backend now records each selected region and its status, so detection and extraction can happen at different times. That is what makes a review step possible: a detected box can wait for approval instead of going straight to Camelot.

## Reviewing a Document

An upload starts in one of three modes. **Auto** detects and extracts without pausing. **Auto + Review** presents detected regions for approval or rejection before extraction. **Manual** starts with user-drawn regions and skips automatic detection. The Book Viewer shows the PDF page by page with zoom controls and table boxes over the pages. In selection mode, I can draw a box around a missed table, approve a useful detection, or reject one that covers the wrong content.

![Book Viewer showing two PDF pages, detected table boxes, and a list of selections](/img/projects/tablescan/book-viewer.png "The Book Viewer keeps detected regions beside the pages so they can be checked before extraction.")

The selection list shows the boxes and their states. Once the right regions are selected, extraction runs on those regions. This matters for financial PDFs: a box that clips a column can give a plausible looking CSV with missing values, and a box around nearby prose can yield a false table.

## Extracting a Selected Table

The capstone used one Camelot strategy. Tablescan can try Camelot `stream` for aligned text and `lattice` for ruled tables. It also offers line and text strategies from pdfplumber and PyMuPDF. The img2table path uses vision and OCR for scanned pages. Docling is a heavier, opt-in method. The upload form lets the user choose which libraries to run; those choices are saved with the report so they still apply after a review or manual selection.

```text
PDF + selected region
        ↓
enabled extraction methods
        ↓
candidate tables with scores and warnings
        ↓
chosen result → CSV, JSON, or ZIP
```

## Choosing a Result

Each method can interpret the same region differently. One might preserve column boundaries while another combines two cells. Tablescan scores the candidates using the method's confidence, the proportion of filled cells, row and column regularity, numeric integrity, and header detection. The weights are 35%, 20%, 15%, 10%, and 20% respectively. The highest-scoring candidate is selected first, and the Book Viewer shows the other scored versions so I can switch methods after looking at the extracted data.

The score is a comparison aid, not a measure of ground-truth accuracy. A neatly shaped table can still contain the wrong figures. Keeping the alternatives visible is useful because it lets a person inspect a specific failure instead of accepting the first result silently.

## Running It

Django serves the interface and API. Celery workers handle detection and extraction away from the web request; Redis is the task broker, and PostgreSQL stores the application records. Docker Compose starts the web app, worker, Redis, and PostgreSQL. The interface uses Django templates and htmx, while the Book Viewer adds browser-side controls for navigating pages and marking regions.

The result is a workflow where I can see the detector's choices and the extractor's alternatives before I download the data.

[View Tablescan on GitHub →](https://github.com/famesjranko/tablescan)
