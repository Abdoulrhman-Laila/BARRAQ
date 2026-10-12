import { describe, expect, it } from "vitest";

import { selectOverview } from "@/lib/auth/overview-scope";
import type { AdminScope } from "@/types/api";

const organizationScope: AdminScope = {
  type: "organization",
  organization: { public_id: "org-a", name: "School A" },
};

// A real class scope carries its organization too -- the backend attaches
// it so the UI can say which school the class belongs to. Testing against
// a stripped-down version would have hidden the bug this fixture found.
const classScope: AdminScope = {
  type: "class",
  classroom: { public_id: "class-a", name: "10-A" },
  organization: { public_id: "org-a", name: "School A" },
};

/** A viewer with the permissions a real account of this shape would hold. */
function viewer(
  scopes: AdminScope[],
  { superuser = false, permissions = ["organizations.view", "classes.view"] } = {},
) {
  return { is_superuser: superuser, scopes, permissions };
}

describe("which overview an operator sees", () => {
  it("sends a superuser to the platform overview", () => {
    expect(selectOverview(viewer([], { superuser: true }))).toEqual({ kind: "platform" });
  });

  it("sends an explicitly global grant to the platform overview", () => {
    expect(selectOverview(viewer([{ type: "global" }]))).toEqual({
      kind: "platform",
    });
  });

  it("sends a scoped manager to their own organization", () => {
    // The regression this exists for: the platform overview is refused for
    // a scoped account, so routing them there turned a correct refusal into
    // a load failure on the first screen after signing in.
    const result = selectOverview(viewer([organizationScope]));

    expect(result).toEqual({ kind: "organization", organizations: [organizationScope] });
  });

  it("keeps every organization an operator reaches, so they can switch", () => {
    const second: AdminScope = {
      type: "organization",
      organization: { public_id: "org-b", name: "School B" },
    };

    const result = selectOverview(viewer([organizationScope, second]));

    expect(result).toEqual({ kind: "organization", organizations: [organizationScope, second] });
  });

  it("does not promote a scoped account to the platform overview", () => {
    for (const scopes of [[organizationScope], [classScope], [organizationScope, classScope]]) {
      expect(selectOverview(viewer(scopes)).kind).not.toBe("platform");
    }
  });

  it("shows nothing rather than inventing numbers for an unscoped account", () => {
    expect(selectOverview(viewer([]))).toEqual({ kind: "none" });
    expect(selectOverview({ is_superuser: false, scopes: undefined, permissions: [] })).toEqual({ kind: "none" });
    expect(selectOverview(null)).toEqual({ kind: "none" });
  });

  it("gives a class supervisor their classes, not an organization total", () => {
    // The scope names an organization, but only so the UI can say which
    // school the class belongs to -- the backend refuses this account the
    // organization overview. Their classes are the whole of their job and
    // are plainly theirs to see.
    expect(selectOverview(viewer([classScope]))).toEqual({
      kind: "classes",
      classes: [classScope],
    });
  });

  it("prefers the organization view when an account holds both", () => {
    const result = selectOverview(viewer([classScope, organizationScope]));

    // An organization grant is the broader of the two and answers more.
    expect(result).toEqual({ kind: "organization", organizations: [organizationScope] });
  });

  it("does not offer an overview the account cannot load", () => {
    // A custom role scoped to an organization but without
    // organizations.view: the backend answers 403, and offering the view
    // anyway produced a blank page with no metrics and no error.
    const coordinator = viewer([organizationScope], {
      permissions: ["dashboard.view", "classes.view", "join_requests.view"],
    });

    expect(selectOverview(coordinator).kind).not.toBe("organization");
  });

  it("falls back to nothing when no overview is permitted", () => {
    const stranger = viewer([organizationScope, classScope], { permissions: ["dashboard.view"] });

    expect(selectOverview(stranger)).toEqual({ kind: "none" });
  });
});
