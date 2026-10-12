"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function StudyPlansPage() {
  const dictionary = useDictionary();

  return (
    <ResourcePage
      title={dictionary.studyPlans}
      description={dictionary.studyPlansDesc}
      endpoint={endpoints.admin.studyPlans}
      filters={[
        {
          key: "status",
          label: dictionary.status,
          options: [
            { label: dictionary.statusActive, value: "active" },
            { label: dictionary.statusCompleted, value: "completed" },
            { label: dictionary.statusArchived, value: "archived" }
          ]
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "user", label: dictionary.colUser, type: "user", mobile: true },
        { key: "title", label: dictionary.colPlanTitle, mobile: "title" },
        { key: "subject_name", label: dictionary.colSubject },
        { key: "generation_type", label: dictionary.generationType, type: "status" },
        { key: "status", label: dictionary.status, type: "status", mobile: true },
        {
          key: "completion_percentage",
          label: dictionary.completion,
          mobile: true,
          render: (row) => `${Number(row.completion_percentage ?? 0).toFixed(0)}%`
        },
        { key: "start_date", label: dictionary.colStart, type: "date" },
        { key: "end_date", label: dictionary.colEnd, type: "date" }
      ]}
      mobileCards
    />
  );
}
