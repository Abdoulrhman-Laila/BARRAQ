"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api/client";
import { detailEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

type EventType = "lesson" | "exam" | "other";

interface ClassEvent {
  id: number;
  classroom?: string;
  title: string;
  description?: string;
  event_type?: EventType | string;
  start_at: string;
  end_at?: string | null;
}

interface Paginated<T> {
  results?: T[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

function eventTypeLabel(type: string, dictionary: Dictionary): string {
  if (type === "lesson") return dictionary.eventTypeLesson;
  if (type === "exam") return dictionary.eventTypeExam;
  if (type === "other") return dictionary.eventTypeOther;
  return type || dictionary.eventTypeOther;
}

/**
 * Calendar items for one class, on the class record rather than the sidebar.
 * class_work.view lists; class_work.manage writes. Scope stays on the backend.
 */
export function ClassEventsPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : "ar-SY";
  const { can } = useAdmin();
  const publicId = String(classroom.public_id ?? "");
  const canView = can("class_work.view");
  const canManage = can("class_work.manage");

  const [items, setItems] = useState<ClassEvent[] | null>(null);
  const [editing, setEditing] = useState<ClassEvent | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("lesson");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!publicId || !canView) return;
    try {
      const response = await api.get<Paginated<ClassEvent> | ClassEvent[]>(endpoints.admin.classEvents, {
        classroom: publicId,
        page_size: 100
      });
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload?.results ?? [];
      const scoped = rows.filter((row) => !row.classroom || String(row.classroom) === publicId);
      scoped.sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
      setItems(scoped);
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setItems([]);
    }
  }, [canView, publicId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setEventType("lesson");
    setStartAt("");
    setEndAt("");
    setComposing(true);
  }

  function startEdit(item: ClassEvent) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setEventType((item.event_type as EventType) || "lesson");
    setStartAt(toLocalInput(item.start_at));
    setEndAt(toLocalInput(item.end_at));
    setComposing(true);
  }

  function cancelForm() {
    setComposing(false);
    setEditing(null);
    setTitle("");
    setDescription("");
    setEventType("lesson");
    setStartAt("");
    setEndAt("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !startAt) return;
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        event_type: eventType,
        start_at: toIso(startAt),
        end_at: endAt ? toIso(endAt) : null
      };
      if (editing) {
        await api.patch(detailEndpoint(endpoints.admin.classEvents, editing.id), body);
        toast.success(dictionary.eventUpdated);
      } else {
        await api.post(endpoints.admin.classEvents, { classroom: publicId, ...body });
        toast.success(dictionary.eventCreated);
      }
      cancelForm();
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ClassEvent) {
    if (!window.confirm(dictionary.deleteEventConfirm)) return;
    setBusy(true);
    try {
      await api.delete(detailEndpoint(endpoints.admin.classEvents, item.id));
      toast.success(dictionary.eventDeleted);
      if (editing?.id === item.id) cancelForm();
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  if (!canView) return null;

  if (items === null) {
    return (
      <section aria-label={dictionary.classEvents} aria-busy="true">
        <h4>{dictionary.classEvents}</h4>
        <p className="muted">{dictionary.loading}</p>
      </section>
    );
  }

  return (
    <section aria-label={dictionary.classEvents} className="announcements-panel">
      <header className="announcements-panel__head">
        <div>
          <h4>{dictionary.classEvents}</h4>
          <p className="muted">{dictionary.classEventsDesc}</p>
        </div>
      </header>

      {canManage ? (
        composing ? (
          <form className="announcements-panel__composer" onSubmit={save}>
            <p className="announcements-panel__composer-kicker">
              {editing ? dictionary.editEvent : dictionary.eventComposerHint}
            </p>
            <Field label={dictionary.eventTitle}>
              {(props) => (
                <TextInput
                  {...props}
                  value={title}
                  required
                  maxLength={255}
                  autoFocus
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </Field>
            <Field label={dictionary.eventType}>
              {(props) => (
                <Select
                  {...props}
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as EventType)}
                >
                  <option value="lesson">{dictionary.eventTypeLesson}</option>
                  <option value="exam">{dictionary.eventTypeExam}</option>
                  <option value="other">{dictionary.eventTypeOther}</option>
                </Select>
              )}
            </Field>
            <div className="events-panel__times">
              <Field label={dictionary.eventStart}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                  />
                )}
              </Field>
              <Field label={dictionary.eventEnd}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={dictionary.eventDescription}>
              {(props) => (
                <textarea
                  {...props}
                  className="control announcements-panel__body"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              )}
            </Field>
            <footer className="announcements-panel__composer-bar">
              <div className="announcements-panel__form-actions">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={cancelForm}>
                  {dictionary.cancel}
                </Button>
                <Button type="submit" size="sm" disabled={busy || !title.trim() || !startAt}>
                  {busy ? dictionary.executing : editing ? dictionary.saveEvent : dictionary.createEvent}
                </Button>
              </div>
            </footer>
          </form>
        ) : (
          <button type="button" className="announcements-panel__launch" onClick={startCreate}>
            <span className="announcements-panel__launch-icon" aria-hidden="true">
              <Icon name="calendar" />
            </span>
            <span>
              <strong>{dictionary.createEvent}</strong>
              <small>{dictionary.eventComposerHint}</small>
            </span>
          </button>
        )
      ) : null}

      {items.length === 0 ? (
        <p className="announcements-panel__empty">{dictionary.noEvents}</p>
      ) : (
        <ul className="announcements-panel__list">
          {items.map((item) => {
            const type = String(item.event_type ?? "other");
            return (
              <li key={item.id} className="announcements-panel__item">
                <div className="announcements-panel__item-head">
                  <strong>{item.title}</strong>
                  <Badge value={type} label={eventTypeLabel(type, dictionary)} />
                </div>
                {item.description ? <p>{item.description}</p> : null}
                <footer className="announcements-panel__item-foot">
                  <small>
                    {new Date(item.start_at).toLocaleString(localeTag, {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                    {item.end_at
                      ? ` — ${new Date(item.end_at).toLocaleString(localeTag, {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}`
                      : ""}
                  </small>
                  {canManage ? (
                    <div className="announcements-panel__item-actions">
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => startEdit(item)}>
                        {dictionary.editRecord}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(item)}>
                        {dictionary.deleteRecord}
                      </Button>
                    </div>
                  ) : null}
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
