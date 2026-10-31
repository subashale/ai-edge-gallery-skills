# Decision partner and creative challenges — two new Gallery skills

**Decision sparring partner** helps frame a choice, test assumptions, compare
tradeoffs against your priorities, and plan a small reversible experiment.
Try: “Help me decide whether to take an evening class or keep my evenings free.”
It asks one question at a time. The runner supplies a worksheet; the on-device
model reasons about it. No automatic scoring, verified external facts or actions.

**Creative challenge generator** provides a drawing, photography or writing
challenge for your time, setting and difficulty. Try: “Give me a gentle 10-minute
drawing challenge at my desk,” or “Surprise me, five minutes, indoors.” Say
“another one” for another combination. It uses bounded templates and random
selection; older prompts may repeat. Suggested time plans are not running timers.
There is no camera/location access or image generation. You make the work.

Both skills use chat context without runner storage or network access. Gallery's
existing microphone and read-aloud can be used; their offline availability is not
verified. Phone installation, routing, coaching quality and spoken interaction
still need device validation.

After publishing the updated source upload, install these separate folder URLs:
- `https://subashale.github.io/ai-edge-gallery-skills/skills/decision-sparring-partner/`
- `https://subashale.github.io/ai-edge-gallery-skills/skills/creative-challenge-generator/`

Standalone payloads: `dist/decision-sparring-partner.zip` and
`dist/creative-challenge-generator.zip`. Extract before local import if your
picker accepts skill folders; its accepted format remains unverified. The complete
source upload now has 27 files and all five skills. Nothing has been published.

# Voice mystery — new Gallery skill

Choose from **five fixed mysteries**, each with three suspects, four locations,
evidence, three hints and a final accusation:

1. The Missing Midnight Watch — a dinner-party theft.
2. The Vanishing Recipe — a bakery contest mystery.
3. The False Star Signal — an altered observatory result.
4. The Silent Premiere — theatre sound sabotage.
5. The Switched Envelope — a document swap aboard a train.

Say “Show me the cases”, then choose by number/title, or say “Surprise me”.
Selection happens in the Gallery chat using text or voice; no native menu is added.
The runner randomly selects a case, excluding the current case when its notebook
is supplied. There is no stored completion history, so earlier cases can repeat.
During play, say “Question Ada”, “Inspect the coat”, or “Show my notebook”.
Replies are kept short for Gallery's existing read-aloud feature; text also works.
No audio recording or playback API is added by the skill.

The runner controls evidence and the solution. Each call receives the previous
notebook state from the model; no WebView storage or network is used. Losing
that chat state requires an explicit restart. The runner checks the accused
suspect and required evidence, not the meaning of the player's reasoning.
Model narration, state forwarding and voice use still need iPhone validation.

After publishing the source upload, install from:
`https://subashale.github.io/ai-edge-gallery-skills/skills/voice-mystery/`

For local import, extract `dist/voice-mystery.zip`; the phone picker's accepted
format remains unverified. Replaying a selected case uses the same answer. Version 0.2.0 adds case choice
and random selection; replace both skill files and start a fresh chat.
Nothing has been deployed by the packaging command.

# AI Edge Gallery skills — Read and explain + Key details extractor


## Key details extractor

New skill: `skills/key-details-extractor/SKILL.md` and `scripts/index.html`.
It accepts pasted text directly or fetches one supplied public HTTPS webpage
with the same bounded reader used by read-and-explain. The two skills install
independently; the extractor does not require another skill to be enabled.
The runner copies the existing reader to keep each two-file payload standalone;
reader fixes should be applied to both copies. The extractor additionally rejects
known social-media/YouTube hostnames, including final redirect destinations.

Examples:

> Extract key details: Your appointment with Alex is on 12 November at 14:30. Reference BK-481.

> Extract the key details from https://subashale.com.np/

The model is instructed to return Field / Value / Evidence, preserve exact
values, mark missing requested details as Not stated, and flag ambiguity.
Website answers must include the source and disclose partial-page coverage.
These are model instructions, not deterministic extraction guarantees.

Pasted text requires no fetch. Websites use the same 8,000-character excerpt,
512 KiB body limit, 15-second timeout, CORS restrictions and no-storage approach.
Social-media posts, YouTube comments, private pages, PDFs and video transcripts
are unsupported; paste the actual text instead. No YouTube API integration or
API key is included.

After publishing the updated source upload, add this separate Gallery URL:

`https://subashale.github.io/ai-edge-gallery-skills/skills/key-details-extractor/`

Alternatively, extract `dist/key-details-extractor.zip` for local import if your
Gallery picker supports it. Start a fresh chat and enable the extractor. Phone
installation, skill selection and model extraction quality still need validation;
desktop tests verify the reader, not Gemma's final answers. See the extractor
checks in [IOS-VALIDATION.md](docs/IOS-VALIDATION.md).

This repository contains five **Google AI Edge Gallery Agent Skills**, plus local
source, tests, and validation notes. The original reader skill is
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

The user now reports that the single-excerpt flow looks good. Earlier, a
control-page read worked in Gallery. The user's website initially
failed, and later model replies gave ambiguous budget and continuation claims
without raw tool results. Caching/batching was subsequently reported as not
working. Raw tool details for the current flow have not been independently
inspected. The user confirmed that both microphone input and reply read-aloud
work inside Agent Skills. Their engines and offline behavior remain unverified.

See the [iPhone procedure](docs/IOS-VALIDATION.md),
[local test record](docs/LOCAL-TEST-RESULTS.md), and
[upstream inspection](docs/UPSTREAM-NOTES.md). Historical batch tests are not
proof of iOS support and no longer describe the current feature set.

## Upload and install

The [upload list](docs/UPLOAD-FILES.md) contains the same 27 source files.
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
The current local revision also reports `Reader version: 0.1.0` in success and
error text. Use that actual tool field, when visible, to identify the installed
runner after deployment; a model's guessed version is not sufficient evidence.
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
  It preserves headers inside article/main content so headlines and displayed
  publication dates remain available, while dropping outer site headers.
  It does not apply external CSS or recognize every access/paywall screen.
- Page content is untrusted; the model is instructed to ignore embedded commands.
  Its grounding and instruction compliance still need device validation.
- Public-hostname checks reject obvious local names/IP literals, not DNS rebinding.
  Redirects are followed before their final URL is checked and reported.
- Speech is handled by Gallery if available. The skill invokes no native intents,
  Web Speech, MCP, file-writing API, or cloud model.

The next candidate is a separate RSS reader returning a few item titles,
dates, descriptions, and links. An initial desktop probe could read NASA RSS
from the hosted skill origin; BBC RSS, Google News RSS, and Google HTML search
were blocked by CORS. These are endpoint-specific desktop findings, not iOS
tests. See the feasibility notes in UPSTREAM-NOTES.md. No RSS/search skill or
Mac helper has been added to this reader.

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

Packaging writes `dist/read-and-explain.zip`, `dist/key-details-extractor.zip`, `dist/voice-mystery.zip`, the complete source upload ZIP
`dist/ai-edge-gallery-skills-upload.zip`, `dist/UPLOAD-FILES.txt`, and
`dist/SHA256SUMS`. The upload archive excludes `upstream/`, `node_modules/`,
`test-results/`, build output, and macOS metadata. Curated findings stay in
`docs/`; raw reports remain local. No command publishes or deploys anything.
