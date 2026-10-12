"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/normalize";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";
import type { AnyRecord, SystemHealth } from "@/types/api";

export function SystemHealthDashboard() {
  const dictionary = useDictionary();
  const queryClient = useQueryClient();

  const systemQuery = useQuery({
    queryKey: dashboardKeys.systemHealth,
    queryFn: async () => {
      const response = await api.get<SystemHealth>(endpoints.admin.health);
      return response.data;
    },
    retry: (failureCount, reason) => {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) return false;
      return failureCount < 1;
    }
  });

  const aiQuery = useQuery({
    queryKey: dashboardKeys.aiServiceHealth,
    queryFn: async () => {
      const response = await api.get<AnyRecord>(endpoints.ai.serviceHealth);
      return response.data;
    },
    retry: 1
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.systemHealth });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.aiServiceHealth });
  }, [queryClient]);

  // Match prior allSettled UX: wait until both requests finish (including refresh).
  const loading = systemQuery.isFetching || aiQuery.isFetching;

  const health = systemQuery.data ?? null;
  let error: string | null = null;
  if (systemQuery.error) {
    const reason = systemQuery.error;
    if (reason instanceof ApiError && reason.status === 401) {
      error = null;
    } else if (reason instanceof ApiError && reason.status === 403) {
      error = dictionary.httpForbidden;
    } else {
      error = reason instanceof Error ? reason.message : dictionary.systemCheckFailed;
    }
  }

  const aiHealth = aiQuery.data ?? null;
  const aiHealthError = aiQuery.error
    ? aiQuery.error instanceof Error
      ? aiQuery.error.message
      : dictionary.aiServiceUnreachable
    : null;

  const healthy =
    health && [health.database, health.cache, health.storage].every((value) => value.toLowerCase() === "healthy");

  return (
    <>
      <PageHeader
        title={dictionary.system}
        description={dictionary.systemDesc}
        actions={
          <Button variant="secondary" onClick={reload}>
            <Icon name="refresh" />
            {dictionary.checkNow}
          </Button>
        }
      />
      {loading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : error || !health ? (
        <ErrorState message={error ?? dictionary.statusLoadFailed} onRetry={reload} />
      ) : (
        <div className="system-layout">
          <Card className="system-hero">
            <div className="system-hero__icon">
              <Icon name="health" />
            </div>
            <div>
              <span className="eyebrow">{dictionary.platformStatus}</span>
              <h2>{healthy ? dictionary.systemsHealthy : dictionary.systemsNeedAttention}</h2>
              <p>
                {health.app_name} • {health.app_version} • {health.environment}
              </p>
            </div>
            <Badge value={healthy ? "healthy" : "degraded"} />
          </Card>
          <div className="system-cards">
            {(
              [
                { label: dictionary.database, value: health.database, detail: dictionary.databaseDetail },
                { label: "Redis / Cache", value: health.cache, detail: dictionary.cacheDetail },
                { label: dictionary.storage, value: health.storage, detail: dictionary.storageDetail },
                {
                  label: dictionary.aiService,
                  value: health.ai_service_enabled ? "active" : "inactive",
                  detail: dictionary.aiServiceDetail
                }
              ] as const
            ).map((item) => (
              <Card key={item.label} interactive className="health-card">
                <div>
                  <span className={`health-dot health-dot--${item.value.toLowerCase()}`} />
                  <h3>{item.label}</h3>
                </div>
                <Badge value={item.value} />
                <p>{item.detail}</p>
              </Card>
            ))}
          </div>

          <Card className="configuration-card">
            <header>
              <h2>{dictionary.aiServiceHealthTitle}</h2>
              <span>{dictionary.aiServiceHealthDesc}</span>
            </header>
            {aiHealthError ? (
              <p className="inline-error" role="alert">
                {dictionary.aiServiceUnreachable}: {aiHealthError}
              </p>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>{dictionary.aiServiceReachable}</p>
                <dl>
                  {Object.entries(aiHealth ?? {}).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Card>

          <Card className="configuration-card">
            <header>
              <h2>{dictionary.envDetails}</h2>
              <span>{dictionary.nonSensitiveData}</span>
            </header>
            <dl>
              <div>
                <dt>{dictionary.appNameLabel}</dt>
                <dd>{health.app_name}</dd>
              </div>
              <div>
                <dt>{dictionary.versionLabel}</dt>
                <dd>{health.app_version}</dd>
              </div>
              <div>
                <dt>{dictionary.phaseLabel}</dt>
                <dd>{health.app_phase}</dd>
              </div>
              <div>
                <dt>{dictionary.environmentLabel}</dt>
                <dd>{health.environment}</dd>
              </div>
              <div>
                <dt>{dictionary.debugLabel}</dt>
                <dd>{health.debug ? dictionary.enabled : dictionary.disabled}</dd>
              </div>
              <div>
                <dt>{dictionary.allowedHosts}</dt>
                <dd>{health.allowed_hosts_count}</dd>
              </div>
              <div>
                <dt>{dictionary.mediaRoot}</dt>
                <dd>{health.media_root_exists && health.media_root_writable ? dictionary.mediaReady : dictionary.mediaNeedsAttention}</dd>
              </div>
              <div>
                <dt>{dictionary.staticRoot}</dt>
                <dd>{health.static_root_exists ? dictionary.exists : dictionary.missing}</dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </>
  );
}
