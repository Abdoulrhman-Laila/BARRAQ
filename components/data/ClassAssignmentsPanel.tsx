"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api/client";
import {
  assignmentGradeEndpoint,
  classAssignmentSubmissionsEndpoint,
  detailEndpoint,
  endpoints
} from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

type AssignmentStatus = "draft" | "published" | "closed";

interface ClassAssignment {
  id: number;
  classroom?: string;
  subject_name?: string | null;
  title: string;
  instructions?: string;
  due_at?: string | null;
  allow_late?: boolean;
  max_points?: number;
  status?: AssignmentStatus | string;
  submissions_count?: number;
}

interface AssignmentSubmission {
  id: number;
  student_name?: string;
  student_email?: string;
  text_response?: string;
  original_filename?: string;
  file_size?: number;
  submitted_at?: string;
  status?: string;
  grade?: string | null;
  feedback?: string;
  graded_at?: string | null;
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

function assignmentStatusLabel(status: string, dictionary: Dictionary): string {
  if (status === "draft") return dictionary.assignmentStatusDraft;
  if (status === "published") return dictionary.assignmentStatusPublished;
  if (status === "closed") return dictionary.assignmentStatusClosed;
  return status || dictionary.assignmentStatusDraft;
}

function submissionStatusLabel(status: string, dictionary: Dictionary): string {
  if (status === "submitted") return dictionary.submissionStatusSubmitted;
  if (status === "graded") return dictionary.submissionStatusGraded;
  if (status === "late") return dictionary.submissionStatusLate;
  return status || dictionary.submissionStatusSubmitted;
}

function formatBytes(size?: number): string {
  if (!size || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Class assignments live on the class record, not the sidebar.
 * class_work.view lists; class_work.manage writes and grades.
 */
export function ClassAssignmentsPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : "ar-SY";
  const { can } = useAdmin();
  const publicId = String(classroom.public_id ?? "");
  const canView = can("class_work.view");
  const canManage = can("class_work.manage");

  const [items, setItems] = useState<ClassAssignment[] | null>(null);
  const [editing, setEditing] = useState<ClassAssignment | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxPoints, setMaxPoints] = useState("100");
  const [allowLate, setAllowLate] = useState(false);
  const [status, setStatus] = useState<AssignmentStatus>("published");
  const [busy, setBusy] = useState(false);

  const [openId, setOpenId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[] | null>(null);
  const [submissionsBusy, setSubmissionsBusy] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, { grade: string; feedback: string }>>({});

  const load = useCallback(async () => {
    if (!publicId || !canView) return;
    try {
      const response = await api.get<Paginated<ClassAssignment> | ClassAssignment[]>(
        endpoints.admin.classAssignments,
        { classroom: publicId, page_size: 100 }
      );
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload?.results ?? [];
      const scoped = rows.filter((row) => !row.classroom || String(row.classroom) === publicId);
      scoped.sort((a, b) => String(a.due_at ?? "").localeCompare(String(b.due_at ?? "")));
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
    setInstructions("");
    setDueAt("");
    setMaxPoints("100");
    setAllowLate(false);
    setStatus("published");
    setComposing(true);
  }

  function startEdit(item: ClassAssignment) {
    setEditing(item);
    setTitle(item.title);
    setInstructions(item.instructions ?? "");
    setDueAt(toLocalInput(item.due_at));
    setMaxPoints(item.max_points != null ? String(item.max_points) : "100");
    setAllowLate(Boolean(item.allow_late));
    setStatus((item.status as AssignmentStatus) || "published");
    setComposing(true);
  }

  function cancelForm() {
    setComposing(false);
    setEditing(null);
    setTitle("");
    setInstructions("");
    setDueAt("");
    setMaxPoints("100");
    setAllowLate(false);
    setStatus("published");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const points = Number.parseInt(maxPoints, 10);
      const body = {
        title: title.trim(),
        instructions: instructions.trim(),
        due_at: dueAt ? toIso(dueAt) : null,
        max_points: Number.isFinite(points) && points >= 0 ? points : 100,
        allow_late: allowLate,
        status
      };
      if (editing) {
        await api.patch(detailEndpoint(endpoints.admin.classAssignments, editing.id), body);
        toast.success(dictionary.assignmentUpdated);
      } else {
        await api.post(endpoints.admin.classAssignments, { classroom: publicId, ...body });
        toast.success(dictionary.assignmentCreated);
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

  async function remove(item: ClassAssignment) {
    if (!window.confirm(dictionary.deleteAssignmentConfirm)) return;
    setBusy(true);
    try {
      await api.delete(detailEndpoint(endpoints.admin.classAssignments, item.id));
      toast.success(dictionary.assignmentDeleted);
      if (editing?.id === item.id) cancelForm();
      if (openId === item.id) {
        setOpenId(null);
        setSubmissions(null);
      }
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function fetchSubmissions(assignmentId: number) {
    setSubmissionsBusy(true);
    try {
      const response = await api.get<Paginated<AssignmentSubmission> | AssignmentSubmission[]>(
        classAssignmentSubmissionsEndpoint(assignmentId),
        { page_size: 100 }
      );
      const payload = response.data;
      const rows = Array.isArray(payload) ? payload : payload?.results ?? [];
      setSubmissions(rows);
      setGradeDrafts(
        Object.fromEntries(
          rows.map((row) => [row.id, { grade: row.grade ?? "", feedback: row.feedback ?? "" }])
        )
      );
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setSubmissions([]);
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setSubmissionsBusy(false);
    }
  }

  async function toggleSubmissions(item: ClassAssignment) {
    if (openId === item.id) {
      setOpenId(null);
      setSubmissions(null);
      return;
    }
    setOpenId(item.id);
    setSubmissions(null);
    await fetchSubmissions(item.id);
  }

  async function saveGrade(submission: AssignmentSubmission) {
    const draft = gradeDrafts[submission.id];
    if (!draft?.grade.trim()) return;
    setBusy(true);
    try {
      await api.patch(assignmentGradeEndpoint(submission.id), {
        grade: draft.grade.trim(),
        feedback: draft.feedback.trim()
      });
      toast.success(dictionary.gradeSaved);
      if (openId != null) await fetchSubmissions(openId);
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
      <section aria-label={dictionary.classAssignments} aria-busy="true">
        <h4>{dictionary.classAssignments}</h4>
        <p className="muted">{dictionary.loading}</p>
      </section>
    );
  }

  return (
    <section aria-label={dictionary.classAssignments} className="announcements-panel">
      <header className="announcements-panel__head">
        <div>
          <h4>{dictionary.classAssignments}</h4>
          <p className="muted">{dictionary.classAssignmentsDesc}</p>
        </div>
      </header>

      {canManage ? (
        composing ? (
          <form className="announcements-panel__composer" onSubmit={save}>
            <p className="announcements-panel__composer-kicker">
              {editing ? dictionary.editAssignment : dictionary.assignmentComposerHint}
            </p>
            <Field label={dictionary.assignmentTitle}>
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
            <Field label={dictionary.assignmentInstructions}>
              {(props) => (
                <textarea
                  {...props}
                  className="control announcements-panel__body"
                  rows={4}
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              )}
            </Field>
            <div className="events-panel__times">
              <Field label={dictionary.assignmentDue}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                  />
                )}
              </Field>
              <Field label={dictionary.assignmentMaxPoints}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    value={maxPoints}
                    onChange={(event) => setMaxPoints(event.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={dictionary.assignmentStatus}>
              {(props) => (
                <Select
                  {...props}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as AssignmentStatus)}
                >
                  <option value="draft">{dictionary.assignmentStatusDraft}</option>
                  <option value="published">{dictionary.assignmentStatusPublished}</option>
                  <option value="closed">{dictionary.assignmentStatusClosed}</option>
                </Select>
              )}
            </Field>
            <footer className="announcements-panel__composer-bar">
              <label className="announcements-panel__pin">
                <input
                  type="checkbox"
                  checked={allowLate}
                  onChange={(event) => setAllowLate(event.target.checked)}
                />
                {dictionary.assignmentAllowLate}
              </label>
              <div className="announcements-panel__form-actions">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={cancelForm}>
                  {dictionary.cancel}
                </Button>
                <Button type="submit" size="sm" disabled={busy || !title.trim()}>
                  {busy ? dictionary.executing : editing ? dictionary.saveAssignment : dictionary.createAssignment}
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
              <strong>{dictionary.createAssignment}</strong>
              <small>{dictionary.assignmentComposerHint}</small>
            </span>
          </button>
        )
      ) : null}

      {items.length === 0 ? (
        <p className="announcements-panel__empty">{dictionary.noAssignments}</p>
      ) : (
        <ul className="announcements-panel__list">
          {items.map((item) => {
            const assignmentStatus = String(item.status ?? "draft");
            const dueLabel = item.due_at
              ? new Date(item.due_at).toLocaleString(localeTag, {
                  dateStyle: "medium",
                  timeStyle: "short"
                })
              : null;
            const open = openId === item.id;
            return (
              <li key={item.id} className="announcements-panel__item">
                <div className="announcements-panel__item-head">
                  <strong>{item.title}</strong>
                  <Badge value={assignmentStatus} label={assignmentStatusLabel(assignmentStatus, dictionary)} />
                </div>
                {item.instructions ? <p>{item.instructions}</p> : null}
                <p className="assignments-panel__meta">
                  {item.subject_name ? <span>{item.subject_name}</span> : null}
                  {dueLabel ? <span>{dueLabel}</span> : null}
                  {item.max_points != null ? <span>{item.max_points}</span> : null}
                  {item.allow_late ? <span>{dictionary.assignmentAllowLate}</span> : null}
                  <span>
                    {dictionary.assignmentSubmissions}: {Number(item.submissions_count ?? 0).toLocaleString(localeTag)}
                  </span>
                </p>
                <footer className="announcements-panel__item-foot">
                  <div className="announcements-panel__item-actions">
                    <Button size="sm" variant="ghost" disabled={submissionsBusy} onClick={() => void toggleSubmissions(item)}>
                      {open ? dictionary.hideSubmissions : dictionary.openSubmissions}
                    </Button>
                    {canManage ? (
                      <>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => startEdit(item)}>
                          {dictionary.editRecord}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(item)}>
                          {dictionary.deleteRecord}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </footer>
                {open ? (
                  <div className="assignments-panel__submissions">
                    {submissionsBusy || submissions === null ? (
                      <p className="muted">{dictionary.loading}</p>
                    ) : submissions.length === 0 ? (
                      <p className="muted">{dictionary.noSubmissions}</p>
                    ) : (
                      <ul>
                        {submissions.map((submission) => {
                          const draft = gradeDrafts[submission.id] ?? { grade: "", feedback: "" };
                          const fileLabel = [submission.original_filename, formatBytes(submission.file_size)]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <li key={submission.id} className="assignments-panel__submission">
                              <div className="announcements-panel__item-head">
                                <strong>{submission.student_name || submission.student_email || "—"}</strong>
                                <Badge
                                  value={String(submission.status ?? "submitted")}
                                  label={submissionStatusLabel(String(submission.status ?? "submitted"), dictionary)}
                                />
                              </div>
                              {submission.student_email && submission.student_name ? (
                                <small>{submission.student_email}</small>
                              ) : null}
                              {submission.submitted_at ? (
                                <small>
                                  {new Date(submission.submitted_at).toLocaleString(localeTag, {
                                    dateStyle: "medium",
                                    timeStyle: "short"
                                  })}
                                </small>
                              ) : null}
                              {submission.text_response ? (
                                <p>
                                  <span className="assignments-panel__label">{dictionary.submissionText}</span>
                                  {submission.text_response}
                                </p>
                              ) : null}
                              {fileLabel ? (
                                <p>
                                  <span className="assignments-panel__label">{dictionary.submissionFile}</span>
                                  {fileLabel}
                                </p>
                              ) : null}
                              {canManage ? (
                                <form
                                  className="assignments-panel__grade"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    void saveGrade(submission);
                                  }}
                                >
                                  <Field label={dictionary.submissionGrade}>
                                    {(props) => (
                                      <TextInput
                                        {...props}
                                        inputMode="decimal"
                                        value={draft.grade}
                                        onChange={(event) =>
                                          setGradeDrafts((current) => ({
                                            ...current,
                                            [submission.id]: { ...draft, grade: event.target.value }
                                          }))
                                        }
                                      />
                                    )}
                                  </Field>
                                  <Field label={dictionary.submissionFeedback}>
                                    {(props) => (
                                      <textarea
                                        {...props}
                                        className="control announcements-panel__body"
                                        rows={2}
                                        value={draft.feedback}
                                        onChange={(event) =>
                                          setGradeDrafts((current) => ({
                                            ...current,
                                            [submission.id]: { ...draft, feedback: event.target.value }
                                          }))
                                        }
                                      />
                                    )}
                                  </Field>
                                  <Button type="submit" size="sm" disabled={busy || !draft.grade.trim()}>
                                    {dictionary.saveGrade}
                                  </Button>
                                </form>
                              ) : submission.grade != null && submission.grade !== "" ? (
                                <p>
                                  <span className="assignments-panel__label">{dictionary.submissionGrade}</span>
                                  {submission.grade}
                                  {submission.feedback ? ` — ${submission.feedback}` : ""}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
