"use client";

import { useEffect, useState } from "react";

import { ResourcePage } from "@/components/data/ResourcePage";
import type { FormField } from "@/components/data/ResourceFormModal";
import { endpoints, userActionEndpoint } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { api } from "@/lib/api/client";
import type { AnyRecord } from "@/types/api";

export default function UsersPage() {
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
            response.data?.is_superuser ||
            (Array.isArray(response.data?.roles) && response.data.roles.some((r: AnyRecord) => r.code === "admin"));
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

  const createFields: FormField[] = [
    { key: "email", label: dictionary.email, type: "email", required: true },
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "password", label: dictionary.password, type: "password", required: true, minLength: 8 }
  ];

  const editFields: FormField[] = [
    { key: "full_name", label: dictionary.colName, required: true },
    { key: "phone_number", label: dictionary.phoneNumber },
    { key: "is_active", label: dictionary.active, type: "checkbox" }
  ];

  return (
    <ResourcePage
      title={dictionary.usersTitle}
      description={dictionary.usersDesc}
      endpoint={endpoints.admin.users}
      filters={[
        {
          key: "is_active",
          label: dictionary.status,
          options: [
            { label: dictionary.active, value: "true" },
            { label: dictionary.suspended, value: "false" }
          ]
        }
      ]}
      createConfig={isAdmin ? {
        title: dictionary.createRecord,
        fields: createFields
      } : undefined}
      editConfig={{
        title: dictionary.editUser,
        fields: editFields,
        fromRow: (row) => ({
          full_name: String(row.full_name ?? ""),
          phone_number: String(row.phone_number ?? ""),
          is_active: Boolean(row.is_active)
        })
      }}
      mutationToasts={{
        createSuccess: dictionary.userCreated,
        updateSuccess: dictionary.userUpdated
      }}
      rowActions={[
        {
          label: dictionary.suspendAccount,
          variant: "danger",
          visible: (row) => Boolean(row.is_active),
          endpoint: (row) => userActionEndpoint(String(row.id), "suspend"),
          confirm: dictionary.suspendConfirm,
          successToast: dictionary.userSuspended
        },
        {
          label: dictionary.activateAccount,
          variant: "primary",
          visible: (row) => !Boolean(row.is_active),
          endpoint: (row) => userActionEndpoint(String(row.id), "activate"),
          successToast: dictionary.userActivated
        },
        {
          label: dictionary.cancelSubscription,
          variant: "danger",
          endpoint: (row) => userActionEndpoint(String(row.id), "cancel-subscription"),
          confirm: dictionary.cancelSubscriptionConfirm,
          successToast: dictionary.userSubscriptionCancelled
        },
        {
          label: dictionary.changeSubscription,
          variant: "secondary",
          endpoint: (row) => userActionEndpoint(String(row.id), "change-subscription"),
          ask: {
            message: dictionary.changeSubscriptionPrompt,
            buildBody: (input) => ({ plan_code: input })
          },
          successToast: dictionary.userSubscriptionChanged
        }
      ]}
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "email", label: dictionary.colEmailShort, mobile: true },
        { key: "full_name", label: dictionary.colName, mobile: "title" },
        { key: "role", label: dictionary.colRole, type: "status", mobile: true },
        {
          key: "is_active",
          label: dictionary.status,
          mobile: true,
          render: (row) => (row.is_active ? dictionary.active : dictionary.suspended)
        },
        { key: "sources_count", label: dictionary.colSources, type: "number" },
        { key: "study_plans_count", label: dictionary.colPlans, type: "number" },
        { key: "quizzes_count", label: dictionary.colQuizzes, type: "number" },
        { key: "created_at", label: dictionary.createdAt, type: "date" }
      ]}
      mobileCards
    />
  );
}
