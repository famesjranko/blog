---
title: "How I set up my AI coding environment"
description: "A permanent workbench for native coding sessions, reached from a browser, with disposable machines for tasks that need their own."
date: 2026-10-13
draft: true
topics:
  - software engineering
  - coding agents
---

I wanted a permanent home for my coding sessions, reachable from a browser, with Codex, Claude Code, my repositories and tools together. When a task needs a clean machine, I give it a temporary one.

One physical Proxmox host runs my permanent Debian workbench VM and disposable guests on a separate lab network. I open T3 over Tailscale to work there. TrueNAS runs on a second physical machine and can supply a guest workspace.

![A browser reaches the workbench over Tailscale; the workbench reaches a disposable guest over SSH, and the guest can mount optional storage from a separate TrueNAS machine.](/img/ai-engineering/ai-infrastructure/workbench.svg "My workbench and temporary guests share a Proxmox host and lab network; TrueNAS is a separate physical machine. SSH and optional NFS connect directly to their endpoints.")

## Where my coding sessions run

T3 gives me a browser interface and a session server on the workbench. It starts and steers the installed native Codex and Claude Code harnesses. Each harness owns its runtime integration and provider login. I sign in interactively and use my existing subscriptions under each provider's rules.

![T3 controls the native Codex and Claude Code harnesses, which edit local repositories, run tools and send requests to model providers.](/img/ai-engineering/ai-infrastructure/coding.svg "The harnesses edit local repositories and run tools. Only configured model requests pass through the llmtrim proxy.")

## The machines behind the browser

I use a VM so I can snapshot the workbench. One network interface connects to my LAN for home access and Tailscale. The other connects to a Proxmox lab SDN with no gateway configured on that interface. Proxmox supplies DHCP, SNAT and firewall rules; disposable guests have only the lab connection.

I allocate a guest when a task needs a clean image or its own machine. Separate TrueNAS storage can outlive the guest using it.

From a coding session, I use the `lab-control` skill to request a lease from the workbench gateway. The gateway creates a Proxmox guest, prepares a TrueNAS workspace if requested, records the allocations and releases them when the lease ends.

The session reaches the guest directly over SSH across the lab network. Optional NFS mounts connect straight to TrueNAS. My working copies live on the workbench's local disk.

## How I install the environment

I follow the `workbench-infra` runbook. That repository holds machine configuration, systemd units and shell installers. My setup follows these steps:

1. Read the runbook before creating anything.
2. Set up the host, lab network, guest template and workbench VM manually.
3. Review and run the shell installers for the gateway and toolkit profile.
4. Check that each service answers and that a fresh session can use it.

I also start T3 and pair it through Tailscale by hand before making it a user service. Provider login remains interactive.

## The guidance I carry between runtimes

I keep portable guidance in `agent-toolkit`. Its installer makes managed copies where each runtime expects them, with adapters for different hook formats and runtime capabilities. Keeping these files together gives me one place to update shared guidance before installing the appropriate copies into each runtime on the workbench. MCP registration is separate. `workbench-infra` adds the machine-only `lab-control` skill through an explicit manifest.

| Owner | Responsibility |
|---|---|
| `agent-toolkit` | Shared instructions, skills, hooks, runtime adapters, MCP registration and the `workbench` skill |
| `workbench-infra` | The gateway, `lab-control` skill, runbook, installers and services on the machine |
| Each harness | Its runtime integration and provider login |
| T3 | The interface and session orchestration |

## How I maintain the permanent workbench

The toolkit's `workbench` skill guides agents maintaining my permanent VM. I keep that responsibility separate from disposable lab guests.

The skill first proves local or SSH access to the workbench. It reads the machine's own documents, runs its health checks and reports the results. For an authorised change, portable tooling belongs in `agent-toolkit` and machine integration belongs in `workbench-infra`. The affected checks run again afterwards.

The machine's `AGENTS.md`, `ARCHITECTURE.md` and `RUNBOOK.md` files own its facts; the skill owns access and conduct. It stops if access or documents are missing. I use `lab-control` only for disposable guests.

Related project: [How I organise a team of agents&nbsp;→](/ai-engineering/lead-team/)
