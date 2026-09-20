<div align="center">

# Blog

Personal website for essays and projects.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Zod](https://img.shields.io/badge/Zod-4.x-408AFF?style=flat-square&logo=zod&logoColor=white)](https://zod.dev)
[![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Biome](https://img.shields.io/badge/Biome-2.x-60A5FA?style=flat-square&logo=biome&logoColor=white)](https://biomejs.dev)
[![CI](https://img.shields.io/github/actions/workflow/status/famesjranko/blog/ci.yml?style=flat-square&label=CI)](https://github.com/famesjranko/blog/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-manual-222?style=flat-square&logo=github&logoColor=white)](https://github.com/famesjranko/blog/actions/workflows/pages.yml)

</div>

---

Custom static site built with TypeScript and Markdown.

## Development

| Command        | Purpose                 |
| -------------- | ----------------------- |
| `make install` | Install dependencies    |
| `make preview` | Build and serve locally |
| `make preview-wsl` | Build and serve on WSL interfaces |
| `make check`   | Run the full quality gate |

> [!NOTE]
> Requires Node 24 (see `.nvmrc`). `make preview` serves `dist/` at `http://localhost:8000` (`PORT=8001` to override).
> Under WSL2, use `make preview-wsl`; it refreshes the Windows port forwarding and firewall rule, prompting for administrator access when needed.

## Stack

* TypeScript
* Node.js
* Zod
* Markdown
* Biome
* Vitest
* GitHub Actions
* GitHub Pages

## Structure

```text
content/    Markdown content
src/        Site generator
styles/     Stylesheets, served from css/
static/     Static assets, copied as-is (js/ scripts, img/ images)
scripts/    Repository tooling
dist/       Generated site output
```

<details>
<summary><strong>Project-site URLs</strong></summary>

<br>

GitHub Pages serves this repository under `/blog/`. Internal URLs use
`BASE_PATH`, which is empty locally and `/blog` in the Pages build.
RSS and sitemap URLs use `SITE_ORIGIN`, which the Pages workflow derives
from the repository owner.

</details>

<details>
<summary><strong>Cover images</strong></summary>

<br>

An essay or project names its card image with `cover` in frontmatter.
One without a cover gets generated art instead: `npm run images`
renders `static/img/placeholders/<slug>.jpg`, a fluid-ink image seeded
by the slug and coloured from the real covers, and `make check` fails
until it exists. The file is checked in and only rendered when
missing, so delete it to re-render. It is removed again once the piece
gains a cover.

</details>

## Deployment

The site is intended for:

```text
https://famesjranko.github.io/blog/
```

Deployment is currently manual.
