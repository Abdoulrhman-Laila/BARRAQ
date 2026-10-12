"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function SourcesPage() {
  const dictionary = useDictionary();

  return (
    <TabbedResources
      tabs={[
        {
          id: "sources",
          label: dictionary.sourcesTab,
          title: dictionary.sourcesTitle,
          description: dictionary.sourcesDesc,
          endpoint: endpoints.admin.sources,
          allowDelete: true,
          deleteConfirm: dictionary.deleteSourceConfirm,
          mutationToasts: {
            deleteSuccess: dictionary.sourceDeleted
          },
          filters: [
            {
              key: "status",
              label: dictionary.processingStatus,
              options: [
                { label: dictionary.ready, value: "ready" },
                { label: dictionary.processing, value: "processing" },
                { label: dictionary.failed, value: "failed" }
              ]
            },
            {
              key: "source_type",
              label: dictionary.sourceType,
              options: [
                { label: dictionary.typeFile, value: "file" },
                { label: dictionary.typeText, value: "text" },
                { label: dictionary.typeUrl, value: "url" }
              ]
            }
          ],
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: true },
            { key: "title", label: dictionary.colTitle, mobile: "title" },
            { key: "subject_name", label: dictionary.colSubject },
            { key: "source_type", label: dictionary.sourceType, type: "status", mobile: true },
            {
              key: "file_size",
              label: dictionary.colSize,
              render: (row) => (typeof row.file_size === "number" ? `${(row.file_size / 1024 / 1024).toFixed(2)} MB` : "—")
            },
            { key: "status", label: dictionary.status, type: "status", mobile: true },
            { key: "created_at", label: dictionary.uploadedAt, type: "date" }
          ],
          mobileCards: true
        },
        {
          id: "collections",
          label: dictionary.collectionsTab,
          title: dictionary.collectionsTitle,
          description: dictionary.collectionsDesc,
          endpoint: endpoints.admin.sourceCollections,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: true },
            { key: "name", label: dictionary.folderName, mobile: "title" },
            { key: "subject_name", label: dictionary.colSubject },
            { key: "source_count", label: dictionary.sourceCount, type: "number", mobile: true },
            {
              key: "total_file_size",
              label: dictionary.totalSize,
              render: (row) =>
                typeof row.total_file_size === "number" ? `${(row.total_file_size / 1024 / 1024).toFixed(2)} MB` : "—"
            },
            { key: "status", label: dictionary.status, type: "status", mobile: true },
            { key: "created_at", label: dictionary.createdOn, type: "date" }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
