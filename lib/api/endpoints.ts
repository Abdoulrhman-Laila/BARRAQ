export const endpoints = {
  admin: {
    me: "admin/me/",
    overview: "admin/overview/",
    health: "admin/system/health/",
    users: "admin/users/",
    admins: "admin/admin-users/",
    roles: "admin/roles/",
    permissions: "admin/permissions/",
    educationStages: "admin/education-stages/",
    subjects: "admin/subjects/",
    sources: "admin/sources/",
    sourceCollections: "admin/source-collections/",
    studentPerformance: "admin/student-performance/",
    studentPerformanceSummary: "admin/student-performance/summary/",
    studyPlans: "admin/study-plans/",
    quizzes: "admin/quizzes/",
    quizAttempts: "admin/quiz-attempts/",
    characterInteractions: "admin/character-interactions/",
    auditLogs: "admin/audit-logs/",
    aiJobs: "admin/ai-jobs/",
    aiJobMetrics: "admin/ai-jobs/metrics/",
    aiFeedback: "admin/ai-feedback/",
    aiWebhookEvents: "admin/ai-webhook-events/",
    aiRecommendations: "admin/ai-recommendations/",
    aiSummaries: "admin/ai-summaries/",
    aiTranscriptions: "admin/ai-transcriptions/",
    aiUsage: "admin/ai-usage/",
    supportTickets: "admin/support-tickets/",
    subscriptionPlans: "admin/subscription-plans/",
    userSubscriptions: "admin/user-subscriptions/",
    subscriptionUsage: "admin/subscription-usage/",
    organizations: "admin/organizations/",
    classes: "admin/classes/",
    classAnnouncements: "admin/class-announcements/",
    classAssignments: "admin/class-assignments/",
    classEvents: "admin/class-events/",
    classLibrary: "admin/class-library/",
    classQuizzes: "admin/class-quizzes/",
    classQuizQuestions: "admin/class-quiz-questions/",
    invitations: "admin/invitations/",
    joinRequests: "admin/join-requests/"
  },
  ai: {
    serviceHealth: "ai/service-health/"
  },
  auth: {
    changePassword: "auth/change-password/",
    passwordReset: "auth/password-reset/",
    passwordResetConfirm: "auth/password-reset/confirm/",
    verify: "auth/verify/"
  }
} as const;

export function detailEndpoint(base: string, id: string | number): string {
  return `${base}${id}/`;
}

export function userActionEndpoint(
  userId: string | number,
  action: "activate" | "suspend" | "cancel-subscription" | "change-subscription"
): string {
  return `${endpoints.admin.users}${userId}/${action}/`;
}

export function adminAssignRolesEndpoint(adminId: string | number): string {
  return `${endpoints.admin.admins}${adminId}/assign-roles/`;
}

export function supportTicketMessagesEndpoint(ticketId: string | number): string {
  return `${endpoints.admin.supportTickets}${ticketId}/messages/`;
}

export function aiJobCancelEndpoint(publicId: string | number): string {
  return `${endpoints.admin.aiJobs}${publicId}/cancel/`;
}

/**
 * Organization resources are addressed by `public_id`, never by the database
 * id. The backend scopes each of these to the caller, so a response that
 * omits a row means it is not theirs -- the dashboard never needs to filter
 * by organization itself, and must not try: a client-side filter over a
 * server-side boundary is how the two drift apart.
 */
export function organizationActionEndpoint(
  publicId: string,
  action: "archive" | "overview" | "members"
): string {
  return `${endpoints.admin.organizations}${publicId}/${action}/`;
}

export function classActionEndpoint(
  publicId: string,
  action: "archive" | "members" | "invitations" | "invitations/create"
): string {
  return `${endpoints.admin.classes}${publicId}/${action}/`;
}

export function joinRequestActionEndpoint(publicId: string, action: "approve" | "reject"): string {
  return `${endpoints.admin.joinRequests}${publicId}/${action}/`;
}

export function classMembersEndpoint(publicId: string): string {
  return `${endpoints.admin.classes}${publicId}/members/`;
}

export function classMemberActionEndpoint(publicId: string, action: "remove" | "transfer"): string {
  return `${endpoints.admin.classes}${publicId}/members/${action}/`;
}

export function classAssignmentSubmissionsEndpoint(id: string | number): string {
  return `${endpoints.admin.classAssignments}${id}/submissions/`;
}

export function assignmentGradeEndpoint(id: string | number): string {
  return `admin/assignment-submissions/${id}/grade/`;
}

export function classQuizAttemptsEndpoint(id: string | number): string {
  return `${endpoints.admin.classQuizzes}${id}/attempts/`;
}

export function classQuizAnswerGradeEndpoint(id: string | number): string {
  return `admin/class-quiz-answers/${id}/grade/`;
}

export function classLibraryDownloadEndpoint(publicId: string): string {
  return `${endpoints.admin.classLibrary}${publicId}/download/`;
}

export function invitationRevokeEndpoint(id: string | number): string {
  return `${endpoints.admin.invitations}${id}/revoke/`;
}

export function adminRevokeRolesEndpoint(adminId: string | number): string {
  return `${endpoints.admin.admins}${adminId}/revoke-roles/`;
}
