"use client";

import { useState } from "react";
import { ResourcePage, type Column, type FilterConfig, type MutateConfig, type MutationToastConfig, type RowAction } from "@/components/data/ResourcePage";
import { Tabs } from "@/components/ui/Tabs";

export interface ResourceTab {
  id: string;
  label: string;
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
  filters?: FilterConfig[];
  defaultOrdering?: string;
  rowActions?: RowAction[];
  createConfig?: MutateConfig;
  editConfig?: MutateConfig;
  allowDelete?: boolean | ((row: import("@/types/api").AnyRecord) => boolean);
  deleteConfirm?: string;
  /** Opt-in per tab; leave unset to keep default ResourcePage UX. */
  mutationToasts?: MutationToastConfig;
  /** Opt-in mobile card/list at ≤768px (same as ResourcePage.mobileCards). */
  mobileCards?: boolean;
}

export function TabbedResources({ tabs }: { tabs: ResourceTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!selected) return null;
  return (
    <div className="tabbed-page">
      <Tabs items={tabs.map((tab) => ({ id: tab.id, label: tab.label }))} value={active} onChange={setActive} />
      <ResourcePage
        title={selected.title}
        description={selected.description}
        endpoint={selected.endpoint}
        columns={selected.columns}
        filters={selected.filters}
        defaultOrdering={selected.defaultOrdering}
        rowActions={selected.rowActions}
        createConfig={selected.createConfig}
        editConfig={selected.editConfig}
        allowDelete={selected.allowDelete}
        deleteConfirm={selected.deleteConfirm}
        mutationToasts={selected.mutationToasts}
        mobileCards={selected.mobileCards}
      />
    </div>
  );
}
