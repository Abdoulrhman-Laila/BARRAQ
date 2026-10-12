"use client";

import { ClassOverview } from "@/components/dashboard/ClassOverview";
import { OrganizationOverview } from "@/components/dashboard/OrganizationOverview";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { useAdmin } from "@/components/providers/AdminProvider";
import { EmptyState } from "@/components/ui/States";
import { selectOverview } from "@/lib/auth/overview-scope";
import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * The first screen after signing in, chosen by what the operator
 * administers. The rule itself lives in `selectOverview` so it can be
 * tested; this only renders the answer.
 */
export default function DashboardPage() {
  const dictionary = useDictionary();
  const { admin } = useAdmin();
  const overview = selectOverview(admin ?? null);

  if (overview.kind === "platform") return <OverviewDashboard />;
  if (overview.kind === "organization") {
    return <OrganizationOverview organizations={overview.organizations} />;
  }
  if (overview.kind === "classes") return <ClassOverview classes={overview.classes} />;

  // No scope at all. Saying so beats inventing numbers for an account the
  // backend grants nothing to.
  // Not "no scope" -- this account may well have one. It has no summary
  // it is permitted to read, which is a different thing, and telling it
  // to "add an admin account" described a task it cannot perform.
  return <EmptyState title={dictionary.noOverviewTitle} description={dictionary.noOverviewDesc} />;
}
