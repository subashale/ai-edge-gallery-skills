# AI Edge Gallery skills — Read and explain

This repository contains a **Google AI Edge Gallery Agent Skill**, plus local
source, tests, and validation notes. The installable skill is
[`skills/read-and-explain`](skills/read-and-explain): `SKILL.md` and
`scripts/index.html`. The HTML is Gallery's hidden logic runner.

**Current behavior: fetch one supplied public HTTPS URL and return one excerpt
of up to 8,000 characters for the on-device model to summarize.** Batching,
caching, document IDs, cursors, and file saving have been removed. The user
reported that the cached-batch flow did not work on the iPhone and requested
this simpler fallback with an increased excerpt limit.

There is no verified native iOS file-writing bridge available to this skill
through the public Gallery contract we inspected. A native-file cache was not
implemented or claimed to work. The removed cache used WebView storage on the
device, whose lifetime and the model's tool-loop behavior were not reliable in
the user's test.

No API key, paid search API, cloud LLM, proxy, or Mac retrieval helper is used.
Internet is needed to retrieve the page; Gallery's selected model summarizes
only the returned text. **8,000 characters is a script limit, not Gemma's token
capacity or a measurement of available context.**

## Device status

User-reported setup: iPhone 12 Pro, iOS 27.2, Gallery 1.0.22,
`gemma-4-E2B-it-litert-lm` from Hugging Face. Gallery displays Max tokens 32,000.
The reported speed/TTFT/prefill/RAM stats do not show remaining context tokens.

An earlier control-page read worked in Gallery. The user's website initially
failed, and later model replies gave ambiguous budget and continuation claims
without raw tool results. Caching/batching was subsequently reported as not
working. The current single-excerpt 8,000-character version requires a fresh
phone test. Microphone input and read-aloud in Agent Skills remain unverified.

See the [iPhone procedure](docs/IOS-VALIDATION.md),
[local test record](docs/LOCAL-TEST-RESULTS.md), and
[upstream inspection](docs/UPSTREAM-NOTES.md). Historical batch tests are not
proof of iOS support and no longer describe the current feature set.

## Upload and install

The [upload list](docs/UPLOAD-FILES.md) contains the same 17 source files.
Keep `.nojekyll` at the repository root and publish GitHub Pages from
**main → /(root)**. Extract the upload ZIP into a fresh folder and upload its
contents, preserving `skills/read-and-explain/`.

After successful deployment, re-add this URL in Gallery and start a **new chat**
so old batch instructions and tool calls are not reused:

`https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/`

Replace both `SKILL.md` and `scripts/index.html`; changing the HTML alone leaves
old model instructions in place. Verify the file URLs ending in `/SKILL.md`
and `/scripts/index.html`. The runner is blank when opened directly. A folder
URL can show browser 404 without a homepage while those actual files work.
The [hosting record](docs/HOSTING-STATUS.md) describes earlier published code;
the assistant has not deployed this updated version.

For local import, use the two-file skill folder or extract
`dist/read-and-explain.zip`. Direct ZIP import and the iOS picker's accepted
format have not been independently verified.

## Call and validate

Use `run_js` with `skillName: read-and-explain`, `scriptName: index.html`, and:

```json
{"url":"https://subashale.com.np/"}
```

Only `url` is required. There is no `max_chars` option or read/clear workflow.
Legacy extra budget fields are ignored; old read/clear actions return an
explicit unsupported-action error instead of pretending to continue.

Try in Gallery:

> Read and explain https://subashale.com.np/ in three sentences. Show the exact returned Excerpt character limit and Excerpt truncated lines.

The tool result should contain `Excerpt character limit: 8000 (not tokens)`.
A shorter page returns fewer characters. Long pages are explicitly marked
truncated, and the answer must disclose partial coverage. A failed fetch
returns an error and no invented or previously cached page content. Repeating
the URL fetches a fresh first excerpt; it does not retrieve a later part.

## Limits

- One HTTPS HTML/plain-text page, one excerpt, up to 8,000 UTF-16 code units
  without splitting a surrogate pair. Change `MAX_EXCERPT_CHARS` near the top
  of `scripts/index.html` if a different fixed cap is needed later.
- 512 KiB response-body limit and a 15-second retrieval timeout. Larger pages
  are rejected; errors distinguish fetch, body reading, and extraction stages.
- No scripted storage access or file writes. Fetch requests use `cache: no-store`.
  This does not clear prior chat history or promise erasure of OS/app data.
- No authenticated pages, PDFs, RSS, search, rendered JavaScript applications,
  link crawling, or proxy fallback. CORS/WebView policy can still prevent reads.
- Extraction favors main/article content and removes common non-content markup.
  It does not apply external CSS or recognize every access/paywall screen.
- Page content is untrusted; the model is instructed to ignore embedded commands.
  Its grounding and instruction compliance still need device validation.
- Public-hostname checks reject obvious local names/IP literals, not DNS rebinding.
  Redirects are followed before their final URL is checked and reported.
- Speech is handled by Gallery if available. The skill invokes no native intents,
  Web Speech, MCP, file-writing API, or cloud model.

RSS/search and any optional Mac helper remain later work after this simpler
phone flow and its available speech path have been validated.

## Local checks and packaging

Development tools: Node.js 22+, Python 3, OpenSSL, and Chromium. They are not
needed by the installed skill.

```sh
npm ci
npm test
npm run test:live -- https://httpbin.org/html https://subashale.com.np/
npm run package
```

Tests use isolated browser profiles and controlled fixtures. Real loopback
HTTPS origins test CORS and redirects; their self-signed certificate is ignored
only in those fixture contexts. Live public requests use normal TLS validation.
macOS Chrome is used by default. Set `GALLERY_TEST_BROWSER` to another Chromium
binary or install Playwright Chromium with `npx playwright install chromium`.

The live script uses a temporary server bound to `127.0.0.1` and closes it after
testing. `upstream/` is optional. Default live probes also compare the built-in
Wikipedia script if the reference checkout exists; otherwise they report a skip.
To obtain it when needed:

```sh
git clone --depth 1 https://github.com/google-ai-edge/gallery.git upstream/gallery
```

The original inspected commit is recorded in the upstream notes. A fresh clone
may be newer; record its commit when comparing results.

Packaging writes `dist/read-and-explain.zip`, the complete source upload ZIP
`dist/ai-edge-gallery-skills-upload.zip`, `dist/UPLOAD-FILES.txt`, and
`dist/SHA256SUMS`. The upload archive excludes `upstream/`, `node_modules/`,
`test-results/`, build output, and macOS metadata. Curated findings stay in
`docs/`; raw reports remain local. No command publishes or deploys anything.
