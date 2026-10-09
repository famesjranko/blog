# Agentic workflow article — unfinished draft

Work stopped at the author's request. No draft is approved for publication.
The latest opening was rejected: the subject is the agentic software
engineering approach, not the author's biography or employment history.

## Start here

- `workflow-materials.zip`: complete static mock folder, earlier alternatives,
  diagrams, observer screenshots, research/source notes, review records,
  revision21 browser captures, and the available generator scripts.
- `article-draft.md`: the latest **rejected opening only**, not the full article.
- `writing-notes.md`: agreed constraints, voice sample, feedback and draft history.
- `workflow-materials.sha256`: checksum of the preserved snapshot.

The archive keeps the original mock files intact. It is draft material, not
part of the site's build or published content. The full article is in
`mock/d-workflow.html` inside the archive; that is revision21, before the
subsequent opening-only writing session.

## Open the mock

From the repository root:

```sh
python3 -m zipfile -e drafts/agentic-workflow/workflow-materials.zip /tmp/agentic-workflow-handoff
python3 -m http.server 41716 --bind 0.0.0.0 --directory /tmp/agentic-workflow-handoff/mock
```

Open `http://localhost:41716/d-workflow.html`. From another device, use the
serving machine's LAN address with the same port and path.

## Useful files inside the archive

| File | Purpose |
| --- | --- |
| `mock/d-workflow.html` and `mock/d-workflow.css` | Latest complete static page, revision21 |
| `mock/d-revision20.html` and `mock/d-revision20.css` | Frozen prior version |
| `mock/d-revision14.html`, `d-revision16.html`, `d-revision18.html`, `d-revision19.html` | Earlier copy/layout stages; some share later stylesheet assets |
| `mock/a-case-study.html`, `b-workflow-page.html`, `c-essay.html` | Initial directions |
| `mock/sources.html` | Repository evidence and research history; some entries describe superseded drafts |
| `mock/writing-notes.md` | Later collaborative writing decisions and corrections |
| `mock/opening-draft*.md` | Earlier opening attempts |
| `mock/team-workflow.jpg` | Original larger team workflow graph |
| `mock/observer-agent-desktop.png` and `observer-agent-mobile.png` | Selected Lead card from a separate demonstration run |
| `mock/environment-v1-export.svg` and `lead-team-v2-export.svg` | Earlier standalone diagram exports; latest diagrams are inline in the HTML |
| `mock/blog-style/` | Fonts and stylesheet/script copies required by the mock |
| `mock/reviews/` | Historical reviews; approvals do not override the author's later rejection |
| `captures/` | Revision21 desktop and mobile browser captures |
| `generators/` | Original one-off generation scripts, preserved for reference |

Edit the extracted HTML/CSS directly to continue the mock. The generator
scripts use original absolute paths and temporary dependencies; they are not
portable build commands. The original external working folder remains at
`/home/andy/.t3/artifacts/agentic-workflow-20261009` on the workbench.

## Direction at handoff

Focus on the concrete parts: workbench, project setup, lead-team and skills.
Explain judgement versus mechanical enforcement through those mechanisms.
Keep provider choice incidental. Keep ordinary GitHub/triage material short.
Use diagrams at increasing detail and real observer images. Avoid a trials
narrative, generic delivery explanations, or a contribution/biography inventory.
The page should evolve as models and the author's process change.

Voice reference: the author's own replies in “Can ‘Know Thyself’ Define
Philosophy?” (`content/essays/descript_philosophy.md`), excluding the other
student's text. Matt Balshaw's agentic-engineering page is the reference for
focus, concision and technical depth.
