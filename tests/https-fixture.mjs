// Two HTTPS origins on loopback for real browser CORS/redirect checks.
import { createServer } from "node:https";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function fixture(runner, article) {
  const temp = mkdtempSync(join(tmpdir(), "gallery-reader-test-"));
  const key = join(temp, "key.pem");
  const cert = join(temp, "cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-subj", "/CN=public.test", "-days", "1"], { stdio: "ignore" });
  const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
    if (req.url === "/scripts/index.html") {
      res.writeHead(200, { "content-type": "text/html" }); res.end(runner); return;
    }
    if (req.url !== "/cors-denied") res.setHeader("access-control-allow-origin", "*");
    if (req.url === "/start") { res.writeHead(302, { location: "/final" }); res.end(); return; }
    if (req.url !== "/no-type") res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<title>Loopback test article</title><article>${article}</article>`);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    origin: host => `https://${host}:${server.address().port}`,
    close: async () => {
      await new Promise(resolve => server.close(resolve));
      rmSync(temp, { recursive: true, force: true });
    }
  };
}
