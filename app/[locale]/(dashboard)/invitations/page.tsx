"use client";

import { useEffect, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import { endpoints, invitationRevokeEndpoint } from "@/lib/api/endpoints";
import { buildJoinLink } from "@/lib/api/join-link";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

interface NamedEntity {
  public_id: string;
  name: string;
}

interface Paginated<T> {
  results?: T[];
}

function isExpired(row: AnyRecord): boolean {
  const expires = row.expires_at ? new Date(String(row.expires_at)) : null;
  return Boolean(expires && !Number.isNaN(expires.getTime()) && expires <= new Date());
}

function isExhausted(row: AnyRecord): boolean {
  const max = Number(row.max_uses ?? 0);
  return max > 0 && Number(row.usage_count ?? 0) >= max;
}

function isUsable(row: AnyRecord): boolean {
  return String(row.status) === "active" && !isExpired(row) && !isExhausted(row);
}

/**
 * Invitations are credentials, so this page treats them as such.
 *
 * The code and link are shown only for invitations that still work, and
 * copied rather than selected, so a revoked or expired secret is not left
 * sitting on screen waiting to be photographed. Revoking is immediate and
 * final: the backend stops accepting the code, which is the only place that
 * decision can actually be enforced.
 *
 * The list is the backend's, already scoped -- a manager sees their own
 * organizations' invitations and cannot revoke anyone else's.
 */
export default function InvitationsPage() {
  const dictionary = useDictionary();
  const locale = useLocale();
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
      title={dictionary.invitations}
      description={dictionary.invitationsDesc}
      endpoint={endpoints.admin.invitations}
      defaultOrdering="-created_at"
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusActive, value: "active" },
            { label: dictionary.revokeInvitation, value: "revoked" }
          ]
        }
      ]}
      rowActions={[
        {
          label: dictionary.revokeInvitation,
          variant: "danger",
          visible: (row) => String(row.status) === "active",
          endpoint: (row) => invitationRevokeEndpoint(String(row.id)),
          method: "POST",
          confirm: dictionary.revokeInvitationConfirm,
          successToast: dictionary.invitationRevoked
        }
      ]}
      columns={[
        {
          key: "code",
          label: dictionary.colCode,
          mobile: "title",
          // Only while it still works: a dead secret on screen is a secret
          // someone can still read over a shoulder.
          render: (row) =>
            isUsable(row) ? (
              <CopyButton value={String(row.code ?? "")} label={dictionary.copyCode} />
            ) : (
              <span className="muted">—</span>
            )
        },
        {
          key: "token",
          label: dictionary.copyLink,
          // The join page belongs to the student app, on a different origin,
          // and in the reader's own locale. When that origin is not
          // configured no link is offered -- the code below always works,
          // and a link quietly pointing at the wrong host is worse than
          // none, because the manager believes they sent something usable.
          render: (row) => {
            const href = isUsable(row) ? buildJoinLink(String(row.token ?? ""), locale) : null;
            return href ? (
              <CopyButton value={href} label={dictionary.copyLink} />
            ) : (
              <span className="muted">—</span>
            );
          }
        },
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
        {
          key: "status",
          label: dictionary.status,
          mobile: true,
          // One column for the three separate ways an invitation stops
          // working, because to the person holding it they are the same
          // thing: it no longer opens the door.
          render: (row) => {
            if (String(row.status) !== "active") return dictionary.revokeInvitation;
            if (isExpired(row)) return dictionary.expired;
            if (isExhausted(row)) return dictionary.exhausted;
            return dictionary.statusActive;
          }
        },
        {
          key: "usage_count",
          label: dictionary.colUses,
          render: (row) =>
            `${Number(row.usage_count ?? 0)} / ${
              Number(row.max_uses ?? 0) > 0 ? Number(row.max_uses) : dictionary.unlimited
            }`
        },
        {
          key: "expires_at",
          label: dictionary.colExpires,
          render: (row) =>
            row.expires_at ? (
              new Date(String(row.expires_at)).toLocaleString()
            ) : (
              <span className="muted">{dictionary.neverExpires}</span>
            )
        },
        { key: "created_at", label: dictionary.colCreated, type: "date" }
      ]}
      emptyState={{
        title: dictionary.emptyInvitations,
        description: dictionary.emptyInvitationsDesc
      }}
      mobileCards
    />
  );
}
