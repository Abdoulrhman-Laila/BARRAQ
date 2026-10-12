import type { AdminMe, AdminScope } from "@/types/api";

export type OverviewKind =
  | { kind: "platform" }
  | { kind: "organization"; organizations: AdminScope[] }
  | { kind: "classes"; classes: AdminScope[] }
  | { kind: "none" };

/**
 * Which overview to show an operator.
 *
 * Presentation, not authorization. Every branch calls a different endpoint
 * and the backend answers each on its own merits, so a forged scope here
 * buys a 404 rather than a number. What this decides is whether the first
 * screen after signing in is useful or an error.
 *
 * The platform overview is refused outright for a scoped account -- a total
 * describes the shape of every tenant it covers -- so routing everyone to
 * it turned that correct refusal into a load failure on the home page.
 */
export function selectOverview(
  admin: Pick<AdminMe, "is_superuser" | "scopes" | "permissions"> | null,
): OverviewKind {
  if (!admin) return { kind: "none" };

  const scopes = admin.scopes ?? [];
  // Scope says which tenant; permission says whether this account may
  // read the summary at all. Offering a view the backend will refuse
  // produces a blank page, which is how a custom role with an
  // organization scope but no organizations.view landed on nothing.
  const can = (code: string) => (admin.permissions ?? []).includes(code);

  // is_superuser is reach in itself and does not depend on a scope row;
  // an explicit global grant is the other way to hold the whole platform.
  if (admin.is_superuser || scopes.some((scope) => scope.type === "global")) {
    return { kind: "platform" };
  }

  // Keyed on the scope type, not on whether an organization name is
  // attached: a class grant carries its organization so the UI can say
  // which school the class belongs to. Reading that as "may summarise this
  // organization" would send a class supervisor to an overview the backend
  // refuses them, which is the same load-failure-on-the-home-page this
  // function exists to prevent.
  const organizations = scopes.filter(
    (scope) => scope.type === "organization" && Boolean(scope.organization),
  );
  if (organizations.length > 0 && can("organizations.view")) {
    return { kind: "organization", organizations };
  }

  // A class supervisor has no organization total they may read, but they do
  // have classes -- which is the whole of their job. Sending them to an
  // empty state that says "add an admin account" was both useless and
  // wrong: it described a task they cannot perform.
  const classes = scopes.filter((scope) => scope.type === "class" && Boolean(scope.classroom));
  if (classes.length > 0 && can("classes.view")) return { kind: "classes", classes };

  // No scope at all, which the backend reads as no access. Saying so beats
  // inventing numbers for an account that can see none.
  return { kind: "none" };
}
