---
title: "Agentic engineering"
eyebrow: "Workbench · Foundations · Team · Toolkit"
description: "How I set up a workbench, a project's foundations and a team of agents so that coding agents can do the work and I can judge it."
---

I build my projects with coding agents, across languages and frameworks that have little in common. What the agents need from me is an environment: a workbench that keeps running while they work, a project that says what it expects, and, when one agent isn't enough, a team with clear responsibilities. I set the brief and review what comes back.

One question runs through all of it: what to leave to an agent's judgement, and what to enforce in code. Where a task needs judgement, the agent gets room to work; where a rule can be checked, a check holds it. This page sets out the workbench, the project foundations, the team, and a short reference to the tools they carry. I reassess all of it as the models change.

<nav class="page-nav" aria-label="Sections"><a href="#workbench">Workbench</a><a href="#foundations">Foundations</a><a href="#team">Team</a><a href="#toolkit">Toolkit</a></nav>

<p class="eyebrow" id="workbench">01 · Workbench</p>

## Where the work happens

The agents don't run on my laptop. They run on a permanent VM on a Proxmox host that is always on, so the work continues on dedicated hardware while I direct it from a laptop or a phone.

![Where the work happens](/img/agentic/workbench.svg "The main components and how they connect. One permanent VM does the work.")

I reach the VM over Tailscale from a browser on whatever device is nearest, including a phone with speech-to-text for the brief. T3 Code is the front end for the coding runtimes. I use a separate git worktree for each coding thread, so several agents can work on one repository at once, and a session is where I left it when I come back.

From the VM the agents push to GitHub, call the model providers, and use Google Cloud and Cloudflare for logs, analytics and authorised test deployments. Model calls pass through llmtrim, a loopback proxy that trims prompts, history and tool output losslessly before they leave the machine. Builds and tests run in rootless containers.

When a job needs an isolated test environment, the lab-control gateway lends it a disposable guest on a firewalled lab network, with storage from TrueNAS. The agent gets six bounded tools; the Proxmox and TrueNAS credentials stay in the gateway.

<details class="editorial-note">
<summary>Inside the lab-control gateway</summary>

![Inside the lab-control gateway](/img/agentic/gateway.svg "Requests pass policy and a recorded lease before any credentialed adapter acts.")

The gateway listens only on loopback, needs a bearer token, and loads the appliance secrets through systemd credentials, so they never enter an agent process. A guest or a dataset is held as a lease: a UUID recorded in SQLite and written onto the resource itself, as a tag on the guest or a comment on the dataset. Release checks that the marker on the resource matches the lease before anything is destroyed; a mismatch or a failed step is quarantined, not cleaned up. One guest exists at a time, with the GPU as an optional exclusive lease. A guest's firewall allows it the lab network, web egress and NFS to TrueNAS, and rejects management services, unrelated LAN addresses and new connections to the workbench.

</details>

<p class="eyebrow" id="foundations">02 · Project foundations</p>

## What the agents work within

My repositories are set up so that an agent can find what it needs to know, see how the code is organised, run the checks that matter, and not quietly weaken them. I think of that as four layers.

<dl class="kit-grid">
<div><dt><span>01</span>Context</dt><dd>What an agent should know that the code doesn't show. A short <code>AGENTS.md</code> gives the purpose, the commands, and the decisions and constraints that aren't obvious from the files. Longer guidance sits in separate documents that are read when a task needs them, and a rule a check already enforces isn't repeated here.</dd></div>
<div><dt><span>02</span>Structure</dt><dd>How the code is organised so an agent can find its way. Clear module boundaries and consistent file roles across modules, so what an agent learns in one part of the repository applies in the rest.</dd></div>
<div><dt><span>03</span>Checks</dt><dd>Rules that run. Formatting, types, lint, tests and the project's own rules run from one command, <code>make check</code>, and a failure says what to fix; <code>make format</code> applies the formatting. A passing check shows only that what it tests holds.</dd></div>
<div><dt><span>04</span>Custody</dt><dd>Keeping the checks effective. A custom check is verified against a known violation when it is added, so a rule that matches nothing is never recorded as enforced. A change to a guardrail is reviewed by me, not left to the agent. Local checks verify the working copy as the work goes; CI, where a project has it, verifies a fresh checkout before a merge; deployment is a separate step.</dd></div>
</dl>

Which rules a project enforces depends on the project. The <code>project-init</code> skill sets a repository up this way, and <code>project-evolve</code> adds each later rule as a check first and a documented decision second. A few preferences follow me everywhere, such as limits on file and function length. The limit is a check. Where to split a file that has outgrown it is left to the agent, and the instructions say so: split along a real responsibility, not to satisfy the count.

### Tests I can read

Every test is one behaviour, written as Given, When, Then, so I can read what an agent wrote and see what it proves. A new test has to be shown failing before it counts: remove the behaviour, see it fail, put it back.

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

From this site's own suite. It catches rounding down at the 200-word boundary.

<p class="eyebrow" id="team">03 · Agent team</p>

## One lead, bounded tasks

When a change is too big for one context, or a missed defect would be expensive, I run it as a team. The idea is to protect context. The lead keeps its own for the decisions a team depends on: what the slices are, what each agent is told, and whether the result is right. Every other agent receives one bounded responsibility and the context that job needs, and reports back when it is done.

![One lead, bounded tasks](/img/agentic/team.svg "Contracts go down through the ledger; reports come back up. Only the lead accepts.")

A task is a contract: what the agent must achieve, which files it owns, and the acceptance criteria its report has to answer. The agent starts without the lead's conversation; it gets the contract, its prompt, and the repository to read. Agents that write get their own worktree, and two tasks that would touch the same file run in sequence. Models are matched to responsibility, with escalation when needed.

<details class="editorial-note">
<summary>A worked contract and report example</summary>

<p>An illustrative contract for a final-check task and a report in the required shape, checked against the toolkit's own validator. Not a recorded run.</p>

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

<p>Each role has a default model tier, and the lead's own tier caps every one of them.</p>

| Role | Responsibility | Default tier |
|---|---|---|
| Planner | Breaks the goal into sized slices, with files and dependencies. Read-only. | strong |
| Explorer | Surveys what exists, what is missing, what is stale. Read-only. | mid |
| Worker | Code, tests and prose that need judgement, on the files it owns. | mid |
| Reviewer | Independent judgement on the integrated result. | strong |
| Chore | Suites, lint, greps, and the waits. | smallest |

</details>

### One task, start to finish

![One task, start to finish](/img/agentic/lifecycle.svg "The diagram shows the hook at spawn and at stop. Reporting moves a task to reported; only the lead's acceptance moves it on.")

Reporting ends the agent's work; it does not finish the task. A reported task stays where it is, and nothing that depends on it can start, until the lead has read the diff as well as the report and accepted with a note of what it read. Otherwise it goes back with what to change. The hook at stop checks the report's shape, that every criterion has evidence, and that a worker stayed inside its files. It cannot check that the work is right. Rework after acceptance is a new task, so the record keeps what was accepted.

Shape, ownership and order are mechanical, so hooks hold them. Whether a slice is the right size, and whether the work is right, are judgement, so the planner and the lead hold those.

<details class="editorial-note">
<summary>What the hooks don't cover</summary>

<p>The hooks check structure and specific constraints; they cannot establish that a report is true. A failed report check blocks once; the second stop reports the task with its problems noted. A hook that errors or times out lets the action through. The lead's edit tools and sleep loops are refused, but a file changed through the shell is not seen. Coverage differs by runtime, and none of it is a security boundary.</p>

</details>

### A run, as the observer shows it

The observer is a read-only view built from the ledger and the runtimes' own session logs. The ledger gives the tasks and their states; the logs give each agent's transcript, context use and tool calls. It records; it decides nothing.

![The team observer's workflow graph: 29 tasks over 9 steps, with workers and explorers converging on two reviewers and a final check, sent back twice, waiting on acceptance before packaging](/img/agentic/team-workflow.jpg "A run of 29 tasks over 9 steps. Workers and explorers converge on two reviewers; the final check, in purple, has been sent back twice and waits for acceptance before packaging can begin.")

![The top of the lead agent's observer card: model, context window use, lifetime token counts, and an accept command whose note names the README lines and Explorer evidence it read](/img/agentic/lead-card-crop.png "The lead in a separate run: its context use, and an accept call whose note names the evidence it read.")

<details class="editorial-note">
<summary>The full card</summary>

![The lead agent's full observer card, continuing with the command's result, the lead's message to the user, and its next spawn](/img/agentic/lead-card.png)

</details>

<p class="eyebrow" id="toolkit">04 · Toolkit</p>

## What the agents carry between projects

The skills, the global instructions and the hooks live in one repository and install into each runtime from the same source, with a thin adapter where a runtime differs. Today the runtimes are Claude Code and Codex.

<dl class="rows">
<div><dt>investigate</dt><dd>Reproduce the problem, confirm its cause, then fix it with a regression test.</dd></div>
<div><dt>triage</dt><dd>Judge each open issue on whether it is real, in scope and worth doing, and record the verdict with the repository's labels.</dd></div>
<div><dt>pr-body</dt><dd>A pull request description a reviewer can judge in a minute: what was wrong, what changed, how I know, what could break.</dd></div>
<div><dt>project-init / project-evolve</dt><dd>Stand a repository up on the four layers, then land each later change as a mechanism first.</dd></div>
<div><dt>gcp</dt><dd>Google Cloud with the account and project pinned first, and a stop before anything destructive.</dd></div>
<div><dt>workbench</dt><dd>Check and maintain the permanent VM from its own runbooks, with reachability proven first.</dd></div>
</dl>

Each skill is marked either for explicit invocation or for the agent to select from its description. <code>triage</code>, <code>project-init</code> and <code>lead-team</code> run only when I ask for them; <code>investigate</code> and <code>pr-body</code> an agent may pick itself. The marking is set per skill, and it is separate from permission: selecting a skill doesn't let an agent do anything a hook or I would refuse.
