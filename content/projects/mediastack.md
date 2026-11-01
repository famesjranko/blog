---
title: "MediaStack"
description: "A menu-driven installer that turns a bare Debian server into a secure home media stack, then manages it day to day."
date: 2026-10-30
draft: false
cover: /img/projects/mediastack/cover.jpg
coverAlt: "A small open-frame server stands on a wooden sideboard between a houseplant and a row of records. A blue network cable is plugged into the server, and coloured boxes bearing the stack's service logos are piped into it from above"
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

![A small open-frame server stands on a wooden sideboard between a houseplant and a row of records. A blue network cable is plugged into the server, and coloured boxes bearing the stack's service logos are piped into it from above](/img/projects/mediastack/cover.jpg)

I have run a self-hosted media stack at home for years, and friends and family have asked for help with one or wanted one of their own. Setting one up by hand means a Compose file, half a dozen services, and the API keys that connect them. Then the owner needs enough explanation to look after it. MediaStack is my answer: a home media server that is practical to install and to look after, built from what running my own has taught me.

MediaStack turns a bare Debian 12 or 13 server into a complete media stack from one menu. It starts up to 20 containers and configures each service through its own API, so the services already know about each other when setup exits. The same menu runs the server afterwards. The stack is opinionated: one set of services, one data layout, and security that is on by default.

## The media services

Jellyfin plays the films and shows in the library. Seerr takes requests from the household. Sonarr and Radarr manage the shows and films, Jackett searches the indexers, qBittorrent downloads, and Unpackerr unpacks. Homepage provides a dashboard, Uptime Kuma and Beszel monitor the stack, Portainer manages the containers, and Bazarr supplies subtitles.

When someone requests a film in Seerr, Radarr searches the indexers through Jackett, hands the result to qBittorrent, and files the finished download into the library, where Jellyfin finds it on its next scan.

MediaStack enables no public trackers. The owner adds indexers only where they have the right to use them.

Sonarr and Radarr have many quality settings, but the wizard asks two questions: how sharp (720p or 1080p) and how large (compact, balanced or large). The answers select a named profile such as "1080p Balanced", which sets the allowed quality tiers, the upgrade cutoff, and the size bounds for each tier. Every profile excludes Remux releases, which can reach 40 GB for one film.

## Installing

![The MediaStack install menu in a terminal: a status box showing Not yet installed, the host, LAN, router and public IPs, above the options Install MediaStack, System readiness check, Test port forwarding, Check domain DNS and Quit](/img/projects/mediastack/install-menu.jpg "Installation and preflight checks.")

Clone the repository and run the installer:

```bash
git clone https://github.com/famesjranko/MediaStack.git MediaStack
cd MediaStack
./mediastack
```

The wizard builds the LAN stack first, then offers hardware transcoding if there is a GPU, then remote access. The owner can skip both and add them from the menu later.

Images come from the Stable channel by default: the exact set the project last tested together. MediaStack configures every service through its API, so an upstream change to an endpoint or schema can break setup. Stable therefore installs only images that have passed MediaStack's API integration tests. Latest, which pulls whatever upstream published most recently, is the advanced choice.

Three files control the stack. The Compose file says how the services run. The owner edits `config.yml` to say what to configure. `.env` holds the secrets and is readable only by the install user.

## Running it afterwards

![The MediaStack management menu in a terminal: a status box showing 11 of 11 containers running, the domain, host, LAN, router and public IPs, above a list of options from View access info to Uninstall MediaStack](/img/projects/mediastack/menu.jpg "Everyday management, updates and recovery.")

After install, `./mediastack` opens the management menu. Its entries are the jobs an owner would otherwise ask me about, so it is the part of MediaStack I care about most.

Updates run from the menu, one service at a time or all of them, rather than through an auto-updater. When an update breaks a service, the owner needs a way back. Before updating a service's image, MediaStack saves a restore point of the service's configuration while the old container is stopped. This avoids copying a running database. Revert puts back the old image and that configuration, then checks that the service is healthy and that MediaStack can still log in to it.

Uninstall asks the owner to type `DESTROY`, then removes the containers and only those host changes that still match the ledger kept at install. The media stays, and so does Docker.

## Setting up again

Setup is built to be run again. An installer that simply wrote its settings again would undo every change the owner had made in a service's own UI, so the configure step reads before it writes. MediaStack compares most settings with their live values and writes them only when they are absent or still at the upstream default; it reapplies a few on every run. For settings checked this way, a value the owner has changed is reported and left alone: a quality profile edited in Sonarr stays as the owner left it, and the log names two ways to resolve the difference. A read that lacks the fields MediaStack expects stops the write, and no write is retried automatically, because a lost response can hide a write that succeeded.

## Storage and the NAS watchdog

Storage follows the TRaSH Guides layout: downloads and media share one filesystem, so a finished download is hardlinked into the library. The file exists once on disk, and deleting the torrent leaves the library alone. The wizard offers a local disk, a NAS over NFS, or a manual mode for owners who wire the apps' paths themselves.

A NAS needs more care, because a network share can disappear while the server keeps running. An empty mount point is still an ordinary directory, so a container that writes into it fills the local disk instead, and a plain existence check never notices. MediaStack therefore tests the export before anything depends on it, records the mount's source and type, and writes a sentinel file inside the share. Every later start checks the live mount against those records.

MediaStack disables Docker's automatic restart for the services that touch media. A watchdog, on by default for NAS installs and switchable from the menu, starts them only after the mount has passed its checks for a full minute and stops them when the share goes away. Each check has a time limit, because a hung NFS mount blocks any process that touches it. Remounting goes through a small root-owned helper that handles only the recorded export, so nothing in the repository checkout runs as root.

## Remote access and security

Remote access publishes only Jellyfin and Seerr, over HTTPS behind Nginx Proxy Manager with Let's Encrypt certificates. Every admin page stays on the LAN and the WireGuard VPN, and per-client firewall rules limit what each VPN device can reach: the whole LAN, the server, the containers, or just Jellyfin, with or without Seerr, for a relative's TV.

![How MediaStack is wired, from the internet to the filesystem](/img/projects/mediastack/stack.svg "The stack with remote access enabled: public entry points, private administration and shared storage.")

The admin-port filter keeps the admin pages off the public internet. When a container publishes a port, Docker opens it on every interface and bypasses the host firewall, so one forwarded port can expose an admin page by accident. MediaStack's own chain in `DOCKER-USER` closes that gap. The filter is on by default and can be switched off; while it is on, a failure to apply it stops Docker from starting. Around it sit fail2ban, UFW and security-only unattended upgrades, each recorded in a root-owned ledger for uninstall.

## Hardware transcoding

When a phone or TV cannot play a file as it is, Jellyfin converts it on the fly, and a GPU does this far faster than a CPU. MediaStack sets up Intel, AMD and NVIDIA cards, including the driver install and reboot an NVIDIA card needs. The [setup documentation](https://github.com/famesjranko/MediaStack/blob/main/docs/setup/setup-flow.md) covers the full sequence.

Jellyfin gets the GPU only after a test encode has succeeded inside the Jellyfin container, and HEVC, AV1 and hardware decoding are each enabled only when their own test passes. Those tests showed me that the decoder on a Tesla P4 can hang and ignore the usual stop signal. Each decode test now has a time limit inside the container and another on the host. A failure anywhere turns hardware acceleration off, regenerates the Compose override without the GPU, and shows the reason in the status screen.

## Testing it

MediaStack began as a Bash installer script and has stayed Bash, with standard-library Python for JSON, because Bash is already on every Debian server and needs no build step.

The test suite uses Docker-in-Docker to keep the test machine clean. Half the scenarios drive the real wizard prompts through a pseudo-terminal. Contract files declare every endpoint MediaStack calls on each service. A mock server uses those files to answer requests, so the configure script runs against a fake stack on every pull request without pulling an image. The NAS scenarios run a real NFS server and restart it to test the watchdog.

Beyond the suite, I install on Google Cloud VMs, bare metal and Proxmox VMs, which cover real DNS, certificates, firewalls and GPU passthrough.

Weekly jobs check whether an upstream tag now points at a new image, rerun the installs against the new ones, and open a pull request to update the lock file. The workflow never merges it. That decision stays with me.

## Where it stands

MediaStack is at v0.3.0, source available under the PolyForm Noncommercial licence. It has taken over the part I used to do by hand for each person: the install is a clone and a menu, and the questions it asks are ones a household can answer. What it leaves with the owner is deliberate. A domain, the router's port forwarding and the choice of indexers are theirs, and when a health check reports a problem, the report is written for them to act on.

Handing a system to someone else turned out to be mostly a matter of deciding what to protect them from and what to leave in their hands. Each of those decisions needed a test that could fail before I trusted it.

[View on GitHub&nbsp;→](https://github.com/famesjranko/MediaStack)
