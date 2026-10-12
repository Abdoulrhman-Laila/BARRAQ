import { describe, expect, it } from "vitest";
import {
  adminAssignRolesEndpoint,
  aiJobCancelEndpoint,
  assignmentGradeEndpoint,
  classAssignmentSubmissionsEndpoint,
  classLibraryDownloadEndpoint,
  classQuizAnswerGradeEndpoint,
  classQuizAttemptsEndpoint,
  detailEndpoint,
  endpoints,
  supportTicketMessagesEndpoint,
  userActionEndpoint,
} from "@/lib/api/endpoints";
import djangoRoutes from "./django-routes.json";

/**
 * Contract parity gate.
 *
 * Every path this dashboard can build must exist on the Django backend. The
 * canonical route list is a checked-in projection of the backend's generated
 * OpenAPI contract (refresh it with `node scripts/sync-django-routes.mjs`), so
 * a backend rename this dashboard has not followed fails here rather than as a
 * 404 in an operator's face.
 */

const SAMPLE_ID = "42";

function canonical(path: string): string {
  return path
    .replace(/^\/+/u, "")
    .replace(/\{[^}]+\}/gu, "*")
    .replace(new RegExp(`(^|/)${SAMPLE_ID}(?=/|$)`, "gu"), "$1*");
}

const backendPaths = new Set(djangoRoutes.paths.map(canonical));

/** Collection endpoints that a DRF router also exposes as `<base>{id}/`. */
const detailCapableBases = Object.entries(endpoints.admin).filter(([, base]) =>
  backendPaths.has(canonical(detailEndpoint(base, SAMPLE_ID))),
);

const collectionPaths: Array<[string, string]> = [
  ...Object.entries(endpoints.admin).map(
    ([key, path]) => [`admin.${key}`, path] as [string, string],
  ),
  ...Object.entries(endpoints.ai).map(([key, path]) => [`ai.${key}`, path] as [string, string]),
  ...Object.entries(endpoints.auth).map(
    ([key, path]) => [`auth.${key}`, path] as [string, string],
  ),
];

const actionPaths: Array<[string, string]> = [
  ["userActionEndpoint(activate)", userActionEndpoint(SAMPLE_ID, "activate")],
  ["userActionEndpoint(suspend)", userActionEndpoint(SAMPLE_ID, "suspend")],
  [
    "userActionEndpoint(cancel-subscription)",
    userActionEndpoint(SAMPLE_ID, "cancel-subscription"),
  ],
  [
    "userActionEndpoint(change-subscription)",
    userActionEndpoint(SAMPLE_ID, "change-subscription"),
  ],
  ["adminAssignRolesEndpoint", adminAssignRolesEndpoint(SAMPLE_ID)],
  ["supportTicketMessagesEndpoint", supportTicketMessagesEndpoint(SAMPLE_ID)],
  ["aiJobCancelEndpoint", aiJobCancelEndpoint(SAMPLE_ID)],
  ["classAssignmentSubmissionsEndpoint", classAssignmentSubmissionsEndpoint(SAMPLE_ID)],
  ["assignmentGradeEndpoint", assignmentGradeEndpoint(SAMPLE_ID)],
  ["classQuizAttemptsEndpoint", classQuizAttemptsEndpoint(SAMPLE_ID)],
  ["classQuizAnswerGradeEndpoint", classQuizAnswerGradeEndpoint(SAMPLE_ID)],
  ["classLibraryDownloadEndpoint", classLibraryDownloadEndpoint(SAMPLE_ID)],
];

describe("dashboard/Django API contract parity", () => {
  it("covers every endpoint group", () => {
    expect(collectionPaths.length).toBeGreaterThan(30);
    expect(detailCapableBases.length).toBeGreaterThan(15);
  });

  it.each(collectionPaths)("%s → %s exists on the backend", (_name, path) => {
    expect(backendPaths.has(canonical(path))).toBe(true);
  });

  it.each(actionPaths)("%s → %s exists on the backend", (_name, path) => {
    expect(backendPaths.has(canonical(path))).toBe(true);
  });

  it("builds every path relative to /api/v1 with Django's trailing slash and no leading slash", () => {
    for (const [name, path] of [...collectionPaths, ...actionPaths]) {
      // backend-http.ts joins these onto BACKEND_API_URL (which already ends
      // in /api/v1), so a leading slash or a repeated prefix would produce a
      // `//` or a doubled `/api/v1/api/v1` upstream URL.
      expect(path, name).not.toMatch(/^\//u);
      expect(path, name).toMatch(/\/$/u);
      expect(path, name).not.toContain("//");
      expect(path, name).not.toContain("api/v1");
    }
  });
});
