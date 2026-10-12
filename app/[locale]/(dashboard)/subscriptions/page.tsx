"use client";

import { TabbedResources } from "@/components/data/TabbedResources";
import type { FormField } from "@/components/data/ResourceFormModal";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";

export default function SubscriptionsPage() {
  const dictionary = useDictionary();

  const planFields: FormField[] = [
    { key: "code", label: dictionary.colCode, required: true },
    { key: "name", label: dictionary.colPlanName, required: true },
    { key: "description", label: dictionary.colDescription, type: "textarea" },
    { key: "price", label: dictionary.colPrice },
    { key: "currency", label: dictionary.currency },
    {
      key: "billing_interval",
      label: dictionary.colBillingCycle,
      type: "select",
      options: [
        { label: "free", value: "free" },
        { label: "monthly", value: "monthly" },
        { label: "yearly", value: "yearly" },
        { label: "lifetime", value: "lifetime" },
        { label: "custom", value: "custom" }
      ]
    },
    { key: "sort_order", label: dictionary.colSortOrder, type: "number", min: 0 },
    { key: "is_active", label: dictionary.active, type: "checkbox" },
    { key: "is_public", label: dictionary.isPublic, type: "checkbox" }
  ];

  return (
    <TabbedResources
      tabs={[
        {
          id: "plans",
          label: dictionary.plansTab,
          title: dictionary.plansTitle,
          description: dictionary.plansDesc,
          endpoint: endpoints.admin.subscriptionPlans,
          createConfig: { title: dictionary.createPlan, fields: planFields },
          editConfig: {
            title: dictionary.editPlan,
            fields: planFields,
            fromRow: (row) => ({
              code: String(row.code ?? ""),
              name: String(row.name ?? ""),
              description: String(row.description ?? ""),
              price: String(row.price ?? ""),
              currency: String(row.currency ?? "SAR"),
              billing_interval: String(row.billing_interval ?? row.billing_cycle ?? ""),
              sort_order: String(row.sort_order ?? ""),
              is_active: Boolean(row.is_active),
              is_public: Boolean(row.is_public ?? true)
            })
          },
          allowDelete: true,
          deleteConfirm: dictionary.deletePlanConfirm,
          mutationToasts: {
            createSuccess: dictionary.planCreated,
            updateSuccess: dictionary.planUpdated,
            deleteSuccess: dictionary.planDeleted
          },
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "code", label: dictionary.colCode, mobile: true },
            { key: "name", label: dictionary.colPlanName, mobile: "title" },
            { key: "price", label: dictionary.colPrice, mobile: true },
            {
              key: "billing_interval",
              label: dictionary.colBillingCycle,
              type: "status",
              render: (row) => String(row.billing_interval ?? row.billing_cycle ?? "—")
            },
            {
              key: "is_active",
              label: dictionary.status,
              mobile: true,
              render: (row) => (row.is_active ? dictionary.active : dictionary.inactive)
            },
            { key: "sort_order", label: dictionary.colSortOrder, type: "number" }
          ],
          mobileCards: true
        },
        {
          id: "users",
          label: dictionary.userSubsTab,
          title: dictionary.userSubsTitle,
          description: dictionary.userSubsDesc,
          endpoint: endpoints.admin.userSubscriptions,
          editConfig: {
            title: dictionary.editUserSubscription,
            fields: [
              { key: "plan_code", label: dictionary.colCode, placeholder: dictionary.changeSubscriptionPrompt },
              {
                key: "status",
                label: dictionary.status,
                type: "select",
                options: [
                  { label: "active", value: "active" },
                  { label: "trialing", value: "trialing" },
                  { label: "expired", value: "expired" },
                  { label: "canceled", value: "canceled" },
                  { label: "past_due", value: "past_due" },
                  { label: "paused", value: "paused" }
                ]
              },
              { key: "auto_renew", label: dictionary.autoRenew, type: "checkbox" }
            ],
            fromRow: (row) => ({
              plan_code: String(row.plan_code ?? ""),
              status: String(row.status ?? "active"),
              auto_renew: Boolean(row.auto_renew)
            }),
            toBody: (values) => {
              const body: Record<string, unknown> = {
                status: values.status,
                auto_renew: Boolean(values.auto_renew)
              };
              const planCode = String(values.plan_code ?? "").trim();
              if (planCode) body.plan_code = planCode;
              return body;
            }
          },
          mutationToasts: {
            updateSuccess: dictionary.userSubscriptionUpdated
          },
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: "title" },
            { key: "plan_name", label: dictionary.colPlan, mobile: true },
            { key: "status", label: dictionary.status, type: "status", mobile: true },
            { key: "started_at", label: dictionary.colStart, type: "date" },
            { key: "ends_at", label: dictionary.colEnd, type: "date", mobile: true },
            {
              key: "auto_renew",
              label: dictionary.autoRenew,
              render: (row) => (row.auto_renew ? dictionary.yes : dictionary.no)
            }
          ],
          mobileCards: true
        },
        {
          id: "usage",
          label: dictionary.usageTab,
          title: dictionary.usageTitle,
          description: dictionary.usageDesc,
          endpoint: endpoints.admin.subscriptionUsage,
          columns: [
            { key: "id", label: "#", type: "number" },
            { key: "user", label: dictionary.colUser, type: "user", mobile: "title" },
            { key: "character", label: dictionary.character, type: "status", mobile: true },
            { key: "used", label: dictionary.colUsed, type: "number", mobile: true },
            { key: "limit", label: dictionary.colLimit, type: "number", mobile: true },
            { key: "period_start", label: dictionary.periodStart, type: "date" },
            { key: "period_end", label: dictionary.periodEnd, type: "date" }
          ],
          mobileCards: true
        }
      ]}
    />
  );
}
