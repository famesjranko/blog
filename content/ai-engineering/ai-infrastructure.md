---
title: "How I run my AI coding environment"
description: "Choosing what coding agents can access, where they work and how long their environment lasts."
date: 2026-10-13
draft: false
topics:
  - software engineering
  - coding agents
---

Coding agents need access to files and tools to do useful work. I want to choose which data and systems they can reach. Keeping their work in a separate place lets me make those choices deliberately and limit the consequences of mistakes for the personal systems I depend on.

I run a dedicated Debian workbench VM on my existing Proxmox development server. I choose the data, accounts and connections available to it. Its local state can be rolled back or the environment rebuilt, which also gives me room to experiment with different configurations. I was already comfortable with Proxmox from other projects, so it provided a familiar way to manage that separation.

![A browser reaches the workbench over Tailscale; the workbench reaches a disposable guest over SSH, and the guest can mount optional storage from a separate TrueNAS machine.](/img/ai-engineering/ai-infrastructure/workbench.svg "My workbench and temporary guests share a Proxmox host and lab network; TrueNAS is a separate physical machine. SSH and optional NFS connect directly to their endpoints.")

## A workbench I can reach

Keeping the workbench separate also makes it available independently of my laptop or desktop. [T3 Code](https://t3.codes/) gives me a browser interface I can reach through Tailscale from different devices. I can leave the work on the workbench and change where I interact with it.

T3 steers the native Codex and Claude Code harnesses installed there: the programs that let a model edit files and run tools. I use each harness's login with my existing subscriptions. The interface brings those sessions together while each harness retains its own runtime integration.

![T3 controls the native Codex and Claude Code harnesses, which edit local repositories, run tools and send requests to model providers.](/img/ai-engineering/ai-infrastructure/coding.svg "The harnesses edit local repositories and run tools. Only configured model requests pass through the llmtrim proxy.")

I also use [llmtrim](https://github.com/fkiene/llmtrim), an optional proxy for configured model requests, with its lossless preset to improve token efficiency and manage cost.

## Giving experiments a lifetime

The permanent workbench holds the tools and context I use across projects. Work that needs a separate machine can use a disposable Debian guest. The `lab-control` skill lets an agent request one, with optional NVIDIA Quadro GPU passthrough or storage from a separate physical TrueNAS machine. Files can stay on the guest's disk or in its optional NAS workspace.

A separate lab network keeps those guests' connections under explicit control. Firewall rules permit the access needed for tools, workbench SSH and optional NAS storage, while restricting access to management and other private networks. The workbench retains its normal home-network connection; its lab interface does not provide a competing default route.

Each guest and optional NAS workspace belong to a temporary lease. Results I want to keep must be saved outside that lease. Manual release or automated cleanup after expiry or prolonged inactivity removes both allocations.

## Making the setup repeatable

I keep machine configuration and installers in `workbench-infra`. Its runbook connects the manual platform setup to the automated installation, so I can see which parts need my decisions and which can be repeated.

<ol class="infra-steps" role="list">
  <li><span class="infra-step-name">Runbook</span> <small>Read the setup and acceptance procedures.</small></li>
  <li><span class="infra-step-name">Machine setup</span> <small>Create the network, Debian template and workbench VM manually.</small></li>
  <li><span class="infra-step-name">Installers</span> <small>Install the gateway and toolkit integration.</small></li>
  <li><span class="infra-step-name">Acceptance</span> <small>Check fresh sessions can discover tools and create, access and release a guest.</small></li>
</ol>

Provider login and initial T3 pairing remain interactive. The acceptance checks matter because an installed service alone does not establish that an agent can use the environment.

## Keeping guidance portable

I keep shared instructions, skills and hooks in `agent-toolkit`. Its installer puts managed copies where each runtime expects them. Registering MCP tools is a separate step from copying guidance: instructions describe how to work, while registration makes tools available to the runtime. Machine-specific lab integration belongs to `workbench-infra`.

| Owner | Responsibility |
|---|---|
| `agent-toolkit` | Shared instructions, skills, hooks, runtime adapters, portable MCP registration and the `workbench` skill |
| `workbench-infra` | Gateway, lab MCP registration, `lab-control` skill, runbook, installers and machine services |
| Each harness | Runtime integration and provider login |
| T3 | Interface and session orchestration |

The toolkit's `workbench` skill maintains the permanent VM, using its machine documents as the authority for configuration and procedures. `lab-control` handles disposable guests.

<ol class="infra-steps infra-steps--3" role="list">
  <li><span class="infra-step-name">Reach</span> <small>Establish access to the workbench.</small></li>
  <li><span class="infra-step-name">Read and check</span> <small>Read its documents and check the relevant services.</small></li>
  <li><span class="infra-step-name">Change and recheck</span> <small>Make authorised changes and verify the result.</small></li>
</ol>

Bringing projects onto the workbench still means preparing their dependencies and giving agents accurate context about where they run. That context also helps them provide previews I can reach. I want to develop a workflow where I can set work going while away and return to changes ready for review. The separate environment gives me somewhere to try it while deciding what data and access each task needs.

Related project: [How I organise a team of agents&nbsp;→](/ai-engineering/lead-team/)
