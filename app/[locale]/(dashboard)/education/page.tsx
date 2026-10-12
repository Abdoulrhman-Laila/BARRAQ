"use client";

import { useEffect, useState } from "react";

import { TabbedResources } from "@/components/data/TabbedResources";
import type { FormField } from "@/components/data/ResourceFormModal";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { api } from "@/lib/api/client";
import type { AnyRecord } from "@/types/api";

export default function EducationPage() {
  const dictionary = useDictionary();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AnyRecord>(endpoints.admin.me)
      .then((response) => {
        if (!cancelled) {
          // Check if user is platform admin
          const isAdminUser = 
            (Array.isArray(response.data?.roles) && response.data.roles.some((r: AnyRecord) => r.code === "admin")) ||
            response.data?.is_superuser ||
            !response.data?.scopes?.some((s: AnyRecord) => s.scope_type !== "global");
          setIsAdmin(isAdminUser);
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stageFields: FormField[] = [
    { key: "name", label: dictionary.colName, required: true },
    { key: "description", label: dictionary.colDescription, type: "textarea" },
    { key: "order", label: dictionary.ordering, type: "number", min: 0 },
    { key: "is_active", label: dictionary.active, type: "checkbox" }
  ];

  const subjectFields: FormField[] = [
    { key: "name", label: dictionary.colSubject, required: true },
    { key: "education_stage", label: dictionary.stageId, type: "number", required: true, min: 1 },
    { key: "grade_level", label: dictionary.gradeLevel, required: true },
    { key: "description", label: dictionary.colDescription, type: "textarea" },
    { key: "is_active", label: dictionary.active, type: "checkbox" }
  ];

  return (
    <TabbedResources
      tabs={[
        {
          id: "stages",
          label: dictionary.stagesTab,
          title: dictionary.stagesTitle,
          description: dictionary.stagesDesc,
          endpoint: endpoints.admin.educationStages,
          createConfig: isAdmin ? { title: dictionary.createStage, fields: stageFields } : undefined,
          editConfig: isAdmin ? {
            title: dictionary.editStage,
            method: "PUT",
            fields: stageFields,
            fromRow: (row) => ({
              name: String(row.name ?? ""),
              description: String(row.description ?? ""),
              order: String(row.order ?? ""),
              is_active: Boolean(row.is_active)
            })
          } : undefined,
          allowDelete: isAdmin,
          deleteConfirm: dictionary.deleteStageConfirm,
          mutationToasts: {
            createSuccess: dictionary.stageCreated,
            updateSuccess: dictionary.stageUpdated,
            deleteSuccess: dictionary.stageDeleted
          },
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "name", label: dictionary.colName, mobile: "title" },
            { key: "code", label: dictionary.colCode, mobile: true },
            { key: "order", label: dictionary.ordering, type: "number", mobile: true },
            {
              key: "is_active",
              label: dictionary.status,
              mobile: true,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            }
          ],
          mobileCards: true
        },
        {
          id: "subjects",
          label: dictionary.subjectsTab,
          title: dictionary.subjectsTitle,
          description: dictionary.subjectsDesc,
          endpoint: endpoints.admin.subjects,
          createConfig: isAdmin ? { title: dictionary.createSubject, fields: subjectFields } : undefined,
          editConfig: isAdmin ? {
            title: dictionary.editSubject,
            method: "PUT",
            fields: subjectFields,
            fromRow: (row) => ({
              name: String(row.name ?? ""),
              education_stage: String(row.education_stage ?? row.stage_id ?? ""),
              grade_level: String(row.grade_level ?? ""),
              description: String(row.description ?? ""),
              is_active: Boolean(row.is_active)
            })
          } : undefined,
          allowDelete: isAdmin,
          deleteConfirm: dictionary.deleteSubjectConfirm,
          mutationToasts: {
            createSuccess: dictionary.subjectCreated,
            updateSuccess: dictionary.subjectUpdated,
            deleteSuccess: dictionary.subjectDeleted
          },
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "name", label: dictionary.colSubject, mobile: "title" },
            { key: "code", label: dictionary.colCode },
            { key: "stage_name", label: dictionary.colStage, mobile: true },
            { key: "color", label: dictionary.colColor },
            {
              key: "is_active",
              label: dictionary.status,
              mobile: true,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
