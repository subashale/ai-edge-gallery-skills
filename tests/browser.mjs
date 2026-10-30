import { chromium } from "playwright";
import { existsSync } from "node:fs";

export async function launch(options = {}) {
  const chrome = process.env.GALLERY_TEST_BROWSER || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}), ...options });
}
