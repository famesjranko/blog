---
title: "MediaStack"
description: "A single menu-driven installer that turns a bare Debian box into a full home media server: Jellyfin, Sonarr, Radarr, qBittorrent, monitoring, and remote access."
date: 2026-09-21
draft: true
origin: personal
repo: https://github.com/famesjranko/MediaStack
stack:
  - bash
  - docker
  - docker-compose
  - jellyfin
  - sonarr
  - radarr
  - qbittorrent
  - wireguard
---

Setting up a home media server usually means reading a wiki, copying a Compose file, and wiring API keys between half a dozen services by hand, then doing it again for the next box. MediaStack turns that into one command: point `./mediastack` at a bare Debian host and it runs the full install from a menu, detecting the GPU, laying out storage (local, NAS/NFS, or manual), hardening the host, starting the containers, and configuring every service through its own API.

The stack itself is nineteen containers behind Docker Compose: Jellyfin, Seerr, Sonarr, Radarr, qBittorrent, Jackett, a reverse proxy and WireGuard for remote access, and a set of monitoring and maintenance services. Data follows the TRaSH Guides layout, so a completed download hardlinks into the media library instead of being copied, and removing the finished torrent never touches the library's copy of the same file. By the time setup exits, the services already know about each other: Sonarr and Radarr point at qBittorrent, Jellyfin and Seerr point at Sonarr and Radarr, and the quality profile picked in the install wizard is set as the default for requests made through Seerr.

`./mediastack` doesn't stop being useful once the stack is running. The same entry point becomes a day-2 menu: service status and logs, per-service updates with a revert to the previously installed image, fail2ban's ban list and jail stats, TLS and DNS drift checks, and hardware transcoding setup. Everything the installer changed on the host is tracked, so uninstalling removes those changes while leaving `data/` and `config/` in place.

[View MediaStack on GitHub →](https://github.com/famesjranko/MediaStack)
