---
title: "MediaStack"
description: "A menu-driven installer that turns a bare Debian server into a secure home media stack, then manages it day to day."
date: 2026-10-30
draft: false
cover: /img/projects/mediastack/cover.jpg
coverAlt: "A small open-frame server on a wooden sideboard, a blue network cable plugged in, with coloured boxes bearing the stack's service logos piped into it from above, between a houseplant and a row of records"
origin: personal
repo: https://github.com/famesjranko/MediaStack
stack:
  - bash
  - python
  - docker
  - docker-compose
  - jellyfin
  - sonarr
  - radarr
  - qbittorrent
  - wireguard
  - fail2ban
  - nfs
---

![A small open-frame server on a wooden sideboard, a blue network cable plugged in, with coloured boxes bearing the stack's service logos piped into it from above, between a houseplant and a row of records](/img/projects/mediastack/cover.jpg)

I have run my own self-hosted media stack at home for years, and friends and family have asked for help with one or wanted one of their own. Setting one up by hand means a Compose file, half a dozen services, and the API keys that connect them. Then the owner needs enough explanation to look after it. MediaStack is my answer: a home media server that is practical to install and to look after, built from what running my own has taught me.

MediaStack turns a bare Debian 12 or 13 server into a complete media stack from one menu. It starts up to 20 containers and configures each service through its own API, so the services already know about each other when setup exits. The same menu runs the server afterwards. The stack is opinionated: one set of services, one data layout, and security that is on by default.

## The media services

Jellyfin plays the library on phones, TVs and browsers. Seerr is a request page where anyone in the household asks for a film or show. Sonarr and Radarr track the shows and films the household wants, search for them through Jackett, and file them into the library. qBittorrent downloads, and Unpackerr unpacks. Around them sit a Homepage dashboard, Uptime Kuma and Beszel for monitoring, Portainer for the containers, and Bazarr for subtitles.

When someone requests a film in Seerr, Radarr searches the indexers through Jackett, hands the result to qBittorrent, and files the finished download into the library, where Jellyfin finds it on its next scan. MediaStack enables no public trackers. The owner adds indexers only where they have the right to use them.

<div class="theme-light-only">

![Two-row pipeline: Seerr requests a film or show; Radarr or Sonarr searches through Jackett and manages the qBittorrent download; Unpackerr extracts archives; Radarr or Sonarr hardlinks the file from /data/torrents/ into /data/media/ on one filesystem; Jellyfin scans and plays the library](/img/projects/mediastack/pipeline.svg "A request passes from Seerr through search and download to Jellyfin. Radarr or Sonarr hardlinks the finished download into the library, so seeding continues without a second copy.")

</div>

<div class="theme-dark-only">

![Two-row pipeline: Seerr requests a film or show; Radarr or Sonarr searches through Jackett and manages the qBittorrent download; Unpackerr extracts archives; Radarr or Sonarr hardlinks the file from /data/torrents/ into /data/media/ on one filesystem; Jellyfin scans and plays the library](/img/projects/mediastack/pipeline-dark.svg "A request passes from Seerr through search and download to Jellyfin. Radarr or Sonarr hardlinks the finished download into the library, so seeding continues without a second copy.")

</div>

Sonarr and Radarr have many quality settings, but the wizard asks two questions: how sharp (720p or 1080p) and how large (compact, balanced or large). The answers select a named profile such as "1080p Balanced", which sets the allowed tiers, the upgrade cutoff, and the size bounds for each. Every profile excludes Remux releases, which can reach 40 GB for one film.

## Installing

![The MediaStack install menu in a terminal: a status box showing Not yet installed, the host, LAN, router and public IPs, above the options Install MediaStack, System readiness check, Test port forwarding, Check domain DNS and Quit](/img/projects/mediastack/install-menu.jpg "The menu before install. The checks can run before anything is changed.")

The install is a clone and one command:

```bash
git clone https://github.com/famesjranko/MediaStack.git MediaStack
cd MediaStack
./mediastack
```

The wizard builds the LAN stack first, then offers hardware transcoding if there is a GPU, then remote access. The owner can skip both and add them from the menu later. The checks above the install entry run before anything on the host changes.

Images come from the Stable channel by default: the exact set the project last tested together. Because MediaStack configures every service through its API, an upstream change to an endpoint or a schema can break setup, and Stable installs only images those calls have passed against. Latest, which pulls whatever upstream published most recently, is the advanced choice.

Three files control the stack. The Compose file says how the services run. `config.yml` says what to configure and is the file the owner edits. `.env` holds the secrets and is readable only by the install user.

## Running it afterwards

![The MediaStack management menu in a terminal: a status box showing 11 of 11 containers running, the domain, host, LAN, router and public IPs, above a list of options from View access info to Uninstall MediaStack](/img/projects/mediastack/menu.jpg "The menu after install. Each entry opens a submenu for that job.")

After install, `./mediastack` opens the management menu. Its entries are the jobs an owner would otherwise ask me about, so it is the part of MediaStack I care about most.

Updates run from the menu, one service at a time or all of them, rather than through an auto-updater. When an update breaks a service, the owner needs a way back. Before a service leaves its installed image, MediaStack saves a restore point of its configuration while the old container is stopped, so it never copies a running database. Revert puts back the old image and that configuration, then checks that the service is healthy and that MediaStack can still log in to it.

Uninstall asks the owner to type `DESTROY`, then removes the containers and only those host changes that still match the ledger kept at install. The media stays, and so does Docker.

## Setting up again

Setup is safe to run again. An installer that simply wrote its settings again would undo every change the owner had made in a service's own UI, so the configure step reads before it writes. For each setting in `config.yml`, it reads the live value through the service's API. A matching value is skipped, and an absent or upstream-default value is written. What happens to a value someone has changed depends on the setting. Most are reported as drift and left alone: a quality profile edited in Sonarr stays as the owner left it, and the log names two ways to resolve the difference. A few, such as qBittorrent's connection limits and Seerr's request quotas, always follow `config.yml`. A read that lacks the fields MediaStack expects stops the write, and no write is retried automatically, because a lost response can hide a write that succeeded.

## Storage and the NAS watchdog

Storage follows the TRaSH Guides layout: downloads and media share one filesystem, so a finished download is hardlinked into the library. The file exists once on disk, and deleting the torrent leaves the library alone. The wizard offers a local disk, a NAS over NFS, or a manual mode for owners who wire the apps' paths themselves.

A NAS needs more care, because a network share can disappear while the server keeps running. An empty mount point is still an ordinary directory, so a container that writes into it fills the local disk instead, and a plain existence check never notices. MediaStack therefore tests the export before anything depends on it, records the mount's source and type, and writes a sentinel file inside the share. Every later start checks the live mount against those records.

Docker's automatic restart is turned off for the services that touch media. A watchdog, on by default for NAS installs and switchable from the menu, starts them only after the mount has passed its checks for a full minute and stops them when the share goes away. Each check has a time limit, because a hung NFS mount blocks any process that touches it. Remounting goes through a small root-owned helper that handles only the recorded export, so nothing in the repository checkout runs as root.

## Remote access and security

Remote access publishes only Jellyfin and Seerr, over HTTPS behind Nginx Proxy Manager with Let's Encrypt certificates. Every admin page stays on the LAN and the WireGuard VPN, and per-client firewall rules limit what each VPN device can reach: the whole LAN, the server, the containers, or, for a relative's TV, Jellyfin alone.

<div class="theme-light-only">

![Three routes into MediaStack: a browser or app crosses the router on HTTPS to Nginx Proxy Manager, which holds a Let's Encrypt certificate and publishes only Jellyfin and Seerr; a WireGuard device crosses the router on UDP 51820 and receives one firewall tier, the whole LAN, the server, the containers, or Jellyfin only; a laptop at home reaches every service and admin page directly. A panel notes that admin ports accept only private, loopback and Tailscale sources, that other sources are dropped even after a mistaken port forward, and that Docker does not start unless the rules load](/img/projects/mediastack/remote.svg "Away from home, HTTPS reaches only Jellyfin and Seerr, and a WireGuard device gets one tier. The admin pages answer private addresses only, whatever the router forwards.")

</div>

<div class="theme-dark-only">

![Three routes into MediaStack: a browser or app crosses the router on HTTPS to Nginx Proxy Manager, which holds a Let's Encrypt certificate and publishes only Jellyfin and Seerr; a WireGuard device crosses the router on UDP 51820 and receives one firewall tier, the whole LAN, the server, the containers, or Jellyfin only; a laptop at home reaches every service and admin page directly. A panel notes that admin ports accept only private, loopback and Tailscale sources, that other sources are dropped even after a mistaken port forward, and that Docker does not start unless the rules load](/img/projects/mediastack/remote-dark.svg "Away from home, HTTPS reaches only Jellyfin and Seerr, and a WireGuard device gets one tier. The admin pages answer private addresses only, whatever the router forwards.")

</div>

One firewall rule holds that promise. When a container publishes a port, Docker opens it on every interface and bypasses the host firewall, so one forwarded port can expose an admin page by accident. MediaStack's own chain in `DOCKER-USER` closes that gap, and Docker does not start without it. Around it sit fail2ban, UFW and security-only unattended upgrades, each recorded in a root-owned ledger for uninstall.

## Hardware transcoding

When a phone or TV cannot play a file as it is, Jellyfin converts it on the fly, and a GPU does this far faster than a CPU. MediaStack sets up Intel, AMD and NVIDIA cards, including the driver install and reboot an NVIDIA card needs. The documentation covers the full sequence.

Jellyfin gets the GPU only after a test encode has succeeded inside the Jellyfin container, and HEVC, AV1 and hardware decoding are each enabled only when their own test passes. Those tests are how I found that the decoder on a Tesla P4 can hang and ignore the usual stop signal, so each decode test now has a time limit inside the container and another on the host. A failure anywhere turns hardware acceleration off, regenerates the Compose override without the GPU, and shows the reason in the status screen.

## Testing it

MediaStack began as a Bash installer script and has stayed Bash, with standard-library Python for JSON, because Bash is already on every Debian server and needs no build step.

The test suite runs Docker-in-Docker scenarios, so the test machine stays clean, and half of them drive the real wizard prompts through a pseudo-terminal. Contract files declare every endpoint MediaStack calls on each service, and a mock server answers from them, so the configure script runs against a fake stack on every pull request without pulling an image. The NAS scenarios run a real NFS server and restart it to test the watchdog. Beyond the suite, I install on Google Cloud VMs, bare metal and Proxmox VMs, which cover real DNS, certificates, firewalls and GPU passthrough. Weekly jobs check whether the Stable images have moved, rerun the installs against the new ones, and open a pull request to update the lock file. I merge it.

## Where it stands

MediaStack is at v0.3.0, source available under the PolyForm Noncommercial licence. It has taken over the part I used to do by hand for each person: the install is a clone and a menu, and the questions it asks are ones a household can answer. What it leaves with the owner is deliberate. A domain, the router's port forwarding and the choice of indexers are theirs, and when a health check reports a problem, the report is written for them to act on. Handing a system to someone else turned out to be mostly a matter of deciding what to protect them from and what to leave in their hands, and each of those decisions needed a test that could fail before I trusted it.

[View on GitHub&nbsp;→](https://github.com/famesjranko/MediaStack)
