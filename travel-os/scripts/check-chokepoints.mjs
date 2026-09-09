/**
 * Enforces the single-chokepoint rules that the architecture depends on.
 *
 *   npm run check:chokepoints
 *
 * These are the invariants that quietly rot: someone needs a download URL in a
 * hurry, calls createSignedUrl inline, and the DPDP access log silently stops
 * being complete. A grep in CI is cheap; discovering it during an audit is not.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "src");

const RULES = [
  {
    symbol: "createSignedUrl",
    allowedIn: ["src/lib/documents/signed-url.ts"],
    why: "Every signed URL must be written to document_access_log before it is returned.",
  },
  {
    symbol: "SUPABASE_SERVICE_ROLE_KEY",
    allowedIn: ["src/lib/env.ts", "src/lib/db/admin.ts"],
    why:
      "The service role key bypasses RLS entirely. env.ts validates it and admin.ts " +
      "builds the one client that uses it; it must not spread beyond those two.",
  },
];

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walk(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

const files = await walk(srcDir);
let failures = 0;

for (const rule of RULES) {
  const offenders = [];

  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (rule.allowedIn.includes(relative)) continue;

    const contents = await readFile(file, "utf8");
    if (contents.includes(rule.symbol)) offenders.push(relative);
  }

  if (offenders.length === 0) {
    console.log(`  \x1b[32m✓\x1b[0m ${rule.symbol} appears only in ${rule.allowedIn.join(", ")}`);
  } else {
    failures += 1;
    console.log(`  \x1b[31m✗\x1b[0m ${rule.symbol} leaked outside its chokepoint`);
    console.log(`      ${rule.why}`);
    for (const offender of offenders) console.log(`      - ${offender}`);
  }
}

if (failures > 0) {
  console.log(`\n\x1b[31m${failures} chokepoint rule(s) violated.\x1b[0m\n`);
  process.exit(1);
}

console.log("");
