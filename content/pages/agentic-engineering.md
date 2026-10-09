---
title: "Agentic engineering"
eyebrow: "Workbench · Foundations · Team · Toolkit"
description: "How I set up a workbench, a project's foundations and a team of agents so that coding agents can do the work and I can judge it."
---

I build my projects with coding agents, across languages and frameworks that have little in common. I give them a workbench that stays running and a repository with clear expectations. When one agent isn't enough, I organise a team with defined responsibilities. I set the brief and review the result.

I give agents room to make decisions that need judgement, and use automated checks to report rule violations. I revisit this setup as the models change.

<nav class="page-nav" aria-label="Sections"><a href="#workbench">Workbench</a><a href="#foundations">Foundations</a><a href="#team">Team</a><a href="#toolkit">Toolkit</a></nav>

<p class="eyebrow" id="workbench">01 · Workbench</p>

## Where the work happens

The agents run on a permanent VM on an always-on [Proxmox](https://www.proxmox.com/) host. Work continues on dedicated hardware while I direct it from a laptop or phone.

![Where the work happens](/img/agentic/workbench.svg "The main components and how they connect. One permanent VM does the work.")

I reach the VM over [Tailscale](https://tailscale.com/). [T3 Code](https://github.com/pingdotgg/t3code) is the UI over the coding runtimes, and each thread gets its own git worktree, so several agents can work on one repository at once.

Agents push to GitHub from the VM. Model calls pass through [llmtrim](https://github.com/fkiene/llmtrim), a loopback proxy that trims prompts, history and tool output losslessly before they leave the machine. Builds and tests run in rootless containers.

When a job needs an isolated test environment, the lab-control gateway provides a disposable guest on a firewalled lab network, with storage from [TrueNAS](https://www.truenas.com/). The agent gets six bounded tools; the Proxmox and TrueNAS credentials stay in the gateway.

<details class="editorial-note">
<summary>Inside the lab-control gateway</summary>

![Inside the lab-control gateway](/img/agentic/gateway.svg "The gateway checks requests against policy and a recorded lease before a credentialed adapter acts.")

The gateway listens only on loopback and requires a bearer token. It loads appliance secrets through systemd credentials, keeping them out of agent processes. It records each guest or dataset lease as a UUID in SQLite and on the resource itself: a tag on the guest or a comment on the dataset. Before destroying a resource during release, it checks that the marker matches the recorded lease. If the marker doesn't match or a step fails, the gateway quarantines the resource and stops cleanup. It allows one guest at a time, with the GPU available as an optional exclusive lease. The guest's firewall allows access to the lab network, web egress and NFS to TrueNAS, and blocks management services, unrelated LAN addresses and new connections to the workbench.

</details>

<p class="eyebrow" id="foundations">02 · Project foundations</p>

## What the agents work within

I set up my repositories so agents can find the guidance they need, understand the code's organisation and run the relevant checks. I also protect the checks against changes that would weaken them.

<dl class="kit-grid">
<div><dt><span>01</span>Context</dt><dd>A short <code>AGENTS.md</code> gives the purpose and commands, plus decisions and constraints the code doesn't explain. Longer guidance stays separate until needed; rules enforced by checks aren't repeated.</dd></div>
<div><dt><span>02</span>Structure</dt><dd>Clear module boundaries and consistent file roles, so what an agent learns in one module holds in the next.</dd></div>
<div><dt><span>03</span>Checks</dt><dd><code>make check</code> runs formatting, types, lint, tests and project rules, and reports what to fix. A pass confirms only what is tested.</dd></div>
<div><dt><span>04</span>Custody</dt><dd>I confirm a custom check catches a known violation before I record its rule as enforced, and I review changes to the guardrails. Where CI exists, it repeats the checks on a fresh checkout before merge.</dd></div>
</dl>

The rules vary by project, but a few preferences apply everywhere, such as limits on file and function length. A check enforces the limit; the agent chooses where to split the code along real responsibilities.

### Tests I can read

Each test covers one behaviour, with Given, When, Then comments, so I can read an agent's test and see what it proves. Before I accept a new test, the agent removes the behaviour it checks, shows the test fail, then restores it.

```ts
it("rounds 201 words up to two minutes", () => {
	// Given a Markdown body with 201 words.
	const body = Array(201).fill("word").join(" ");

	// When its reading time is estimated.
	const minutes = readingMinutes(body);

	// Then the estimate is two minutes.
	expect(minutes).toBe(2);
});
```

This example is from the site's test suite and catches rounding down at the 200-word boundary.

<p class="eyebrow" id="team">03 · Agent team</p>

## One lead, bounded tasks

I use a team when a change is too large for one agent's context, or when a missed defect would be expensive. The lead keeps its context for decisions: how to divide the work, what each agent needs to know and whether the result is right. Every other agent gets one bounded task and reports back.

![One lead, bounded tasks](/img/agentic/team.svg "Contracts go down through the ledger; reports come back up. Only the lead accepts.")

Each task has a contract: what the agent must achieve, which files it owns and the acceptance criteria its report must address. The agent starts fresh with that contract, a prompt and the repository, not the lead's conversation. Agents that write get their own worktrees, and tasks that touch the same file run in sequence. Models are chosen to suit each responsibility, with escalation when needed.

<details class="editorial-note">
<summary>A worked contract and report example</summary>

<p>An illustrative final-check contract and report, validated by the toolkit but not taken from a recorded run.</p>

```json
{
  "id": "final_check",
  "role": "Chore",
  "parent": "lead",
  "goal": "Verify the integrated change.",
  "accept": [
    { "id": "A1", "text": "The full check command passes." },
    { "id": "A2", "text": "Record the commit that was checked." }
  ],
  "model": "haiku",
  "effort": "medium",
  "deps": [],
  "verify": ["make check"]
}
```

```text
STATUS: DONE
CHANGED: none
EVIDENCE:
A1: `make check` -> `exit 0`
A2: checked commit <sha>
NOT DONE: none
DECISIONS: none
```

</details>

<details class="editorial-note">
<summary>Roles and default tiers</summary>

<p>Each role has a default model tier, capped at the lead's own tier.</p>

| Role | Responsibility | Default tier |
|---|---|---|
| Planner | Breaks the goal into bounded tasks with files and dependencies. Read-only. | strong |
| Explorer | Surveys what exists, what is missing and what is out of date. Read-only. | mid |
| Worker | Writes code, tests and prose that need judgement, within its assigned files. | mid |
| Reviewer | Independent judgement on the integrated result. | strong |
| Chore | Runs test suites, lint and text searches, and handles waits. | smallest |

</details>

### One task, start to finish

![One task, start to finish](/img/agentic/lifecycle.svg "Hooks run at spawn and stop. A report moves the task to reported. Dependent tasks wait for the lead's acceptance.")

A reported task blocks the tasks that depend on it until the lead accepts it. The hooks check form: the report's shape, evidence for every criterion, task order, and that a worker stayed within its files. The lead judges substance: whether the tasks were the right size and whether the work is correct, reading the diff as well as the report. Rework after acceptance is a new task, so the record of what was accepted stays intact.

<details class="editorial-note">
<summary>What the hooks don't cover</summary>

<p>The hooks cannot verify that a report is true. A failed report check blocks the first stop attempt; the second reports the task with the problems noted. A hook error or timeout lets the action through. Hooks refuse the lead's edit tools and sleep loops, but do not detect the lead's shell edits. Coverage varies by runtime, and the hooks are not a security boundary.</p>

</details>

### A run, as the observer shows it

The observer is a read-only view with no role in task decisions. It shows tasks and their states from the ledger, alongside each agent's transcript, context use and tool calls from the runtimes' session logs.

![The team observer's workflow graph: 29 tasks over 9 steps, with workers and explorers converging on two reviewers and a final check, sent back twice, waiting on acceptance before packaging](/img/agentic/team-workflow.jpg "A run of 29 tasks over 9 steps. Workers and explorers converge on two reviewers; the final check, in purple, has been sent back twice and waits for acceptance before packaging can begin.")

![The top of the lead agent's observer card: model, context window use, lifetime token counts, and an accept command whose note names the README lines and Explorer evidence it read](/img/agentic/lead-card-crop.png "The lead in a separate run: its context use, and an accept call whose note names the evidence it read.")

<details class="editorial-note">
<summary>The full card</summary>

![The lead agent's full observer card, continuing with the command's result, the lead's message to the user, and its next spawn](/img/agentic/lead-card.png)

</details>

<p class="eyebrow" id="toolkit">04 · Toolkit</p>

## What the agents carry between projects

I keep skills, global instructions and hooks in one repository and install them into each runtime from that source. Thin adapters handle differences between runtimes. I currently use [Claude Code](https://claude.com/claude-code) and [Codex](https://developers.openai.com/codex/cli).

<dl class="rows">
<div><dt>investigate</dt><dd>Reproduce the problem, confirm its cause, then fix it with a regression test.</dd></div>
<div><dt>triage</dt><dd>Judge each open issue on whether it is real, in scope and worth doing, and record the verdict with the repository's labels.</dd></div>
<div><dt>pr-body</dt><dd>Write a pull request description a reviewer can assess in a minute, covering the problem, the change, the evidence and the risks.</dd></div>
<div><dt>gcp</dt><dd>Pin the Google Cloud account and project before working, and stop before anything destructive.</dd></div>
<div><dt>workbench</dt><dd>Confirm reachability, then use the permanent VM's own runbooks to check and maintain it.</dd></div>
</dl>

Each skill declares whether an agent may choose it from its description or only I may invoke it. I invoke <code>triage</code> and <code>lead-team</code>; an agent can choose <code>investigate</code> and <code>pr-body</code> itself. Choosing a skill doesn't let an agent do anything a hook or I would refuse.
