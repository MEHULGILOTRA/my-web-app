/**
 * Refuses to let a secret reach a commit.
 *
 *   npm run check:secrets
 *
 * Scans every file git would actually include — staged, or tracked-and-modified
 * — rather than the working tree, so an ignored .env.local is never a false
 * positive and a mistakenly `git add -f`'d one is never a false negative.
 *
 * This exists because the repo already carries a lesson: EmailJS service and
 * template IDs plus a public key were committed to `src/emailServiceClient.js`
 * and `START_HERE.md`, and are in git history permanently.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

/**
 * Each pattern is a real credential shape, not a generic "password" grep —
 * generic patterns produce noise, get ignored, and then the check is worthless.
 */
const PATTERNS = [
  {
    name: "Supabase / JWT token",
    re: /eyJhbGciOiJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,}\./,
  },
  { name: "Supabase secret key", re: /\bsb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Postgres connection string with password", re: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]{6,}@/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Razorpay live key", re: /\brzp_live_[A-Za-z0-9]{10,}/ },
  { name: "Resend API key", re: /\bre_[A-Za-z0-9]{20,}/ },
  { name: "Generic bearer secret assignment", re: /(?:SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ROLE)\s*[=:]\s*["'][^"'\s]{12,}["']/ },
];

/** Files that legitimately describe secrets without containing them. */
const ALLOWLIST = new Set([
  ".env.example",
  "scripts/check-secrets.mjs",
  "docs/DEPLOYMENT.md",
]);

function gitFiles(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", cwd: repoRoot })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Staged files if there are any, otherwise everything git currently tracks
// plus anything untracked-but-not-ignored — i.e. what a `git add -A` would take.
const staged = gitFiles(["diff", "--cached", "--name-only", "--diff-filter=ACM"]);
const candidates =
  staged.length > 0
    ? staged
    : gitFiles(["ls-files", "--cached", "--others", "--exclude-standard"]);

const findings = [];
let scanned = 0;

for (const relative of candidates) {
  const absolute = path.join(repoRoot, relative);

  const normalised = relative.split(path.sep).join("/");
  if ([...ALLOWLIST].some((allowed) => normalised.endsWith(allowed))) continue;
  if (/node_modules|\.next\/|package-lock\.json/.test(normalised)) continue;
  if (/\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|pdf|mp4|zip)$/i.test(normalised)) {
    continue;
  }

  let contents;
  try {
    if (statSync(absolute).size > 2_000_000) continue;
    contents = readFileSync(absolute, "utf8");
  } catch {
    continue;
  }

  scanned += 1;

  for (const { name, re } of PATTERNS) {
    const match = contents.match(re);
    if (!match) continue;

    const line = contents.slice(0, match.index).split("\n").length;
    findings.push({ file: normalised, line, name, sample: match[0].slice(0, 24) });
  }
}

// An .env that is not ignored is a problem even if it happens to be empty today.
for (const relative of candidates) {
  const normalised = relative.split(path.sep).join("/");
  if (/(^|\/)\.env(\.|$)/.test(normalised) && !normalised.endsWith(".env.example")) {
    findings.push({
      file: normalised,
      line: 0,
      name: "env file is not gitignored",
      sample: "",
    });
  }
}

console.log(
  `Scanned ${scanned} file(s) ${staged.length > 0 ? "staged for commit" : "git would include"}.`,
);

if (findings.length === 0) {
  console.log("\x1b[32mNo secrets found.\x1b[0m\n");
  process.exit(0);
}

console.log(`\n\x1b[31mBlocked — ${findings.length} potential secret(s):\x1b[0m\n`);
for (const f of findings) {
  console.log(`  ${f.file}${f.line ? `:${f.line}` : ""}`);
  console.log(`    ${f.name}${f.sample ? ` — starts "${f.sample}…"` : ""}\n`);
}
console.log("Remove the value, move it to .env.local, and re-run.\n");
process.exit(1);
