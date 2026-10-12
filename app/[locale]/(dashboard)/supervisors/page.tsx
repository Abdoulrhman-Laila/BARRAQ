"use client";

import { useEffect, useState } from "react";

import { AdminScopePanel } from "@/components/data/AdminScopePanel";
import { ResourcePage } from "@/components/data/ResourcePage";
import { api } from "@/lib/api/client";
import { adminRevokeRolesEndpoint, endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

interface Scope {
  type: string;
  organization?: { public_id: string; name: string };
  classroom?: { public_id: string; name: string };
}

interface OrganizationOption {
  public_id: string;
  name: string;
}

function describeScopes(row: AnyRecord, fallback: string): string {
  const scopes = Array.isArray(row.scopes) ? (row.scopes as Scope[]) : [];
  if (scopes.length === 0) return fallback;
  return scopes
    .map((scope) => scope.classroom?.name ?? scope.organization?.name ?? scope.type)
    .join("، ");
}

/**
 * Who administers what.
 *
 * The same accounts as the admin directory, read the other way round: not
 * "who is an admin" but "who runs this school, this class". Those are
 * different questions once more than one organization exists, and only the
 * second one is answerable from an account's scopes.
 *
 * Both the list and the scopes shown on it are the backend's, already
 * reduced to what this operator may see -- an account working in two
 * schools shows only the one they share. Revoking is likewise bounded:
 * it withdraws the grants inside this operator's reach and leaves the rest
 * alone.
 */
export default function SupervisorsPage() {
  const dictionary = useDictionary();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ results?: OrganizationOption[] }>(endpoints.admin.organizations, { page_size: 100 })
      .then((response) => {
        if (!cancelled) setOrganizations(response.data?.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setOrganizations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResourcePage
      title={dictionary.supervisors}
      description={dictionary.supervisorsDesc}
      endpoint={endpoints.admin.admins}
      hydrateDetail
      filters={
        organizations.length > 0
          ? [
              {
                key: "organization",
                label: dictionary.colOrganization,
                options: organizations.map((organization) => ({
                  label: organization.name,
                  value: organization.public_id
                }))
              }
            ]
          : []
      }
      renderDetailExtra={(admin, { refreshDetail }) => (
        <AdminScopePanel
          admin={admin}
          onAssigned={async () => {
            await refreshDetail();
          }}
        />
      )}
      rowActions={[
        {
          label: dictionary.revokeRoles,
          variant: "danger",
          visible: (row) => Array.isArray(row.scopes) && row.scopes.length > 0,
          endpoint: (row) => adminRevokeRolesEndpoint(String(row.id)),
          method: "POST",
          confirm: dictionary.revokeRolesConfirm,
          successToast: dictionary.rolesRevoked
        }
      ]}
      columns={[
        { key: "full_name", label: dictionary.colName, mobile: "title" },
        { key: "email", label: dictionary.colEmailShort, mobile: true },
        {
          key: "roles",
          label: dictionary.roles,
          render: (row) =>
            Array.isArray(row.roles)
              ? (row.roles as AnyRecord[]).map((role) => String(role.name)).join("، ")
              : "—"
        },
        {
          key: "scopes",
          label: dictionary.colScopes,
          mobile: true,
          render: (row) => describeScopes(row, dictionary.noScope)
        },
        { key: "is_active", label: dictionary.status, type: "status" }
      ]}
      emptyState={{
        title: dictionary.emptySupervisors,
        description: dictionary.emptySupervisorsDesc
      }}
      mobileCards
    />
  );
}
