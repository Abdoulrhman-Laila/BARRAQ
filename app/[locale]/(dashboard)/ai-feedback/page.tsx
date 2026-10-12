"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function AIFeedbackPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "feedback",
          label: dictionary.feedbackTab,
          title: dictionary.feedbackTitle,
          description: dictionary.feedbackDesc,
          endpoint: endpoints.admin.aiFeedback,
          filters: [
            {
              key: "rating",
              label: dictionary.rating,
              options: [1, 2, 3, 4, 5].map((value) => ({
                label: `${value} ${dictionary.starsLabel}`,
                value: String(value)
              }))
            },
            {
              key: "training_consent",
              label: dictionary.trainingConsent,
              options: [
                { label: dictionary.agreed, value: "true" },
                { label: dictionary.disagreed, value: "false" }
              ]
            }
          ],
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "job", label: dictionary.colJob, mobile: true },
            {
              key: "rating",
              label: dictionary.rating,
              mobile: "title",
              render: (row) => `${row.rating ?? "—"} / 5`
            },
            {
              key: "is_helpful",
              label: dictionary.helpful,
              render: (row) => (row.is_helpful ? dictionary.yes : dictionary.no)
            },
            { key: "feedback_type", label: dictionary.colType, type: "status", mobile: true },
            { key: "reason_codes", label: dictionary.reasons },
            {
              key: "training_consent",
              label: dictionary.training,
              mobile: true,
              render: (row) => (row.training_consent ? dictionary.agreed : dictionary.disagreed)
            },
            {
              key: "forwarded_to_ai_service",
              label: dictionary.forwardedToAi,
              render: (row) => (row.forwarded_to_ai_service ? dictionary.yes : dictionary.no)
            },
            { key: "created_at", label: dictionary.colDate, type: "date" }
          ],
          mobileCards: true
        },
        {
          id: "webhooks",
          label: dictionary.webhooksTab,
          title: dictionary.webhooksTitle,
          description: dictionary.webhooksDesc,
          endpoint: endpoints.admin.aiWebhookEvents,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "event_id", label: dictionary.eventId, mobile: "title" },
            { key: "event_type", label: dictionary.colType, type: "status", mobile: true },
            { key: "external_job_id", label: dictionary.externalJob },
            {
              key: "processed",
              label: dictionary.processed,
              mobile: true,
              render: (row) => (row.processed ? dictionary.yes : dictionary.no)
            },
            { key: "error_message", label: dictionary.errorMessage, mobile: true },
            { key: "received_at", label: dictionary.receivedAt, type: "date" },
            { key: "processed_at", label: dictionary.processedAt, type: "date" }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
