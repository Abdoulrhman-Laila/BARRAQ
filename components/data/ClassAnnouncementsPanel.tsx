"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api/client";
import { detailEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface Announcement {
  id: number;
  classroom?: string;
  title: string;
  body?: string;
  pinned?: boolean;
  created_by_name?: string;
  created_at?: string | null;
}

interface Paginated<T> {
  results?: T[];
}

/**
 * Notices for one class, shown on the class record rather than as a
 * sidebar destination. Listing is gated on class_work.view; writing on
 * class_work.manage. The backend still scopes rows to the caller's classes.
 */
export function ClassAnnouncementsPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : "ar-SY";
  const { can } = useAdmin();
  const publicId = String(classroom.public_id ?? "");
  const canView = can("class_work.view");
  const canManage = can("class_work.manage");

  const [items, setItems] = useState<Announcement[] | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!publicId || !canView) return;
    try {
      const response = await api.get<Paginated<Announcement> | Announcement[]>(
        endpoints.admin.classAnnouncements,
        { classroom: publicId, page_size: 100 }
      );
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload?.results ?? [];
      const scoped = rows.filter((row) => !row.classroom || String(row.classroom) === publicId);
      scoped.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
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
    setBody("");
    setPinned(false);
    setComposing(true);
  }

  function startEdit(item: Announcement) {
    setEditing(item);
    setTitle(item.title);
    setBody(item.body ?? "");
    setPinned(Boolean(item.pinned));
    setComposing(true);
  }

  function cancelForm() {
    setComposing(false);
    setEditing(null);
    setTitle("");
    setBody("");
    setPinned(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await api.patch(detailEndpoint(endpoints.admin.classAnnouncements, editing.id), {
          title: title.trim(),
          body: body.trim(),
          pinned
        });
        toast.success(dictionary.announcementUpdated);
      } else {
        await api.post(endpoints.admin.classAnnouncements, {
          classroom: publicId,
          title: title.trim(),
          body: body.trim(),
          pinned
        });
        toast.success(dictionary.announcementCreated);
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

  async function remove(item: Announcement) {
    if (!window.confirm(dictionary.deleteAnnouncementConfirm)) return;
    setBusy(true);
    try {
      await api.delete(detailEndpoint(endpoints.admin.classAnnouncements, item.id));
      toast.success(dictionary.announcementDeleted);
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
      <section aria-label={dictionary.classAnnouncements} aria-busy="true">
        <h4>{dictionary.classAnnouncements}</h4>
        <p className="muted">{dictionary.loading}</p>
      </section>
    );
  }

  return (
    <section aria-label={dictionary.classAnnouncements} className="announcements-panel">
      <header className="announcements-panel__head">
        <div>
          <h4>{dictionary.classAnnouncements}</h4>
          <p className="muted">{dictionary.classAnnouncementsDesc}</p>
        </div>
      </header>

      {canManage ? (
        composing ? (
          <form className="announcements-panel__composer" onSubmit={save}>
            <p className="announcements-panel__composer-kicker">
              {editing ? dictionary.editAnnouncement : dictionary.composerHint}
            </p>
            <Field label={dictionary.announcementTitle}>
              {(props) => (
                <TextInput
                  {...props}
                  value={title}
                  required
                  maxLength={255}
                  autoFocus
                  placeholder={dictionary.announcementTitle}
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
            </Field>
            <Field label={dictionary.announcementBody}>
              {(props) => (
                <textarea
                  {...props}
                  className="control announcements-panel__body"
                  rows={5}
                  value={body}
                  placeholder={dictionary.classAnnouncementsDesc}
                  onChange={(event) => setBody(event.target.value)}
                />
              )}
            </Field>
            <footer className="announcements-panel__composer-bar">
              <label className="announcements-panel__pin">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(event) => setPinned(event.target.checked)}
                />
                {dictionary.pinAnnouncement}
              </label>
              <div className="announcements-panel__form-actions">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={cancelForm}>
                  {dictionary.cancel}
                </Button>
                <Button type="submit" size="sm" disabled={busy || !title.trim()}>
                  {busy
                    ? dictionary.executing
                    : editing
                      ? dictionary.saveAnnouncement
                      : dictionary.publishAnnouncement}
                </Button>
              </div>
            </footer>
          </form>
        ) : (
          <button type="button" className="announcements-panel__launch" onClick={startCreate}>
            <span className="announcements-panel__launch-icon" aria-hidden="true">
              <Icon name="file" />
            </span>
            <span>
              <strong>{dictionary.publishAnnouncement}</strong>
              <small>{dictionary.composerHint}</small>
            </span>
          </button>
        )
      ) : null}

      {items.length === 0 ? (
        <p className="announcements-panel__empty">{dictionary.noAnnouncements}</p>
      ) : (
        <ul className="announcements-panel__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`announcements-panel__item${item.pinned ? " announcements-panel__item--pinned" : ""}`}
            >
              <div className="announcements-panel__item-head">
                <strong>{item.title}</strong>
                {item.pinned ? <Badge value="pinned" label={dictionary.pinned} /> : null}
              </div>
              {item.body ? <p>{item.body}</p> : null}
              <footer className="announcements-panel__item-foot">
                <small>
                  {[item.created_by_name, formatWhen(item.created_at, localeTag)].filter(Boolean).join(" · ")}
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
          ))}
        </ul>
      )}
    </section>
  );
}

function formatWhen(value: string | null | undefined, localeTag: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}
