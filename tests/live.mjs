// Local desktop probes, not Gallery/iOS validation. No proxy or LLM.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { launch } from "./browser.mjs";

const root = new URL("../", import.meta.url);
const files = { "/reader": await readFile(new URL("skills/read-and-explain/scripts/index.html", root)) };
const skipped = [];
try {
  files["/wikipedia"] = await readFile(new URL("upstream/gallery/skills/built-in/query-wikipedia/scripts/index.html", root));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  skipped.push("Wikipedia comparison skipped: optional upstream/gallery checkout is absent.");
}

const suppliedUrls = process.argv.slice(2);
const probes = suppliedUrls.length ? suppliedUrls.map(url => ["Supplied public URL", "/reader", { url }]) : [
  ...(files["/wikipedia"] ? [["built-in Wikipedia", "/wikipedia", { topic: "Photosynthesis", lang: "en" }]] : []),
  ["httpbin public HTML test page", "/reader", { url: "https://httpbin.org/html" }],
  ["W3C public HTML", "/reader", { url: "https://www.w3.org/Provider/Style/URI" }],
  ["GitHub public plain text", "/reader", { url: "https://raw.githubusercontent.com/google-ai-edge/gallery/main/README.md" }],
  ["example.org cross-origin HTML", "/reader", { url: "https://example.org/" }]
];

const server = createServer((req, res) => {
  if (req.url === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (!Object.hasOwn(files, req.url)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(files[req.url]);
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {
  testedAt: new Date().toISOString(),
  scope: "Desktop Chromium over loopback HTTP; NOT Gallery, Android, Safari, WKWebView, or iOS",
  skipped, probes: []
};
let browser;
try {
  browser = await launch();
  report.browser = browser.version();
  for (const reason of skipped) console.log(reason);
  for (const [name, runner, data] of probes) {
    const page = await browser.newPage();
    const responses = [];
    const errors = [];
    page.on("response", response => {
      if (response.url().startsWith("https:")) responses.push({ url: response.url(), status: response.status(), allowOrigin: response.headers()["access-control-allow-origin"] || null });
    });
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    try {
      await page.goto(origin + runner);
      const raw = await page.evaluate(async data => {
        let timer;
        try {
          return await Promise.race([
            window.ai_edge_gallery_get_result(JSON.stringify(data)),
            new Promise(resolve => { timer = setTimeout(() => resolve(JSON.stringify({ error: "Live probe stopped after 25 seconds" })), 25000); })
          ]);
        } finally { clearTimeout(timer); }
      }, data);
      const output = JSON.parse(raw);
      report.probes.push({ name, input: data, output, responses, browserErrors: errors });
      console.log(JSON.stringify({ name, url: data.url, outcome: output.error || "Retrieved text", chars: output.result?.length || 0 }));
    } finally { await page.close(); }
  }
} finally {
  try { await browser?.close(); }
  finally {
    await new Promise(resolve => server.close(resolve));
    await mkdir(new URL("test-results/", root), { recursive: true });
    await writeFile(new URL("test-results/live.json", root), JSON.stringify(report, null, 2) + "\n");
  }
}
