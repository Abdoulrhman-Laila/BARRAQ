"use client";

import { ResourcePage } from "@/components/data/ResourcePage";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function AuditLogsPage() {
  const dictionary = useDictionary();

  return (
    <ResourcePage
      title={dictionary.auditLogs}
      description={dictionary.auditDesc}
      endpoint={endpoints.admin.auditLogs}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "actor", label: dictionary.colActor, type: "user", mobile: true },
        { key: "action", label: dictionary.actions, mobile: "title" },
        { key: "target_type", label: dictionary.targetType, type: "status", mobile: true },
        { key: "target_id", label: dictionary.targetId },
        { key: "ip_address", label: dictionary.ipAddress },
        { key: "metadata", label: dictionary.metadata, type: "json" },
        { key: "created_at", label: dictionary.colDate, type: "date", mobile: true }
      ]}
      mobileCards
    />
  );
}
