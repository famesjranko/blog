---
title: "A workbench that stays running"
description: "The permanent coding environment behind my browser: T3 Code, git worktrees, build tools and shared agent skills."
date: 2026-10-13
draft: true
topics:
  - software engineering
  - coding agents
---

I put my coding environment on a permanent virtual machine on an always-on Proxmox host. The agents could work there while I directed them from a laptop or phone. Repositories and build tools stayed on the workbench, so changing devices did not mean moving the job.

By October 2026, this environment brought together T3 Code, Claude Code and Codex on Debian 13. I kept its setup and operating procedures in an infrastructure repository. This account follows the setup documented there through 13 October, including two changes made during that month.

## From the browser to the working files

I reached T3 Code through Tailscale. The configured endpoint was restricted to the tailnet, rather than exposed to the general LAN or internet. The browser was my way into the workbench; the coding runtimes and their tools ran on the VM.

T3 supplied the interface for conversations with those runtimes. I used separate git worktrees for its threads so tasks could edit different working copies of a repository. An agent could read the project, make changes and run commands in the files assigned to that task.

A worktree gives each task its own working files. It still belongs to the same git repository, and tasks on one VM can use the same machine resources. That matters when deciding which work can happen together. Separate copies help keep edits apart, but they do not reserve build capacity or prevent two commands from trying to use the same service.

The workbench also gave the agents a place to run builds and inspect their results. A coding conversation could therefore include the compiler error or failing test from the actual checkout. The repository remained there when I switched the device from which I was directing the work.

I describe the coordination of several agents separately in [How I organise a team of agents](/ai-engineering/lead-team/). Here I am concerned with the environment those tasks use, from their working files down to the tools available to them.

## Tools on the workbench

The VM had the ordinary development tools: Git, compiler and build packages, Node, ripgrep and jq. Rootless Docker was its default container environment. The choice of how to build a project still belonged to that project; having Docker installed did not mean every test or build ran in a container.

On 12 October 2026, I added JDK 17 and the Android SDK, including platforms 35 and 36. Each repository supplied its own Gradle wrapper. That kept the project's Gradle version with its source while the workbench supplied the Java and Android tools needed to run it.

The tools needed to be available to both shells and the coding runtimes reached through T3. A tool available in an interactive shell might still be missing from the environment inherited by a running service. The setup therefore included the shell configuration and T3's service configuration. Fresh-process checks covered each route, and the installation record included a Java project's full check and an Android debug build in clean checkouts.

The permanent workbench also had to fit the host's capacity. On 6 October 2026, I moved it to a persistent-only allocation of 10 GiB of memory and eight virtual CPUs to give builds and agent tooling more room. I disabled the gateway I had built for disposable test guests. The lab was part of the earlier setup; the October environment used the permanent VM and its rootless Docker engine as the default development environment.

## The request proxy

I also configured T3 and fresh shells to send provider requests through llmtrim, an HTTPS proxy running locally on the machine. It compressed the requests sent to model providers, using its lossless preset.

The proxy configuration was inherited by the processes that used it. Certificate trust was set for those processes through their environment, without adding the proxy's certificate authority to the system trust store. This made the integration a workbench configuration task: it involved a service, shell startup and the environment passed to coding runtimes.

An existing process kept its proxy settings if the daemon went down, so requests could fail until the proxy recovered or the process restarted. New shells checked whether it was running before using it. The browser interface could remain available while a provider request failed.

## What carries between projects

I kept portable agent tooling in a separate toolkit repository. It held shared skills, global instructions, hooks and MCP client setup, with adapters for differences between Claude and Codex. The default installer copied managed snapshots into the supported runtimes. Editing the source toolkit did not automatically change every installed copy.

A skill supplied instructions for a particular kind of work. For example, `investigate` described reproducing a problem and establishing its cause before fixing it. `pr-body` described writing a pull request body with the problem, change and evidence a reviewer needed. These workflows could follow an agent between projects without carrying each project's architecture into the toolkit.

The infrastructure repository owned the machine's packages and service configuration. The toolkit owned the portable workflows and their runtime adapters. Runtime-specific features stayed explicit; installing into both runtimes did not make every feature interchangeable.

The installation procedures also called for fresh-session acceptance. A copied skill directory showed that installation had placed files. A fresh runtime had to discover and load the skill, just as a fresh process had to inherit a tool's environment. I kept those checks alongside the setup procedures so an installation could be tested at the point where an agent would use it.

## Back to the project

Once an agent reached a working copy, the project's own guidance supplied the remaining context. Its `AGENTS.md` named the commands, constraints and decisions relevant to that repository. The shared toolkit could explain how to investigate a failure; the project had to say how to build and test its code.

For this site, `make check` runs formatting, lint, structural guards, type checking, tests, image checks, the build and browser checks. The structural guards check limits such as file and function length. An agent still has to choose a sensible boundary when splitting code, but the check can report when the result exceeds a limit.

That command is specific to this repository. The toolkit has its own `./check`, and the infrastructure repository uses npm commands. Keeping the command in the project gives the next task a place to find it and a result to bring back for review.
