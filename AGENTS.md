# AGENTS.md

## Scope

These instructions apply to the entire repository.

## Before making changes

- Read the relevant existing files before editing.
- Preserve the existing architecture unless the task explicitly requires changing it.
- Run make check before substantial work when practical to establish a clean baseline.
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
- Makefile quality/check targets
- `package.json` validation scripts
- CI workflow validation commands
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

### Test Rules

1. Every test must be capable of failing under a plausible defect.
2. Test externally observable behaviour, not implementation details.
3. Each test should prove one behavioural contract.
4. Regression tests must reproduce the original defect before the fix.
5. Expected values must be independent of the implementation under test.
6. Tests must be deterministic, isolated, and order-independent.
7. Assertions must verify correctness, not merely execution.
8. Include negative, boundary, and failure-path coverage where relevant.
9. Never weaken a valid test merely to make the suite pass.
10. A new test should be mutation-checked when its value is uncertain: deliberately break the behaviour and confirm the test fails.

## Validation

`make` is the canonical interface for repository checks.

Use focused targets while developing:

```text
make format
make format-check
make lint
make guard
make typecheck
make test
make build
```

The final quality gate is:

```bash
make check
```

`make check` is the sole definition of the full validation gate. Compatibility entry points may delegate to it but must never duplicate its steps.

### Final-gate rules

* Run `make check` only after all intended code, tests, styles, configuration, and cleanup edits are complete.
* `make check` must be the final validation of the current worktree.
* If any source, test, style, configuration, build, or guardrail file is edited after `make check`, the previous result is stale and `make check` must be run again.
* Never report the repository as green based on a gate run performed before the final edit.
* Do not substitute a collection of focused checks for the final `make check`.
* Do not pipe or filter validation output in ways that can hide errors or warnings.
* Do not use `|| true`, ignored exit codes, shell redirection, or other mechanisms that can conceal a failed check.
* A task is not complete until `make check` exits successfully on the final worktree.
* After the final gate, inspect `git status --short` and `git diff --check`. Do not modify repository files afterward unless you rerun the gate.

### Failure handling

If any check fails:

1. fix the underlying problem;
2. run the relevant focused target while iterating;
3. rerun the complete `make check` after the fix;
4. do not weaken tests, lint rules, compiler settings, structural limits, or validation commands merely to obtain a green result.

When reporting completion, state the actual result of the final `make check` run. Do not claim checks passed if they were not run against the final worktree.
