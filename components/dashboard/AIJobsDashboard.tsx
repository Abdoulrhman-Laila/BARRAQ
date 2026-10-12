"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ResourcePage } from "@/components/data/ResourcePage";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { api } from "@/lib/api/client";
import { aiJobCancelEndpoint, endpoints } from "@/lib/api/endpoints";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";
import type { AnyRecord } from "@/types/api";

interface Metrics {
  total: number;
  by_status: Array<{ status: string; count: number }>;
  by_character: Array<{ character: string; count: number }>;
  feedback_count: number;
  average_rating: number | null;
}

const emptyMetrics: Metrics = {
  total: 0,
  by_status: [],
  by_character: [],
  feedback_count: 0,
  average_rating: null
};

const jobStatuses = [
  "created",
  "queued",
  "submitted",
  "processing",
  "validating",
  "completed",
  "failed",
  "canceled"
] as const;

function normalizeMetrics(payload: Partial<Metrics> | null | undefined): Metrics {
  return {
    total: Number(payload?.total ?? 0),
    by_status: Array.isArray(payload?.by_status) ? payload.by_status : [],
    by_character: Array.isArray(payload?.by_character) ? payload.by_character : [],
    feedback_count: Number(payload?.feedback_count ?? 0),
    average_rating: typeof payload?.average_rating === "number" ? payload.average_rating : null
  };
}

/** Product character names stay brand-fixed. */
const characters = [
  { id: "fahes", name: "فاحص", image: "/brand/characters/fahes-removebg-preview.png", tone: "blue" },
  { id: "khota", name: "خُطى", image: "/brand/characters/khota-removebg-preview.png", tone: "red" },
  { id: "rasheed", name: "رشيد", image: "/brand/characters/rasheed-removebg-preview.png", tone: "green" },
  { id: "kholasa", name: "خُلاصة", image: "/brand/characters/kholasa-removebg-preview.png", tone: "pink" },
  { id: "sada", name: "صدى", image: "/brand/characters/sada-removebg-preview.png", tone: "purple" }
];

function characterName(id: unknown): string {
  const match = characters.find((item) => item.id === id);
  return match?.name ?? (id ? String(id) : "—");
}

function jobStatusLabel(status: string, dictionary: Dictionary): string {
  switch (status) {
    case "created":
      return dictionary.jobStatusCreated;
    case "queued":
      return dictionary.jobStatusQueued;
    case "submitted":
      return dictionary.jobStatusSubmitted;
    case "processing":
      return dictionary.jobStatusProcessing;
    case "validating":
      return dictionary.jobStatusValidating;
    case "completed":
      return dictionary.completedLabel;
    case "failed":
      return dictionary.failedLabel;
    case "canceled":
      return dictionary.jobStatusCanceled;
    default:
      return status || "—";
  }
}

function formatWhen(value: unknown, localeTag: string): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

function displayOrDash(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "—";
}

export function AIJobsDashboard() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";

  const metricsQuery = useQuery({
    queryKey: dashboardKeys.aiJobMetrics,
    queryFn: async () => {
      const response = await api.get<Partial<Metrics>>(endpoints.admin.aiJobMetrics);
      return normalizeMetrics(response.data);
    },
    retry: false
  });

  const metrics = metricsQuery.isError ? null : (metricsQuery.data ?? null);
  const safe = metrics ?? emptyMetrics;
  const counts = new Map(safe.by_character.map((item) => [item.character, item.count]));

  return (
    <>
      <div className="character-grid">
        {characters.map((character) => (
          <Card key={character.id} interactive className={`character-card character-card--${character.tone}`}>
            <Image src={character.image} alt={character.name} width={92} height={92} />
            <div>
              <span>{character.name}</span>
              <strong>{(counts.get(character.id) ?? 0).toLocaleString(numberLocale)}</strong>
              <small>{dictionary.recordedJobs}</small>
            </div>
          </Card>
        ))}
      </div>
      {metrics ? (
        <Card className="ai-metrics-strip">
          <div>
            <span>{dictionary.totalJobs}</span>
            <strong>{safe.total.toLocaleString(numberLocale)}</strong>
          </div>
          <div>
            <span>{dictionary.feedbackCount}</span>
            <strong>{safe.feedback_count.toLocaleString(numberLocale)}</strong>
          </div>
          <div>
            <span>{dictionary.avgSatisfaction}</span>
            <strong>{safe.average_rating ? `${safe.average_rating.toFixed(2)} / 5` : "—"}</strong>
          </div>
          <div className="status-summary">
            {safe.by_status.map((item) => (
              <Badge
                key={item.status}
                value={item.status}
                label={`${jobStatusLabel(item.status, dictionary)}: ${item.count}`}
              />
            ))}
          </div>
        </Card>
      ) : null}
      <ResourcePage
        title={dictionary.aiJobs}
        description={dictionary.aiJobsDesc}
        endpoint={endpoints.admin.aiJobs}
        hydrateDetail
        hideDefaultDetail
        detailTitle={(row) =>
          `${characterName(row.character)}${row.task_type ? ` · ${String(row.task_type)}` : ""}`
        }
        renderDetailExtra={(job: AnyRecord) => {
          const publicId = String(job.public_id ?? "");
          const externalId = String(job.external_job_id ?? "").trim();
          return (
            <div className="job-detail">
              <header className="job-detail__head">
                <h3>{characterName(job.character)}</h3>
                <Badge
                  value={job.status}
                  label={jobStatusLabel(String(job.status ?? ""), dictionary)}
                />
              </header>
              <div className="job-detail__stats">
                <div className="student-detail__stat">
                  <span>{dictionary.taskType}</span>
                  <strong>{displayOrDash(job.task_type)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.resultType}</span>
                  <strong>{displayOrDash(job.result_type)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.errorCode}</span>
                  <strong>{displayOrDash(job.error_code)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.createdAt}</span>
                  <strong>{formatWhen(job.created_at, numberLocale)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.completedAt}</span>
                  <strong>{formatWhen(job.completed_at, numberLocale)}</strong>
                </div>
              </div>
              {publicId || externalId ? (
                <div className="job-detail__copy">
                  {publicId ? (
                    <div className="job-detail__copy-row">
                      <span>{dictionary.jobId}</span>
                      <CopyButton value={publicId} label={dictionary.copy} />
                    </div>
                  ) : null}
                  {externalId ? (
                    <div className="job-detail__copy-row">
                      <span>{dictionary.externalJobId}</span>
                      <CopyButton value={externalId} label={dictionary.copy} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        }}
        filters={[
          {
            key: "status",
            label: dictionary.status,
            options: jobStatuses.map((value) => ({
              label: jobStatusLabel(value, dictionary),
              value
            }))
          },
          {
            key: "character",
            label: dictionary.character,
            options: characters.map((item) => ({ label: item.name, value: item.id }))
          }
        ]}
        columns={[
          {
            key: "character",
            label: dictionary.character,
            mobile: "title",
            render: (row) => characterName(row.character)
          },
          { key: "task_type", label: dictionary.taskType, mobile: true },
          {
            key: "status",
            label: dictionary.status,
            mobile: true,
            render: (row) => (
              <Badge
                value={row.status}
                label={jobStatusLabel(String(row.status ?? ""), dictionary)}
              />
            )
          },
          {
            key: "result_type",
            label: dictionary.resultType,
            render: (row) => displayOrDash(row.result_type)
          },
          {
            key: "error_code",
            label: dictionary.errorCode,
            render: (row) => displayOrDash(row.error_code)
          },
          { key: "created_at", label: dictionary.createdAt, type: "date" },
          { key: "completed_at", label: dictionary.completedAt, type: "date" }
        ]}
        mobileCards
        rowActions={[
          {
            label: dictionary.cancelJob,
            variant: "danger",
            visible: (row) => !["completed", "failed", "canceled"].includes(String(row.status)),
            endpoint: (row) => aiJobCancelEndpoint(String(row.public_id)),
            confirm: dictionary.cancelJobConfirm,
            successToast: dictionary.aiJobCancelled
          }
        ]}
      />
    </>
  );
}
