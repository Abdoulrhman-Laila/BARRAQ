"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import type { FormField } from "@/components/data/ResourceFormModal";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function RolesPage() {
  const dictionary = useDictionary();

  const roleFields: FormField[] = [
    { key: "name", label: dictionary.colName, required: true },
    { key: "code", label: dictionary.colCode, required: true },
    { key: "description", label: dictionary.colDescription, type: "textarea" },
    { key: "is_active", label: dictionary.active, type: "checkbox" }
  ];

  return (
    <TabbedResources
      tabs={[
        {
          id: "roles",
          label: dictionary.rolesTab,
          title: dictionary.rolesTitle,
          description: dictionary.rolesDesc,
          endpoint: endpoints.admin.roles,
          createConfig: {
            title: dictionary.createRole,
            fields: roleFields
          },
          editConfig: {
            title: dictionary.editRole,
            fields: roleFields,
            allow: (row) => !row.is_system,
            fromRow: (row) => ({
              name: String(row.name ?? ""),
              code: String(row.code ?? ""),
              description: String(row.description ?? ""),
              is_active: Boolean(row.is_active)
            })
          },
          allowDelete: (row) => !row.is_system,
          deleteConfirm: dictionary.deleteRoleConfirm,
          mutationToasts: {
            createSuccess: dictionary.roleCreated,
            updateSuccess: dictionary.roleUpdated,
            deleteSuccess: dictionary.roleDeleted
          },
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode, mobile: true },
            { key: "name", label: dictionary.colName, mobile: "title" },
            { key: "description", label: dictionary.colDescription },
            {
              key: "is_system",
              label: dictionary.isSystem,
              mobile: true,
              render: (row) => (row.is_system ? dictionary.yes : dictionary.no)
            },
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
          id: "permissions",
          label: dictionary.permissionsTab,
          title: dictionary.permissionsTitle,
          description: dictionary.permissionsDesc,
          endpoint: endpoints.admin.permissions,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode, mobile: true },
            { key: "name", label: dictionary.colName, mobile: "title" },
            { key: "category", label: dictionary.colCategory, type: "status", mobile: true },
            { key: "description", label: dictionary.colDescription, mobile: true }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
