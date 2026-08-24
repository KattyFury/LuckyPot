// Builds the full deploy folder: dashboard app under dist-site/app (via vite,
// see vite.config.ts base/outDir) plus the static landing page at dist-site/
// root. Landing isn't part of the Vite build — it's plain HTML/CSS/JS with no
// bundling needed — so this script just copies it into place afterward.
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const landingDir = join(root, "landing");
const siteDir = join(root, "dist-site");

mkdirSync(siteDir, { recursive: true });
cpSync(join(landingDir, "index.html"), join(siteDir, "index.html"));
cpSync(join(landingDir, "icons"), join(siteDir, "icons"), { recursive: true });

console.log("Copied landing page into dist-site/");
