---
title: "How I organise a team of agents"
description: "Coordinating coding agents through task contracts, hooks, acceptance rules and an observer."
date: 2026-10-10
draft: false
topics:
  - software engineering
  - coding agents
---

Managing a team of coding agents involves dividing work, choosing suitable models and preserving context. A lead agent coordinates delegation, assesses results and keeps the work coherent. Language models are probabilistic, so an agent given only written instructions may follow a rule on one run and skip it on the next. That is why I built `lead-team` around enforceable rules. It is a skill for Claude Code and Codex: a set of instructions that an agent loads to follow a working method.

The lead agent works with a planner agent to divide the work into tasks, assigns them to agents, and judges their results before allowing later work to depend on them.

Each task has a contract: a structured JSON record defining its goal, boundaries and acceptance criteria. A ledger stored on disk holds those contracts and tracks each task's state. Hooks let the coding runtime check actions against that record. An observer program combines the ledger with the agents' native logs so I can inspect decisions and follow the run.

The skill supplies the working method; the ledger and hooks give parts of it mechanical support. The lead still has to decide whether the work is correct.

## The lead agent and its team

The lead gives each agent the context it needs, reads its results and decides what happens next. I set the scope, permitted actions and review depth, and resolve decisions that would materially change the agreed cost or risk.

![The user briefs a lead agent, which assigns work to agents in planner, explorer, worker, reviewer and chore roles.](/img/ai-engineering/lead-team/team.svg "Agent roles and their reporting relationships. The lead selects the roles the job needs; it does not start a fixed team of five. [Open figure at full size](/img/ai-engineering/lead-team/team.png)")

Implementation, investigation and routine execution go to the assigned agents. The lead keeps its context for judgement, integrates accepted branches and publishes when the brief permits it. If delegation stalls, it waits or retries rather than taking over code changes assigned to a worker agent.

Each new task gets a fresh agent and context. An agent can be resumed to correct its own task, but it does not accumulate unrelated work. The contract and repository supply what it needs to know.

Stronger models normally handle planning and independent review, middle-tier models handle worker and explorer tasks, and the smallest handle routine chores, within the tier and effort caps below.

<details class="team-note">
<summary>Model tiers, effort and escalation</summary>

Model tier and reasoning effort are separate choices. Effort defaults to medium; high needs a reason in the contract. Nothing runs above high, and no member may exceed the lead's tier or effort.

A worker agent starts on the middle tier. Each reassignment to a replacement agent permits a one-tier increase. Going further requires my approval, recorded in the contract, and still cannot exceed the lead's tier. An unavailable model alias does not authorise a more expensive substitute.

</details>

## Turning the brief into contracts

Before assigning work, the lead registers a ledger for the session I started, which all its agents share. A planner agent receives the first contract, reads the repository and proposes tasks that one agent can finish and another can judge. The lead checks their scope, file ownership and dependencies before adding them. A sufficiently detailed plan supplied with the brief can replace this planning step.

A contract identifies the task and its parent, goal, numbered acceptance criteria, model, effort and prerequisites. A worker agent starts without the lead's conversation and receives its worktree, base commit, permitted and forbidden files, verification commands and repository instructions.

As a hypothetical example, take a worker tasked with excluding image alt text from this blog's reading-time calculation. Its contract could look like this:

| Contract part | Example |
|---|---|
| Identity and goal | `count_prose`, a worker agent reporting to the lead; exclude image alt text from the word count |
| Acceptance | `A1`: alt text adds no words; `A2`: normal prose still counts; `A3`: new tests fail when the relevant behaviour is removed |
| Ownership | `src/readingTime.ts` and its tests; configuration files forbidden |
| Context and starting point | Repository instructions, an isolated worktree and a fixed base commit |
| Verification | Focused reading-time tests, with commands and actual output |
| Prerequisite | The planning task has been accepted |

A second worker changing the reading-time badge shown on each post would own different files. Independent workers use separate worktrees; tasks needing the same file run in sequence. This keeps concurrent edits apart and limits the code each worker must understand.

The ledger checks each contract against a schema of required fields, value types and rules for its role before adding it. Dependencies must name valid tasks and contain no cycles. A contract can be revised while queued; an agent that has started keeps the brief it received.

<details class="team-note">
<summary>Ledger files and validation</summary>

`team.py` manages one ledger directory per session. `state.json` stores the contracts and current task states. `journal.jsonl` records commands and hook decisions as one JSON object per line. Python validation code enforces the contract schema. File locks and atomic replacement of `state.json` protect concurrent updates.

</details>

## How hooks apply the rules

A hook is a program the runtime calls around an event, such as an agent spawn or tool invocation. A small shell wrapper passes the event to `team.py`, which also manages the ledger. The hook can therefore check the proposed action against the contract and current task state.

![Spawn, start and stop hooks surround an agent's work; the lead separately judges the result.](/img/ai-engineering/lead-team/hooks.svg "Hooks check admission, task binding and reports. Edit, message and shell hooks govern other lead actions. Acceptance remains a separate decision. [Open figure at full size](/img/ai-engineering/lead-team/hooks.png)")

| Event | Rule applied |
|---|---|
| Spawn | Refuses requests without a queued contract, accepted prerequisites, authorised parent, available delegated allowance or compatible model settings. On Codex, the spawn must also start with fresh context. |
| Start | Binds the runtime agent to its task and marks it running. |
| Stop | Checks report fields, criterion IDs, required verification commands and the worker's changed-file ownership. Normally allows one correction attempt, then records remaining problems for the lead. |
| Edit | Refuses a lead's edit-tool changes to repository files that Git does not ignore. |
| Message | Requires a running task before resuming its agent. New work needs a new task. |
| Shell | Refuses the lead's polling sleep loops or sleeps longer than five seconds. Long external waits go to a chore agent. |

These checks support the workflow but are not a security boundary. Internal errors or timeouts can let an action through. The edit hook does not catch shell-based file changes. A well-formed report can also contain false claims, which is why the lead reads the evidence itself.

<details class="team-note">
<summary>Hook registration and runtime exceptions</summary>

`init` checks that spawn, start and stop hooks are registered with suitable matchers. It rejects missing or malformed registration. This does not establish runtime trust or check all six event paths. An explicitly unenforced run requires my choice and is labelled in the ledger. A session without a ledger is not treated as a team.

Verification matching checks a command's program and script or subcommand, not its arguments or working directory. Ownership covers the worker's own commits since its fork point and uncommitted or untracked changes, excluding changes merely merged from another branch.

A terminal hand-back cannot receive a correction turn, so its report problems are recorded immediately. The Codex message hook also refuses calls that only queue text for a team child; the lead must use the call that resumes work.

</details>

## Reports and acceptance

An agent ends with a report connecting its brief to the work it completed:

```text
STATUS:    DONE | DONE_WITH_CONCERNS | BLOCKED | REJECTED
CHANGED:   branch, commit and files, or none
EVIDENCE:  each criterion ID, with commands and actual output
NOT DONE:  incomplete items and their reasons
DECISIONS: questions for the parent
```

For the reading-time task, the evidence must address `A1`, `A2` and `A3`. Passing tests alone would not satisfy the last criterion. The worker must remove the relevant behaviour, show the regression tests failing, restore it and show them passing. Changing an assertion to force a failure would not prove that the test detects the defect.

Other roles supply evidence suited to their work: file evidence and a size estimate for each planned task, sources for an investigation, reproductions for review findings, and commands with exit codes for routine checks. The lead reads a worker's diff as well as its report, then records what it examined in the acceptance note.

The report status describes the agent's result. `DONE` means its brief is complete; `DONE_WITH_CONCERNS` means complete with unresolved concerns. `BLOCKED` needs a decision or prerequisite. `REJECTED` means the task's premise did not hold, such as a bug that did not reproduce. That can be a useful result if the evidence supports it.

The ledger records a separate task state. When the agent stops, the task becomes `reported`. The lead's acceptance makes it `done` and releases dependent work. Neither a report headed `DONE` nor a passing stop-hook check performs that acceptance.

![A queued task runs, reports and awaits acceptance; the lead can accept it or send it back.](/img/ai-engineering/lead-team/lifecycle.svg "The main task cycle, with alternative transitions below. The lead records why work is accepted, returned or dropped. [Open figure at full size](/img/ai-engineering/lead-team/lifecycle.png)")

A send-back records the required correction and returns the task to `running`; the lead then resumes its agent. If a new completion repeats the failure, reassignment clears the owner and queues the task for a fresh agent.

Work that is no longer needed can be dropped once its dependents have been revised or dropped too. An investigation that rejects a bug premise can therefore close the conditional fix tasks without claiming a fix was delivered.

## Dependencies and rework

The reporting hierarchy describes who assigns and judges work. The dependency graph describes which accepted results a task needs. Two workers reporting to the same lead may be independent or may have to run in sequence.

The calculation and badge workers can proceed independently if their file ownership and interfaces allow it. The lead accepts each branch and then merges it as a separate step, before a reviewer agent examines the combined result.

![Independent calculation and badge tasks join at review, followed by a new fix and re-check before final verification.](/img/ai-engineering/lead-team/dependencies.svg "Arrows represent acceptance dependencies. When review finds a defect, the queued final check gains a dependency on the new fix and re-check. [Open figure at full size](/img/ai-engineering/lead-team/dependencies.png)")

Suppose review finds a boundary case in the calculation. Accepting that report accepts its findings; it does not approve the faulty implementation for publication. The lead adds a fix task and re-check, then revises final verification to wait for them. The earlier acceptance remains in the record alongside the later finding.

The ledger permits limited reopening: an accepted task can be sent back while no accepted dependent relies on it. Running or reported dependents then return to queued, transitively, because their results are stale. Once dependent work is accepted, reopening is refused. New tasks are the normal route for rework after acceptance.

A graph can consequently show many finished tasks while a new fix still blocks completion. Its columns express dependency depth, not time slots. Independent work may proceed further right while an earlier-column task is still running.

## Review and completion

Review depth is agreed during planning. A lighter review uses the lead's diff inspection and a reviewer agent where independent judgement helps. The default team process adds passes by explorer agents with distinct lenses after integration. Each lens focuses on a class of failure to investigate.

The starting lenses cover encoding, size limits, parsing, configuration and platform differences. The lead selects those relevant to the change and adds domain concerns such as authorisation or concurrency. Each pass gets a fixed integration commit, requirements and a budget. Resource-intensive probes need effective limits and a timeout; none should perform real publishing, deletion or other live side effects.

A finding must include its reproduction, expected and actual behaviour, and the requirement it violates. Suspicions stay separate. The lead checks the finding before assigning a fix, since a reproduced behaviour outside the requirements is not automatically a defect.

Workers changing a guard, parser or other trust boundary also receive design criteria before implementation. These cover failures of required checks, bounded data, supported input forms, skipped content and alternate paths. They give the later review concrete behaviours to challenge.

A confirmed defect goes to a worker agent for a fix and regression test, followed by a fresh re-check using the lens that found it. If the problem remains, the run stops for my decision. More review rounds require a deliberate choice.

Finally, a chore agent runs the full repository checks on the integrated result. Workers have already run their focused checks. The lead inspects the page, document or program where I will judge it, then publishes only what the brief permits. Pull-request merging remains a separate human decision. A failure found after publication becomes new work with its own review and verification.

## How the observer follows the run

The task graph and decisions also provide the structure for observation. Unless I opt out, the lead attaches an observer to the session's log and ledger. It runs beside the team and has no authority to accept work or command agents.

![The team ledger and runtime logs feed an observer recorder, which writes the snapshot and journal used by the live dashboard and offline replay.](/img/ai-engineering/lead-team/observer.svg "The ledger supplies task decisions; native logs supply observed activity. The observer keeps its own snapshot and journal, separate from the team's records. [Open figure at full size](/img/ai-engineering/lead-team/observer.png)")

The ledger supplies contracts, dependencies, owners, states and decision notes. Native logs supply agent identities and parents, activity, model settings and available usage counters. The observer joins these sources with the ledger's own state reducer, which validates and applies state changes.

The team view shows the reporting hierarchy. The workflow view shows dependencies, including work awaiting a lead decision. Selecting a task reveals its contract, prerequisites and decision history; selecting an agent reveals its activity and usage. Run history connects hook refusals, send-backs and acceptances to their reasons and source times.

A "Needs attention" panel collects blocked reports, reports awaiting the lead and refused spawns. A blocked-report card shows why the stop hook objected, so I can inspect the problem without searching the transcript.

![Recorded workflow with 29 tasks, a reported final check and queued packaging work.](/img/ai-engineering/lead-team/team-workflow.jpg "A recorded run, separate from the reading-time example. Follow final_check into package_prs on the right; an independent task is still running on the left. [Open figure at full size](/img/ai-engineering/lead-team/team-workflow.jpg)")

Here, `final_check` is purple because it has reported and awaits acceptance. Its loop records two send-backs. `package_prs` remains queued behind it. An idle agent can therefore own a task that still blocks progress. Display labels add context: "sent back" explains a `running` task, while "blocked report" records a report-check problem (distinct from the agent's `BLOCKED` report status).

In the agent detail below, the lead's acceptance command cites README lines and explorer evidence. The activity then shows the command result, the lead's explanation and its next spawn.

![A recorded lead card showing usage and an acceptance command with its evidence note.](/img/ai-engineering/lead-team/lead-card.png "A separate recorded run. The activity view shows the acceptance command; the ledger holds the resulting task decision. [Open figure at full size](/img/ai-engineering/lead-team/lead-card.png)")

The dashboard refreshes its snapshot about every two seconds during live following. A failed refresh leaves the last valid state visible with a warning. Capture status and observation time matter: a quiet or stale log does not establish that an agent is stalled. If observation fails, the team can continue and the gap is reported.

Closing capture saves a standalone `replay.html` with the recorded history and viewer. It opens offline and preserves any capture gaps. The live server has no login, and transcripts can contain repository content and tool output, so its network reachability determines who can read the run.

<details class="team-note">
<summary>Reading transcripts and usage counters</summary>

The activity view contains clipped text and tool entries, retaining a window of recent activity. Opaque content stays opaque; the native log remains the full source. Transcript prose does not determine task completion.

Current context occupancy, last-request counters and cumulative thread usage are different quantities. Counters from different runtimes are not automatically comparable team costs. Some context windows are derived from model and configuration information and labelled accordingly. Missing readings and unknown parents are shown as missing, not estimated.

</details>

## When there is more than one lead agent

When a brief has several outcomes, a second skill, `manage-team`, adds a manager agent above the lead agents. It assigns each lead an outcome contract, boundaries and an allowance of child agents. Each lead handles local planning, acceptance and integration; the manager resolves cross-team decisions and judges the completed outcomes.

![A manager agent assigns outcomes to two delegated lead agents, each with a child allowance, sharing one ledger and observer.](/img/ai-engineering/lead-team/manager.svg "The manager agent reserves capacity for each lead and its children. Local acceptance and the manager's acceptance of the outcome remain separate decisions. [Open figure at full size](/img/ai-engineering/lead-team/manager.png)")

A delegated lead shares the session's ledger and observer. Its children name its lead task as their parent. The spawn hook checks that ownership and the allowance, counting both running children and reported children awaiting acceptance. Runtime capacity can impose a tighter limit.

Workers and reviewers do not create further teams, and a delegated lead cannot add another management layer. Scope conflicts and requests for capacity return to the manager. Before handing back an outcome, the lead collects its children's results and accounts for any unfinished descendants.

## Where judgement remains

The structure makes commitments and decisions inspectable. It still depends on the lead to choose useful tasks, write adequate criteria and recognise when a technically complete result misses the goal. Changes to the agreed scope, cost or risk return to me.
