---
title: "ESP32-S3 Internet Monitor"
description: "Firmware for a Waveshare ESP32-S3-Matrix that checks the internet connection every ten seconds and shows the result on an 8x8 LED matrix."
date: 2025-12-02
draft: true
cover: /img/projects/esp32-s3-internet-monitor/cover.jpg
coverAlt: "An ESP32-S3-Matrix board on a wooden desk, powered by a USB-C cable, its 8x8 LEDs glowing in rows from red through yellow to green in front of a painted wall"
origin: personal
repo: https://github.com/famesjranko/esp32-s3-internet-monitor
stack:
  - c++
  - esp32
  - arduino
  - freertos
  - mqtt
---

![An ESP32-S3-Matrix board on a wooden desk, powered by a USB-C cable, its 8x8 LEDs glowing in rows from red through yellow to green in front of a painted wall](/img/projects/esp32-s3-internet-monitor/cover.jpg)

ESP32-S3 Internet Monitor is firmware for the Waveshare ESP32-S3-Matrix, a small board with an ESP32-S3 microcontroller and an 8x8 grid of WS2812B RGB LEDs. It checks the internet connection every ten seconds and shows the result on the matrix as an animated colour: green when the connection is up, yellow after a failed check, and red when it is down.

The firmware is written in Arduino C++ and is MIT licensed. It also serves a web dashboard and can publish its state over MQTT.

## Why I built it

The internet at my property drops out intermittently, and when it does, it is not always clear where the fault lies. It may be my own local network, a DNS problem for instance, or it may be the uplink itself. I wanted a quick visual way to tell, without testing the connection by hand each time: in effect, an uptime monitor I could read at a glance. So I bought the Waveshare board for this purpose and built the firmware as a side project.

## How a check works

Each check is an HTTP request to a connectivity-check URL, the kind phones and laptops use to detect captive portals. The first is Google's `generate_204`, which answers with an empty 204 response; if that fails, the check tries Cloudflare's equivalent. A request gives up if it cannot connect within two seconds, or if the reply stalls for three. Unlike a ping, an HTTP check needs the hostname to resolve and a server on the internet to answer, so it tests what a browser would need.

The result drives a small state machine:

| State | Colour | Meaning |
|---|---|---|
| Online | Green | The last check succeeded |
| Degraded | Yellow | One check failed |
| Down | Red-orange | Two checks in a row failed |
| WiFi lost | Red | The board lost its WiFi connection; checks pause until it reconnects |
| Setup | Purple | No WiFi configured; the setup portal is open |

One success returns the state to online. Losing WiFi is a separate state from losing the internet, which separates a fault in the local network from a fault upstream. However, the check resolves hostnames through the network's own DNS server, so a local DNS fault still shows as down.

## The display

The state colour is shown through one of eighteen effects, chosen from the dashboard. They range from a solid fill and a slow pulse to rain, fire, plasma, Pong and Conway's Game of Life. Most effects draw in the current state colour. Six of them, such as the rainbow and the plasma, show their own colours while the connection is up and switch to the state colour when it is not. Either way, the colour fades over half a second when the state changes. Effects that need a sine or a distance for every pixel use a lookup table and the fast inverse square root from *Quake III*, which keeps each frame cheap.

![The dashboard effects card: eighteen effect buttons with Rain selected, then sliders for brightness at 18 of 50 and speed at 36%, and rotation buttons with 180° selected](/img/projects/esp32-s3-internet-monitor/effects.jpg "The effects card, with Rain selected. All screenshots here come from a host preview of the firmware's web code, with sample data.")

## Two cores

The effects draw a new frame every 16 milliseconds, about 60 a second, but a connectivity check can wait several seconds on a dead connection. If both ran on one core, the animation would stutter during each slow check. The ESP32-S3 has two cores, and the firmware gives the display one of them. The LED task is pinned to core 0, while the connectivity check, the web server and the MQTT client all run on core 1, so a slow check cannot stall the animation. Changes to the shared state are made inside a critical section, so neither core reads it half-written. A 60-second watchdog reboots the board if a task stops responding.

## Setup and the dashboard

The board is set up and controlled from a browser. WiFi credentials are not compiled in. On first boot, the board opens an open access point named `InternetMonitor-Setup` and serves a portal that scans for networks and takes the password.

![The setup portal: a list of five nearby WiFi networks with signal bars, a Scan Again button, a dashboard password field and a Connect button](/img/projects/esp32-s3-internet-monitor/portal.jpg "The setup portal, served from the board's own access point.")

Once the board joins its network, it serves a password-protected dashboard that sets the effect, brightness, speed and rotation, and shows the uptime, success rate, downtime, WiFi signal and chip temperature. The password is stored as a SHA-256 hash, and five failed logins lock the form for a minute.

![The full dashboard: an ONLINE status banner, the effects card, statistics, network details for HomeNetwork at 192.168.1.50, collapsed MQTT, System and Diagnostics sections, and a Factory Reset button](/img/projects/esp32-s3-internet-monitor/dashboard.jpg "The dashboard as it first loads.")

Settings are saved to flash and survive a reboot. Firmware updates go over WiFi, and holding the BOOT button for five seconds resets the board to the setup portal.

## MQTT and Home Assistant

The board can also report its state to other systems over MQTT. When a broker is configured, the board publishes its state as a retained JSON message every thirty seconds, with a last-will message that marks it offline if it drops off. An optional Home Assistant discovery setting registers eight sensors without any configuration on the Home Assistant side.

![The MQTT card: status Connected, broker settings, a 30-second interval, Home Assistant discovery switched off, and Test, Save and Reset buttons](/img/projects/esp32-s3-internet-monitor/mqtt.jpg "The MQTT card. A change to the connection settings must pass a test before it can be saved.")

## Board notes

The firmware is written for this board only. Its LEDs take colour data in RGB order, not the GRB order most WS2812B code assumes, and the matrix is wired in plain rows, not the zigzag layout many LED matrices use. Brightness is capped at 50 of 255, because more can damage the board.

[View esp32-s3-internet-monitor on GitHub →](https://github.com/famesjranko/esp32-s3-internet-monitor)
