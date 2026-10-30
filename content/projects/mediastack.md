---
title: "MediaStack"
description: "A menu-driven installer that turns a bare Debian server into a home media stack, then manages it: Jellyfin, Sonarr, Radarr, qBittorrent, monitoring, and hardened remote access."
date: 2026-10-30
draft: true
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

I have run a self-hosted media server at home for years: Jellyfin for playback, Sonarr and Radarr for the library, qBittorrent for downloads, and Seerr so other people can ask for things. Friends and family who used it, or saw it, tended to say the same thing: they would love one of their own, but they would not know where to start, so could I set it up for them? Doing that by hand means a Compose file, half a dozen services, and API keys wired between them, and then explaining the ecosystem well enough for them to look after it. I started thinking about how I would do that for several households without being the one who maintains every box. It had to be easy to follow, so that a person could learn the stack as they went, and it had to be secure, reliable and hard to break by accident. That is why I built MediaStack.

MediaStack takes a bare Debian 12 or 13 server and builds the whole stack from one menu, up to 20 containers, and configures every service through its own API so the services already know about each other when setup exits. The management side came from the same need. Installing is the easy part; the questions arrive later, when an image needs updating, a certificate expires, or something stops. So the same menu runs the box afterwards: updates with a revert, health and security checks, GPU transcoding, and an uninstall that removes only what it added.

The stack is opinionated. There are many ways to choose services for a media server and many ways to secure them, and MediaStack is my preferred approach: one set of services that I run myself, one data layout, and security that is on by default and fails closed when it cannot be sure. The code is Bash with Python helpers from the standard library, so there is no build step and nothing to install beyond git. It was only ever meant to be a private project, but the more work went into it, the more it seemed that other people might find it useful, since a media server is a common first step into self-hosting and home labs. The first tagged release, v0.1.0, went out on 23 October 2026, and v0.3.0 followed a week later. The source is public under the PolyForm Noncommercial licence.

## The media services

A media server is a group of small programs that each do one job and talk to each other over the local network. MediaStack installs these:

| Service | What it does |
|---|---|
| Jellyfin | Plays your library on phones, TVs and browsers |
| Seerr | A request page where household members ask for a film or show |
| Sonarr and Radarr | Keep track of the shows and films you want, find them, and file them into the library |
| Jackett and FlareSolverr | Talk to the indexers that Sonarr and Radarr search, including ones behind Cloudflare |
| qBittorrent and Unpackerr | Download, and unpack any archives |
| Bazarr | Fetches subtitles, if enabled |
| Homepage | A dashboard with a tile for every service |
| Uptime Kuma and Beszel | Watch the services and the server's resources |
| Portainer | A web view of the containers themselves |

When a request is made in Seerr, Radarr or Sonarr searches the indexers through Jackett, hands the result to qBittorrent, and files the finished download into the library. Jellyfin picks it up on its next scan and Bazarr adds subtitles. No public trackers are enabled by default; adding indexers is a choice the user makes, where they have the right to use them.

Quality is one of the few things the wizard asks about. Instead of exposing the many settings Sonarr and Radarr have for it, it asks two questions: how sharp, 720p or 1080p, and how large, compact, balanced or large. The answers combine into a named profile such as "1080p Balanced", which sets the allowed quality tiers, the point at which upgrades stop, and the size bounds for every tier. Remux releases, which can be 25 to 40 GB for one film, are excluded from every profile because they do not fit a home server. The profile can be changed from the menu later.

## The wizard

The install starts with a clone and one command:

```bash
git clone https://github.com/famesjranko/MediaStack.git MediaStack
cd MediaStack
./mediastack
```

Before the install, the menu offers a readiness check for disk, memory, internet and GPU, a port-forwarding test, and a DNS check for a domain. It also offers to install gum, which turns the numbered menus into arrow-key menus. The wizard itself runs in three stages. The first stage collects the admin account, storage, subtitles, file sharing, quality, indexers, the image channel, download limits and the security choices, shows a plan, and then builds the LAN stack. The second stage offers hardware transcoding if a GPU is present. The third adds remote access. Both of the later stages can be skipped and added from the menu afterwards.

Two choices in the first stage are deliberate. The admin password is one password for every service, so the wizard never generates it. The user types it, and it is shown once in the install summary and then kept behind a reveal prompt in the menu. The image channel defaults to Stable, which installs the exact set of container images the project last tested together. Latest, which pulls whatever upstream published most recently, is labelled as the advanced choice.

The wizard is safe to run again. It skips what is already configured, reports what has changed, and never overwrites a setting the user changed themselves. How that works is covered below.

## Storage

The wizard offers local disk, a NAS over NFS, or a manual mode for people who want to wire the apps' paths themselves. Whichever is chosen, the folders follow the TRaSH Guides layout: a torrents folder and a media folder under one data path, with every service that handles files seeing the same path. Because they are on one filesystem, a finished download is hardlinked into the library. The file exists once on disk, seeding continues from the same bytes Jellyfin plays, and deleting the torrent later leaves the library alone. Jellyfin sees the media read-only.

A NAS needs more care, because a network share can disappear while the server keeps running, and a container that writes into an empty mount point will quietly fill the local disk instead. The NAS layer is built around that failure.

During the wizard, the export is mounted on a throwaway directory, never the real mount point, and checked in four steps: the NAS answers on the network, the export mounts, it can be read, and the install user can write to it. The write test catches read-only exports and root-squash before anything depends on the share. The probe uses short timeouts, so an unreachable NAS fails in about ten seconds instead of hanging. At install, MediaStack records the mount's source and filesystem type and writes a sentinel file inside the share. Every later start compares the live mount against those recorded values and checks for the sentinel. A directory that merely exists is not enough.

The services that touch media have Docker's automatic restart turned off. Instead, a watchdog runs as a system service under the installing user, polling every fifteen seconds. It starts those containers only after the mount has verified for a full minute, and stops them if it has been failing for thirty seconds. Its checks are bounded, because a hung NFS mount will block any process that touches it, and a stalled call ignores the usual termination signal until the server answers. A probe that hangs is killed and counted; three in a row and the NAS is treated as down.

The watchdog cannot mount anything itself. Repair is delegated to a small root-owned helper, reachable through exactly one sudo rule, which reads only root-owned configuration and only detaches NFS mounts. It refuses to touch a mount that the system's own fstab describes differently, and it uses a lazy unmount only when a mount has stopped answering, since a plain unmount of a dead NFS mount blocks forever. The split exists so that nothing in the repository checkout ever runs as root.

Since v0.3.0 the watchdog also remembers what the user meant. A service stopped from the menu stays stopped through reboots and NAS outages, and the health screen says that is why. If the file that records those stops cannot be read, nothing starts, because the user's stops might be hidden in what cannot be read.

## Remote access

Remote access is optional, and it is the stage where a home server meets the internet. The wizard walks through it in five steps: a domain and a dynamic DNS provider, a router port test, the VPN, a bitrate cap for remote viewers, and a confirmation.

Only two services are published over HTTPS: Jellyfin and Seerr. They sit behind Nginx Proxy Manager, which obtains and renews Let's Encrypt certificates and adds the usual security headers. Every admin interface, including Sonarr, Radarr, qBittorrent, Portainer, the proxy's own admin page and the VPN's admin page, stays on the LAN and the VPN. Six dynamic DNS providers are supported, and the credentials are checked in a throwaway container before they are saved. Four router forwards are needed: the two web ports, the torrent port, and the VPN port. The port test does more than ask an external service to connect: it opens a temporary listener and confirms that the connection landed on this host, so it can tell "not forwarded" from "forwarded to another device".

For everything else there is a WireGuard VPN with a web interface for adding devices. Each device gets an access tier, enforced by firewall rules per client: the whole LAN, the server only, the containers only, Jellyfin only, or Jellyfin and Seerr only. The last two are meant for a relative's phone or TV. The wizard does not offer them for the first device, because the owner would lock themselves out of the admin pages.

## Security

Docker has a habit that surprises people: when a container publishes a port, Docker opens it on every network interface, bypassing the host firewall. A home server with a forwarded port can expose an admin page to the internet without anyone intending it. MediaStack's answer is its own iptables chain, hooked into the one chain Docker consults, which lets private, loopback and Tailscale address ranges through and drops every other source for the admin ports. A systemd unit installs the chain before Docker starts, and a drop-in makes Docker require it and verify it after starting. If the filter cannot be applied, Docker does not start. The stack going down is the preferred outcome over admin pages going public. The design record explains why the alternatives were rejected: binding admin ports to the loopback address would, for the intended user, be the same as removing the feature, and binding them to the LAN address would silently stop working after a DHCP change.

Several services need to ask Docker about the containers. Only Portainer mounts the Docker socket directly. The monitoring agent and Autoheal go through a proxy that allows five calls: list containers, read stats, version, info and restart. Inspect is refused, because its answer includes every container's environment, which is where the secrets live. The cost is that Beszel cannot show per-container logs, which is accepted.

fail2ban watches the login logs of Jellyfin, Seerr and the proxy and bans an address after five failures in thirty minutes, doubling the ban each time up to a day. VPN addresses are never banned, since VPN peers are trusted by design. There was a quiet failure in this arrangement: Jellyfin and Seerr open a new dated log file each day, and fail2ban only looks for files when it reloads, so after midnight it would keep tailing yesterday's file and stop matching. An inotify watcher now reloads fail2ban when a new log file appears, a timer reloads it every six hours regardless, and the health check flags a jail stuck on a stale file.

Host hardening is on by default and recorded. UFW is enabled with rules tagged as MediaStack's own, and an SSH allow is kept even when the user turns UFW off. Unattended upgrades are limited to security updates, with kernel and NVIDIA packages excluded and automatic reboots off. A sysctl file sets the usual network protections and is applied on its own, because applying the whole system set would switch off the IP forwarding that Docker and WireGuard need. Every change goes into a root-owned ledger so that uninstall can take back exactly what was added.

Some of the opinions are about what to leave out. Rate limiting on the proxy ships disabled, because a limit at the server level applies to streaming too, and a household behind one address could hit errors mid-playback and then ban itself. One residual risk is written down rather than hidden: three of the DDNS providers put the credential in the request URL, and the updater logs that URL on a network failure. MediaStack shortens the log retention and points the user to the narrowest credential each provider offers.

## Hardware transcoding

When a phone or TV cannot play a file as it is, Jellyfin has to convert it on the fly, and on a CPU that is slow. A GPU does it easily, but getting a GPU driver installed and proven on a headless Debian box is the part of a home server build that most often goes wrong. This stage is the largest single piece of MediaStack.

Detection reads the PCI bus and finds NVIDIA, AMD and Intel cards. Intel and AMD need only the video acceleration packages, the render device, and a group membership for the container, and no reboot. NVIDIA is the involved case.

For NVIDIA there are two modes. Standard installs Debian's packaged driver. It also installs the kernel headers, because the packaged driver builds its module through DKMS, and DKMS silently skips the build when no headers match the running kernel. The install then checks every installed kernel from the running one upwards, since a kernel without a built module boots with no driver at all. Unlock installs NVIDIA's own driver and applies a community patch that removes the limit on concurrent encoding sessions on consumer cards. It is opt-in, confirmed twice with a warning, pinned to a reviewed commit of the patch repository so no moving code runs as root, and never selected by default.

Before any driver is downloaded, the installer works out which driver branch the card needs. NVIDIA keeps a support table per driver version, and the installer fetches it and looks the card up, so an older card is sent to its legacy branch instead of a current driver that does not support it. The check runs before the 400 MB download, and an unknown answer never triggers a change. Secure Boot is detected, and the installer continues only if the signing key is already enrolled, with the exact commands to create and enrol one otherwise. The minimum driver version Jellyfin's encoder needs is known, and a card below it is recorded as too old before anything is installed.

A driver install cannot finish in one pass if the open-source nouveau driver still holds the card. Rather than fight it, the installer caches the download, writes a marker, and reboots. The marker records the boot ID, so when setup runs again it can tell a real reboot from a second run in the same session and will not finalise early. A systemd unit runs setup once after the reboot and then removes itself. Both "reboot now" and "reboot later" arm the same unit.

After the reboot, the driver is proven rather than assumed. Jellyfin is told to use the GPU only after a short test encode has succeeded inside the Jellyfin container. H.264 is the required proof. HEVC and AV1 output are enabled only if their own test encodes pass, and hardware decoding is switched on per codec from decode tests, because an encoder that works says nothing about decoding. Each probe is bounded twice, because a wedged decoder has been seen to ignore every signal. A failure anywhere in the chain turns hardware acceleration off in Jellyfin, regenerates the Compose override without the GPU, and shows the reason in the status screen. A failed patch is the one exception: the GPU still encodes with the stock session limit, so the install keeps hardware encoding and reports the limit was not removed.

A driver the user installed themselves is never touched. Setup will use it, with updates left to the user, or offer to replace it, and asks before either.

## Management

After install, `./mediastack` opens a different menu. A status box shows the container count, domain, LAN and public addresses, and the items below it cover access details and logins, stack status and logs, updates, features and settings, health and security, fail2ban, hardware transcoding, diagnostics, and uninstall. Features that were skipped in the wizard, such as remote access, the VPN, subtitles or file sharing, are added from here. The health check covers container state, the fail2ban jails and their log regexes, certificate expiry, DNS and public IP drift, disk space, the firewall, and the admin-port filter.

Updates are the part of running a server that newcomers find hardest, because an update can break a service and there is rarely a way back. MediaStack has no auto-updater. Updates are run from the menu, one service or all, and each becomes a sticky per-service choice. Before a service moves off its installed image, MediaStack saves a restore point of that service's configuration, taken while the old container is stopped and before the new one starts, so a running database is never copied. Revert puts back the old image and that configuration, then checks that the service is healthy and that MediaStack can still log in to it. An interrupted revert can be retried without losing the safety copy.

Uninstall is a transaction. It validates the ledger of host changes, asks the user to type `DESTROY`, pauses the watchdog, removes the containers and confirms they are gone, then removes only the host changes whose tags or hashes still match the ledger. The secrets file and the ledger go last, so a partial cleanup can be retried. The media stays, and Docker stays. If the user has added a Samba share of their own, MediaStack treats Samba as theirs from then on and leaves the package and account alone.

## How it configures the services

Three files control the stack. The Compose file says how the services run. `config.yml` says what gets configured, from indexers and quality definitions to Seerr quotas and Bazarr languages, and is the file a user edits. `.env` holds the secrets and host values, is generated by setup, and is readable only by its owner.

The configure step reads `config.yml` and applies it to each service through that service's own HTTP API, with curl making the requests and Python handling the JSON. Every setting goes through one decision. If the live value already matches, the step is skipped. If the live value differs and is not the shipped default, it is reported as drift, with two repair routes, and left alone. Only a setting that is absent or still at the upstream default is written. This is what makes re-running safe: a change made in a service's own UI survives every later run.

The reads are treated as carefully as the writes. A read must validate the fields and types it expects before it authorises a write, and an unreadable inventory stops the dependent writes for that service while the others continue. A write is never retried automatically, because a lost response can hide a write that succeeded.

A good part of this code is the accumulated knowledge of how each service misbehaves. Jellyfin's startup endpoint silently does nothing unless the matching GET has been called first, because the GET is what creates the root user. Jellyfin's health check passes long before any library exists, so the configure step polls the library endpoint itself. Portainer closes its admin setup window after five minutes and then returns 403 on every call, so setup restarts the container to reopen it. Nginx Proxy Manager's well-known default login only exists after its UI wizard has run; on first boot the user table is empty, so setup seeds the admin account directly and the stock credentials are never active.

## Testing and releases

At v0.3.0 the product is about 35,700 lines of shell and Python, and the tests are about 87,200. One script runs everything: lint and format checks, a secret scan, strict typing for the Python, the structural rules, the unit suites, and the install scenarios. The structural rules fail closed. No shell file may exceed 500 lines, every function must be referenced from somewhere, service modules may import only the shared library, and an empty test population counts as a failure. The conventions document keeps a list of rules that are not enforced, on the principle that a rule which names no enforcer reads as a gate without being one.

The install is tested in 79 Docker-in-Docker scenarios, so the host stays clean. Forty of them drive the real wizard prompts through a pseudo-terminal and check both the transcript and the generated configuration. A set of contract files declares every endpoint MediaStack calls on each service, and a generic mock server answers from them, so the real configure script runs against a fake stack in the pull-request gate without pulling any images. The NAS scenarios run a real NFS server inside the test container and restart it to prove the watchdog. Two harnesses run only by hand: one on a disposable cloud VM for real DNS, certificates and firewall behaviour, and one on a dedicated Debian box for real hardware, firewall, systemd and GPU passthrough. The repository is explicit about what a green run proves: the stack boots, configures, and connects to its download client. Searching, grabbing and importing depend on live trackers and are not exercised.

The Stable channel's image set is maintained by three weekly jobs. One resolves every image tag to its current remote digest and opens an issue when upstream has moved. One reruns the install scenarios against the moved images on a hosted VM and, if they pass, opens a pull request that updates the lock file. One reruns the full install on the accepted images even when nothing moved, as a canary for upstream API or service changes that MediaStack would need to respond to. The maintainer's weekly job is to read the result and merge. A release is never cut while a drift issue is open.

Releases follow a 0.x policy. A patch never changes behaviour on an existing install. A minor release may, with a breaking-changes entry and the migration step written inline. The changelog lists only changes an operator can act on, and its section becomes the GitHub release note word for word.

[View on GitHub&nbsp;→](https://github.com/famesjranko/MediaStack)
