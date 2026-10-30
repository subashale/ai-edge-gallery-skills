# Upstream inspection

Inspected locally on 2026-10-30 from
[google-ai-edge/gallery](https://github.com/google-ai-edge/gallery) at commit
[`af9bfd5f282527d7557905c40994269bc2c0de6e`](https://github.com/google-ai-edge/gallery/tree/af9bfd5f282527d7557905c40994269bc2c0de6e).
The reference checkout is `upstream/gallery`; it was not modified.

## Wikipedia approach

The built-in
[SKILL.md](https://github.com/google-ai-edge/gallery/blob/af9bfd5f282527d7557905c40994269bc2c0de6e/skills/built-in/query-wikipedia/SKILL.md)
asks the model to call `run_js` with `index.html` and a JSON string containing
`topic` and `lang`. Its
[runner](https://github.com/google-ai-edge/gallery/blob/af9bfd5f282527d7557905c40994269bc2c0de6e/skills/built-in/query-wikipedia/scripts/index.html)
exposes `window.ai_edge_gallery_get_result(data)` and returns stringified JSON.

It performs a MediaWiki search plus introductory extract request, then a
second request for section-zero HTML. Both include `origin=*`. The optional
infobox is parsed with DOMParser; errors there leave the introduction available.
It bounds output and asks the model for a concise answer grounded in the result.

The prototype follows the bridge, detached DOM parsing, bounded text, and
grounded-answer pattern. Wikipedia's API CORS support does not transfer to
arbitrary HTML pages. The local live-probe record reports API behavior separately
from running the script inside Gallery.

## Result handling detail

The Android
[RunJsTool.kt](https://github.com/google-ai-edge/gallery/blob/af9bfd5f282527d7557905c40994269bc2c0de6e/Android/src/app/src/main/java/com/google/ai/edge/gallery/tools/RunJsTool.kt)
has parameters `skillName`, `scriptName`, and `data` and parses the returned JSON
with `failOnUnknown()`. The corresponding `CallJsSkillResult` in
[ToolAction.kt](https://github.com/google-ai-edge/gallery/blob/af9bfd5f282527d7557905c40994269bc2c0de6e/Android/src/app/src/main/java/com/google/ai/edge/gallery/tools/ToolAction.kt)
contains `result`, `error`, `image`, and `webview`.

This prototype returns only `{ "result": "..." }` or `{ "error": "..." }`.
The source URL, title, retrieval time, and truncation notice are inside the
result string so they survive the host's parser.

In this Android revision, an error-only object reaches the raw-result fallback
before the explicit error branch, and can receive an outer succeeded status.
This was observed by reading code, not by executing the Android app. The skill
therefore instructs the model to honor error content regardless of outer status.
iOS parsing and model behavior remain unverified.

## Loading and execution

The [skills documentation](https://github.com/google-ai-edge/gallery/blob/af9bfd5f282527d7557905c40994269bc2c0de6e/skills/README.md)
specifies the kebab-case folder, matching skill name, frontmatter, and
`scripts/index.html`. It documents URL loading and explicitly Android local
folder import. It also says hosted scripts require a correct HTML MIME type;
a GitHub repository/raw-file URL is not a substitute for executable HTML hosting.

Android `SkillManager.addSkillFromUrl` reads `<folder URL>/SKILL.md`.
`SkillExtensions.getJsSkillUrl` constructs `<folder URL>/scripts/index.html`.
Scripts can remain remotely loaded, so installing from a URL may still require
that host to be reachable later. Do not assume the iPhone copies them offline.

Android `AgentChatScreen` loads the runner in a hidden GalleryWebView, waits for
the entry function, passes a safely quoted JSON string, and waits for its return.
It has a 60-second tool-execution safety timer. The prototype's own 15-second
fetch/body timeout is shorter. No iOS timeout value was inferred.

## Speech and platform boundary

The root README advertises ASR/TTS for AI Chat, but that alone does not verify
their availability in Agent Skills on iOS.

In the Android source:

- `customtasks/agentchat/AgentChatScreen.kt` uses shared `ChatView` and sets
  `showAudioPicker = true`.
- `ui/common/chat/ChatView.kt` obtains a TTS controller and passes it to the
  shared chat panel.
- `ui/common/chat/ChatPanel.kt` wires ASR dictation callbacks and renders speaker
  buttons on agent text messages when TTS is available. Audio-file/model input
  is distinct from dictation, so the audio-picker flag alone proves little.

These are source-level findings for Android, not Android device tests. This
checkout contains no `.swift`, `Package.swift`, or Xcode project source found
by the inspection. The presence of an App Store link and iOS requirements in
the README is not evidence that a particular iOS release exposes the same
skill loader, speech controls, WebView settings, native actions, or MCP support.

No Android app, iOS app, simulator, on-device model, native intent, or MCP
integration was executed during local validation.

## Native file-storage boundary

The public skill contract documents a hidden JavaScript WebView entry point
and predefined native actions. It does not establish a native iOS file-writing
bridge available to this skill. The earlier sessionStorage cache was already
on-device WebView storage; replacing it with a native temporary file would
need app capabilities not verified here. After the user reported batch/cache
failure, the implementation therefore takes the requested fallback: one
8,000-character excerpt, with no storage or file-writing dependency. This is
not a claim that iOS generally cannot save files.
