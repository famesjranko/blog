---
title: "ESP32-S3 Internet Monitor"
description: "A Waveshare ESP32-S3 board with an 8x8 RGB matrix that checks internet connectivity every ten seconds and shows the result as an animated colour effect, with MQTT and a web dashboard."
date: 2026-09-21
draft: true
origin: personal
repo: https://github.com/famesjranko/esp32-s3-internet-monitor
stack:
  - c++
  - esp32
  - arduino
  - mqtt
  - home-assistant
---

Checking whether the internet is actually down usually means opening a laptop and running a speed test. This project puts the answer on a shelf instead: a Waveshare ESP32-S3 board with a built-in 8x8 WS2812B LED matrix polls connectivity every ten seconds and renders the result as one of eighteen animated effects, green through yellow to red as the connection degrades and then drops.

The firmware splits across the ESP32-S3's two cores: LED effects run on one core at 60fps, networking and the web server on the other, so the animation stays smooth regardless of what the connectivity check is doing. On first boot with no WiFi configured, the device opens a captive config portal to take the network credentials; day to day, a password-protected dashboard (the password stored as a SHA-256 hash, with rate-limited login) picks the effect, brightness, speed and rotation, and shows uptime, success rate, WiFi signal and CPU temperature.

Status also goes out over MQTT, with an optional Home Assistant auto-discovery flag that registers connectivity, uptime, signal and temperature as entities without hand-written YAML. Settings persist across reboot, a watchdog timer reboots the device if it hangs, firmware updates go out over WiFi, and holding the BOOT button for five seconds does a hardware factory reset back to the config portal.

[View esp32-s3-internet-monitor on GitHub →](https://github.com/famesjranko/esp32-s3-internet-monitor)
