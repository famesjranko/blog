# AGENTS.md

## Scope

These instructions apply to the entire repository.

## Before making changes

- Read the relevant existing files before editing.
- Preserve the existing architecture unless the task explicitly requires changing it.
- Run `./check.sh` before substantial work when practical to establish a clean baseline.
- Use the existing `siteUrl()` / `BASE_PATH` mechanism for internal URLs.
- Do not assume the repository summary in a prompt is newer than the files on disk.

## Architecture

This is a custom TypeScript static-site generator:

Markdown → TypeScript build pipeline → `dist/` → GitHub Pages.

Do not introduce a frontend framework, template engine, alternate static-site generator, or overlapping build/lint toolchain unless explicitly requested.

Prefer the smallest change that fits the existing design.

Do not introduce speculative abstractions, generic component systems, dependency injection, unnecessary classes, or utility layers for hypothetical future needs.

## Structural guardrails

The repository deliberately enforces strict structural limits.

Do not weaken, bypass, or raise these limits to make a change pass.

Current limits include:

- production TypeScript/JavaScript files: ≤250 lines
- test files: ≤400 lines
- CSS files: ≤400 lines
- function bodies: ≤50 lines
- function parameters: ≤4
- classes per file: ≤1
- cognitive complexity: ≤10

If a change exceeds a limit, simplify it or split it along meaningful responsibilities.

Do not mechanically split code merely to satisfy a line limit.

## Prohibited workarounds

Do not introduce:

- `@ts-ignore`
- `@ts-expect-error`
- `@ts-nocheck`
- `biome-ignore`
- `eslint-disable`
- non-null assertions merely to silence the type checker
- `any` merely to avoid proper typing
- guardrail/configuration changes merely to make a feature pass

Do not weaken:

- `biome.json`
- `tsconfig.json`
- `scripts/guard*`
- `check.sh`
- existing tests

unless the task explicitly concerns those guardrails.

## Coding style

- Prefer explicit, readable code over clever code.
- Prefer small functions with one clear responsibility.
- Prefer immutable transformations over mutation.
- Do not mutate function parameters or their properties.
- Prefer typed option objects once a function would otherwise need many parameters.
- Avoid deep nesting; use early returns where clearer.
- Do not use `.map()` for side effects.
- Do not add dependencies where platform APIs or existing dependencies are sufficient.

## Testing

For behavioral changes:

- add or update focused tests where meaningful;
- test observable behavior rather than implementation details;
- ensure new tests can demonstrably fail when behavior is broken;
- avoid giant snapshots and brittle markup/CSS assertions.

Do not delete, skip, weaken, or rewrite tests just to make a change pass.

## Validation

`./check.sh` is the canonical quality gate.

Before finishing any code change, run:

```bash
./check.sh
