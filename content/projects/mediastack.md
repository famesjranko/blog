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

I have run my own self-hosted media stack at home for years, and many friends and family have asked for help with one or wanted one of their own. Setting one up by hand means a Compose file, half a dozen services, and the API keys that connect them. Then the owner needs enough explanation to look after it. MediaStack is my answer: a turnkey setup, as easy and as reliable as I could make it. Its core ideas come from running and maintaining my own stack.

MediaStack turns a bare Debian 12 or 13 server into a complete media stack from one menu. It starts up to 20 containers and configures each service through its own API, so the services already know about each other when setup exits, and the same menu runs the server afterwards. The stack is opinionated: one set of services, one data layout, and security that is on by default.

## The media services

A media server is a group of small programs that each do one job and talk to each other over the local network. MediaStack installs these:

| Service | What it does |
|---|---|
| Jellyfin | Plays the library on phones, TVs and browsers |
| Seerr | A request page where anyone in the household asks for a film or show |
| Sonarr and Radarr | Keep track of the shows and films the household wants, find them, and file them into the library |
| Jackett and FlareSolverr | Search the indexers (sites that list releases) for Sonarr and Radarr, including ones behind Cloudflare |
| qBittorrent and Unpackerr | Download, and unpack any archives |
| Bazarr | Fetches subtitles, if enabled |
| Homepage | A dashboard with a tile for every service |
| Uptime Kuma and Beszel | Watch the services and the server's resources |
| Portainer | A web view of the containers themselves |

When someone requests a film in Seerr, Radarr searches the indexers through Jackett, hands the result to qBittorrent, and files the finished download into the library, where Jellyfin finds it on its next scan.

MediaStack enables no public trackers by default. The wizard offers an example set as an opt-in, and the owner adds indexers only where they have the right to use them.

Sonarr and Radarr have many quality settings, but the wizard asks only two questions: how sharp (720p or 1080p) and how large (compact, balanced or large). The answers select a named profile such as "1080p Balanced", which sets the allowed tiers, the point where upgrades stop, and the size bounds for each tier. Every profile excludes Remux releases, which can reach 25 to 40 GB for one film.

## Installing, and installing again

The install is a clone and one command:

```bash
git clone https://github.com/famesjranko/MediaStack.git MediaStack
cd MediaStack
./mediastack
```

The wizard builds the LAN stack first, then offers hardware transcoding if there is a GPU, then remote access. The owner can skip both add-ons and add them from the menu later. Before the install, the menu can also check the disk, memory, internet and GPU, test the router's port forwarding, and check a domain's DNS.

The image channel defaults to Stable, the exact set of images the project last tested together. MediaStack sets up every service through direct API calls, for its settings, its users and its links to the other services, so an upstream change to an endpoint or a schema can break setup. Stable installs only images that MediaStack's API calls have been tested against. Latest, which pulls whatever upstream published most recently, is labelled as the advanced choice.

Three files control the stack. The Compose file says how the services run. `config.yml` says what to configure and is the file the owner edits. `.env` holds the secrets and is readable only by the install user.

Setup is safe to run again. An installer that simply wrote its settings again would undo every change the owner had made since, so the configure step reads before it writes. For each setting in `config.yml`, it reads the live value through the service's HTTP API and makes one decision. If the value already matches, it skips the setting. If the value differs and is not the upstream default, someone has changed it, so the step reports drift and leaves it alone. It writes only a setting that is absent or still at the upstream default, which is why a change made in a service's own UI survives later runs. Seerr's request quotas are the one exception: they always follow `config.yml`. If the read response lacks the fields that MediaStack expects, the step does not write. MediaStack also never retries a write automatically, because a lost response can hide a write that succeeded.

Some services also need workarounds. Jellyfin's startup endpoint silently does nothing unless the matching GET came first, because the GET creates the root user. Nginx Proxy Manager, the reverse proxy for remote access, has a well-known default login that exists only after its UI wizard has run, so setup seeds the admin account directly, and the stock credentials are never active.

## Storage

Storage follows the TRaSH Guides layout, with downloads and media under one data path on one filesystem. A finished download is therefore hardlinked into the library: the file exists once on disk, seeding continues from the bytes Jellyfin plays, and deleting the torrent leaves the library alone. The wizard offers three places for that data path: a local disk, a NAS over NFS, or a manual mode for owners who want to wire the apps' paths themselves.

## The NAS watchdog

A NAS needs more care, because a network share can disappear while the server keeps running. A container that then writes into the empty mount point fills the local disk instead. The wizard first mounts the export on a throwaway directory and tests it, including a write as the install user, which catches read-only exports and root-squash (an NFS setting that remaps root to an unprivileged user) before anything depends on the share. At install, MediaStack records the mount's source and filesystem type and writes a sentinel file inside the share. An empty mount point is still a directory, so a plain existence check would pass. Every later start therefore checks the live mount against both records.

Docker restarts every MediaStack container automatically, with one exception. On NAS storage, automatic restart is off for the seven services that touch media: Jellyfin, Seerr, Sonarr, Radarr, qBittorrent, Unpackerr and Bazarr. Docker would otherwise start them whether the share is there or not. Instead, a watchdog running as a system service under the install user starts them only after the mount has passed its checks for a full minute, and stops them after thirty seconds of failure. Each check has a time limit, because a hung NFS mount blocks any process that touches it. Since v0.3.0, the watchdog also respects the owner's own stops: a service stopped from the menu stays stopped through reboots and NAS outages.

The watchdog cannot mount or unmount anything itself. Repair goes to a small root-owned helper, reachable through one sudo rule. The helper detaches only NFS mounts and remounts only the recorded export, so nothing in the repository checkout runs as root.

## Remote access

Remote access publishes only Jellyfin and Seerr, over HTTPS behind Nginx Proxy Manager with Let's Encrypt certificates. Every admin page is reachable only from the LAN and the VPN. The wizard's port test opens a temporary listener and confirms that the connection reached this host, which tells "not forwarded" apart from "forwarded to another device".

Everything else goes through a WireGuard VPN, and per-client firewall rules limit what each device can reach. The wizard sets up the owner's first device with one of three tiers: the whole LAN, the server, or the containers. It does not offer narrower tiers for that device, because the owner would lock themselves out of the admin pages. MediaStack also defines two narrow tiers, Jellyfin only and Jellyfin with Seerr, for a relative's phone or TV that the owner adds later in the VPN's web interface.

## Security

When a container publishes a port, Docker opens it on every interface and bypasses the host firewall, so one forwarded port can expose an admin page by accident. MediaStack hooks its own iptables chain into `DOCKER-USER`, the chain Docker keeps for the host's own rules. The chain lets private, loopback and Tailscale addresses reach the admin ports and drops every other source. A systemd unit installs it before Docker starts. If the filter cannot be applied, Docker does not start, so no admin port is published without it.

Access to Docker itself is limited too. Only Portainer mounts the Docker socket. The monitoring agent and Autoheal, which restarts unhealthy containers, go through a proxy that allows five calls and refuses inspect, because an inspect answer includes every container's environment, and the environment holds the secrets.

fail2ban bans an address after five failed logins in thirty minutes. Jellyfin and Seerr start a new dated log file each day, but fail2ban looks for log files only when it reloads, so after midnight it would keep watching yesterday's file and match nothing. A file watcher now reloads fail2ban when a new log appears, and the health check flags any jail still stuck on an old file.

Host hardening, from UFW rules to security-only unattended upgrades, is on by default. Every change is recorded in a root-owned ledger, which uninstall relies on later.

## Hardware transcoding

When a phone or TV cannot play a file as it is, Jellyfin converts it on the fly. A GPU does this much faster than a CPU, but it needs a working driver. Intel and AMD cards need only the video acceleration packages and access to the render device, with no reboot. NVIDIA needs a kernel driver, and the installer offers two modes for it.

Standard installs Debian's packaged driver, which builds its kernel module through DKMS. Unlock installs NVIDIA's own driver and applies a community patch that removes the limit on concurrent encoding sessions on consumer cards. Unlock is opt-in and never the default. The patch runs as root, so MediaStack pins it to a reviewed commit of the patch repository.

If the server already has an NVIDIA driver that MediaStack did not install, setup asks whether to use it, reinstall, or use software transcoding. A new NVIDIA install goes through these steps:

1. **Choose the driver.** MediaStack looks the card up in NVIDIA's support table for the driver version, so an older card gets its legacy branch instead of a current driver that does not support it.
2. **Refuse a card that is too old.** MediaStack knows the oldest driver that Jellyfin's encoder accepts. If the card's newest driver is older than that, it records the card as too old, before any driver download and before anything on the host changes.
3. **Install.** In Standard mode, the kernel headers come first. DKMS silently skips the module build when no headers match the kernel, so without them the install would report success and fail later. MediaStack then confirms a built module for the running kernel and every newer installed kernel, because GRUB boots the newest one.
4. **Reboot past nouveau.** The new driver cannot load while the open-source nouveau driver holds the card. In Unlock mode, setup first caches the downloaded driver. In both modes, setup then writes a marker that records the boot ID and offers to reboot. The boot ID lets setup tell a real reboot from a second run in the same session, so it does not finish early. A one-shot systemd unit runs setup after the reboot and then deletes itself. "Reboot now" and "reboot later" arm the same unit, so an owner who reboots days later still lands in the finishing step.
5. **Prove it.** Jellyfin gets the GPU only once a short test encode has succeeded inside the Jellyfin container. The H.264 test encode must pass. HEVC and AV1 output are enabled only if their own test encodes pass, and hardware decoding is enabled per codec from separate decode tests. Each decode test has two time limits, one inside the container and one on the host, because the NVIDIA decoder on a Tesla P4 once hung and ignored the usual stop signal.
6. **Fall back.** A failure anywhere in the chain turns hardware acceleration off in Jellyfin, regenerates the Compose override without the GPU, and shows the reason in the status screen. A failed Unlock patch is the one exception. The card still encodes at the stock session limit, so hardware encoding stays on, and the menu offers to apply the patch again.

## Running it afterwards

After install, `./mediastack` opens a management menu for logs, updates, health checks, the features skipped in the wizard, and uninstall.

Updates run from the menu, one service at a time or all of them, instead of through an auto-updater. When an update does break a service, the owner needs a way back. Before a service leaves its installed image, MediaStack saves a restore point of its configuration while the old container is stopped, so it never copies a running database. Revert puts back the old image and that configuration, then checks that the service is healthy and that MediaStack can still log in to it.

Uninstall validates the ledger, asks the owner to type `DESTROY`, removes the containers, and then removes only the host changes whose tags or hashes still match the ledger. The secrets file and the ledger go last, so an interrupted uninstall can be retried. The media stays, and so does Docker.

## Building and testing it

MediaStack began as a simple Bash installer script and grew from there, adding standard-library Python helpers to handle JSON. It has stayed Bash because Bash is already on every Debian server and needs no build step, so nothing needs installing beyond git.

The test suite has 79 Docker-in-Docker scenarios, so the test machine stays clean, and 40 of them drive the real wizard prompts through a pseudo-terminal. Contract files declare every endpoint MediaStack calls on each service, and a mock server answers from them, so the real configure script runs against a fake stack on every pull request without pulling an image. The NAS scenarios run a real NFS server and restart it to test the watchdog. Beyond the scenarios, I test live installs on Google Cloud VMs and on local hosts, both bare metal and Proxmox VMs. Together they cover real DNS, certificates, firewalls and GPU passthrough.

Weekly jobs maintain the Stable image set. One opens an issue when an upstream image has moved. One reruns the install scenarios against the moved images and, if they pass, opens a pull request that updates the lock file. The workflow never merges that pull request itself. The third reruns the full install on the accepted images even when nothing moved, to catch breakage from newer Docker, Debian packages or test fixtures.

The source is public under the PolyForm Noncommercial licence. v0.1.0 went out on 23 October 2026, and v0.3.0 a week later.

[View on GitHub&nbsp;→](https://github.com/famesjranko/MediaStack)
