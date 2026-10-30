import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { launch } from "./browser.mjs";
import { fixture } from "./https-fixture.mjs";

const runner = await readFile(new URL("../skills/read-and-explain/scripts/index.html", import.meta.url), "utf8");
const article = "Plants use sunlight to turn water and carbon dioxide into stored chemical energy. Oxygen is released during this process. This text is a controlled test fixture, not a live article.";
let browser;
let httpsFixture;
before(async () => {
  httpsFixture = await fixture(runner, article);
  browser = await launch({ args: ["--host-resolver-rules=MAP *.test 127.0.0.1"] });
});
after(async () => { await browser?.close(); await httpsFixture?.close(); });

async function session(t) {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  await page.route("https://skill.test/**", route => route.fulfill({ contentType: "text/html", body: runner }));
  await page.goto("https://skill.test/scripts/index.html");
  return page;
}

async function reply(page, body, contentType = "text/html", status = 200, headers = {}) {
  await page.route("https://public.test/**", route => route.fulfill({
    status, contentType, headers: { "access-control-allow-origin": "*", ...headers }, body
  }));
}

async function invoke(page, data = { url: "https://public.test/article" }) {
  const raw = await page.evaluate(data => window.ai_edge_gallery_get_result(data), typeof data === "string" ? data : JSON.stringify(data));
  assert.equal(typeof raw, "string", "Gallery requires a JSON string");
  const value = JSON.parse(raw);
  assert.deepEqual(Object.keys(value), [value.error ? "error" : "result"], "only Gallery's documented result/error fields");
  return value;
}

test("extracts article text and source; strips markup and does not execute it", async t => {
  const page = await session(t);
  await reply(page, `<title>Photosynthesis &amp; energy</title><nav>Navigation noise</nav><article><h1>Plants</h1><p>${article}</p><p hidden>hidden secret</p><p style="display: none">hidden style</p><script>window.injected = true;<\/script><img src="https://tracker.test/pixel"><iframe src="https://tracker.test/frame"></iframe></article><footer>Footer noise</footer>`);
  const { result } = await invoke(page);
  assert.ok(result.includes(article));
  assert.match(result, /Source URL: https:\/\/public.test\/article/);
  assert.match(result, /Title: Photosynthesis & energy/);
  assert.match(result, /Plants\nPlants use/);
  assert.match(result, /Excerpt truncated: no/);
  assert.doesNotMatch(result, /Navigation noise|hidden secret|hidden style|Footer noise|window.injected|tracker.test/);
  assert.equal(await page.evaluate(() => window.injected), undefined);
});

test("uses main content and preserves minified block boundaries", async t => {
  const page = await session(t);
  await reply(page, `<main><p>${article}</p><p>Second paragraph.</p></main><aside>advert</aside>`);
  const { result } = await invoke(page);
  assert.match(result, /fixture, not a live article\.\nSecond paragraph\./);
  assert.doesNotMatch(result, /advert/);
});

test("accepts plain text and honors the declared encoding", async t => {
  const page = await session(t);
  await reply(page, Buffer.from(`Caf\xe9. ${article}`, "latin1"), "text/plain; charset=iso-8859-1");
  const { result } = await invoke(page);
  assert.match(result, /Café/);
  assert.match(result, /Title: Plain text/);
});

test("returns the final redirect URL alongside the requested URL", async t => {
  // Real HTTP redirects cannot reliably be emulated by chained Playwright routes.
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(httpsFixture.origin("skill.test") + "/scripts/index.html");
  const target = httpsFixture.origin("public.test");
  const value = await invoke(page, { url: target + "/start#section" });
  assert.ok(value.result, JSON.stringify(value));
  assert.ok(value.result.includes(`Source URL: ${target}/final`));
  assert.ok(value.result.includes(`Requested URL: ${target}/start`));
});

test("real HTTPS origins enforce CORS and reject a missing content type", async t => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(httpsFixture.origin("skill.test") + "/scripts/index.html");
  const target = httpsFixture.origin("public.test");
  assert.ok((await invoke(page, { url: target + "/article" })).result);
  assert.match((await invoke(page, { url: target + "/cors-denied" })).error, /FETCH_FAILED/);
  assert.match((await invoke(page, { url: target + "/no-type" })).error, /UNSUPPORTED_TYPE/);
});

test("caps the excerpt at 8000 characters and marks truncation", async t => {
  const page = await session(t);
  await reply(page, `<article><p>${article.repeat(50)}</p></article>`);
  const { result } = await invoke(page);
  assert.match(result, /Excerpt truncated: yes/);
  const excerpt = result.split("BEGIN UNTRUSTED PAGE TEXT\n")[1].split("\nEND UNTRUSTED PAGE TEXT")[0];
  assert.equal(excerpt.length, 8000);
  assert.match(result, /Excerpt character limit: 8000 \(not tokens\)/);
  const counts = /Excerpt characters: (\d+) \/ (\d+) extracted \(not a token count\)/.exec(result);
  assert.equal(Number(counts[1]), excerpt.length);
  assert.ok(Number(counts[2]) > excerpt.length);
});

test("rejects invalid input and local/credential/non-HTTPS URLs before fetching", async t => {
  const page = await session(t);
  let requests = 0;
  await page.route("https://public.test/**", route => { requests++; return route.abort(); });
  for (const input of ["{", "null", {}, { url: 5 }, { url: "http://example.org" }, { url: "https://localhost" }, { url: "https://192.168.0.1/" }, { url: "https://[::1]/" }, { url: "https://user:pass@example.org" }, { url: "file:///private/test" }]) {
    const { error } = await invoke(page, input);
    assert.match(error, /INVALID_INPUT|INVALID_URL/);
  }
  assert.equal(requests, 0);
});

test("HTTP errors return no article or success result", async t => {
  const page = await session(t);
  for (const status of [401, 403, 404, 429, 500]) {
    await reply(page, article, "text/html", status);
    const { error, result } = await invoke(page);
    assert.match(error, new RegExp(`HTTP ${status}`));
    assert.ok(error.includes("Source URL:"));
    assert.equal(result, undefined);
    assert.ok(!error.includes(article));
  }
});

test("rejects PDF/JSON/RSS, short and challenge pages", async t => {
  const page = await session(t);
  for (const type of ["application/pdf", "application/json", "application/rss+xml", "application/octet-stream"]) {
    await reply(page, article, type);
    assert.match((await invoke(page)).error, /UNSUPPORTED_TYPE/);
  }
  await reply(page, "<body><script>renderArticleLater()<\/script><p>Loading…</p></body>");
  assert.match((await invoke(page)).error, /NO_READABLE_TEXT/);
  await reply(page, `<title>Just a moment...</title><p>Verify you are human. ${article}</p>`);
  assert.match((await invoke(page)).error, /ACCESS_PAGE/);
});

test("rejects oversized responses both with and without content-length", async t => {
  const page = await session(t);
  await reply(page, article, "text/plain", 200, { "content-length": String(600000) });
  assert.match((await invoke(page)).error, /PAGE_TOO_LARGE/);
  await reply(page, "x".repeat(524289), "text/plain");
  assert.match((await invoke(page)).error, /PAGE_TOO_LARGE/);
});

test("network/CORS-style failure never reuses the previous successful text", async t => {
  const page = await session(t);
  await reply(page, `<article>${article}</article>`);
  assert.ok((await invoke(page)).result);
  await page.route("https://public.test/**", route => route.abort("failed"));
  const { error, result } = await invoke(page);
  assert.match(error, /FETCH_FAILED/);
  assert.match(error, /CORS, connectivity, TLS/);
  assert.equal(result, undefined);
  assert.ok(!error.includes(article));
});

test("aborts a stalled fetch at the 15 second limit", async t => {
  const page = await session(t);
  // Controlled timer acceleration; preserves the shipped 15000ms limit assertion.
  await page.evaluate(() => {
    const original = window.setTimeout;
    window.setTimeout = (fn, ms) => { window.requestedTimeout = ms; return original(fn, 20); };
    window.fetch = (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  });
  assert.match((await invoke(page)).error, /TIMEOUT/);
  assert.equal(await page.evaluate(() => window.requestedTimeout), 15000);
});

test("reports missing streaming WebView APIs explicitly", async t => {
  const page = await session(t);
  await page.evaluate(() => {
    window.fetch = async () => ({ ok: true, url: "https://public.test/article", headers: new Headers({ "content-type": "text/html" }), body: null });
  });
  assert.match((await invoke(page)).error, /UNSUPPORTED_RUNTIME/);
});

test("fetch diagnostics include the stage, actual browser error, source, and origin", async t => {
  const page = await session(t);
  await page.evaluate(() => {
    window.fetch = async () => { throw new TypeError("Load failed"); };
  });
  const { error } = await invoke(page);
  assert.match(error, /\[FETCH_FAILED\]/);
  assert.match(error, /Stage: fetch/);
  assert.match(error, /Browser error: TypeError: Load failed/);
  assert.match(error, /Source URL: https:\/\/public.test\/article/);
  assert.match(error, /Runner origin: https:\/\/skill.test/);
});

test("a body stream failure is not mislabeled as a fetch failure", async t => {
  const page = await session(t);
  await page.evaluate(() => {
    window.fetch = async () => ({
      ok: true, url: "https://public.test/article",
      headers: new Headers({ "content-type": "text/html" }),
      body: new ReadableStream({ start(controller) { controller.error(new TypeError("Controlled body failure")); } })
    });
  });
  const { error } = await invoke(page);
  assert.match(error, /\[READ_FAILED\]/);
  assert.match(error, /Stage: read/);
  assert.match(error, /Controlled body failure/);
  assert.doesNotMatch(error, /FETCH_FAILED|CORS, connectivity/);
});

test("an extraction error is not mislabeled as a fetch failure", async t => {
  const page = await session(t);
  await reply(page, `<article>${article}</article>`);
  await page.evaluate(() => {
    window.DOMParser = class { parseFromString() { throw new Error("Controlled parser failure"); } };
  });
  const { error, result } = await invoke(page);
  assert.match(error, /\[EXTRACTION_FAILED\]/);
  assert.match(error, /Stage: extract/);
  assert.match(error, /Controlled parser failure/);
  assert.doesNotMatch(error, /FETCH_FAILED|CORS, connectivity/);
  assert.equal(result, undefined);
});

test("an unsupported encoding is reported without locking the response stream", async t => {
  const page = await session(t);
  await page.evaluate(() => {
    window.responseBody = new ReadableStream({ start(controller) { controller.close(); } });
    window.fetch = async () => ({
      ok: true, url: "https://public.test/article", body: window.responseBody,
      headers: new Headers({ "content-type": "text/plain; charset=unsupported-test-encoding" })
    });
  });
  const { error } = await invoke(page);
  assert.match(error, /UNSUPPORTED_ENCODING/);
  assert.equal(await page.evaluate(() => window.responseBody.locked), false);
});

test("single-excerpt retrieval works without accessing device or WebView storage", async t => {
  const page = await session(t);
  await reply(page, `<article>${article}</article>`);
  await page.evaluate(() => {
    window.storageReads = 0;
    for (const key of ["sessionStorage", "localStorage", "indexedDB"]) {
      Object.defineProperty(window, key, { configurable: true, get() {
        window.storageReads++;
        throw new DOMException("Storage disabled", "SecurityError");
      } });
    }
  });
  const { result } = await invoke(page);
  assert.ok(result.includes(article));
  assert.match(result, /Excerpt character limit: 8000 \(not tokens\)/);
  assert.doesNotMatch(result, /Document ID:|Next offset:|Temporary cache:|Batch range:/);
  assert.equal(await page.evaluate(() => window.storageReads), 0);
});

test("old read/clear actions are rejected without fetching or inventing continuation", async t => {
  const page = await session(t);
  let requests = 0;
  await page.route("https://public.test/**", route => { requests++; return route.abort(); });
  for (const action of ["read", "clear"]) {
    const { error, result } = await invoke(page, { action, url: "https://public.test/article" });
    assert.match(error, /UNSUPPORTED_ACTION/);
    assert.equal(result, undefined);
  }
  assert.equal(requests, 0);
});

test("legacy optional max_chars fields cannot reintroduce the 4000-character limit", async t => {
  const page = await session(t);
  await reply(page, `<article>${article.repeat(60)}</article>`);
  for (const max_chars of [4000, null, "", "400-4000"]) {
    const { result } = await invoke(page, { url: "https://public.test/article", max_chars });
    const excerpt = result.split("BEGIN UNTRUSTED PAGE TEXT\n")[1].split("\nEND UNTRUSTED PAGE TEXT")[0];
    assert.equal(excerpt.length, 8000);
    assert.match(result, /Excerpt character limit: 8000 \(not tokens\)/);
  }
});

test("the 8000-character cap does not split a Unicode surrogate pair", async t => {
  const page = await session(t);
  await reply(page, `<article>${"a".repeat(7999)}🌱${article}</article>`);
  const { result } = await invoke(page);
  const excerpt = result.split("BEGIN UNTRUSTED PAGE TEXT\n")[1].split("\nEND UNTRUSTED PAGE TEXT")[0];
  assert.equal(excerpt.length, 7999);
  assert.match(result, /Excerpt truncated: yes/);
  assert.doesNotMatch(excerpt, /[\uD800-\uDBFF]$/);
});
