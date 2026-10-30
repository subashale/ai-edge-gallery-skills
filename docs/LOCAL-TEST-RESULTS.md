# Local test record — 2026-10-30

**Measured scope: macOS desktop Chrome, not Gallery or iOS.**
No Android device test was used to infer iOS support. No on-device model or
speech engine was run locally.

## Automated checks

Initial command: `npm test`. Initial result: **13 passed, 0 failed**.
Node.js `22.23.2`, Playwright `1.64.1`, installed Chrome `156.0.8078.74`.

The shipped runner was loaded as HTML and called through its actual
`window.ai_edge_gallery_get_result(JSON.stringify(data))` entry point. Tests
covered:

1. Article extraction, entity decoding, stripping common non-content markup,
   and no execution of a script in fetched HTML.
2. Main-content selection and block boundaries in minified markup.
3. Plain text and a declared ISO-8859-1 encoding.
4. A real HTTPS redirect: final source URL and original requested URL retained.
5. Two real loopback HTTPS origins: CORS-allowed success, CORS-denied error,
   and missing content-type rejection.
6. A 4,000-character excerpt with an explicit truncation notice.
7. Invalid JSON, missing/invalid URLs, non-HTTPS URLs, local/IP URLs, and embedded
   credentials rejected before a request.
8. HTTP 401/403/404/429/500 errors returning no retrieved page text.
9. PDF/JSON/RSS rejection, a script-only shell, and an HTTP-200 bot-check page.
10. Oversized response rejection with and without a content-length header.
11. A failed request after a successful one returning no stale excerpt.
12. Abort on a stalled request. The test accelerated the timer and checked that
    the production timeout requested was 15,000 ms; it did not wait 15 seconds.
13. An explicit error when the WebView lacks the required streaming interface.

Most responses are controlled Playwright fixtures; the CORS and redirect tests
use a real temporary HTTPS server and two hostnames mapped to loopback. They do
not establish public-site accessibility. An early mocked-redirect test failed
because chained browser route mocks did not exercise a real redirect; replacing
it with that HTTPS fixture passed without a change to the skill code.

## Live public network checks

Command: `npm run test:live`. Recorded start: **2026-10-30 08:45:59 Europe/Berlin**
(`2026-10-30T07:45:59.215Z`). Chrome `156.0.8078.74` used a temporary profile and
a loopback HTTP origin; normal TLS checking remained enabled.
Raw outputs, response headers, and browser console errors were recorded locally
in `test-results/live.json`. This generated report is excluded from the upload;
the table below preserves the measured findings.

| Probe | Observed local result |
| --- | --- |
| Unmodified built-in query-wikipedia; Photosynthesis / en | Both MediaWiki requests returned HTTP 200 and `Access-Control-Allow-Origin: *`; returned introductory text, 4,101 characters including its heading |
| `https://httpbin.org/html` | HTTP 200; server allowed the actual loopback origin; HTML was extracted into a 3,763-character result including metadata, with no truncation |
| `https://raw.githubusercontent.com/google-ai-edge/gallery/main/README.md` | HTTP 200, CORS `*`; plain-text excerpt returned and marked truncated at 4,000 excerpt characters; total result 4,243 characters |
| `https://www.w3.org/Provider/Style/URI` | Browser console reported missing CORS allow-origin header; reader returned FETCH_FAILED and no excerpt |
| `https://www.ietf.org/rfc/rfc1149.txt` | Browser console reported missing CORS allow-origin header; reader returned FETCH_FAILED and no excerpt |
| `https://example.org/` | Browser console reported missing CORS allow-origin header; reader returned FETCH_FAILED and no excerpt |

The Wikipedia result contained the introduction; no infobox was asserted.
A separate 404 console message in that probe did not accompany either API
response and was not used as evidence about Wikipedia retrieval.

httpbin is a public HTML test fixture; it demonstrates direct cross-origin HTML
reading in this desktop origin. It does not demonstrate that arbitrary articles
are readable. The raw GitHub probe demonstrates plain-text retrieval, not
execution of a remotely hosted HTML skill. Neither is an iOS test.

The script's generic FETCH_FAILED message intentionally lists several possible
causes: JavaScript Fetch cannot reliably distinguish CORS from connectivity,
TLS, redirects, or host WebView restrictions. The browser console supplied the
CORS diagnosis in these specific local probes.

## Package checks

`npm run package` builds `dist/read-and-explain.zip` and `dist/SHA256SUMS`.
The archive contains the matching-name folder with just `SKILL.md` and
`scripts/index.html`. Package validation checks frontmatter/name and the bridge
entry point. It does not run Gallery's actual importer.

## Still requires Gallery on the iPhone

Device setup reported by the user on 2026-10-30: iPhone 12 Pro, iOS 27.2,
Gallery 1.0.22, Gemma 4 E2B. The user confirmed that both Load skill from URL
and local import are visible. That establishes menu availability only.

| Capability | Status |
| --- | --- |
| iOS skill import / URL loading / script MIME behavior | Both import options user-confirmed; user now reports the httpbin control working after URL loading; importer details not independently inspected |
| iOS WebView Fetch, streams, CORS, redirects, parser, and timeout | Unverified |
| Actual target webpage on the user's device/network | User supplied https://subashale.com.np/ and reported a generic retrieval failure; same published runner succeeds on desktop Chrome |
| Gemma 4 E2B routing, exact run_js parameters, grounded summary, context fit | Unverified |
| Following the error/no-fabrication instructions and ignoring page instructions | Model behavior unverified; script failure paths tested locally |
| Microphone input inside Agent Skills | Unverified; Android shared-chat wiring inspected only |
| Read-aloud and automatic playback inside Agent Skills | Unverified; Android shared-chat wiring inspected only |
| On-device/offline behavior of recognition and speech engines | Unverified |
| Native actions and MCP on iOS | Unverified and not used by this prototype |
| RSS / Google HTML search | Deferred until the phone's single-page flow works |

Use the [device procedure](IOS-VALIDATION.md) to record exact versions and test
each capability separately. A working browser demo, an Android source path, or
the ZIP's existence does not establish iOS compatibility.

## Subsequent diagnostic update

After the user reported that the HTTPS target site failed but the httpbin
control worked in Gallery, the local error handling was revised. The initial
catch-all message could label unexpected body-reading or extraction exceptions
as fetch failures; that message alone could not establish a CORS/network cause.

The update reports separate fetch/read/extract stages, preserves the original
browser error text, and includes source URL and runner origin inside the
documented `error` string. Three additional tests verify those distinctions.
The diagnostic update's test result was **16 passed, 0 failed**. The earlier 13-test result
and live probes above describe the initial version.

Both transport ZIPs were rebuilt and their skill payloads were verified against
the tested local source. No new version was published or deployed. The update
needs a phone retry after the user uploads the two changed skill files. Device
results, exact versions, and the limits of the control-page success are recorded
in [IOS-VALIDATION.md](IOS-VALIDATION.md).

## Source-upload review

The source-upload review passed **17 browser tests, 0 failed**. It retained the
diagnostic stages, added actual excerpt/extracted character counts, and fixed
an unsupported-encoding path that acquired a stream reader before validating
the decoder. The new test verifies that this failure leaves the stream unlocked.
Character counts are UTF-16 code units, not Gemma tokens or total chat context.

The upload package now preserves the source layout under
`skills/read-and-explain/`, includes an empty root `.nojekyll`, and has an
explicit 17-file manifest. ZIP integrity, byte-for-byte comparison against
source, and relative Markdown link targets were checked. Dependencies, the
reference checkout, generated reports, build output, and macOS metadata are
excluded. Node.js 22+ is declared for the development tools.

An isolated extraction of the upload ZIP, with **no upstream checkout**, ran
the live script using Node.js 22.23.2 and desktop Chrome 156.0.8078.74. The
optional Wikipedia comparison was explicitly skipped. Both supplied probes
succeeded from a loopback HTTP origin on 2026-10-30:

| Target | Extracted characters | Excerpt characters | Total result characters |
| --- | --- | --- | --- |
| `https://httpbin.org/html` | 3,594 | 3,594 | 3,825 |
| `https://subashale.com.np/` | 6,761 | 4,000, marked truncated | 4,294 |

These are desktop observations of the revised local source. They do not
resolve the previously reported iPhone failure. No updated source or new
`/skills/` URL was published by the assistant.

## Temporary cached batches

The initial batch-reading implementation passed **25 browser tests, 0 failed**.
The eight additional checks cover configurable larger batches, runner reload
and offline reads, cache expiry, unavailable storage, matching-ID clearing,
invalidation after a failed new fetch, input validation, and Unicode-safe cursors.

A live test of the revised local runner downloaded `https://subashale.com.np/`
**once**. It returned 4,000 characters, reloaded the runner, disabled browser
network access, and returned the remaining 2,761 characters from the same
cached snapshot. Clearing succeeded; a subsequent read returned CACHE_MISS.
The report is local-only at `test-results/batches-live.json`.

This is a desktop Chrome test, with no model running. It does not establish
iOS WebView storage persistence or Gemma's ability to choose batch sizes,
advance cursors, clear the snapshot, or manage its conversation context.
Those checks are in the device procedure. Temporary caching does not remove
previous batches from the model's retained chat history.

## Continuation and optional-input correction

The user reported a model reply with an invalid max_chars attempt followed by
a claimed budget of “400-4000”, then a failed continuation that guessed offset
40 without the required document ID. Raw tool arguments/results were not
provided, so neither the parameter cause nor the claimed retrieval success was
independently established. The published files were checked and matched the
local version, with a 4,000-character default and a scalar budget output.

The previous instructions also requested cache clearing before the final
answer. That policy was changed so the user can continue in a later turn:
keep the snapshot until expiry, replacement, or explicit user-requested clear.
`read` and `clear` now accept the page URL. The script verifies it against the
cached snapshot and handles the continuation cursor itself. An unmatched URL
never substitutes another page. Old cache records without the new cursor
schema require a fresh fetch.

Missing/null/empty max_chars uses the default; digit-only integer strings are
normalized. Ambiguous ranges and invalid sizes still fail. Metadata requests
must quote the actual returned fields rather than inventing a range.

The current suite passed **28 browser tests, 0 failed**. A live desktop Chrome
test downloaded the user's page once, returned the exact budget line
`Batch character budget: 4000 (not tokens)`, reloaded the runner, and continued
offline with only `action: read` and the matching URL. Ranges advanced from
0–4000 to 4000–6761. A subsequent read returned END_OF_DOCUMENT; explicit clear
succeeded, and another read returned CACHE_MISS. The local-only record is
`test-results/continue-live.json`. No model was run in these desktop tests;
Gemma's compliance and iPhone storage persistence still require validation.
