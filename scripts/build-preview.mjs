// Builds a single self-contained HTML file (JS, CSS and fonts inlined).
// Usage: node scripts/build-preview.mjs [out=preview/index.html] [router=hash|memory]
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";

const out = process.argv[2] ?? "preview/index.html";
const router = process.argv[3] ?? "hash";
execSync("npx vite build -c vite.artifact.config.ts", { stdio: "inherit", env: { ...process.env, PREVIEW_ROUTER: router } });

const dir = "dist-artifact/assets";
const files = readdirSync(dir);
let css = readFileSync(
  join(
    dir,
    files.find((f) => f.endsWith(".css")),
  ),
  "utf8",
);
css = css.replace(/url\(["']?([^)"']+\.woff2)["']?\)/g, (m, f) => {
  const p = join(dir, basename(f));
  return existsSync(p) ? `url(data:font/woff2;base64,${readFileSync(p).toString("base64")})` : m;
});
const js = readFileSync(
  join(
    dir,
    files.find((f) => f.endsWith(".js")),
  ),
  "utf8",
).replace(/<\/script/g, "<\\/script");
const icon = `data:image/svg+xml;base64,${readFileSync("public/favicon.svg").toString("base64")}`;

const full = router === "hash";
const html = `${full ? '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n' : ""}<title>Bailly</title>
<meta name="description" content="Bailly, gestion locative : propriétaires, gestionnaires, locataires." />
<meta name="theme-color" content="#0a2a1f" />
<link rel="icon" href="${icon}" />
<style>${css}</style>
${full ? "</head>\n<body>\n" : ""}<div id="root"></div>
<script type="module">${js}</script>
${full ? "</body>\n</html>\n" : ""}`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1e6).toFixed(2)} MB`);
