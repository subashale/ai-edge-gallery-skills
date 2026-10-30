# User-published hosting verification

Read-only verification on 2026-10-30. The user published the prepared files;
the assistant did not push, upload, configure hosting, or deploy changes.

Repository: [subashale/ai-edge-gallery-skills](https://github.com/subashale/ai-edge-gallery-skills).
GitHub's API reported a public repository, default branch `main`, and Pages
enabled. The [Pages deployment](https://github.com/subashale/ai-edge-gallery-skills/actions/runs/41058719399)
was completed with conclusion `success`.

| Requested URL path under the Pages project | HTTP result |
| --- | --- |
| `/` | 404; no root homepage index file |
| `/read-and-explain/` | 404; no index file in the skill folder |
| `/read-and-explain/SKILL.md` | 200; `text/markdown; charset=utf-8`; raw frontmatter and instructions |
| `/read-and-explain/scripts/index.html` | 200; `text/html; charset=utf-8` |

The repository root contains `.nojekyll`, `README.md`, and `read-and-explain/`.
Neither folder has a homepage `index.html`. The 404 when visiting a folder is
distinct from failing to retrieve its skill files. Gallery's documented loader
uses the supplied folder URL to request `SKILL.md` and `scripts/index.html`.
The iOS implementation still requires an actual phone test.

Paste this URL into Gallery's **Load skill from URL**:

`https://subashale.github.io/ai-edge-gallery-skills/read-and-explain/`

## Hosted runner check

At 2026-10-30 13:55:51 Europe/Berlin (`2026-10-30T12:55:51.069Z`), a temporary
desktop Chrome 156.0.8078.74 profile opened the actual published runner URL.
It returned HTTP 200, defined `window.ai_edge_gallery_get_result` as a function,
and successfully retrieved `https://httpbin.org/html` from the GitHub Pages
origin. The result contained 3,763 characters including metadata, the expected
public test-page text, and no error. No browser console errors were observed.
The machine-readable record is local-only at `test-results/hosted.json` and is
not part of the repository upload.

This verifies hosted script execution and retrieval in desktop Chrome only.
It does not verify iOS importing, WKWebView behavior, Gemma tool routing or
summarization, microphone input, or speech playback.

## Subsequent target-page and phone observations

The user supplied `https://subashale.com.np/` and reported a generic retrieval
error in Gallery on the iPhone. The user then confirmed that
`https://httpbin.org/html` worked in the same Agent Skills session. This is
partial device evidence, not a general compatibility result.

The actual published runner was tested again in desktop Chrome at
2026-10-30T13:04:50.739Z: the HTTPS user site returned a 4,232-character result,
including a 4,000-character truncated excerpt, and the httpbin control returned
3,763 characters. HTTP input was separately rejected by URL validation. The
HTTPS run logged a blocked inline-style CSP warning but returned text; that
warning does not establish the cause of the iPhone failure. The local-only
details are in `test-results/subashale-site.json`.

Read-only server probes also showed the HTTPS site returning HTTP 200 and
`Access-Control-Allow-Origin: *` for the GitHub Pages origin. The phone's actual
response and error stage remain unknown. A local error-diagnostic update is
prepared but has not been deployed to this hosting.

## Source-layout migration

The source upload now preserves `skills/read-and-explain/`, so its intended
Gallery URL after the user's next deployment is:

`https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/`

The earlier HTTP and browser observations above apply to the older root-level
payload, not proof that the new path has been published. No hosting changes
were made as part of this local review.
