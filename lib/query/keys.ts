/** Query keys for dashboard server-state (Phase 3). */
export const dashboardKeys = {
  overview: ["dashboard", "overview"] as const,
  systemHealth: ["dashboard", "system-health"] as const,
  aiServiceHealth: ["dashboard", "ai-service-health"] as const,
  aiJobMetrics: ["dashboard", "ai-job-metrics"] as const,
  aiUsage: ["dashboard", "ai-usage"] as const,
  studentPerformanceSummary: ["dashboard", "student-performance-summary"] as const
} as const;

/** Admin session / RBAC profile (Phase 4). */
export const adminKeys = {
  me: ["admin", "me"] as const
} as const;
