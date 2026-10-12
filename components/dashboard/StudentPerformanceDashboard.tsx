"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ResourcePage } from "@/components/data/ResourcePage";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";
import type { AnyRecord } from "@/types/api";

interface NamedEntity {
  public_id: string;
  name: string;
}

interface Paginated<T> {
  results?: T[];
}

interface PerformanceSummary {
  period_days: number;
  students_count: number;
  active_students: number;
  needs_attention: number;
  quizzes_submitted: number;
  average_score: number | null;
  ai_requests: number;
  ai_completed: number;
  ai_failed: number;
  ai_by_character: Record<string, number>;
  score_distribution: Record<string, number>;
}

const emptySummary: PerformanceSummary = {
  period_days: 30,
  students_count: 0,
  active_students: 0,
  needs_attention: 0,
  quizzes_submitted: 0,
  average_score: null,
  ai_requests: 0,
  ai_completed: 0,
  ai_failed: 0,
  ai_by_character: {},
  score_distribution: {}
};

const characterNames: Record<string, string> = {
  fahes: "فاحص",
  khota: "خُطى",
  rasheed: "رشيد",
  kholasa: "خُلاصة",
  sada: "صدى"
};

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : null;
}

function placementList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = asRecord(item);
      return row ? String(row.name ?? "") : "";
    })
    .filter(Boolean);
}

function placementNames(value: unknown, empty: string): string {
  return placementList(value).join(" · ") || empty;
}

function formatScore(value: unknown, localeTag: string): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(localeTag, { maximumFractionDigits: 1 })}%`;
}

function formatWhen(value: unknown, localeTag: string): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

function normalizeSummary(payload: Partial<PerformanceSummary> | null | undefined): PerformanceSummary {
  return {
    period_days: Number(payload?.period_days ?? 30),
    students_count: Number(payload?.students_count ?? 0),
    active_students: Number(payload?.active_students ?? 0),
    needs_attention: Number(payload?.needs_attention ?? 0),
    quizzes_submitted: Number(payload?.quizzes_submitted ?? 0),
    average_score: typeof payload?.average_score === "number" ? payload.average_score : null,
    ai_requests: Number(payload?.ai_requests ?? 0),
    ai_completed: Number(payload?.ai_completed ?? 0),
    ai_failed: Number(payload?.ai_failed ?? 0),
    ai_by_character:
      payload?.ai_by_character && typeof payload.ai_by_character === "object" ? payload.ai_by_character : {},
    score_distribution:
      payload?.score_distribution && typeof payload.score_distribution === "object"
        ? payload.score_distribution
        : {}
  };
}

export function StudentPerformanceDashboard() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : "ar-SY";
  const [organizations, setOrganizations] = useState<NamedEntity[]>([]);
  const [classrooms, setClassrooms] = useState<NamedEntity[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Paginated<NamedEntity>>(endpoints.admin.organizations, { page_size: 100 })
      .then((response) => {
        if (!cancelled) {
          const data = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
          setOrganizations(data);
        }
      })
      .catch(() => {
        if (!cancelled) setOrganizations([]);
      });
    api
      .get<Paginated<NamedEntity>>(endpoints.admin.classes, { page_size: 100 })
      .then((response) => {
        if (!cancelled) {
          const data = Array.isArray(response.data) ? response.data : response.data?.results ?? [];
          setClassrooms(data);
        }
      })
      .catch(() => {
        if (!cancelled) setClassrooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summaryQuery = useQuery({
    queryKey: dashboardKeys.studentPerformanceSummary,
    queryFn: async () => {
      const response = await api.get<Partial<PerformanceSummary>>(endpoints.admin.studentPerformanceSummary);
      return normalizeSummary(response.data);
    },
    retry: false
  });

  const summary = summaryQuery.isError ? null : (summaryQuery.data ?? null);
  const safe = summary ?? emptySummary;

  const organizationOptions = organizations.map((organization) => ({
    label: organization.name,
    value: organization.public_id
  }));
  const classroomOptions = classrooms.map((classroom) => ({
    label: classroom.name,
    value: classroom.public_id
  }));

  return (
    <>
      {summary ? (
        <div className="metrics-grid">
          <MetricCard
            title={dictionary.studentsCount}
            value={safe.students_count.toLocaleString(localeTag)}
            detail={`${dictionary.periodDays}: ${safe.period_days}`}
            icon="users"
            tone="purple"
          />
          <MetricCard
            title={dictionary.activeStudents}
            value={safe.active_students.toLocaleString(localeTag)}
            detail={dictionary.ofStudents}
            icon="users"
            tone="green"
          />
          <MetricCard
            title={dictionary.needsAttention}
            value={safe.needs_attention.toLocaleString(localeTag)}
            detail={dictionary.ofStudents}
            icon="support"
            tone="red"
          />
          <MetricCard
            title={dictionary.averageScore}
            value={formatScore(safe.average_score, localeTag)}
            detail={dictionary.inThisPeriod}
            icon="quiz"
            tone="blue"
          />
          <MetricCard
            title={dictionary.quizzesSubmitted}
            value={safe.quizzes_submitted.toLocaleString(localeTag)}
            detail={dictionary.inThisPeriod}
            icon="quiz"
            tone="gold"
          />
          <MetricCard
            title={dictionary.aiRequests}
            value={safe.ai_requests.toLocaleString(localeTag)}
            detail={`${safe.ai_completed.toLocaleString(localeTag)} ${dictionary.aiCompletedOf}`}
            icon="spark"
            tone="pink"
          />
        </div>
      ) : null}
      <ResourcePage
        title={dictionary.studentPerformance}
        description={dictionary.studentPerformanceDesc}
        endpoint={endpoints.admin.studentPerformance}
        hydrateDetail
        hideDefaultDetail
        detailTitle={(row) => String(row.full_name || dictionary.recordDetails)}
        defaultOrdering="-last_ai"
        orderingOptions={[
          { label: dictionary.orderByLastAi, value: "-last_ai" },
          { label: dictionary.orderByLastQuiz, value: "-last_quiz" },
          { label: dictionary.orderByScore, value: "-score" },
          { label: dictionary.orderByAi, value: "-ai" },
          { label: dictionary.orderByName, value: "name" }
        ]}
        filters={[
          {
            key: "days",
            label: dictionary.periodDays,
            options: [
              { label: dictionary.days7, value: "7" },
              { label: dictionary.days30, value: "30" },
              { label: dictionary.days90, value: "90" }
            ]
          },
          ...(organizationOptions.length > 1
            ? [{ key: "organization", label: dictionary.colOrganization, options: organizationOptions }]
            : []),
          ...(classroomOptions.length > 1
            ? [{ key: "classroom", label: dictionary.colClass, options: classroomOptions }]
            : [])
        ]}
        columns={[
          { key: "full_name", label: dictionary.colName, mobile: "title" },
          { key: "email", label: dictionary.email, mobile: true },
          {
            key: "organizations",
            label: dictionary.colOrganization,
            render: (row) => placementNames(row.organizations, "—")
          },
          {
            key: "classes",
            label: dictionary.colClass,
            mobile: true,
            render: (row) => placementNames(row.classes, "—")
          },
          {
            key: "average_score",
            label: dictionary.averageScore,
            mobile: true,
            render: (row) => formatScore(row.average_score, localeTag)
          },
          {
            key: "quizzes_submitted",
            label: dictionary.quizzesSubmitted,
            type: "number"
          },
          {
            key: "ai_requests",
            label: dictionary.aiRequests,
            type: "number"
          },
          {
            key: "needs_attention",
            label: dictionary.needsAttention,
            mobile: true,
            render: (row) =>
              row.needs_attention ? (
                <Badge value="attention" label={dictionary.yes} />
              ) : (
                <span className="muted">{dictionary.no}</span>
              )
          },
          {
            key: "last_activity_at",
            label: dictionary.lastActivity,
            type: "date"
          }
        ]}
        detailOmitKeys={[
          "ai_by_character",
          "recent_attempts",
          "recent_ai_activity",
          "organizations",
          "classes",
          "score_distribution"
        ]}
        renderDetailExtra={(row) => {
          const orgs = placementList(row.organizations);
          const classes = placementList(row.classes);
          const characterCounts = asRecord(row.ai_by_character) ?? {};
          const attempts = Array.isArray(row.recent_attempts) ? row.recent_attempts : [];
          const aiActivity = Array.isArray(row.recent_ai_activity) ? row.recent_ai_activity : [];
          const initial = String(row.full_name ?? row.email ?? "?").trim().slice(0, 1);

          return (
            <div className="student-detail">
              <header className="student-detail__head">
                <div className="student-detail__avatar" aria-hidden="true">
                  {initial}
                </div>
                <div>
                  <h3>{String(row.full_name || "—")}</h3>
                  <p>{String(row.email || "—")}</p>
                  {row.needs_attention ? (
                    <div className="student-detail__flag">
                      <Badge value="attention" label={dictionary.needsAttention} />
                    </div>
                  ) : null}
                </div>
              </header>

              <div className="student-detail__stats">
                <div className="student-detail__stat">
                  <span>{dictionary.averageScore}</span>
                  <strong>{formatScore(row.average_score, localeTag)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.quizzesSubmitted}</span>
                  <strong>{Number(row.quizzes_submitted ?? 0).toLocaleString(localeTag)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.aiRequests}</span>
                  <strong>{Number(row.ai_requests ?? 0).toLocaleString(localeTag)}</strong>
                </div>
                <div className="student-detail__stat">
                  <span>{dictionary.lastActivity}</span>
                  <strong>{formatWhen(row.last_activity_at, localeTag)}</strong>
                </div>
              </div>

              <div>
                <h4>{dictionary.colOrganization}</h4>
                <div className="student-detail__chips">
                  {orgs.length ? (
                    orgs.map((name) => (
                      <span key={name} className="student-detail__chip">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>
              <div>
                <h4>{dictionary.colClass}</h4>
                <div className="student-detail__chips">
                  {classes.length ? (
                    classes.map((name) => (
                      <span key={name} className="student-detail__chip">
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
              </div>

              {Object.keys(characterCounts).length ? (
                <div>
                  <h4>{dictionary.byCharacter}</h4>
                  <div className="student-detail__chips">
                    {Object.entries(characterCounts).map(([id, count]) => (
                      <span key={id} className="student-detail__chip">
                        {characterNames[id] ?? id} · {Number(count).toLocaleString(localeTag)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="student-detail__grid">
                <section className="student-detail__section">
                  <h4>{dictionary.recentAttempts}</h4>
                  {attempts.length ? (
                    attempts.map((item, index) => {
                      const attempt = asRecord(item);
                      if (!attempt) return null;
                      return (
                        <article
                          key={`${String(attempt.quiz_title ?? "attempt")}-${index}`}
                          className="student-detail__item"
                        >
                          <strong>{String(attempt.quiz_title ?? "—")}</strong>
                          <small>
                            {[attempt.subject ? String(attempt.subject) : null, formatScore(attempt.percentage, localeTag)]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </article>
                      );
                    })
                  ) : (
                    <p className="student-detail__empty">{dictionary.noRecentAttempts}</p>
                  )}
                </section>
                <section className="student-detail__section">
                  <h4>{dictionary.recentAiActivity}</h4>
                  {aiActivity.length ? (
                    aiActivity.map((item, index) => {
                      const activity = asRecord(item);
                      if (!activity) return null;
                      const character = String(activity.character ?? "");
                      return (
                        <article key={`${character}-${index}`} className="student-detail__item">
                          <strong>{(characterNames[character] ?? character) || "—"}</strong>
                          <small>
                            {[
                              activity.task_type ? String(activity.task_type) : null,
                              activity.status ? String(activity.status) : null,
                              formatWhen(activity.created_at, localeTag)
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </article>
                      );
                    })
                  ) : (
                    <p className="student-detail__empty">{dictionary.noRecentAi}</p>
                  )}
                </section>
              </div>
            </div>
          );
        }}
        emptyState={{
          title: dictionary.studentPerformanceEmpty,
          description: dictionary.studentPerformanceEmptyDesc
        }}
        mobileCards
      />
    </>
  );
}
