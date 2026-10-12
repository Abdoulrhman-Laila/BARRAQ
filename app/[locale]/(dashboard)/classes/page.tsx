"use client";

import { useEffect, useState } from "react";

import { ClassAnnouncementsPanel } from "@/components/data/ClassAnnouncementsPanel";
import { ClassAssignmentsPanel } from "@/components/data/ClassAssignmentsPanel";
import { ClassEventsPanel } from "@/components/data/ClassEventsPanel";
import { ClassMembersPanel } from "@/components/data/ClassMembersPanel";
import { ClassQuizzesPanel } from "@/components/data/ClassQuizzesPanel";
import { ResourcePage } from "@/components/data/ResourcePage";
import { api } from "@/lib/api/client";
import { classActionEndpoint, endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface OrganizationOption {
  public_id: string;
  name: string;
}

interface Paginated<T> {
  results?: T[];
}

function looksLikeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/iu.test(value) || /^\d+$/u.test(value);
}

function organizationLabel(
  row: { organization?: unknown; organization_name?: unknown },
  organizations: OrganizationOption[]
): string {
  const nested = row.organization;
  if (nested && typeof nested === "object") {
    const name = String((nested as { name?: unknown }).name ?? "").trim();
    if (name && !looksLikeId(name)) return name;
  }
  const named = String(row.organization_name ?? "").trim();
  if (named && !looksLikeId(named)) return named;
  const id = String(typeof nested === "string" || typeof nested === "number" ? nested : "").trim();
  const match = organizations.find((organization) => organization.public_id === id);
  return match?.name || "—";
}

/**
 * The organization picker is built from what the backend returns, so a
 * manager can only ever name an organization they already reach.
 *
 * That is convenience, not protection: the backend re-resolves the
 * organization in the request body against the caller's scope and answers
 * 404 for anything else. Both layers exist because a picker is trivially
 * bypassed by anyone willing to send the request themselves.
 */
export default function ClassesPage() {
  const dictionary = useDictionary();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Paginated<OrganizationOption>>(endpoints.admin.organizations, { page_size: 100 })
      .then((response) => {
        if (!cancelled) {
          // API wrapper normalizes response, so response.data is the array
          const data = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
          setOrganizations(data);
        }
      })
      .catch(() => {
        // A manager without organizations.view still reaches this page via
        // classes.view. An empty picker is the honest result; the create
        // form simply offers nothing to pick.
        if (!cancelled) setOrganizations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const organizationOptions = organizations.map((organization) => ({
    label: organization.name,
    value: organization.public_id
  }));

  return (
    <ResourcePage
      title={dictionary.classes}
      description={dictionary.classesDesc}
      endpoint={endpoints.admin.classes}
      hydrateDetail
      hideDefaultDetail
      detailTitle={(row) => String(row.name || dictionary.classes)}
      renderDetailExtra={(classroom) => (
        <>
          <div className="class-summary">
            <p className="class-summary__meta">
              <span>{organizationLabel(classroom, organizations)}</span>
              {classroom.code ? <span>{String(classroom.code)}</span> : null}
              {classroom.member_count !== undefined ? (
                <span>
                  {Number(classroom.member_count).toLocaleString()} {dictionary.colMembers}
                </span>
              ) : null}
            </p>
          </div>
          <ClassAnnouncementsPanel classroom={classroom} />
          <ClassEventsPanel classroom={classroom} />
          <ClassQuizzesPanel classroom={classroom} />
          <ClassAssignmentsPanel classroom={classroom} />
          <ClassMembersPanel classroom={classroom} />
        </>
      )}
      createConfig={{
        title: dictionary.createClass,
        fields: [
          {
            key: "organization",
            label: dictionary.colOrganization,
            type: "select",
            required: true,
            options: organizationOptions
          },
          { key: "name", label: dictionary.colName, required: true },
          { key: "code", label: dictionary.colCode }
        ]
      }}
      editConfig={{
        title: dictionary.editClass,
        fields: [
          { key: "name", label: dictionary.colName, required: true },
          { key: "code", label: dictionary.colCode }
        ],
        fromRow: (row) => ({
          name: String(row.name ?? ""),
          code: String(row.code ?? "")
        })
      }}
      mutationToasts={{
        createSuccess: dictionary.classCreated,
        updateSuccess: dictionary.classUpdated
      }}
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusActive, value: "active" },
            { label: dictionary.statusArchived, value: "archived" }
          ]
        },
        ...(organizationOptions.length > 1
          ? [
              {
                key: "organization",
                label: dictionary.colOrganization,
                options: organizationOptions
              }
            ]
          : [])
      ]}
      rowActions={[
        {
          label: dictionary.archiveClass,
          variant: "danger",
          visible: (row) => String(row.status) !== "archived",
          endpoint: (row) => classActionEndpoint(String(row.public_id), "archive"),
          method: "POST",
          confirm: dictionary.archiveClassConfirm,
          successToast: dictionary.classArchived
        },
        {
          label: dictionary.createInvitation,
          variant: "secondary",
          visible: (row) => String(row.status) === "active",
          endpoint: (row) => classActionEndpoint(String(row.public_id), "invitations/create"),
          method: "POST",
          body: () => ({ max_uses: 0 }),
          successToast: dictionary.invitationCreated
        }
      ]}
      columns={[
        { key: "name", label: dictionary.colName, mobile: "title" },
        {
          key: "organization",
          label: dictionary.colOrganization,
          render: (row) => organizationLabel(row, organizations)
        },
        { key: "code", label: dictionary.colCode },
        { key: "member_count", label: dictionary.colMembers, type: "number", mobile: true },
        { key: "status", label: dictionary.status, type: "status", mobile: true },
        { key: "created_at", label: dictionary.colCreated, type: "date" }
      ]}
      emptyState={{
        title: dictionary.emptyClasses,
        description: dictionary.emptyClassesDesc
      }}
      mobileCards
    />
  );
}
