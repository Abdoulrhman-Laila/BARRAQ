"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Select } from "@/components/ui/Field";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api/client";
import { organizationActionEndpoint } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AdminScope } from "@/types/api";

interface OrganizationCounts {
  active_students: number;
  active_classes: number;
  pending_join_requests: number;
  active_invitations: number;
}

/**
 * The overview a scoped operator gets instead of the platform one.
 *
 * The platform overview answers "how is Baraq doing", which is not a
 * question an organization manager is entitled to ask -- a total describes
 * the shape of every tenant it covers, so the backend refuses it outright
 * for a scoped account. Before this, that refusal surfaced on their home
 * page as a generic load failure.
 *
 * These four numbers come from the backend already aggregated per
 * organization. Nothing here is computed from a wider set and narrowed in
 * the client, which would be the same leak wearing a different coat.
 */
export function OrganizationOverview({ organizations }: { organizations: AdminScope[] }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";

  const options = organizations
    .map((scope) => scope.organization)
    .filter((organization): organization is NonNullable<typeof organization> => Boolean(organization));

  const [selected, setSelected] = useState(options[0]?.public_id ?? "");
  const active = options.find((organization) => organization.public_id === selected) ?? options[0];

  const result = useQuery({
    queryKey: ["organization-overview", selected] as const,
    queryFn: async () => {
      const response = await api.get<OrganizationCounts>(
        organizationActionEndpoint(selected, "overview"),
      );
      return response.data;
    },
    enabled: Boolean(selected),
    retry: (failureCount, reason) => (isUnauthorizedError(reason) ? false : failureCount < 1),
  });

  const counts = result.data;

  return (
    <div className="overview">
      <PageHeader
        title={active?.name ?? dictionary.organizations}
        description={dictionary.organizationOverviewDesc}
        actions={
          // Only when there is a choice to make. A switcher offering one
          // option is a control that cannot do anything.
          options.length > 1 ? (
            <>
              <label className="sr-only" htmlFor="overview-organization">
                {dictionary.colOrganization}
              </label>
              <Select
                id="overview-organization"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                {options.map((organization) => (
                  <option key={organization.public_id} value={organization.public_id}>
                    {organization.name}
                  </option>
                ))}
              </Select>
            </>
          ) : null
        }
      />

      {result.isPending ? (
        <TableSkeleton columns={4} rows={1} label={dictionary.loading} />
      ) : result.error && !isUnauthorizedError(result.error) ? (
        <ErrorState
          message={
            result.error instanceof Error ? result.error.message : dictionary.overviewLoadFailed
          }
          onRetry={() => void result.refetch()}
        />
      ) : counts ? (
        <div className="metrics-grid">
          <MetricCard
            title={dictionary.activeStudents}
            value={counts.active_students.toLocaleString(numberLocale)}
            detail={dictionary.colOrganization}
            icon="users"
            tone="blue"
          />
          <MetricCard
            title={dictionary.classes}
            value={counts.active_classes.toLocaleString(numberLocale)}
            detail={dictionary.statusActive}
            icon="file"
            tone="purple"
          />
          <MetricCard
            title={dictionary.joinRequests}
            value={counts.pending_join_requests.toLocaleString(numberLocale)}
            detail={dictionary.statusPending}
            icon="support"
            tone="gold"
          />
          <MetricCard
            title={dictionary.invitations}
            value={counts.active_invitations.toLocaleString(numberLocale)}
            detail={dictionary.statusActive}
            icon="spark"
            tone="green"
          />
        </div>
      ) : null}
    </div>
  );
}
