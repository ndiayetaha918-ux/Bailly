// Dev helper: screenshots of routes, optionally after a few interactions.
// Usage: node scripts/screenshots.mjs <outDir> "name|/path|width|height|theme|full|actions"
// actions: "click:text=Continuer;wait:600;fill:#id=value;hover:css;key:Enter"
import { chromium } from "playwright";

const [, , outDir, ...specs] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];
for (const spec of specs) {
  const [name, path, w = "1440", h = "900", theme = "light", full = "0", actions = ""] = spec.split("|");
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  if (!process.env.SPLASH) {
    await page.addInitScript(() => {
      sessionStorage.setItem("bailly-splash-seen", "1");
      sessionStorage.setItem("loclic-splash-seen", "1");
    });
  }
  if (theme === "dark") {
    await page.addInitScript(() => {
      localStorage.setItem("bailly-demo-v1", JSON.stringify({ state: { theme: "dark" }, version: 1 }));
    });
  }
  await page.goto(`${process.env.BASE_URL || "http://localhost:5173"}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  for (const a of actions.split(";").filter(Boolean)) {
    const i = a.indexOf(":");
    const kind = a.slice(0, i);
    const arg = a.slice(i + 1);
    if (kind === "click") await page.locator(arg).first().click();
    else if (kind === "hover") await page.locator(arg).first().hover();
    else if (kind === "wait") await page.waitForTimeout(+arg);
    else if (kind === "key") await page.keyboard.press(arg);
    else if (kind === "fill") {
      const j = arg.lastIndexOf("=");
      const sel = arg.slice(0, j);
      const val = arg.slice(j + 1);
      await page.locator(sel).first().fill(val);
    }
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full === "1" });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no errors");
