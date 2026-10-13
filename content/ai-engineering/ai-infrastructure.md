---
title: "A workbench that stays running"
description: "The coding environment behind my browser: T3 Code, Git worktrees, build tools, disposable test guests and shared agent skills."
date: 2026-10-13
draft: true
topics:
  - software engineering
  - coding agents
---

I put my coding environment on a permanent virtual machine on an always-on Proxmox host. The agents work there while I direct them from a laptop or phone. When I switch devices, the repositories and tools are still in the same place.

I built the setup around T3 Code, Claude Code and Codex on Debian, with disposable guests for jobs that need a separate test machine. This is the working environment I intend those parts to provide.

![The permanent workbench and its connections](/img/ai-engineering/ai-infrastructure/workbench.svg "Proxmox hosts the workbench and disposable guests. TrueNAS runs on a separate physical machine. The lab-control arrow summarises guest access and management; the gateway below handles provisioning.")

## Working through the browser

I reach T3 Code through Tailscale. T3 gives me the interface for conversations with the coding runtimes, which read files and run commands on the workbench. The browser is where I give a task, follow its progress and review what comes back.

I use Git worktrees to give parallel tasks separate working copies of a repository. An agent can edit its assigned files without another task editing the same copy. Worktrees still share repository metadata and services on the VM, so I need to account for those when dividing work.

The working files stay close to the tools that use them. An agent can inspect a failure, change the code and run it again in the same environment.

The VM supplies the development tools I use, including language toolchains and command-line utilities. Rootless Docker provides a container environment when a task needs one. Ordinary file editing and shell work can run directly on the workbench.

## Requests to hosted models

The models run with external providers. llmtrim is a local HTTPS request proxy on the workbench, configured to reduce the content sent to them using its lossless preset. Provider processes configured to use it send their model requests through the proxy. Other tools and services use their own connections.

## Disposable test environments

Some tasks need their own operating system environment. A disposable Debian guest gives an agent somewhere to install software and test behaviour away from the permanent workbench. Proxmox hosts it as a separate VM on a lab network. Firewall rules restrict access from the guest to management services and unrelated LAN devices.

![Requests inside the lab-control gateway](/img/ai-engineering/ai-infrastructure/gateway.svg "The agent requests lab operations over MCP. The gateway applies policy and records a lease before its adapters control Proxmox and TrueNAS. Appliance credentials stay inside the gateway.")

An agent can request a guest, inspect or extend its lease, and release it when the job is finished. The workbench reaches the guest over the lab network to do the work. When a task needs temporary storage, the gateway arranges an NFS workspace on TrueNAS for the guest to mount.

The lab-control skill explains how an agent should use these operations. The gateway implements them and manages their leases. I can improve the instructions for a test job without changing how the underlying appliances are controlled.

## What carries between projects

I keep portable agent tooling in a separate toolkit repository. Shared instructions and skills describe how I want agents to work. Hooks and MCP client setup support those workflows, with adapters for differences between Claude and Codex. Selected tool services provide browser automation, cloud access and library documentation.

The installer copies managed versions of the toolkit into the supported runtimes. Updating its source therefore needs an installation step before those copies change. Runtime-specific features stay explicit in their adapters.

The infrastructure repository owns the machine packages, service configuration and lab gateway. A shared investigation procedure belongs in the toolkit; guest provisioning belongs with the machine infrastructure. I describe how I divide and coordinate the agents' work in [How I organise a team of agents](/ai-engineering/lead-team/).
