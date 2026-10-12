import type { Dictionary } from "@/lib/i18n/dictionaries";

export type IconName = "grid" | "users" | "shield" | "book" | "file" | "calendar" | "quiz" | "spark" | "star" | "gem" | "credit" | "support" | "history" | "health";

export interface NavItem {
  key: keyof Dictionary;
  href: string;
  icon: IconName;
  permission?: string;
  section?: string;
}

/**
 * `section` and `permission` must use the backend's own identifiers --
 * SECTION_PERMISSIONS and DEFAULT_PERMISSIONS in
 * apps/admin_dashboard/services.py. A key that does not exist there
 * resolves to `undefined` in `allowed_sections` and silently hides the item
 * from every non-superuser admin, which is how education, study plans and
 * audit logs became invisible.
 */
export const navigation: NavItem[] = [
  { key: "overview", href: "", icon: "grid", permission: "dashboard.view", section: "dashboard" },
  { key: "users", href: "/users", icon: "users", permission: "users.view", section: "users" },
  { key: "studentPerformance", href: "/student-performance", icon: "quiz", permission: "students.view", section: "students" },
  { key: "organizations", href: "/organizations", icon: "shield", permission: "organizations.view", section: "organizations" },
  { key: "classes", href: "/classes", icon: "book", permission: "classes.view", section: "classes" },
  { key: "joinRequests", href: "/join-requests", icon: "users", permission: "join_requests.view", section: "join_requests" },
  { key: "supervisors", href: "/supervisors", icon: "shield", permission: "admins.view", section: "admins" },
  { key: "invitations", href: "/invitations", icon: "file", permission: "invitations.view", section: "invitations" },
  { key: "admins", href: "/admins", icon: "shield", permission: "admins.view", section: "admins" },
  { key: "roles", href: "/roles", icon: "shield", permission: "roles.view", section: "roles" },
  { key: "education", href: "/education", icon: "book" },
  { key: "sources", href: "/sources", icon: "file" },
  { key: "classLibrary", href: "/class-library", icon: "file", permission: "library.view" },
  { key: "studyPlans", href: "/study-plans", icon: "calendar" },
  { key: "quizzes", href: "/quizzes", icon: "quiz" },
  { key: "aiJobs", href: "/ai-jobs", icon: "spark" },
  { key: "aiFeedback", href: "/ai-feedback", icon: "star" },
  { key: "aiResults", href: "/ai-results", icon: "gem" },
  { key: "subscriptions", href: "/subscriptions", icon: "credit" },
  { key: "support", href: "/support", icon: "support" },
  { key: "auditLogs", href: "/audit-logs", icon: "history", permission: "audit_logs.view", section: "audit_logs" },
  { key: "system", href: "/system", icon: "health", permission: "system.health", section: "system" }
];

/**
 * Sidebar grouping.
 *
 * Lives here rather than in the Sidebar because an item present in
 * `navigation` but absent from every group is never rendered -- the
 * sidebar looks items up *by group*, so the omission is silent. That is
 * how the entire organization section shipped unreachable while its
 * permissions, sections, routes and pages all existed. `navigationGroups`
 * and `navigation` are now one file and one test apart.
 */
export const navigationGroups: Array<{
  id: string;
  labelKey: "navHome" | "navAccounts" | "navOrganizations" | "navAccess" | "navContent" | "navLearning" | "navAi" | "navOps" | "navSystem";
  keys: Array<NavItem["key"]>;
}> = [
  { id: "home", labelKey: "navHome", keys: ["overview"] },
  { id: "accounts", labelKey: "navAccounts", keys: ["users", "admins"] },
  {
    id: "organizations",
    labelKey: "navOrganizations",
    keys: ["organizations", "classes", "studentPerformance", "supervisors", "invitations", "joinRequests"]
  },
  { id: "access", labelKey: "navAccess", keys: ["roles"] },
  { id: "content", labelKey: "navContent", keys: ["education", "sources", "classLibrary"] },
  { id: "learning", labelKey: "navLearning", keys: ["studyPlans", "quizzes"] },
  { id: "ai", labelKey: "navAi", keys: ["aiJobs", "aiFeedback", "aiResults"] },
  { id: "ops", labelKey: "navOps", keys: ["subscriptions", "support", "auditLogs"] },
  { id: "system", labelKey: "navSystem", keys: ["system"] }
];

/** Resolve the navigation access rule for a dashboard pathname. */
export function matchNavItem(pathname: string, locale: string): NavItem | undefined {
  const base = `/${locale}`;
  const normalized = pathname.replace(/\/+$/, "") || base;

  if (normalized === base) {
    return navigation.find((item) => item.href === "");
  }

  const matches = navigation
    .filter((item) => item.href)
    .map((item) => ({ item, full: `${base}${item.href}` }))
    .filter(({ full }) => normalized === full || normalized.startsWith(`${full}/`))
    .sort((a, b) => b.full.length - a.full.length);

  return matches[0]?.item;
}
