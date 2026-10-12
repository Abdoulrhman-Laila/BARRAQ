import { describe, expect, it } from "vitest";
import { navigation } from "@/lib/navigation";

/**
 * Access-control coherence between this dashboard and the API.
 *
 * `allowed_sections` is keyed by the backend's own section identifiers
 * (`SECTION_PERMISSIONS` in `apps/admin_dashboard/services.py`). A nav item
 * naming a key that does not exist there resolves to `undefined`, which is
 * falsy, so the item silently disappears for every non-superuser admin —
 * which is exactly what happened to education (`subjects`), study plans
 * (`study_plans` vs `study`) and audit logs (`audit` vs `audit_logs`).
 *
 * Hiding a nav item is never the security mechanism: the backend denies the
 * endpoint independently. This guards the *coherence* of the two.
 */

/** Mirrors SECTION_PERMISSIONS in apps/admin_dashboard/services.py. */
const BACKEND_SECTIONS = new Set([
  "dashboard",
  "users",
  "admins",
  "roles",
  "students",
  "subjects",
  "sources",
  "collections",
  "study",
  "quizzes",
  "character_interactions",
  "analytics",
  "ai",
  "support",
  "subscriptions",
  "subscription_plans",
  "audit_logs",
  "system",
  "organizations",
  "classes",
  "join_requests",
  "invitations",
]);

/** The permission each backend section is gated on, same source. */
const SECTION_PERMISSION: Record<string, string> = {
  dashboard: "dashboard.view",
  users: "users.view",
  admins: "admins.view",
  roles: "roles.view",
  students: "students.view",
  subjects: "subjects.view",
  sources: "sources.view",
  collections: "collections.view",
  study: "study_plans.view",
  quizzes: "quizzes.view",
  character_interactions: "character_interactions.view",
  analytics: "analytics.view",
  ai: "ai_jobs.view",
  support: "support.view",
  subscriptions: "subscriptions.view",
  subscription_plans: "subscription_plans.view",
  audit_logs: "audit_logs.view",
  system: "system.view",
  organizations: "organizations.view",
  classes: "classes.view",
  join_requests: "join_requests.view",
  invitations: "invitations.view",
};

describe("navigation access rules", () => {
  it("has navigation entries to check", () => {
    expect(navigation.length).toBeGreaterThan(5);
  });

  it.each(navigation.filter((item) => item.section))(
    "$key uses a section the backend actually publishes",
    (item) => {
      expect(BACKEND_SECTIONS.has(item.section as string)).toBe(true);
    },
  );

  it.each(navigation.filter((item) => item.permission && item.section))(
    "$key names a permission from its own section's family",
    (item) => {
      // An item may legitimately demand a *stricter* permission than the
      // section gate — `system` is gated on `system.view` but its page reads
      // health, so it asks for `system.health`. What it must never do is name
      // a permission from a different family, which is how `audit.view` on
      // the `audit` section silently matched nothing at all.
      const sectionPermission = SECTION_PERMISSION[item.section as string];
      const family = (code: string) => code.split(".")[0];
      expect(family(item.permission as string)).toBe(family(sectionPermission));
    },
  );

  it("never names a permission outside the backend's vocabulary", () => {
    const known = new Set(Object.values(SECTION_PERMISSION));
    // `system.health` is a real permission that is not a section gate.
    known.add("system.health");
    known.add("library.view");
    for (const item of navigation) {
      if (!item.permission) continue;
      expect(known.has(item.permission), `${item.key} → ${item.permission}`).toBe(true);
    }
  });
});
