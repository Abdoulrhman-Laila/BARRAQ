/**
 * Refreshes tests/contract/django-routes.json — the checked-in snapshot of the
 * backend's canonical `/api/v1` surface that tests/contract/api-contract.test.ts
 * validates `lib/api/endpoints.ts` against.
 *
 * The backend repo is the source of truth and regenerates
 * `backend/contracts/openapi.json` in its own release gate; this script only
 * projects it into a form this repo can assert against offline (CI for this
 * app must not need the backend checked out to run).
 *
 *   node scripts/sync-django-routes.mjs [path-to-backend-contracts-openapi.json]
 *
 * Re-run it whenever the backend adds, renames, or removes a route, and commit
 * the result alongside the endpoints.ts change that consumes it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = resolve(
  repoRoot,
  "../Baraaq_back/backend/contracts/openapi.json",
);

const source = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_SOURCE;
const spec = JSON.parse(readFileSync(source, "utf8"));

const paths = Object.keys(spec.paths ?? {})
  .filter((path) => path.startsWith("/api/v1/"))
  .map((path) => path.slice("/api/v1".length))
  .sort();

if (paths.length === 0) {
  throw new Error(`No /api/v1 paths found in ${source} — refusing to write an empty snapshot`);
}

const target = resolve(repoRoot, "tests/contract/django-routes.json");
writeFileSync(
  target,
  `${JSON.stringify(
    {
      $comment:
        "GENERATED — do not edit by hand. Run `node scripts/sync-django-routes.mjs`. Paths are relative to /api/v1 and use {param} for path parameters.",
      generatedFrom: "Baraaq_back/backend/contracts/openapi.json",
      paths,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${paths.length} canonical routes to ${target}`);
