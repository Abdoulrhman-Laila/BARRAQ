"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, type CSSProperties } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";
import type { Overview } from "@/types/api";

function Ring({ value, label }: { value: number; label: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className="ring" style={{ "--ring-value": `${safe * 3.6}deg` } as CSSProperties}>
      <div>
        <strong>{safe.toFixed(0)}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function OverviewDashboard() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: async () => {
      const response = await api.get<Overview>(endpoints.admin.overview);
      return response.data;
    },
    retry: (failureCount, reason) => {
      if (isUnauthorizedError(reason)) return false;
      return failureCount < 1;
    }
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
  }, [queryClient]);

  const loading = result.isFetching;
  const data = result.data ?? null;
  const error =
    result.error && !isUnauthorizedError(result.error)
      ? result.error instanceof Error
        ? result.error.message
        : dictionary.overviewLoadFailed
      : null;

  if (loading) {
    return (
      <>
        <PageHeader title={dictionary.overview} description={dictionary.overviewDesc} />
        <Card>
          <LoadingState />
        </Card>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title={dictionary.overview} description={dictionary.overviewDesc} />
        <ErrorState message={error ?? dictionary.noData} onRetry={reload} />
      </>
    );
  }

  const completionRate = data.ai_jobs_count ? (data.ai_jobs_completed_count / data.ai_jobs_count) * 100 : 0;
  const failureRate = data.ai_jobs_count ? (data.ai_jobs_failed_count / data.ai_jobs_count) * 100 : 0;
  const activeRate = data.subscriptions_count ? ((data.active_subscriptions_count ?? 0) / data.subscriptions_count) * 100 : 0;
  const maxPlan = Math.max(1, ...data.subscriptions_by_plan.map((item) => item.count));

  return (
    <>
      <PageHeader
        title={dictionary.commandCenterTitle}
        description={dictionary.commandCenterDesc}
        actions={
          <Button variant="secondary" onClick={reload}>
            <Icon name="refresh" />
            {dictionary.refreshData}
          </Button>
        }
      />
      <div className="metrics-grid">
        <MetricCard
          title={dictionary.metricUsers}
          value={data.users_count}
          detail={`${data.new_users_this_week} ${dictionary.metricUsersDetail}`}
          icon="users"
          tone="purple"
        />
        <MetricCard
          title={dictionary.metricSources}
          value={data.sources_count}
          detail={`${data.new_sources_this_week} ${dictionary.metricSourcesDetail}`}
          icon="file"
          tone="green"
        />
        <MetricCard
          title={dictionary.metricQuizzes}
          value={data.quizzes_count}
          detail={`${data.quiz_attempts_count} ${dictionary.metricQuizzesDetail}`}
          icon="quiz"
          tone="blue"
        />
        <MetricCard
          title={dictionary.metricAiJobs}
          value={data.ai_jobs_count}
          detail={`${data.ai_jobs_pending_count} ${dictionary.metricAiJobsDetail}`}
          icon="spark"
          tone="pink"
        />
        <MetricCard
          title={dictionary.metricSubscriptions}
          value={data.active_subscriptions_count ?? 0}
          detail={`${data.subscriptions_count} ${dictionary.metricSubscriptionsDetail}`}
          icon="credit"
          tone="gold"
        />
        <MetricCard
          title={dictionary.metricSupport}
          value={data.open_support_tickets_count}
          detail={`${data.support_tickets_count} ${dictionary.metricSupportDetail}`}
          icon="support"
          tone="red"
        />
      </div>
      <div className="overview-grid">
        <Card className="panel panel--wide">
          <header className="panel__header">
            <div>
              <span className="eyebrow">{dictionary.aiOpsEyebrow}</span>
              <h2>{dictionary.aiOpsTitle}</h2>
            </div>
            <Badge
              value={data.system_health.ai_service_enabled ? "active" : "inactive"}
              label={data.system_health.ai_service_enabled ? dictionary.serviceEnabled : dictionary.serviceDisabled}
            />
          </header>
          <div className="ai-performance">
            <Ring value={completionRate} label={dictionary.successRate} />
            <Ring value={100 - failureRate} label={dictionary.executionSafety} />
            <Ring value={((data.ai_average_rating ?? 0) / 5) * 100} label={dictionary.userSatisfaction} />
            <div className="ai-stats">
              <div>
                <span>{dictionary.completedLabel}</span>
                <strong>{data.ai_jobs_completed_count.toLocaleString(numberLocale)}</strong>
              </div>
              <div>
                <span>{dictionary.pendingLabel}</span>
                <strong>{data.ai_jobs_pending_count.toLocaleString(numberLocale)}</strong>
              </div>
              <div>
                <span>{dictionary.failedLabel}</span>
                <strong>{data.ai_jobs_failed_count.toLocaleString(numberLocale)}</strong>
              </div>
              <div>
                <span>{dictionary.ratingsLabel}</span>
                <strong>{data.ai_feedback_count.toLocaleString(numberLocale)}</strong>
              </div>
            </div>
          </div>
        </Card>
        <Card className="panel">
          <header className="panel__header">
            <div>
              <span className="eyebrow">{dictionary.systemHealthEyebrow}</span>
              <h2>{dictionary.systemComponentsTitle}</h2>
            </div>
          </header>
          <div className="health-list">
            {(
              [
                [dictionary.database, data.system_health.database],
                [dictionary.cache, data.system_health.cache],
                [dictionary.storage, data.system_health.storage],
                [dictionary.aiService, data.system_health.ai_service_enabled ? "healthy" : "inactive"]
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <span className={`health-dot health-dot--${String(value).toLowerCase()}`} />
                <span>{label}</span>
                <Badge value={value} />
              </div>
            ))}
          </div>
          <footer className="panel__footer">
            <span>
              {dictionary.environmentLabel}: {data.system_health.environment}
            </span>
            <span>
              {dictionary.versionLabel}: {data.system_health.app_version}
            </span>
          </footer>
        </Card>
        <Card className="panel">
          <header className="panel__header">
            <div>
              <span className="eyebrow">{dictionary.subscriptionsEyebrow}</span>
              <h2>{dictionary.subscriptionsTitle}</h2>
            </div>
            <strong>
              {activeRate.toFixed(0)}% {dictionary.activePercent}
            </strong>
          </header>
          <div className="bar-chart">
            {data.subscriptions_by_plan.map((item) => (
              <div key={item.plan__code}>
                <div>
                  <span>{item.plan__name}</span>
                  <strong>{item.count}</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${(item.count / maxPlan) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="panel">
          <header className="panel__header">
            <div>
              <span className="eyebrow">{dictionary.activityEyebrow}</span>
              <h2>{dictionary.activityTitle}</h2>
            </div>
          </header>
          <div className="activity-grid">
            <div>
              <strong>{data.study_plans_count.toLocaleString(numberLocale)}</strong>
              <span>{dictionary.studyPlanUnit}</span>
            </div>
            <div>
              <strong>{data.collections_count.toLocaleString(numberLocale)}</strong>
              <span>{dictionary.sourceFolderUnit}</span>
            </div>
            <div>
              <strong>{data.character_interactions_count.toLocaleString(numberLocale)}</strong>
              <span>{dictionary.characterInteractionUnit}</span>
            </div>
            <div>
              <strong>{data.unread_notifications_count.toLocaleString(numberLocale)}</strong>
              <span>{dictionary.unreadNotificationUnit}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
