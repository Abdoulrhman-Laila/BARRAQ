"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { dashboardKeys } from "@/lib/query/keys";

interface DailyPoint {
  date: string;
  job_count: number;
  cost_usd: number;
  total_tokens: number;
}

interface CharacterUsage {
  character: string;
  job_count: number;
  cost_usd: number;
  total_tokens: number;
}

interface UsageSummary {
  range_days: number;
  totals: {
    job_count: number;
    completed_count: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  month_to_date: { year_month: string; job_count: number; cost_usd: number };
  daily: DailyPoint[];
  by_character: CharacterUsage[];
}

const emptySummary: UsageSummary = {
  range_days: 30,
  totals: { job_count: 0, completed_count: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 },
  month_to_date: { year_month: "", job_count: 0, cost_usd: 0 },
  daily: [],
  by_character: []
};

const characterLabels: Record<string, string> = {
  fahes: "فاحص",
  khota: "خُطى",
  rasheed: "رشيد",
  kholasa: "خُلاصة",
  sada: "صدى"
};

function normalize(payload: Partial<UsageSummary> | null | undefined): UsageSummary {
  return {
    range_days: Number(payload?.range_days ?? emptySummary.range_days),
    totals: { ...emptySummary.totals, ...(payload?.totals ?? {}) },
    month_to_date: { ...emptySummary.month_to_date, ...(payload?.month_to_date ?? {}) },
    daily: Array.isArray(payload?.daily) ? payload.daily : [],
    by_character: Array.isArray(payload?.by_character) ? payload.by_character : []
  };
}

export function AIUsageDashboard() {
  const dictionary = useDictionary();
  const locale = useLocale();
  const numberLocale = locale === "en" ? "en-US" : "ar-SY";
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: dashboardKeys.aiUsage,
    queryFn: async () => {
      const response = await api.get<Partial<UsageSummary>>(endpoints.admin.aiUsage, { days: 30 });
      return normalize(response.data);
    },
    retry: (failureCount, reason) => {
      if (isUnauthorizedError(reason)) return false;
      return failureCount < 1;
    }
  });

  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.aiUsage });
  }, [queryClient]);

  const loading = result.isFetching;
  const error =
    result.error && !isUnauthorizedError(result.error)
      ? result.error instanceof Error
        ? result.error.message
        : dictionary.loadFailed
      : null;

  if (loading) {
    return (
      <>
        <PageHeader title={dictionary.aiUsage} description={dictionary.aiUsageDesc} />
        <Card>
          <LoadingState />
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title={dictionary.aiUsage} description={dictionary.aiUsageDesc} />
        <ErrorState message={error} onRetry={reload} />
      </>
    );
  }

  const safe = result.data ?? emptySummary;
  const formatUsd = (value: number) => `$${value.toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  const maxDailyCost = Math.max(1e-9, ...safe.daily.map((point) => point.cost_usd));
  const hasData = safe.totals.job_count > 0;

  return (
    <>
      <PageHeader title={dictionary.aiUsage} description={dictionary.aiUsageDesc} />
      <Card className="ai-metrics-strip">
        <div>
          <span>{dictionary.aiUsageTotalCost}</span>
          <strong>{formatUsd(safe.totals.cost_usd)}</strong>
        </div>
        <div>
          <span>{dictionary.aiUsageMonthToDate}</span>
          <strong>{formatUsd(safe.month_to_date.cost_usd)}</strong>
        </div>
        <div>
          <span>{dictionary.aiUsageTotalTokens}</span>
          <strong>{safe.totals.total_tokens.toLocaleString(numberLocale)}</strong>
        </div>
        <div>
          <span>{dictionary.aiUsageCompletedJobs}</span>
          <strong>{safe.totals.completed_count.toLocaleString(numberLocale)}</strong>
        </div>
      </Card>

      {!hasData ? (
        <EmptyState title={dictionary.aiUsageNoData} description={dictionary.aiUsageDesc} />
      ) : (
        <div className="ai-usage-grid">
          <Card className="ai-usage-chart">
            <header>
              <h3>{dictionary.aiUsageDailyTrend}</h3>
              <span>
                {dictionary.aiUsageRangeLabel} {safe.range_days} {dictionary.aiUsageRangeDays}
              </span>
            </header>
            <div className="ai-usage-bars" role="img" aria-label={dictionary.aiUsageDailyTrend}>
              {safe.daily.map((point) => (
                <div key={point.date} className="ai-usage-bar-col" title={`${point.date}: ${formatUsd(point.cost_usd)}`}>
                  <div className="ai-usage-bar" style={{ height: `${Math.max(2, (point.cost_usd / maxDailyCost) * 100)}%` }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="ai-usage-by-character">
            <header>
              <h3>{dictionary.aiUsageByCharacter}</h3>
            </header>
            <table>
              <tbody>
                {safe.by_character.map((row) => (
                  <tr key={row.character}>
                    <td>{characterLabels[row.character] ?? row.character}</td>
                    <td>{row.job_count.toLocaleString(numberLocale)}</td>
                    <td>{formatUsd(row.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
