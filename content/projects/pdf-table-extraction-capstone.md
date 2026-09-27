---
title: "Extracting Tables from Financial PDFs"
description: "A 2021 La Trobe University team project for detecting tables in financial reports and extracting their data through a Django API."
date: 2021-10-25
draft: true
origin: university
repo: https://github.com/famesjranko/automated-PDF-tabulated-data-extractor-api
stack:
  - python
  - django
  - yolo
  - camelot
  - angular
  - sqlite
---

In 2021, I worked with the 4BDAW team at La Trobe University on a system for extracting financial tables from company reports. Our client, Lensell, wanted to take figures from long PDF reports and make them available as data. Dr Scott Mann and Derek Nguyen supervised the project. The team's [system documentation](https://github.com/famesjranko/automated-PDF-tabulated-data-extractor-api/blob/main/PDF-extraction-system-documentation.pdf) describes the requirements, design, and testing.

The difficulty was finding a table before reading its cells. PDF records the position of text and graphics on a page, but those positions do not say which pieces form a row or column. Annual reports also use different layouts. We researched a two-stage approach: detect the table in an image of the page, then give its location to a parser that reads the PDF text.

## Detecting a Table

The engine rendered each PDF page as an image and passed it to a YOLOv3 object detector trained to find tables. YOLO returned a bounding box around each candidate. Those boxes used image coordinates, while the extraction library needed PDF coordinates. The engine read the dimensions of both versions of the page and converted the boxes before parsing. Without that conversion, a visually correct detection would point Camelot at the wrong part of the PDF.

```text
PDF page → rendered image → YOLOv3 table boxes
                              ↓
                    convert image boxes to PDF coordinates
                              ↓
                    parse those regions with Camelot
                              ↓
                       CSV and JSON files
```

## Reading the Cells

Camelot took each converted box through its `table_areas` option. We used its `stream` mode, which infers columns from the spacing and alignment of text. That suited the borderless tables we expected in financial reports. The resulting dataframe could be written as CSV or JSON. We logged Camelot's parsing report, including its accuracy and whitespace measures, so a result could be inspected after extraction.

The detector and parser answered different questions. YOLO could find a region without knowing its rows. Camelot could reconstruct rows from text, but first needed a useful region. A missed or oversized box could spoil the extraction before Camelot began.

## Serving the Extraction

The team built an Angular interface for uploading reports and downloading results. The Django backend exposed a REST API for the same workflow. A `POST /api/upload/` request accepted a PDF and an optional start and end page; report and extraction records were stored with SQLite. The API also listed reports, returned a report by ID, and made its extracted files available, including a ZIP of CSV files.

My work included the Django API, report and extraction models, and the detection and extraction pipeline. The source headers in the [republished backend repository](https://github.com/famesjranko/automated-PDF-tabulated-data-extractor-api) identify those files and my edits to the YOLO integration. The interface, system design, research, and testing were the work of the 4BDAW team.

## Testing the System

We tested the engine on company annual reports and recorded expected tables, misses, false positives, and the quality of parsed output. The system documentation includes examples where Camelot reported high parsing accuracy even though a table was incomplete or the detected region was a false positive. That made visual checks important: a parsing score alone could not tell us whether the right table had been found.

I later published the backend and engine code in my own repository. The detector-to-parser pipeline was the starting point for a later personal project that added page review and more extraction methods.

[See this extraction system rebuilt as Tablescan →](/projects/tablescan/)
