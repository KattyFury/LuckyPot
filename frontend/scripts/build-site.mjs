// Builds the full deploy folder: dashboard app under dist-site/app (via vite,
// see vite.config.ts base/outDir) plus the static landing page at dist-site/
// root. Landing isn't part of the Vite build — it's plain HTML/CSS/JS with no
// bundling needed — so this script just copies it into place afterward.
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const landingDir = join(root, "landing");
const siteDir = join(root, "dist-site");

mkdirSync(siteDir, { recursive: true });

// Clear everything except app/ (vite owns that, and has already written it by
// the time this runs). Without this, a landing asset that gets renamed or
// deleted lingers in dist-site from an earlier build and ships to production -
// which is exactly how favicon.svg and logo-full.svg survived being deleted
// from the repo.
for (const entry of readdirSync(siteDir)) {
  if (entry !== "app") rmSync(join(siteDir, entry), { recursive: true, force: true });
}

cpSync(join(landingDir, "index.html"), join(siteDir, "index.html"));
cpSync(join(landingDir, "icons"), join(siteDir, "icons"), { recursive: true });
cpSync(join(landingDir, "favicon.svg"), join(siteDir, "favicon.svg"));
cpSync(join(landingDir, "apple-touch-icon.png"), join(siteDir, "apple-touch-icon.png"));
// logo.svg replaced logo-full.svg: the mark ships on its own now and the
// "LuckyPot" beside it is live type, so there's no wordmark artwork to copy.
cpSync(join(landingDir, "logo.svg"), join(siteDir, "logo.svg"));
// The full lockup (mark + wordmark) plus the /logo short URL that points at it.
cpSync(join(landingDir, "logo-full.svg"), join(siteDir, "logo-full.svg"));
// Same lockup with a white wordmark, for dark grounds - including this site.
cpSync(join(landingDir, "logo-full-dark.svg"), join(siteDir, "logo-full-dark.svg"));
// Privy's dashboard login-screen logo field takes a PNG URL at a 2:1 ratio.
// The lockup is 3.6:1, so these are the same artwork centred in a 360x180
// transparent canvas - padded, never stretched. Light = black wordmark for
// Privy's default light modal, dark = white wordmark if the modal is themed dark.
cpSync(join(landingDir, "privy-logo.png"), join(siteDir, "privy-logo.png"));
cpSync(join(landingDir, "privy-logo-dark.png"), join(siteDir, "privy-logo-dark.png"));
cpSync(join(landingDir, "_redirects"), join(siteDir, "_redirects"));
cpSync(join(landingDir, "_headers"), join(siteDir, "_headers"));

// /app/admin (App.tsx's own window.location.pathname check picks AdminPage
// over Dashboard) needs a literal file here for a direct visit/refresh to
// resolve - a _redirects rewrite to /app/index.html consistently lost to
// Pages' own unmatched-path fallback (serves the landing page instead),
// reproduced even on the raw *.pages.dev domain. The script/asset tags in
// app/index.html are absolute (vite's base is "/app/"), so this copy loads
// the same bundle correctly one directory deeper.
const appDir = join(siteDir, "app");
mkdirSync(join(appDir, "admin"), { recursive: true });
cpSync(join(appDir, "index.html"), join(appDir, "admin", "index.html"));

console.log("Copied landing page into dist-site/");
