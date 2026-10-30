# AI Edge Gallery skills — Read and explain

This repository contains a **Google AI Edge Gallery Agent Skill**, plus its
local development tools and test records. The installable skill is
[`skills/read-and-explain`](skills/read-and-explain): `SKILL.md` and
`scripts/index.html`. The HTML runs in Gallery's hidden WebView.

It reads **one user-supplied public HTTPS URL**, extracts text once, and returns
batches with a source URL for Gallery's selected model to explain. A batch
defaults to 4,000 characters and can be adjusted by the caller. Retrieval goes
directly to the source. It needs no
API key, paid search API, proxy, cloud LLM, or Mac retrieval helper.

**Status: prototype with partial, user-reported iPhone validation.** The user
reports that the httpbin HTML control page works in Gallery on an iPhone 12 Pro
with iOS 27.2, Gallery 1.0.22, and `gemma-4-E2B-it-litert-lm`. The user's HTTPS website failed
there with a generic retrieval error, although it succeeded in the published
runner on desktop Chrome. The cause remains unresolved. Model grounding,
microphone input, and read-aloud still require device validation.

See the [device procedure](docs/IOS-VALIDATION.md),
[local test record](docs/LOCAL-TEST-RESULTS.md), and
[upstream inspection](docs/UPSTREAM-NOTES.md). Desktop or Android findings are
not treated as proof of iOS compatibility.

## Publish the project files with GitHub Pages

The [exact upload list](docs/UPLOAD-FILES.md) keeps source, documentation, and
tests in this repository. Keep `.nojekyll` at the root. In GitHub Pages, select
**Deploy from a branch → main → /(root)**.

After uploading this layout and successful deployment, enter this folder URL
in Gallery's **Load skill from URL**:

`https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/`

This adds `/skills/` compared with the earlier payload-only upload. Re-add the
skill using the new URL and start a new chat after switching layouts. The
[hosting record](docs/HOSTING-STATUS.md) describes the earlier published paths;
it does not assert that this new layout has already been deployed.

Verify that appending `SKILL.md` displays raw Markdown and appending
`scripts/index.html` loads HTML. The runner is blank when opened directly.
Opening the folder itself may show 404 because it has no homepage index file;
that is separate from the two required files being reachable.

For local file import, use the two-file skill folder or extract the skill
transport ZIP generated below. Direct ZIP import and the iOS picker's accepted
format are not independently verified.

Try in Agent Skills:

> Read and explain https://httpbin.org/html in two sentences.

Compare the answer against the returned excerpt and source. Then try the
actual public webpage you want to read. Test the microphone and reply speaker
**inside Agent Skills**; their availability elsewhere in Gallery is insufficient.

## Temporary cache and batch reading

The same `run_js` script supports three actions in its JSON `data` argument:

- `fetch`: supply `url` and optional `max_chars`. The script fetches and extracts
  the page, caches one snapshot in `sessionStorage`, and returns the first batch.
- `read`: supply the returned `document_id`, integer `offset` copied from
  Next offset, and optional `max_chars`. This reads the same snapshot without
  another network request. Stop when Next offset is `none`.
- `clear`: supply `document_id` to remove the cached snapshot.

The old `{ "url": "https://example.org/article" }` input still works: it defaults
to fetch with a 4,000-character batch. `max_chars` may be 256–524288; this is an
output-size request within the resource limit, not proof it fits the selected
model. Use the default when available context is unknown, or an explicit
budget supplied by the caller. No model-specific context size is hardcoded.

To change the default itself, edit `DEFAULT_MAX_CHARS` near the top of
`skills/read-and-explain/scripts/index.html`. The skill instructions tell the
model to omit `max_chars` when no explicit budget is known, so this constant is
the runtime default. An explicit `max_chars` always overrides it. Each result
reports `Batch character budget` separately from the actual excerpt length.
After changing the default, update the default-budget assertion in
`tests/reader.test.mjs` and the stated default in this README, run `npm test`,
then run `npm run package`. Re-upload the skill and refresh it in Gallery.

The cache holds one document, expires logically after 15 minutes, and has an
explicit clear action. A timer removes it while the runner is alive; expiry is
also checked on reads. Immediate physical erasure while the WebView is closed
or suspended is not guaranteed. There is no persistent-storage fallback.
Starting another fetch discards the earlier snapshot, even if retrieval fails.

If storage is blocked, the fetched first batch still works and reports that
further reads are unavailable. If the app recreates or isolates its WebView,
later reads may report CACHE_MISS. Cross-call persistence is tested on desktop
Chrome but **requires a separate Gallery iPhone test**.

Gemma orchestrates repeated tool calls; the script cannot call the model itself.
Earlier tool results may remain in Gallery's context, so batch reads do not
automatically free context. The skill instructs the model to stop when it has
enough evidence, keep coverage partial when appropriate, and read at most three
batches per answer when remaining context is unknown. That is model guidance,
not app-level enforcement. Summarization/compaction of retained chat history is
a separate Gallery capability, unverified here.

## Limits and diagnostics

- HTTPS HTML and plain text only. No authenticated pages, PDFs, RSS, search,
  page rendering, multipage crawling, or automatic proxy fallback.
- Many websites block cross-origin reads. A page opening in Safari does not
  establish that a hidden skill WebView can fetch it. Failed retrieval returns
  an error; the model is instructed to avoid inventing page content.
- Retrieval has a 15-second timeout and a 512 KiB response-body limit. Each
  batch uses the requested number of UTF-16 code units, defaulting to 4,000,
  without splitting a surrogate pair. Output includes character counts,
  cursor/range metadata, cache status, and partial-coverage information.
  These counts are **not tokenizer measurements or total context usage**.
- Failures report a code, stage, source URL, runner origin, and underlying
  browser error when available. A generic network error does not establish
  whether CORS, connectivity, TLS, redirects, or WebView policy caused it.
- Extraction favors `main`, `article`, or `[role=main]`, with a cleaned body
  fallback. It does not apply external CSS or recognize every access screen.
  Titles and excerpts are untrusted data; model compliance needs evaluation.
- DOMParser, Fetch streams, TextDecoder, and AbortController must be available
  in Gallery's WebView. Missing required APIs produce explicit errors.
- Public-hostname checks reject obvious local names and IP literals, but do
  not verify DNS resolution. Fetch follows redirects before the final URL is
  checked and reported. This is not a network isolation mechanism.
- Speech is handled by Gallery. This skill invokes no native actions,
  browser speech APIs, MCP servers, or cloud model.

RSS and Google HTML search remain a later stage after the phone's single-page
flow and available speech path have been validated. A Mac helper remains an
optional fallback; none has been built or enabled.

## Run local checks

Development tools: Node.js 22+, Python 3, OpenSSL, and Chromium. These are not
needed by the installed iPhone skill.

```sh
npm ci
npm test
npm run test:live
npm run test:live -- https://subashale.com.np/
npm run package
```

`npm test` uses controlled browser fixtures, including real HTTPS loopback
origins for CORS and redirects. Its self-signed certificate is ignored only in
those fixture contexts. Live probes use normal TLS validation. The runner
uses macOS Chrome by default; set `GALLERY_TEST_BROWSER` to another Chromium
executable, or install Playwright Chromium with `npx playwright install chromium`.
It uses a temporary browser profile and closes its loopback server afterward.

`test:live` works without `upstream/`. If the optional reference checkout is
present, the default probes also run the original Wikipedia script. Otherwise
that comparison is explicitly skipped. To obtain that reference when desired:

```sh
git clone --depth 1 https://github.com/google-ai-edge/gallery.git upstream/gallery
```

The original inspected commit is pinned in the upstream notes. A fresh clone
may contain newer code; record its commit when comparing results.

`npm run package` produces:

- `dist/read-and-explain.zip`: only the Gallery skill folder.
- `dist/ai-edge-gallery-skills-upload.zip`: the complete reviewed source layout,
  with the skill under `skills/read-and-explain/`.
- `dist/UPLOAD-FILES.txt` and `dist/SHA256SUMS`: upload manifest and ZIP hashes.

Extract the upload ZIP into a **fresh folder** and upload its contents to the
repository root. The ZIP uses an explicit file list and excludes dependencies,
`upstream/`, generated test results, build output, and macOS metadata. Raw test
reports remain local under `test-results/`; curated findings are in `docs/`.
Nothing is automatically published or deployed by these commands.
