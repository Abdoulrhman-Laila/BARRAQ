/**
 * Assert the security headers a production build actually ships.
 *
 * Next resolves `headers()` once, during `next build`, and bakes the result
 * into .next/routes-manifest.json. It is never re-evaluated at runtime, so a
 * header gated on an environment variable the *builder stage* does not set is
 * decided wrongly and permanently, whatever the container sets later.
 *
 * That is not hypothetical: the student web app shipped `'unsafe-eval'` in its production
 * CSP, and no HSTS header at all, because the gate read APP_ENV -- a variable
 * the Dockerfile sets at runtime and not at build time. Reading the config
 * source would not have caught it. Reading the built artifact does.
 *
 * Run after `npm run build`.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MANIFEST = resolve("./.next/routes-manifest.json");

/** Directives that must never reach a production bundle. */
const FORBIDDEN_CSP = ["'unsafe-eval'"];
/** Headers a production build must carry. */
const REQUIRED = ["Content-Security-Policy", "Strict-Transport-Security"];

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  console.error(`No build found at ${MANIFEST}. Run \`npm run build\` first.`);
  process.exit(1);
}

const headers = new Map();
for (const entry of manifest.headers ?? []) {
  for (const { key, value } of entry.headers ?? []) headers.set(key, value);
}

const failures = [];

for (const name of REQUIRED) {
  if (!headers.has(name)) {
    failures.push(`missing ${name}: the production build does not send it`);
  }
}

const csp = headers.get("Content-Security-Policy") ?? "";
for (const directive of FORBIDDEN_CSP) {
  if (csp.includes(directive)) {
    failures.push(
      `CSP contains ${directive}. This is a development-only allowance; ` +
        `its presence means the production gate evaluated false at build time.`,
    );
  }
}

if (failures.length > 0) {
  console.error("Production security headers are wrong:\n");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\nBaked CSP: ${csp || "(none)"}`);
  process.exit(1);
}

console.log("Production security headers OK");
console.log(`  CSP: ${csp}`);
console.log(`  HSTS: ${headers.get("Strict-Transport-Security")}`);
