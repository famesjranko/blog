---
title: "A workbench that stays running"
description: "The coding environment behind my browser: T3 Code, git worktrees, build tools, disposable test guests and shared agent skills."
date: 2026-10-13
draft: true
topics:
  - software engineering
  - coding agents
---

I put my coding environment on a permanent virtual machine on an always-on Proxmox host. The agents work there while I direct them from a laptop or phone. I can switch devices and return to the same working environment, with the repositories and build tools still on the workbench.

I built the setup around T3 Code, Claude Code and Codex on Debian 13, with disposable guests for jobs that need a separate test machine. This is how I intend those parts to work together: from the browser where I give a task to the project checks that help me judge the result.

## From the browser to the working files

I reach T3 Code through Tailscale. Its endpoint is configured for access through the tailnet. The browser gives me a way to direct the work; the coding runtimes and their tools run on the VM.

T3 supplies the interface for conversations with those runtimes. I use separate git worktrees for its threads so tasks can edit different working copies of a repository. An agent can read the project, make changes and run commands in the files assigned to that task.

A worktree gives a task its own working files, but it still belongs to the same git repository. Tasks on the workbench can also use the same services. I have to account for that when dividing work: two separate checkouts can still try to start a server on the same port.

The runtime can bring compiler errors and failing tests from the checkout into the coding conversation. That lets a task proceed from an observed failure to a change and another check, all in the environment where the code lives. Switching from my laptop to my phone changes how I reach that environment.

I describe the coordination of several agents separately in [How I organise a team of agents](/ai-engineering/lead-team/). Here I am concerned with the environment those tasks use, from their working files down to the tools available to them.

## Tools on the workbench

The VM supplies ordinary development tools: Git, compiler and build packages, Node, ripgrep and jq. Rootless Docker is the default container environment. A project's build instructions determine which of these tools an agent uses and whether a command runs in a container.

Java and Android support follows the same division. The workbench supplies JDK 17 and the Android SDK, including platforms 35 and 36. Each repository supplies its own Gradle wrapper, keeping the project's Gradle version with its source. An agent can use the wrapper from its checkout rather than choose a separate Gradle installation.

These tools need to be available to the runtimes launched through T3 as well as to an interactive shell. The infrastructure setup therefore includes both shell configuration and the environment passed to T3's service. That wiring is part of making a tool usable from a coding task.

For a job that needs a separate operating system environment, I built a lab-control gateway for disposable Debian guests on Proxmox. An agent uses its bounded tools to request a guest, inspect or extend its lease, and release it when the job is finished. The guest provides a place to install software and test behaviour away from the permanent workbench. Temporary NFS storage from TrueNAS can supply a workspace when needed.

The gateway manages the guest's lifecycle and holds the appliance credentials. Its client interface exposes the lab operations rather than the underlying appliance APIs. Guests use a lab network with firewall rules that restrict access to management services and unrelated LAN devices. During release, the gateway checks the resource's ownership marker against its recorded lease before deleting it. If ownership is unclear or cleanup fails, it records the problem and stops that cleanup.

The lab-control skill tells an agent how to use this route. The gateway implements the policy and lease checks. This keeps the instructions for a test job separate from the machinery that creates and removes its environment.

## The request proxy

I configured T3 and fresh shells to send provider requests through llmtrim, an HTTPS proxy running locally on the workbench. Its purpose is to reduce the request content sent to model providers; I configured it with its lossless preset.

The processes using the proxy inherit its configuration and certificate trust through their environment. The proxy's certificate authority is not added to the system trust store. This integration belongs with the workbench services because it involves a running daemon and the environment passed to coding runtimes.

## What carries between projects

I keep portable agent tooling in a separate toolkit repository. It holds shared skills, global instructions, hooks and MCP client setup, with adapters for differences between Claude and Codex. The default installer copies managed snapshots into the supported runtimes, so an update to the toolkit source needs an installation step before those copies change.

A skill supplies instructions for a particular kind of work. For example, `investigate` describes reproducing a problem and establishing its cause before fixing it. `pr-body` describes writing a pull request body with the problem, change and evidence a reviewer needs. Those workflows can follow an agent between projects while each repository keeps its own architecture and commands.

The infrastructure repository owns machine packages, service configuration and the lab gateway. The toolkit owns portable workflows and their runtime adapters. A change to a shared investigation procedure belongs in the toolkit; a change to the proxy service or guest provisioning belongs with the infrastructure. Features specific to one runtime remain explicit in its adapter.

## Back to the project

Once an agent reaches a working copy, the project's own guidance supplies the remaining context. Its `AGENTS.md` names the commands, constraints and decisions relevant to that repository. The shared toolkit can explain how to investigate a failure; the project has to say how to build and test its code.

For this site, `make check` runs formatting, lint, structural guards, type checking, tests, image checks, the build and browser checks. The structural guards report limits such as file and function length. An agent still has to choose a sensible boundary when splitting code, then use the check to find whether the result meets the rules.

That command is specific to this repository. The toolkit has its own `./check`, and the infrastructure repository uses npm commands. Keeping the command in the project gives an agent a place to find it. The task can bring back the changes and their check results for me to review, whether it used the workbench's tools or a disposable guest.
