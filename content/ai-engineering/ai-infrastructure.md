---
title: "How I run my AI coding environment"
description: "Choosing what coding agents can access, where they work and how long their environment lasts."
date: 2026-10-13
draft: false
cover: /img/ai-engineering/ai-infrastructure/cover.jpg
coverAlt: "Pixel-art laptop connected to an orange server enclosure and a separate storage tower on a stone plinth"
topics:
  - software engineering
  - coding agents
---

![Pixel-art laptop connected to an orange server enclosure and a separate storage tower on a stone plinth](/img/ai-engineering/ai-infrastructure/cover.jpg)

Coding agents need access to files and tools to do useful work. I want to choose which data and systems they can reach. Keeping their work in a separate place lets me make those choices deliberately and limit the consequences of mistakes for the personal systems I depend on.

I run a dedicated Debian workbench VM on my existing Proxmox development server. I choose the data, accounts and connections available to it. Its local state can be rolled back or the environment rebuilt, which also gives me room to experiment with different configurations. I was already comfortable with Proxmox from other projects, so it provided a familiar way to manage that separation.

<figure class="infra-responsive">

![Homelab diagram, desktop layout](/img/ai-engineering/ai-infrastructure/workbench.svg)
![Homelab diagram, phone layout](/img/ai-engineering/ai-infrastructure/workbench-narrow.svg)

<figcaption>The permanent workbench controls guest VMs over SSH. GPU passthrough and shared storage are available when needed.</figcaption>
</figure>

## Remote access and coding tools

Keeping the workbench separate also makes it available independently of my laptop or desktop. [T3 Code](https://t3.codes/) gives me a browser interface I can reach through Tailscale from different devices. I can leave the work on the workbench and change where I interact with it.

T3 controls the native Codex and Claude Code harnesses installed there: the programs that let a model edit files and run tools. I use each harness's login with my existing subscriptions. The interface brings those sessions together while each harness retains its own runtime integration.

<figure class="infra-responsive">

![Coding layer diagram, desktop layout](/img/ai-engineering/ai-infrastructure/coding.svg)
![Coding layer diagram, phone layout](/img/ai-engineering/ai-infrastructure/coding-narrow.svg)

<figcaption>Native harnesses work on local repositories and send model requests directly or through an optional local llmtrim proxy. Response paths are omitted.</figcaption>
</figure>

I also use [llmtrim](https://github.com/fkiene/llmtrim), an optional proxy for configured model requests. Its `agent` preset shortens tool output and large JSON arrays in agent requests and keeps cached prompt prefixes stable.

## Disposable VMs and lab resources

The permanent workbench holds the tools and context I use across projects. Work that needs a separate machine can use a disposable Debian guest. The `lab-control` skill lets an agent request one, with optional NVIDIA Quadro GPU passthrough or storage from a separate physical TrueNAS machine. A gateway service on the workbench manages the guest and optional storage allocations requested through `lab-control`. Files can be stored on the guest's disk or in its optional NAS workspace.

A separate lab network keeps those guests' connections under explicit control. Firewall rules permit the access needed for tools, workbench SSH and optional NAS storage, while restricting access to management and other private networks. The workbench retains its normal home-network connection; its lab interface does not provide a competing default route.

Each guest and optional NAS workspace belong to a temporary lease. Results I want to keep must be saved outside that lease. Manual release or automated cleanup after expiry or prolonged inactivity removes both allocations.

## Setup and verification

I keep machine configuration and installers in `workbench-infra`. Its runbook connects the manual platform setup to the automated installation, so I can see which parts need my decisions and which can be repeated.

<ol class="infra-steps" role="list">
  <li><span class="infra-step-name">Runbook</span> <small>Read the setup and acceptance procedures.</small></li>
  <li><span class="infra-step-name">Machine setup</span> <small>Create the network, Debian template and workbench VM manually.</small></li>
  <li><span class="infra-step-name">Installers</span> <small>Install the gateway and toolkit integration.</small></li>
  <li><span class="infra-step-name">Acceptance</span> <small>Check fresh sessions can discover tools and create, access and release a guest.</small></li>
</ol>

Provider login and initial T3 pairing remain interactive. The acceptance checks matter because an installed service alone does not establish that an agent can use the environment.

## Daily health report

The workbench sends me a health report by email at 07:00 each morning. I can check the machine's state from my phone without opening a session.

The subject line and a banner at the top name anything that needs attention. The report then shows memory, disk, CPU and uptime, hourly peak memory use over the previous 24 hours, and any resets, out-of-memory kills, failed services or pending updates. A section for each coding harness shows how much of its usage limits I have used and its activity over the same period. A last section reports how much input llmtrim trimmed.

The email body is laid out for a phone. The same report is attached as an HTML file for a desktop screen, with charts of memory and CPU over the 24 hours and a switch between light and dark themes.

<div class="fade-figure theme-light-only">

![A sample morning health report in light mode, laid out for a desktop screen: an all-good verdict, host figures, hourly memory and CPU charts, event counts, usage limits for each coding harness, and llmtrim's trimmed share per day.](/img/ai-engineering/ai-infrastructure/health-report-light.png "The attached desktop report, rendered from sample data.")

</div>

<div class="fade-figure theme-dark-only">

![A sample morning health report in dark mode, laid out for a desktop screen: an all-good verdict, host figures, hourly memory and CPU charts, event counts, usage limits for each coding harness, and llmtrim's trimmed share per day.](/img/ai-engineering/ai-infrastructure/health-report.png "The attached desktop report, rendered from sample data.")

</div>

A user timer on the workbench runs the report, and `workbench-infra` installs it with the other machine services. Each section reads its own source, such as the system journal or a harness's usage data. If one source cannot be read, its section shows a warning and the rest of the report is still sent.

## Shared agent instructions and tools

I keep shared instructions, skills and hooks in `agent-toolkit`. Its installer puts managed copies where each runtime expects them. Registering MCP tools is a separate step from copying guidance: instructions describe how to work, while registration makes tools available to the runtime. Machine-specific lab integration belongs to `workbench-infra`.

| Owner | Responsibility |
|---|---|
| `agent-toolkit` | Shared instructions, skills, hooks, runtime adapters, portable MCP registration and the `workbench` skill |
| `workbench-infra` | Gateway, lab MCP registration, `lab-control` skill, runbook, installers and machine services |
| Each harness | Runtime integration and provider login |
| T3 | Interface and session orchestration |

The toolkit's `workbench` skill guides agents maintaining the permanent VM, using its machine documents as the authority for configuration and procedures. `lab-control` handles disposable guests.

<ol class="infra-steps infra-steps--3" role="list">
  <li><span class="infra-step-name">Reach</span> <small>Establish access to the workbench.</small></li>
  <li><span class="infra-step-name">Read and check</span> <small>Read its documents and check the relevant services.</small></li>
  <li><span class="infra-step-name">Change and recheck</span> <small>Make authorised changes and verify the result.</small></li>
</ol>

Bringing projects onto the workbench still means preparing their dependencies and giving agents accurate context about where they run. That context also helps them provide previews I can reach. I want to develop a workflow where I can start tasks while away and return to changes ready for review. The separate environment lets me test that workflow and decide what data and access each task needs.

Related article: [How I organise a team of agents&nbsp;→](/ai-engineering/lead-team/)
