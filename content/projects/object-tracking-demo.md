---
title: "Object Tracking Demo"
description: "A Streamlit dashboard over YOLOv5 object tracking, with selective blurring, custom detection zones and background masking, running against video, a webcam or an IP stream."
date: 2026-09-21
draft: true
origin: personal
repo: https://github.com/famesjranko/object-tracking-demo
stack:
  - python
  - yolov5
  - pytorch
  - opencv
  - streamlit
---

Built on the YOLOv5 detector and the SORT tracker, this project adds a Streamlit front end and a handful of features aimed at showing object tracking to someone other than the person who wrote it: draw a zone on the frame and detection only fires inside it, blur every detected region instead of drawing a box around it, or render tracks as dots on a blacked-out background.

Detection runs per class with independent confidence thresholds, so a person can be tracked at a 75% threshold and another class at 40% in the same pass, alongside an overall floor. Zones save to and load from a file, so a camera position only needs to be marked up once. The same script accepts a video file, a webcam index or an IP/RTSP stream as its source, and since OpenCV's video capture backend availability varies by platform, it tries the common backends automatically before falling back to a full search rather than failing outright.

The pipeline runs on CPU or GPU, with the CUDA build of PyTorch as an optional install for GPU inference. `app.py` wraps the same detection and tracking pipeline in the Streamlit dashboard, for a click-through demo separate from the command-line script's zone and blur flags.

[View object-tracking-demo on GitHub →](https://github.com/famesjranko/object-tracking-demo)
