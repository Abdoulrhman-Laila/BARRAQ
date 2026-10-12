export type Locale = "ar" | "en";

export interface ApiErrorShape {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
  error?: ApiErrorShape | null;
  errors?: Record<string, unknown>;
  code?: string;
  request_id?: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ListPayload<T> = Paginated<T> | T[];

export interface AdminRole {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  is_system?: boolean;
  permissions?: AdminPermission[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminPermission {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
}

export interface AdminMe {
  id: number;
  email: string;
  full_name: string;
  role: string;
  roles: AdminRole[];
  permissions: string[];
  is_superuser: boolean;
  is_staff: boolean;
  allowed_sections: Record<string, boolean>;
  /** Backend-authoritative app access; see get_allowed_apps in the API. */
  allowed_apps: string[];
  /** What this account's roles apply to. Empty means platform-wide is absent
   *  AND no tenant was granted -- which the backend reads as no access. */
  scopes?: AdminScope[];
}

export interface AdminScope {
  type: "global" | "organization" | "class";
  organization?: { public_id: string; name: string; organization_type?: string };
  classroom?: { public_id: string; name: string };
}

export interface SystemHealth {
  database: string;
  cache: string;
  storage: string;
  media_root_exists: boolean;
  media_root_writable: boolean;
  static_root_exists: boolean;
  ai_service_enabled: boolean;
  app_name: string;
  app_version: string;
  app_phase: string;
  environment: string;
  debug: boolean;
  allowed_hosts_count: number;
}

export interface Overview {
  users_count: number;
  students_count: number;
  admins_count: number;
  sources_count: number;
  collections_count: number;
  study_plans_count: number;
  quizzes_count: number;
  quiz_attempts_count: number;
  character_interactions_count: number;
  new_users_today: number;
  new_users_this_week: number;
  new_sources_this_week: number;
  subscriptions_count: number;
  active_subscriptions_count: number | null;
  free_users_count: number;
  premium_users_count: number;
  pro_users_count: number;
  school_users_count: number;
  subscriptions_by_plan: Array<{ plan__code: string; plan__name: string; count: number }>;
  ai_jobs_count: number;
  ai_jobs_pending_count: number;
  ai_jobs_failed_count: number;
  ai_jobs_completed_count: number;
  ai_feedback_count: number;
  ai_average_rating: number | null;
  notifications_count: number;
  unread_notifications_count: number;
  support_tickets_count: number;
  open_support_tickets_count: number;
  system_health: SystemHealth;
}

export interface UserBrief {
  id: number;
  email: string;
  full_name: string;
}

export type AnyRecord = Record<string, unknown>;
