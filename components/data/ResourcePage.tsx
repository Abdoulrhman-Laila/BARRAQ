"use client";

import { useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { detailEndpoint } from "@/lib/api/endpoints";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  ResourceFormModal,
  valuesToPayload,
  type FormField,
  type FormValues
} from "@/components/data/ResourceFormModal";
import { useResource } from "@/components/data/useResource";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord, Locale } from "@/types/api";

export interface Column {
  key: string;
  label: string;
  type?: "text" | "date" | "status" | "number" | "user" | "json";
  render?: (row: AnyRecord) => ReactNode;
  /**
   * Opt-in mobile card field when `mobileCards` is enabled on ResourcePage.
   * `"title"` = primary heading; `true` = secondary field on the card.
   */
  mobile?: boolean | "title";
}

export interface RowAction {
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  visible?: (row: AnyRecord) => boolean;
  endpoint: (row: AnyRecord) => string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: (row: AnyRecord) => unknown;
  ask?: {
    message: string;
    buildBody: (input: string, row: AnyRecord) => unknown;
  };
  /** Opens a textarea/modal composer instead of window.prompt. */
  compose?: {
    title: string;
    label: string;
    placeholder?: string;
    buildBody: (input: string, row: AnyRecord) => unknown;
  };
  confirm?: string;
  /** Opt-in: toast on success; API errors use toast instead of inline. */
  successToast?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface MutateConfig {
  title: string;
  fields: FormField[];
  /** Default PATCH for edit. Use PUT when the contract requires it. */
  method?: "PATCH" | "PUT";
  toBody?: (values: FormValues, row?: AnyRecord | null) => unknown;
  fromRow?: (row: AnyRecord) => FormValues;
  allow?: (row: AnyRecord) => boolean;
}

/** Opt-in toast feedback for create/update/delete. Off by default for all resources. */
export interface MutationToastConfig {
  createSuccess?: string;
  updateSuccess?: string;
  deleteSuccess?: string;
}

function valueAt(row: AnyRecord, key: string): unknown {
  return key.split(".").reduce<unknown>(
    (current, part) => (current && typeof current === "object" ? (current as AnyRecord)[part] : undefined),
    row
  );
}

function localeTag(locale: Locale) {
  return locale === "en" ? "en-US" : "ar-SY";
}

function formatValue(
  value: unknown,
  type: Column["type"],
  dictionary: Dictionary,
  locale: Locale
): ReactNode {
  const tag = localeTag(locale);
  if (value === null || value === undefined || value === "") return <span className="muted">—</span>;
  if (type === "status") return <Badge value={value} />;
  if (type === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" });
  }
  if (type === "number") return Number(value).toLocaleString(tag);
  if (type === "user" && typeof value === "object") {
    const user = value as AnyRecord;
    return (
      <div className="user-cell">
        <span className="avatar" aria-hidden="true">
          {String(user.full_name ?? user.email ?? "?").slice(0, 1)}
        </span>
        <span>
          <strong>{String(user.full_name ?? "—")}</strong>
          <small>{String(user.email ?? "")}</small>
        </span>
      </div>
    );
  }
  if (type === "json") return <code className="json-preview">{JSON.stringify(value)}</code>;
  if (typeof value === "boolean") return value ? dictionary.yes : dictionary.no;
  if (Array.isArray(value)) return value.join(locale === "en" ? ", " : "، ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function cellContent(
  column: Column,
  row: AnyRecord,
  dictionary: Dictionary,
  locale: Locale
): ReactNode {
  return column.render ? column.render(row) : formatValue(valueAt(row, column.key), column.type, dictionary, locale);
}

export function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  filters = [],
  rowActions = [],
  createConfig,
  editConfig,
  allowDelete,
  deleteConfirm,
  hydrateDetail = false,
  detailOmitKeys = [],
  renderDetailExtra,
  defaultOrdering = "-created_at",
  pageSize = 20,
  mutationToasts,
  emptyState,
  /** Opt-in: render card/list at ≤768px using columns marked with `mobile`. */
  mobileCards = false,
  orderingOptions,
  hideDefaultDetail = false,
  detailTitle,
  createLabel
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: Column[];
  filters?: FilterConfig[];
  rowActions?: RowAction[];
  createConfig?: MutateConfig;
  editConfig?: MutateConfig;
  allowDelete?: boolean | ((row: AnyRecord) => boolean);
  deleteConfirm?: string;
  /** When opening details, fetch GET {endpoint}{id}/ for full record. */
  hydrateDetail?: boolean;
  detailOmitKeys?: string[];
  renderDetailExtra?: (
    row: AnyRecord,
    helpers: { refreshDetail: () => Promise<void>; detailLoading: boolean }
  ) => ReactNode;
  defaultOrdering?: string;
  pageSize?: number;
  /** When set, create/update/delete show toast feedback instead of inline API errors. */
  mutationToasts?: MutationToastConfig;
  /**
   * What an empty list means *here*. "No data" is true of every resource
   * and useful for none: a manager with no classes yet and a filter that
   * matched nothing need different sentences and different next steps.
   */
  emptyState?: { title: string; description: string };
  mobileCards?: boolean;
  /** Override the default created_at/id ordering menu when the resource uses other fields. */
  orderingOptions?: FilterOption[];
  /** Skip the raw field dump when the page supplies a custom detail layout. */
  hideDefaultDetail?: boolean;
  detailTitle?: (row: AnyRecord) => string;
  /** Header create button. Defaults to the generic "Create" label. */
  createLabel?: string;
}) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const sortOptions = orderingOptions ?? [
    { value: "-created_at", label: dictionary.newest },
    { value: "created_at", label: dictionary.oldest },
    { value: "id", label: dictionary.idAsc },
    { value: "-id", label: dictionary.idDesc }
  ];
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [ordering, setOrdering] = useState(defaultOrdering);
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<AnyRecord | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ action: RowAction; row: AnyRecord } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // An empty result under a search or filter means something different from
  // an empty resource, and deserves different words.
  const filtered = Boolean(search) || Object.values(filterValues).some(Boolean);

  const query = useMemo(
    () => ({ search, ordering, page, page_size: pageSize, ...filterValues }),
    [search, ordering, page, pageSize, filterValues]
  );
  const { data, loading, error, reload } = useResource(endpoint, query);
  const pages = Math.max(1, Math.ceil(data.count / pageSize));

  const mobileTitleColumn = useMemo(
    () => (mobileCards ? columns.find((column) => column.mobile === "title") : undefined),
    [columns, mobileCards]
  );
  const mobileFields = useMemo(
    () => (mobileCards ? columns.filter((column) => column.mobile === true) : []),
    [columns, mobileCards]
  );
  const showMobileCards = Boolean(mobileCards && (mobileTitleColumn || mobileFields.length));

  async function executeAction(action: RowAction, row: AnyRecord, bodyOverride?: unknown): Promise<boolean> {
    if (action.confirm && bodyOverride === undefined && !window.confirm(action.confirm)) return false;

    let body: unknown = bodyOverride ?? action.body?.(row);
    if (bodyOverride === undefined && action.ask) {
      const input = window.prompt(action.ask.message);
      if (input === null) return false;
      const trimmed = input.trim();
      if (!trimmed) {
        setActionError(dictionary.promptRequired);
        return false;
      }
      try {
        body = action.ask.buildBody(trimmed, row);
      } catch (reason) {
        setActionError(reason instanceof Error ? reason.message : dictionary.actionFailed);
        return false;
      }
    }

    if (bodyOverride === undefined && action.compose) {
      setCompose({ action, row });
      return false;
    }

    const key = `${action.label}-${String(row.id ?? row.public_id ?? "record")}`;
    setActionBusy(key);
    setActionError(null);
    try {
      const target = action.endpoint(row);
      const method = action.method ?? "POST";
      if (method === "PATCH") await api.patch(target, body ?? {});
      else if (method === "DELETE") await api.delete(target);
      else await api.post(target, body);
      if (action.successToast) toast.success(action.successToast);
      setSelected(null);
      setCompose(null);
      reload();
      return true;
    } catch (reason) {
      if (isUnauthorizedError(reason)) return false;
      const message = reason instanceof Error ? reason.message : dictionary.actionFailed;
      if (action.successToast) {
        toast.error(message);
      } else {
        setActionError(message);
        setFormError(message);
      }
      return false;
    } finally {
      setActionBusy(null);
    }
  }

  async function submitCreate(values: FormValues) {
    if (!createConfig) return;
    setFormBusy(true);
    setFormError(null);
    try {
      const body = createConfig.toBody?.(values) ?? valuesToPayload(values, createConfig.fields);
      await api.post(endpoint, body);
      if (mutationToasts?.createSuccess) toast.success(mutationToasts.createSuccess);
      setCreateOpen(false);
      reload();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      const message = reason instanceof Error ? reason.message : dictionary.actionFailed;
      if (mutationToasts) toast.error(message);
      else setFormError(message);
    } finally {
      setFormBusy(false);
    }
  }

  async function submitEdit(values: FormValues) {
    if (!editConfig || !selected) return;
    setFormBusy(true);
    setFormError(null);
    try {
      const body = editConfig.toBody?.(values, selected) ?? valuesToPayload(values, editConfig.fields);
      const id = selected.public_id ?? selected.id;
      const target = detailEndpoint(endpoint, String(id));
      if (editConfig.method === "PUT") await api.put(target, body);
      else await api.patch(target, body);
      if (mutationToasts?.updateSuccess) toast.success(mutationToasts.updateSuccess);
      setEditOpen(false);
      setSelected(null);
      reload();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      const message = reason instanceof Error ? reason.message : dictionary.actionFailed;
      if (mutationToasts) toast.error(message);
      else setFormError(message);
    } finally {
      setFormBusy(false);
    }
  }

  async function submitCompose(values: FormValues) {
    if (!compose?.action.compose) return;
    const input = String(values.message ?? "").trim();
    if (!input) {
      setFormError(dictionary.promptRequired);
      return;
    }
    setFormBusy(true);
    setFormError(null);
    try {
      const body = compose.action.compose.buildBody(input, compose.row);
      const ok = await executeAction(compose.action, compose.row, body);
      if (!ok) return;
    } finally {
      setFormBusy(false);
    }
  }

  async function refreshDetail(row: AnyRecord = selected as AnyRecord) {
    if (!row) return;
    const id = row.id ?? row.public_id;
    if (id === undefined || id === null) return;
    setDetailLoading(true);
    try {
      const response = await api.get<AnyRecord>(detailEndpoint(endpoint, String(id)));
      setSelected(response.data);
      setActionError(null);
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setActionError(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openDetail(row: AnyRecord) {
    setSelected(row);
    setActionError(null);
    if (!hydrateDetail) return;
    await refreshDetail(row);
  }

  async function deleteSelected() {
    if (!selected) return;
    const allowed = typeof allowDelete === "function" ? allowDelete(selected) : Boolean(allowDelete);
    if (!allowed) return;
    if (!window.confirm(deleteConfirm ?? dictionary.deleteConfirm)) return;
    setActionBusy("delete");
    setActionError(null);
    try {
      await api.delete(detailEndpoint(endpoint, String(selected.public_id ?? selected.id)));
      if (mutationToasts?.deleteSuccess) toast.success(mutationToasts.deleteSuccess);
      setSelected(null);
      reload();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      const message = reason instanceof Error ? reason.message : dictionary.actionFailed;
      if (mutationToasts) toast.error(message);
      else setActionError(message);
    } finally {
      setActionBusy(null);
    }
  }

  const visibleActions = selected ? rowActions.filter((action) => action.visible?.(selected) ?? true) : [];
  const canEdit = Boolean(selected && editConfig && (editConfig.allow?.(selected) ?? true));
  const canDelete = Boolean(
    selected && (typeof allowDelete === "function" ? allowDelete(selected) : Boolean(allowDelete))
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {createConfig ? (
              <Button
                onClick={() => {
                  setFormError(null);
                  setCreateOpen(true);
                }}
              >
                {createLabel ?? dictionary.createRecord}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={reload}>
              <Icon name="refresh" />
              {dictionary.refresh}
            </Button>
          </>
        }
      />
      <Card className={showMobileCards ? "resource-panel resource-panel--cards" : "resource-panel"}>
        {actionError ? (
          <div className="inline-error" role="alert">
            {actionError}
          </div>
        ) : null}
        <form
          className="toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <label className="search-box">
            <Icon name="search" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={dictionary.searchRecords}
              aria-label={dictionary.searchRecordsAria}
            />
            <button type="submit">{dictionary.searchAction}</button>
          </label>
          <div className="filters">
            {filters.map((filter) => (
              <label key={filter.key}>
                <span>{filter.label}</span>
                <select
                  value={filterValues[filter.key] ?? ""}
                  aria-label={filter.label}
                  onChange={(event) => {
                    setPage(1);
                    setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }));
                  }}
                >
                  <option value="">{dictionary.all}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              <span>{dictionary.ordering}</span>
              <select
                value={ordering}
                aria-label={dictionary.ordering}
                onChange={(event) => {
                  setPage(1);
                  setOrdering(event.target.value);
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
        {loading ? (
          // Shaped like the table it replaces: no jump when the rows land,
          // and the reader already knows where to look.
          <TableSkeleton columns={columns.length + 1} rows={Math.min(pageSize, 6)} label={dictionary.loading} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.results.length === 0 ? (
          <EmptyState
            title={filtered ? dictionary.emptyTitle : emptyState?.title}
            description={filtered ? dictionary.emptyDescription : emptyState?.description}
            // The create action is offered only when the list is genuinely
            // empty. Under an active filter the fix is to clear the filter,
            // not to add a record the operator may already have.
            action={
              !filtered && createConfig
                ? { label: createConfig.title, onClick: () => setCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <>
            <div className="table-wrap resource-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} scope="col">
                        {column.label}
                      </th>
                    ))}
                    <th className="actions-column" scope="col">
                      {dictionary.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row, index) => (
                    <tr key={String(row.id ?? row.public_id ?? index)}>
                      {columns.map((column) => (
                        <td key={column.key}>{cellContent(column, row, dictionary, locale)}</td>
                      ))}
                      <td>
                        <button type="button" className="table-action" onClick={() => openDetail(row)}>
                          <Icon name="eye" />
                          {dictionary.details}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showMobileCards ? (
              <ul className="resource-cards">
                {data.results.map((row, index) => {
                  const rowKey = String(row.id ?? row.public_id ?? index);
                  return (
                    <li key={rowKey} className="resource-card">
                      <div className="resource-card__body">
                        {mobileTitleColumn ? (
                          <h3 className="resource-card__title">
                            {cellContent(mobileTitleColumn, row, dictionary, locale)}
                          </h3>
                        ) : null}
                        {mobileFields.length ? (
                          <dl className="resource-card__fields">
                            {mobileFields.map((column) => (
                              <div key={column.key} className="resource-card__field">
                                <dt>{column.label}</dt>
                                <dd>{cellContent(column, row, dictionary, locale)}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="table-action resource-card__action"
                        onClick={() => openDetail(row)}
                      >
                        <Icon name="eye" />
                        {dictionary.details}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}
        <footer className="pagination">
          <span>
            {data.count.toLocaleString(localeTag(locale))} {dictionary.records}
          </span>
          <div>
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              {dictionary.previous}
            </Button>
            <span>
              {dictionary.page} {page} {dictionary.pageOf} {pages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= pages}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
            >
              {dictionary.next}
            </Button>
          </div>
        </footer>
      </Card>

      <Modal
        open={Boolean(selected)}
        title={selected && detailTitle ? detailTitle(selected) : dictionary.recordDetails}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <>
            {detailLoading ? <LoadingState /> : null}
            {hideDefaultDetail ? null : (
            <dl className="record-details">
              {Object.entries(selected)
                .filter(([key]) => !detailOmitKeys.includes(key) && key !== "messages")
                .map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    {formatValue(
                      value,
                      typeof value === "object"
                        ? "json"
                        : key.includes("date") || key.endsWith("_at")
                          ? "date"
                          : key === "status"
                            ? "status"
                            : "text",
                      dictionary,
                      locale
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            )}
            {renderDetailExtra?.(selected, {
              refreshDetail: () => refreshDetail(selected),
              detailLoading
            })}
            <div className="record-actions">
              {canEdit ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFormError(null);
                    setEditOpen(true);
                  }}
                >
                  {dictionary.editRecord}
                </Button>
              ) : null}
              {canDelete ? (
                <Button variant="danger" disabled={actionBusy !== null} onClick={deleteSelected}>
                  {actionBusy === "delete" ? dictionary.executing : dictionary.deleteRecord}
                </Button>
              ) : null}
              {visibleActions.map((action) => {
                const key = `${action.label}-${String(selected.id ?? selected.public_id ?? "record")}`;
                return (
                  <Button
                    key={action.label}
                    variant={action.variant ?? "secondary"}
                    disabled={actionBusy !== null}
                    onClick={() => executeAction(action, selected)}
                  >
                    {actionBusy === key ? dictionary.executing : action.label}
                  </Button>
                );
              })}
            </div>
          </>
        ) : null}
      </Modal>

      {createConfig ? (
        <ResourceFormModal
          open={createOpen}
          title={createConfig.title}
          fields={createConfig.fields}
          submitLabel={dictionary.createRecord}
          busy={formBusy}
          error={formError}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCreate}
        />
      ) : null}

      {editConfig && selected ? (
        <ResourceFormModal
          open={editOpen}
          title={editConfig.title}
          fields={editConfig.fields}
          initialValues={editConfig.fromRow?.(selected)}
          submitLabel={dictionary.saveChanges}
          busy={formBusy}
          error={formError}
          onClose={() => setEditOpen(false)}
          onSubmit={submitEdit}
        />
      ) : null}

      {compose?.action.compose ? (
        <ResourceFormModal
          open
          title={compose.action.compose.title}
          fields={[
            {
              key: "message",
              label: compose.action.compose.label,
              type: "textarea",
              required: true,
              placeholder: compose.action.compose.placeholder
            }
          ]}
          submitLabel={dictionary.sendReply}
          busy={formBusy}
          error={formError}
          onClose={() => setCompose(null)}
          onSubmit={submitCompose}
        />
      ) : null}
    </>
  );
}
