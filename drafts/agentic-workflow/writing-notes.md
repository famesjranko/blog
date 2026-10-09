# Collaborative writing notes

## Current decision

The revision21 mock remains research and presentation material, not an agreed
draft. Andy rejected the overall result and explicitly invoked longform-writing
to work through the piece together. Do not restart whole-page rewriting or
review panels. Agree voice and outline, then draft one section at a time.

## Author-selected voice sample

Andy selected his replies in “Can ‘Know Thyself’ Define Philosophy?”
Source: content/essays/descript_philosophy.md, “Objections and Replies”.
Use only text marked “My response” as voice evidence. Exclude the other
student's objections and embedded quotations from that student. The main
essay was read for context, but the replies are the preferred sample.

Matt Balshaw's agentic-engineering page remains the author's selected
reference for brevity, visual structure and technical depth.

## Agreed voice reading

Andy agreed to this reading with “Sure”.

- Start with the point or concern at hand, then explain the distinction.
- Use first-person singular for preferences and motives; avoid universalising
  Andy's own practice. Replies distinguish personal inclination from a rule.
- Connect sentences as reasoning develops. Mix a short plain statement with
  longer explanatory sentences; avoid a sequence of slogans or feature claims.
- Be conversational and precise, willing to qualify a claim or admit uncertainty.
- Preserve the reader-facing explanation without importing the debate's
  argumentative setting or philosophy terminology.
- Use British/Australian spelling. Keep operational steps in compact boxes;
  allow prose enough room to explain a meaningful decision.
- Use inline source links for relevant external claims, rather than adopting
  the philosophy essay's academic reference apparatus wholesale.

## Existing author decisions to preserve

The piece describes how Andy works as a solo developer across projects,
languages and frameworks. Repo checks follow project requirements; recurring
preferences include file and function length. Central distinctions: agent
judgement versus mechanical enforcement, bounded context and responsibility,
contract/report/acceptance, and local checks versus CI and deployment.

Keep project layers, team/workbench diagrams at increasing detail, and real
observer screenshots. Compress routine GitHub/triage explanation into short
entries. Explain the team directly, without a trials narrative. Do not restore
an explicit contribution inventory. Describe the designed workbench, including
the lab capability, rather than making temporary RAM limits the subject.

## Evidence already available

sources.html records repository research and historical review findings.
Review approvals do not override the author's rejection of voice or structure.
The opening is now being drafted separately in article-draft.md. Revision21 remains unchanged.

## Revised outline agreed with Andy

Andy said “Yes much better” to organising around the actual parts:
workbench, project setup, lead-team and skills. Judgement versus mechanical
enforcement runs through them. Drop the generic delivery walkthrough. Each
part should show its concrete mechanism with a visual and a short explanation.
Do not compress the distinctive mechanisms while keeping generic process prose.

Opening draft1 is pending author review. Its factual basis is Andy's account
of T3, laptop/phone access, speech-to-text and always-on workbench; his explicit
judgement/mechanics distinction and file-size preferences; and the lead-team
contract, report and role sources recorded in sources.html.

## Opening draft1 rejected — provider framing

Andy rejected the opening as too close to the existing draft, particularly
leading with Claude and Codex. He currently uses those clients because their
subscriptions fit his budget; that is not the architectural foundation of the
workflow. Do not put his budget or subscriptions in the article unless asked.
His intended setup is model/provider agnostic, with agent-toolkit catering for
runtime differences. Lead with the way of working, not a vendor inventory.

Checked agent-toolkit README.md and ARCHITECTURE.md: portable skills, global
instructions and MCP setup are shared; adapters and hook registrations address
runtime-specific interfaces. README identifies AGENTS.md as the common policy
source and a CLAUDE.md compatibility import for the installed stable version.
Do not turn this into a claim that every runtime/provider is tested, or that
all runtime interfaces are interchangeable. Broader vendor standards claims
would need separate verification if included in the article.

The draft1 text is preserved for history, not accepted for use. No replacement
opening has been drafted at this step.

## Opening draft2

Andy agreed to the revised premise: a consistent solo-development workflow
across projects and providers, explained through workbench, project foundations
and team contracts. Current client names belong in the tools section.
Opening draft2 is in article-draft.md and awaits review; rejected draft1 is
archived in opening-draft1-rejected.md. Sources: Andy's stated project scope,
workbench and judgement/mechanics preferences; toolkit README/ARCHITECTURE
shared-source and runtime-adapter boundaries; lead-team report checks recorded
in sources.html. Do not draft subsequent sections until Andy responds.

## Opening draft3 — mirror the purpose of Matt's opening

Andy rejected draft2 and explicitly asked for his version of Matt's opener.
Re-fetched https://mattbalshaw.com/agentic-engineering. Matt establishes his
role, his use of agents, his interest in refining the workflow, and what the
page covers before introducing mechanisms. His cadence metrics and agency
claims do not transfer to Andy. Draft3 uses Andy's solo-development context,
cross-project work and stated tinkering interest, followed by the page's scope.
The judgement/mechanics explanation belongs in the body, where mechanisms
make it concrete. Draft3 remains unapproved; wait for Andy before continuing.

## Opening draft4 — professional context and evolving practice

Andy said draft3 was better but sounded like a hobbyist. He supplied the fact
that he worked with Matt at AppNative and has professional development
experience. He also wants the page framed as subject to change as models and
his process evolve. Draft4 replaces the tinkering-led introduction with that
professional context and adds the evolving-page framing. Do not imply current
employment at AppNative or unprovided commercial outcomes. Retain the existing
second-paragraph sentence about environment, coordination and checks.
Draft4 awaits author review.

## Handoff: drafting stopped at Andy's request

The latest opening is rejected. It wrongly foregrounds biography/employment
when the subject is Andy's agentic software engineering approach. Do not treat
AppNative or personal background as agreed opening content. Andy asked to stop
and preserve the work on a remote branch so he can continue himself. None of
the opening drafts or full mocks is approved for publication.
