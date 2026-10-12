"use client";

import { useEffect, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { classLibraryDownloadEndpoint, endpoints } from "@/lib/api/endpoints";
import { beginSessionExpiredRedirect, isUnauthorizedError } from "@/lib/auth/session-expired";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface NamedEntity {
  public_id: string;
  name: string;
  organization?: unknown;
}

interface Paginated<T> {
  results?: T[];
}

function unwrap<T>(payload: Paginated<T> | T[] | undefined): T[] {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

function classroomKey(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as { public_id?: unknown };
    return String(record.public_id ?? "");
  }
  return "";
}

function formatBytes(size: unknown): string {
  if (typeof size !== "number" || size < 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const characterNames: Record<string, string> = {
  fahes: "فاحص",
  khota: "خُطى",
  rasheed: "رشيد",
  kholasa: "خُلاصة",
  sada: "صدى"
};

function characterLabel(id: string): string {
  return characterNames[id] ?? id;
}

function displayName(value: unknown, empty: string): string {
  const text = String(value ?? "").trim();
  return text || empty;
}

function categoryLabel(category: string, dictionary: Dictionary): string {
  if (category === "handout") return dictionary.libraryCategoryHandout;
  if (category === "worksheet") return dictionary.libraryCategoryWorksheet;
  if (category === "past_exam") return dictionary.libraryCategoryPastExam;
  if (category === "recording") return dictionary.libraryCategoryRecording;
  if (category === "other") return dictionary.libraryCategoryOther;
  return category || "—";
}

function filenameFromDisposition(header: string, fallback: string): string {
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) return decodeURIComponent(utf[1]);
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(header);
  return plain?.[1]?.trim() || fallback;
}

function organizationOfClass(classroom: NamedEntity): string {
  return classroomKey(classroom.organization);
}

async function downloadItem(row: AnyRecord, dictionary: Dictionary) {
  const publicId = String(row.public_id ?? "");
  if (!publicId) return;
  const response = await fetch(`/api/bff/${classLibraryDownloadEndpoint(publicId)}`, {
    credentials: "include",
    headers: { Accept: "*/*", "Cache-Control": "no-store" }
  });
  if (response.status === 401) {
    beginSessionExpiredRedirect();
    return;
  }
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || type.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || dictionary.actionFailed);
  }
  const blob = await response.blob();
  const name = filenameFromDisposition(
    response.headers.get("content-disposition") ?? "",
    String(row.original_filename || row.title || "file")
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ClassLibraryDashboard() {
  const dictionary = useDictionary();
  const { can } = useAdmin();
  const canManage = can("library.manage");
  const [organizations, setOrganizations] = useState<NamedEntity[]>([]);
  const [classrooms, setClassrooms] = useState<NamedEntity[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<Paginated<NamedEntity>>(endpoints.admin.organizations, { page_size: 100 }).then((response) => {
        if (!cancelled) setOrganizations(unwrap(response.data));
      }),
      api.get<Paginated<NamedEntity>>(endpoints.admin.classes, { page_size: 100 }).then((response) => {
        if (!cancelled) setClassrooms(unwrap(response.data));
      })
    ]).catch(() => {
      if (!cancelled) {
        setOrganizations([]);
        setClassrooms([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const classOptions = classrooms.map((classroom) => ({
    label: classroom.name,
    value: classroom.public_id
  }));
  const organizationOptions = organizations.map((organization) => ({
    label: organization.name,
    value: organization.public_id
  }));

  return (
    <ResourcePage
      title={dictionary.classLibrary}
      description={dictionary.classLibraryDesc}
      endpoint={endpoints.admin.classLibrary}
      createLabel={dictionary.uploadLibraryFile}
      hydrateDetail
      hideDefaultDetail
      detailTitle={(row) => String(row.title || dictionary.classLibrary)}
      defaultOrdering="-created_at"
      orderingOptions={[
        { value: "-created_at", label: dictionary.newest },
        { value: "created_at", label: dictionary.oldest }
      ]}
      allowDelete={canManage}
      deleteConfirm={dictionary.deleteLibraryConfirm}
      mutationToasts={{
        createSuccess: dictionary.libraryCreated,
        updateSuccess: dictionary.libraryUpdated,
        deleteSuccess: dictionary.libraryDeleted
      }}
      createConfig={
        canManage
          ? {
              title: dictionary.uploadLibraryFile,
              fields: [
                { key: "title", label: dictionary.libraryTitle, required: true },
                { key: "description", label: dictionary.libraryDescription, type: "textarea" },
                {
                  key: "category",
                  label: dictionary.libraryCategory,
                  type: "select",
                  options: [
                    { label: dictionary.libraryCategoryHandout, value: "handout" },
                    { label: dictionary.libraryCategoryWorksheet, value: "worksheet" },
                    { label: dictionary.libraryCategoryPastExam, value: "past_exam" },
                    { label: dictionary.libraryCategoryRecording, value: "recording" },
                    { label: dictionary.libraryCategoryOther, value: "other" }
                  ]
                },
                {
                  key: "classroom",
                  label: dictionary.colClass,
                  type: "select",
                  options: classOptions
                },
                {
                  key: "organization",
                  label: dictionary.colOrganization,
                  type: "select",
                  options: organizationOptions
                },
                { key: "file", label: dictionary.libraryFile, type: "file", required: true }
              ],
              toBody: (values) => {
                const body = new FormData();
                if (values.file instanceof File) body.append("file", values.file);
                body.append("title", String(values.title ?? "").trim());
                body.append("description", String(values.description ?? "").trim());
                body.append("category", String(values.category || "handout"));
                const classroom = String(values.classroom ?? "").trim();
                if (classroom) {
                  body.append("classroom", classroom);
                  const match = classrooms.find((item) => item.public_id === classroom);
                  const organization = String(values.organization ?? "").trim() || (match ? organizationOfClass(match) : "");
                  if (organization) body.append("organization", organization);
                } else {
                  const organization = String(values.organization ?? "").trim();
                  if (organization) body.append("organization", organization);
                }
                return body;
              }
            }
          : undefined
      }
      editConfig={
        canManage
          ? {
              title: dictionary.editLibraryItem,
              fields: [
                { key: "title", label: dictionary.libraryTitle, required: true },
                { key: "description", label: dictionary.libraryDescription, type: "textarea" },
                {
                  key: "category",
                  label: dictionary.libraryCategory,
                  type: "select",
                  options: [
                    { label: dictionary.libraryCategoryHandout, value: "handout" },
                    { label: dictionary.libraryCategoryWorksheet, value: "worksheet" },
                    { label: dictionary.libraryCategoryPastExam, value: "past_exam" },
                    { label: dictionary.libraryCategoryRecording, value: "recording" },
                    { label: dictionary.libraryCategoryOther, value: "other" }
                  ]
                },
                {
                  key: "status",
                  label: dictionary.status,
                  type: "select",
                  options: [
                    { label: dictionary.statusActive, value: "active" },
                    { label: dictionary.libraryStatusArchived, value: "archived" }
                  ]
                }
              ],
              fromRow: (row) => ({
                title: String(row.title ?? ""),
                description: String(row.description ?? ""),
                category: String(row.category ?? "handout"),
                status: String(row.status ?? "active")
              })
            }
          : undefined
      }
      renderDetailExtra={(row) => {
        const characters = Array.isArray(row.characters)
          ? row.characters.map((item) => characterLabel(String(item)))
          : [];
        return (
          <div className="library-detail">
            {row.description ? <p>{String(row.description)}</p> : null}
            <dl className="record-details">
              <div>
                <dt>{dictionary.colOrganization}</dt>
                <dd>{displayName(row.organization_name, "—")}</dd>
              </div>
              <div>
                <dt>{dictionary.colClass}</dt>
                <dd>{displayName(row.classroom_name, dictionary.libraryAllClasses)}</dd>
              </div>
              <div>
                <dt>{dictionary.colSubject}</dt>
                <dd>{displayName(row.subject_name, "—")}</dd>
              </div>
              <div>
                <dt>{dictionary.libraryCategory}</dt>
                <dd>
                  <Badge
                    value={String(row.category ?? "")}
                    label={categoryLabel(String(row.category ?? ""), dictionary)}
                  />
                </dd>
              </div>
              <div>
                <dt>{dictionary.libraryFileName}</dt>
                <dd>{displayName(row.original_filename, "—")}</dd>
              </div>
              <div>
                <dt>{dictionary.colSize}</dt>
                <dd>
                  {formatBytes(row.file_size)}
                  {row.extension ? ` · ${String(row.extension).toUpperCase()}` : ""}
                </dd>
              </div>
              <div>
                <dt>{dictionary.status}</dt>
                <dd>
                  <Badge value={row.status} />
                </dd>
              </div>
              <div>
                <dt>{dictionary.libraryUploadedBy}</dt>
                <dd>{displayName(row.uploaded_by_name, "—")}</dd>
              </div>
              {characters.length ? (
                <div>
                  <dt>{dictionary.libraryCharacters}</dt>
                  <dd>{characters.join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
            <div className="library-detail__actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void downloadItem(row, dictionary).catch((reason) => {
                    if (isUnauthorizedError(reason)) return;
                    toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
                  });
                }}
              >
                {dictionary.libraryDownload}
              </Button>
            </div>
          </div>
        );
      }}
      filters={[
        {
          key: "category",
          label: dictionary.libraryCategory,
          options: [
            { label: dictionary.libraryCategoryHandout, value: "handout" },
            { label: dictionary.libraryCategoryWorksheet, value: "worksheet" },
            { label: dictionary.libraryCategoryPastExam, value: "past_exam" },
            { label: dictionary.libraryCategoryRecording, value: "recording" },
            { label: dictionary.libraryCategoryOther, value: "other" }
          ]
        },
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusActive, value: "active" },
            { label: dictionary.libraryStatusArchived, value: "archived" }
          ]
        },
        ...(classOptions.length
          ? [{ key: "classroom", label: dictionary.colClass, options: classOptions }]
          : []),
        ...(organizationOptions.length > 1
          ? [{ key: "organization", label: dictionary.colOrganization, options: organizationOptions }]
          : [])
      ]}
      columns={[
        { key: "title", label: dictionary.libraryTitle, mobile: "title" },
        {
          key: "classroom_name",
          label: dictionary.colClass,
          mobile: true,
          render: (row) => displayName(row.classroom_name, dictionary.libraryAllClasses)
        },
        { key: "organization_name", label: dictionary.colOrganization },
        { key: "subject_name", label: dictionary.colSubject },
        {
          key: "category",
          label: dictionary.libraryCategory,
          mobile: true,
          render: (row) => {
            const value = String(row.category ?? "");
            return <Badge value={value} label={categoryLabel(value, dictionary)} />;
          }
        },
        {
          key: "original_filename",
          label: dictionary.libraryFileName,
          render: (row) => displayName(row.original_filename, "—")
        },
        {
          key: "file_size",
          label: dictionary.colSize,
          render: (row) => formatBytes(row.file_size)
        },
        {
          key: "uploaded_by_name",
          label: dictionary.libraryUploadedBy,
          render: (row) => displayName(row.uploaded_by_name, "—")
        },
        {
          key: "characters",
          label: dictionary.libraryCharacters,
          render: (row) =>
            Array.isArray(row.characters) && row.characters.length
              ? row.characters.map((item) => characterLabel(String(item))).join(" · ")
              : "—"
        },
        { key: "status", label: dictionary.status, type: "status", mobile: true },
        { key: "created_at", label: dictionary.colCreated, type: "date" }
      ]}
      emptyState={{
        title: dictionary.noLibraryItems,
        description: dictionary.classLibraryDesc
      }}
      mobileCards
    />
  );
}
