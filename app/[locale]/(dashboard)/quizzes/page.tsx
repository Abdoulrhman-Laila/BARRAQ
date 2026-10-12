"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function QuizzesPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "quizzes",
          label: dictionary.quizzesTab,
          title: dictionary.quizzesManageTitle,
          description: dictionary.quizzesManageDesc,
          endpoint: endpoints.admin.quizzes,
          filters: [
            {
              key: "status",
              label: dictionary.status,
              options: [
                { label: dictionary.draft, value: "draft" },
                { label: dictionary.published, value: "published" },
                { label: dictionary.archived, value: "archived" }
              ]
            }
          ],
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: true },
            { key: "title", label: dictionary.colQuiz, mobile: "title" },
            { key: "subject_name", label: dictionary.colSubject },
            { key: "difficulty_level", label: dictionary.difficulty, type: "status", mobile: true },
            { key: "generation_type", label: dictionary.generationType, type: "status" },
            { key: "questions_count", label: dictionary.questionsCount, type: "number" },
            { key: "attempts_count", label: dictionary.attemptsCount, type: "number" },
            { key: "status", label: dictionary.status, type: "status", mobile: true }
          ],
          mobileCards: true
        },
        {
          id: "attempts",
          label: dictionary.attemptsTab,
          title: dictionary.attemptsTitle,
          description: dictionary.attemptsDesc,
          endpoint: endpoints.admin.quizAttempts,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: true },
            { key: "quiz_title", label: dictionary.colQuiz, mobile: "title" },
            { key: "status", label: dictionary.status, type: "status", mobile: true },
            {
              key: "percentage",
              label: dictionary.percentage,
              mobile: true,
              render: (row) => `${Number(row.percentage ?? 0).toFixed(1)}%`
            },
            { key: "correct_answers_count", label: dictionary.correct, type: "number" },
            { key: "wrong_answers_count", label: dictionary.wrong, type: "number" },
            {
              key: "duration_seconds",
              label: dictionary.duration,
              render: (row) => `${Math.round(Number(row.duration_seconds ?? 0) / 60)} ${dictionary.minutesShort}`
            },
            { key: "submitted_at", label: dictionary.submittedAt, type: "date" }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
