import { describe, expect, it } from "vitest";

import { navigation, navigationGroups } from "@/lib/navigation";

/**
 * The sidebar renders items *by group*, so an entry present in
 * `navigation` but missing from every group is never drawn — no error, no
 * warning, just a page nobody can reach from the menu.
 *
 * That is not hypothetical. The entire organization section — five pages
 * with permissions, sections, routes and backend endpoints all correct —
 * shipped unreachable because its keys were added to `navigation` and not
 * to the groups.
 */
describe("sidebar navigation groups", () => {
  const grouped = navigationGroups.flatMap((group) => group.keys);

  it("renders every navigation item", () => {
    const ungrouped = navigation.map((item) => item.key).filter((key) => !grouped.includes(key));

    expect(ungrouped).toEqual([]);
  });

  it("does not reference items that no longer exist", () => {
    const known = navigation.map((item) => item.key);
    const orphans = grouped.filter((key) => !known.includes(key));

    expect(orphans).toEqual([]);
  });

  it("places each item in exactly one group", () => {
    // Two groups claiming the same key renders it twice, which looks like a
    // bug to the reader and hides which section it really belongs to.
    const duplicates = grouped.filter((key, index) => grouped.indexOf(key) !== index);

    expect(duplicates).toEqual([]);
  });

  it("keeps the organization workflow together and reachable", () => {
    const organizationGroup = navigationGroups.find((group) => group.id === "organizations");

    expect(organizationGroup?.keys).toEqual([
      "organizations",
      "classes",
      "studentPerformance",
      "supervisors",
      "invitations",
      "joinRequests",
    ]);
  });
});
