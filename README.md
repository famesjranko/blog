# personal-blog

Tiny custom static-site pipeline: `content/essays/*.md` → TypeScript → `dist/`, deployed to GitHub Pages. No framework, no templating language — templates are TypeScript functions.

## Conventions (mechanical layer)

- `make check` / `./check.sh` is the canonical gate; CI runs exactly this.
- Order is fast-first: `format:check` → `lint` → `guard` → `typecheck` → `test` → `build`.
- Biome owns lint + format (`biome.json`); `tsc --noEmit` owns types; Vitest owns tests; `scripts/guard.ts` owns structural budgets.
- Content model is a typed API: `src/schema.ts` (`EssaySchema`). Malformed frontmatter fails the build.
- Hugo legacy (`tags`, `categories`) is tolerated at the boundary in `normalizeFrontmatter` and normalized to `topics`. New code consumes `EssayMeta` only.
- `dist/` is build output, never committed. `static/` and `styles/main.css` are copied in by `src/build.ts`.
- All internal links go through `siteUrl()` (`src/site.ts`), prefixed by `BASE_PATH`.
  Local preview uses no prefix; the Pages workflow sets `BASE_PATH=/<repo-name>`
  for project-site hosting (`https://<user>.github.io/<repo>/`).
  Build for the subpath locally with `BASE_PATH=/personal_blog npm run build`.
- Never suppress the gate: `any`, non-null assertions, casts-to-silence, and
  suppression directives (`@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`,
  `eslint-disable`, `biome-ignore`) are banned in authored code. Fix the code instead.
- The custom guard stops growing here: no new guard checks unless a recurring
  problem cannot reasonably be enforced by TypeScript or Biome.

## Structural budgets (enforced, not advisory)

`scripts/guard.ts` (dependency-free, runs as `make guard`) fails the gate on:

| Budget | Limit | Applies to |
| --- | --- | --- |
| TS file length | 250 lines | `src/`, `scripts/` (tests: 400) |
| CSS file length | 400 lines | `styles/` |
| Function body | 50 lines inside braces | all TS |
| Function parameters | 4 (bundle the rest into an object) | all TS |
| Classes per file | 1 | all TS |
| Cognitive complexity | 10 (Biome `noExcessiveCognitiveComplexity`) | all JS/TS |
| Param property mutation | banned — copy the param first | all TS |

Biome additionally enforces (all stable, each with a structural purpose):
`noForEach`, `noUselessCatch`, `noUselessConstructor`, `noUselessLoneBlockStatements`,
`noUselessSwitchCase`, `noUselessTernary`, `noNonNullAssertion`, `noParameterAssign`,
`useBlockStatements`, `useCollapsedElseIf`, `useThrowNewError`,
`noAssignInExpressions`, `noAsyncPromiseExecutor`, `noConfusingVoidType`.

TypeScript runs under full `strict` plus `noImplicitReturns`, `noUnusedLocals`,
`noUnusedParameters`, `noPropertyAccessFromIndexSignature`, and
`noUncheckedSideEffectImports`. Two Biome-proposed rules genuinely conflict
here (`useLiteralKeys` wants `process.env.X`, the compiler requires
`process.env["X"]`); index-signature access goes through the tiny `readEnv()`
helper in `src/site.ts` so both rules stay enabled.

## Commands

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `make install`       | `npm ci`                                  |
| `make check`         | Full gate (format-check, lint, guard, types, tests, build) |
| `make guard`         | Structural budgets (LOC, params, classes, mutations, suppressions) |
| `make format`        | Rewrite with Biome                        |
| `npm run build`      | `tsx src/build.ts` → `dist/`              |
| `make preview`       | Build + serve `dist/` at http://localhost:8000 (`PORT=8001` to override) |
| `npm run typecheck`  | `tsc --noEmit`                            |
| `npm test`           | `vitest run`                              |

## Layout

```text
content/essays/*.md   Markdown + frontmatter (Hugo-tolerant)
src/
  build.ts            Entry: load → generate → copy assets
  content.ts          Glob, parse, slug, sort (drafts excluded)
  markdown.ts         Markdown → HTML (markdown-it)
  schema.ts           Zod content model + Hugo normalization
  site.ts             BASE_PATH / siteUrl helper
  routes.ts           Page/RSS/sitemap generation
  html/               Templates as functions (layout, essay, index, topic)
scripts/
  guard.ts            Structural gate entry (LOC, suppressions, file length)
  guard/
    limits.ts         Budgets + shared types
    comments.ts       Comment-aware suppression scan
    functions.ts      Param/body-size checks
    mutation.ts       Param-property-mutation walk
static/               Copied verbatim to dist/
styles/main.css       Copied to dist/styles.css
dist/                 Build output (gitignored) → GitHub Pages
```
