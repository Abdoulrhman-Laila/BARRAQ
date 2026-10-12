"use client";

import { useEffect, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import { api } from "@/lib/api/client";
import { endpoints, joinRequestActionEndpoint } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

interface NamedEntity {
  public_id: string;
  name: string;
}

interface Paginated<T> {
  results?: T[];
}

/**
 * Approving is what actually creates membership -- in the organization and
 * in the class together, since a learner cannot be in 10-A without being at
 * the school. Both decisions are confirmed, because both are visible to the
 * learner immediately.
 *
 * Rejecting only ever applies to a pending request. The backend refuses to
 * reject one that was already approved, so this screen cannot be used to
 * remove an existing member through the back door.
 */
export default function JoinRequestsPage() {
  const dictionary = useDictionary();
  const [organizations, setOrganizations] = useState<NamedEntity[]>([]);
  const [classrooms, setClassrooms] = useState<NamedEntity[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api
        .get<Paginated<NamedEntity>>(endpoints.admin.organizations, { page_size: 100 })
        .then((response) => {
          if (!cancelled) {
            const data = Array.isArray(response.data)
              ? response.data
              : response.data?.results ?? [];
            setOrganizations(data);
          }
        })
        .catch(() => {
          if (!cancelled) setOrganizations([]);
        }),
      api
        .get<Paginated<NamedEntity>>(endpoints.admin.classes, { page_size: 100 })
        .then((response) => {
          if (!cancelled) {
            const data = Array.isArray(response.data)
              ? response.data
              : response.data?.results ?? [];
            setClassrooms(data);
          }
        })
        .catch(() => {
          if (!cancelled) setClassrooms([]);
        })
    ]);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ResourcePage
      title={dictionary.joinRequests}
      description={dictionary.joinRequestsDesc}
      endpoint={endpoints.admin.joinRequests}
      hydrateDetail
      defaultOrdering="-created_at"
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusPending, value: "pending" },
            { label: dictionary.statusApproved, value: "approved" },
            { label: dictionary.statusRejected, value: "rejected" }
          ]
        }
      ]}
      rowActions={[
        {
          label: dictionary.approveRequest,
          variant: "primary",
          visible: (row) => String(row.status) === "pending",
          endpoint: (row) => joinRequestActionEndpoint(String(row.public_id), "approve"),
          method: "POST",
          confirm: dictionary.approveRequestConfirm,
          successToast: dictionary.requestApproved
        },
        {
          label: dictionary.rejectRequest,
          variant: "danger",
          visible: (row) => String(row.status) === "pending",
          endpoint: (row) => joinRequestActionEndpoint(String(row.public_id), "reject"),
          method: "POST",
          confirm: dictionary.rejectRequestConfirm,
          successToast: dictionary.requestRejected
        }
      ]}
      columns={[
        { key: "user_full_name", label: dictionary.colUser, mobile: "title" },
        { key: "user_email", label: dictionary.email },
        {
          key: "organization",
          label: dictionary.colOrganization,
          render: (row) => {
            const org = organizations.find((o) => o.public_id === row.organization);
            return org?.name || String(row.organization || "-");
          }
        },
        {
          key: "classroom",
          label: dictionary.colClass,
          mobile: true,
          render: (row) => {
            const cls = classrooms.find((c) => c.public_id === row.classroom);
            return cls?.name || String(row.classroom || "-");
          }
        },
        { key: "status", label: dictionary.status, type: "status", mobile: true },
        { key: "created_at", label: dictionary.colCreated, type: "date" },
        { key: "decided_at", label: dictionary.colUpdated, type: "date" }
      ]}
      emptyState={{
        title: dictionary.emptyJoinRequests,
        description: dictionary.emptyJoinRequestsDesc
      }}
      mobileCards
    />
  );
}
