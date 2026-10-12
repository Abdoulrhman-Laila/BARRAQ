"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import type { AnyRecord } from "@/types/api";

export default function AIResultsPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "recommendations",
          label: dictionary.rasheedTab,
          title: dictionary.rasheedTitle,
          description: dictionary.rasheedDesc,
          endpoint: endpoints.admin.aiRecommendations,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "title", label: dictionary.colTitle, mobile: "title" },
            { key: "overall_score", label: dictionary.score },
            { key: "created_at", label: dictionary.createdAt, type: "date" },
            {
              key: "is_read",
              label: dictionary.isRead,
              mobile: true,
              render: (row) => (row.is_read ? dictionary.yes : dictionary.no)
            }
          ],
          mobileCards: true
        },
        {
          id: "summaries",
          label: dictionary.kholasaTab,
          title: dictionary.kholasaTitle,
          description: dictionary.kholasaDesc,
          endpoint: endpoints.admin.aiSummaries,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "title", label: dictionary.colTitle, mobile: "title" },
            { key: "overall_score", label: dictionary.score },
            { key: "summary_type", label: dictionary.summaryLevel, type: "status", mobile: true },
            { key: "created_at", label: dictionary.createdAt, type: "date" }
          ],
          mobileCards: true
        },
        {
          id: "transcriptions",
          label: dictionary.sadaTab,
          title: dictionary.sadaTitle,
          description: dictionary.sadaDesc,
          endpoint: endpoints.admin.aiTranscriptions,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "title", label: dictionary.colTitle, mobile: "title" },
            { key: "language", label: dictionary.language },
            { key: "created_at", label: dictionary.createdAt, type: "date" }
          ],
          mobileCards: true
        },
        {
          id: "interactions",
          label: dictionary.interactionsTab,
          title: dictionary.interactionsTitle,
          description: dictionary.interactionsDesc,
          endpoint: endpoints.admin.characterInteractions,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: "title" },
            { key: "character", label: dictionary.character, type: "status", mobile: true },
            { key: "action", label: dictionary.colAction, type: "status", mobile: true },
            { key: "status", label: dictionary.status, type: "status", mobile: true },
            { key: "source_title", label: dictionary.colSource },
            { key: "collection_name", label: dictionary.colCollection },
            { key: "result_type", label: dictionary.resultType },
            { key: "created_at", label: dictionary.createdAt, type: "date" }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
