# iPhone installation and validation

**Partial user-reported device validation; broader iOS behavior is unresolved.**

| Setup field | Current record |
| --- | --- |
| iPhone | iPhone 12 Pro — user supplied |
| iOS version | 27.2 — user supplied |
| Gallery version | 1.0.22 — user supplied |
| Selected model | `gemma-4-E2B-it-litert-lm` from Hugging Face — user supplied; quantization unverified |
| Displayed app Max tokens setting | 32,000 — user observed in Gallery settings |
| Current occupied/remaining context tokens | Not included in the reported stats; no skill-accessible counter verified |
| Reported performance stats | 11 tok/s; TTFT 7000 ms; prefill 215 tok/s; RAM 3.6 and 65% as reported |
| Cached-batch phone test | Attempted continuation; model reported missing document_id and guessed offset 40; raw tool calls unavailable |
| Available Agent Skills import options | Both Load skill from URL and local import — user confirmed |
| Recognition engine/language | Pending |
| Playback voice/language | Pending |

Versions, import-option visibility, and the results below were reported by the
user on 2026-10-30. Record build identifiers if a failure needs investigation,
and keep the version values with every test result. Record Gallery's exact
model label if it differs from the
name above.

The displayed maximum is distinct from current context occupancy. The reported
generation/prefill speeds, time to first token, and RAM usage do not supply a
remaining token budget to this skill. Do not derive free context or tokenizer
counts from these performance numbers.

## Device observations reported so far

| Target | User-reported Gallery outcome |
| --- | --- |
| `https://httpbin.org/html` | Worked in the same Agent Skills session |
| `https://subashale.com.np/` | Generic retrieval failure mentioning CORS, connectivity, TLS, redirects, or WebView policy |
| Budget verification | Model reported invalid max_chars, then claimed success and a budget of “400-4000”; no raw result supplied, so the actual budget/result is unverified |

The subsequent model reply to “continue” reported a missing document ID, guessed
an offset of 40, and stopped. The earlier skill instructions also asked it to
clear the snapshot before answering, a policy flaw for continuation across user
turns. Whether clear was actually called on the phone is unknown. The current
local update keeps the snapshot and makes `read` work by URL and stored cursor;
it still needs a phone retry. The model is explicitly told not to invent IDs,
offsets, budget ranges, or successful retrieval claims.

The user explicitly confirmed supplying HTTPS for the failed site. An HTTP
validation rejection is therefore not the explanation for that phone result.
The control-page success supports that this skill can execute and retrieve at
least one page on this setup. Exact tool output and summary grounding have not
been independently inspected, and speech has not been reported as tested.

The same published runner retrieves the user's HTTPS site successfully in
desktop Chrome. Read-only server probes returned HTTP 200 and CORS allow-origin
`*`. Those observations do not establish which response or failure the phone
experienced. The old script's catch-all error message also covered unexpected
body/extraction errors. Do not diagnose CORS solely from that message.

A local diagnostic update separates `fetch`, `read`, and `extract` failures and
includes the original browser error and runner origin. It passed 16 desktop
tests at that stage. The current cached-batch version passed 28 local browser
tests; it also provides configurable batches, counts, temporary storage, and
read/clear actions. It is packaged but has not been published. After the user publishes
the update, refresh/re-add the skill if needed, retry the same HTTPS URL, and
record the full error code, Stage, Source URL, Runner origin, and Browser error.

## Install the prepared folder

The payload is:

```text
read-and-explain/
├── SKILL.md
└── scripts/
    └── index.html
```

The ZIP in `dist/` is only for transferring those files; direct ZIP import is
not verified. There are no Node packages, Python files, or test harnesses in
the skill payload.

1. Open **Agent Skills** with the selected model. First confirm that this use
   case and the built-in **query-wikipedia** skill are available on this build.
   If they are absent, record that limitation before proceeding.
2. Open the Skills manager. Both import options are user-confirmed on Gallery
   1.0.22. After publishing the [source upload layout](UPLOAD-FILES.md), enter
   `https://subashale.github.io/ai-edge-gallery-skills/skills/read-and-explain/`
   in **Load skill from URL**. Verify that the two actual file URLs work first.
   The previous payload-only path, without `/skills/`, was verified as HTTP 200
   and produced the user-reported control success. The new path still needs
   deployment and a phone retry. A folder browser page can show 404 if there
   is no homepage, while its actual skill files remain accessible.
3. For local import instead, transfer the ZIP with Files/AirDrop, extract it
   in Files, and try selecting
   the `read-and-explain` folder containing `SKILL.md` through local import.
   Confirm both files are retained by Gallery. The iOS picker's accepted format
   and successful import remain untested. If it accepts only files, record its
   choices or error rather than assuming Android's folder procedure applies.
4. **Hosting requirements:** verify `<base>/SKILL.md` serves raw Markdown
   and `<base>/scripts/index.html` serves `Content-Type: text/html`. Enter
   `<base>` in Gallery. For GitHub Pages, an empty `.nojekyll` at the hosting
   root keeps `SKILL.md` raw. Do not use a `github.com/.../blob/...` URL or a
   raw-GitHub HTML file as the executable runner.
5. Confirm the installed name is `read-and-explain` and enable it. Disable
   competing webpage/search skills for the first test so routing is observable.

The user published the prepared files on GitHub Pages. The assistant verified
the hosting and ran a desktop browser test without changing the repository or
deploying anything. See [hosting verification](HOSTING-STATUS.md). If iOS import
fails, record the exact error before choosing another method. A LAN static
server is another possible delivery method only after
approval and iOS transport-policy testing. A static host serves skill assets;
it does not retrieve or summarize the target webpages.

## Test in this order

| Test | Action | Evidence/pass condition |
| --- | --- | --- |
| Built-in baseline | Enable query-wikipedia and ask for a brief explanation of photosynthesis | A real tool call and nonempty retrieved extract; note exact error if absent |
| Text and public HTML | Enable read-and-explain; send `Read and explain https://httpbin.org/html in two sentences.` | `run_js` loads the correct skill/script; returned excerpt matches that public test page; answer uses its content and reports its source |
| Own webpage | Supply the actual public HTTPS URL you want explained | Nonempty relevant excerpt, or an explicit access failure; compare against the page yourself |
| CORS/access failure | Try a URL that fails on this device; example.org failed locally in desktop Chrome | An error is shown and no invented summary is given; do not presume identical CORS behavior on iOS |
| Offline failure | In a fresh session, disable connectivity and request a new URL | Retrieval error; no reused content or pretend successful retrieval |
| Context limit | Use a long readable page | Tool marks the excerpt truncated and answer says it read only part |
| Cached batch read | Fetch a readable page, then call read with the same URL, omitting document_id and offset | Same source/retrieval time; script advances its stored cursor; no silent fresh fetch |
| Cache persistence | Repeat a read after Gallery reloads the runner; disconnect after fetching if practical | Cached read succeeds, or explicit CACHE_MISS/CACHE_UNAVAILABLE; do not infer iOS support from desktop results |
| Cache release | Ask to discard the snapshot; use clear with the same URL, then attempt read | Cache-cleared confirmation followed by CACHE_MISS; no automatic clear before an ordinary answer |
| Loop behavior | Ask for broader coverage of a long page | Model advances offsets, stops appropriately, and describes partial coverage; token accumulation is measured separately |
| Voice input | In Agent Skills, paste the URL, then use its microphone to dictate the request; inspect recognized text before sending | Correct transcript and the same retrieval/answer path; record whether the mic is Gallery ASR or iOS keyboard dictation |
| Read aloud | Tap the generated reply's speaker, if offered in Agent Skills | The actual final answer plays audibly; verify content, language, and stop/replay |
| Auto playback | If Agent Skills offers auto-play, enable it and repeat once | New final answer plays automatically, not raw tool JSON or a progress message |
| Speech locality | With required voices/models already downloaded, disconnect and try a new dictated phrase and replay an existing answer | Record observed offline behavior separately for recognition and playback; retrieval itself still requires internet |

The public HTML test page is a retrieval control, not a search provider.
If its HTTP 200 page content changes or access fails, inspect the returned text
or error; never use the example prompt as a reason to invent what was read.

Do not count text printed in a chat bubble as successful retrieval without
checking the underlying tool response. If this iOS build has an execution
panel/tester, inspect `skillName`, `scriptName`, `data`, and `result`/`error`.
If no panel exists, record that evidence limitation and compare the final
answer against the supplied page. A source-looking link alone is insufficient.

If the mic or speaker exists in ordinary AI Chat but is missing in Agent Skills,
record Agent Skills speech as unavailable in this build. Keyboard dictation and
iOS accessibility speech may be manual fallbacks, but do not label them as
verified Gallery Agent Skills speech or assume they run offline. Do not enable
an unspecified cloud speech service just to make the prototype appear to work.

## Report a device result

```text
Date/time and timezone:
iPhone / iOS version-build / Gallery version-build:
Exact model label and quantization:
Install method and available import options:
Target URL:
Input method (typed / Gallery ASR / keyboard dictation):
Recognized text (if voice):
Actual run_js arguments (if visible):
Returned result or full error:
Error code / Stage / Runner origin / Browser error (updated reader):
Excerpt character counts (not tokens), if successful:
Document ID / batch ranges / Next offset / cache availability:
Final explanation and source:
Speaker/auto-play availability and observed playback:
Speech engine/voice/language and offline observations:
Pass / fail / not observable, with reason:
```

## Next stage, after the phone flow works

Only after installation, direct retrieval, grounded model output, and the
available speech path have been tested in Agent Skills:

1. Investigate a single public RSS/Atom feed, its actual CORS headers, feed
   format, item links, timestamps, and behavior in the same iPhone WebView.
2. Investigate direct Google HTML search without a search API. Check current
   official guidance, actual responses, CORS, consent pages, bot challenges,
   and DOM stability. A successful desktop fetch does not establish a usable
   iOS search capability. Do not bypass access controls or silently substitute
   a scraper proxy.
3. If direct access remains too limited, discuss an explicitly optional Mac
   helper for retrieval only. Keep on-device summarization and disclose the
   network hop. No helper has been built or enabled in this prototype.

RSS and search have not been implemented or validated. The single-page reader
deliberately rejects RSS content types until that later stage.
