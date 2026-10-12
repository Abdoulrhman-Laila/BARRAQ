"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAdmin } from "@/components/providers/AdminProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api/client";
import {
  classQuizAnswerGradeEndpoint,
  classQuizAttemptsEndpoint,
  detailEndpoint,
  endpoints
} from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

type QuizStatus = "draft" | "published" | "archived";
type QuestionType = "mcq" | "true_false" | "written";

interface QuizChoice {
  text: string;
  is_correct?: boolean;
  order?: number;
}

interface QuizQuestion {
  id: number;
  text: string;
  question_type?: QuestionType | string;
  points?: number;
  order?: number;
  explanation?: string;
  choices?: QuizChoice[];
}

interface ClassQuiz {
  id: number;
  classroom?: string;
  subject_name?: string | null;
  title: string;
  description?: string;
  time_limit_minutes?: number | null;
  due_at?: string | null;
  status?: QuizStatus | string;
  questions?: QuizQuestion[];
  questions_count?: number;
}

interface QuizAnswer {
  id?: number;
  question_text?: string;
  question_type?: string;
  text_answer?: string;
  is_correct?: boolean | null;
  points_awarded?: string;
}

interface QuizAttempt {
  id: number;
  student_name?: string;
  student_email?: string;
  status?: string;
  started_at?: string;
  submitted_at?: string | null;
  score?: string;
  max_score?: string;
  percentage?: string | null;
  fully_graded?: boolean;
  answers?: QuizAnswer[];
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

function quizStatusLabel(status: string, dictionary: Dictionary): string {
  if (status === "draft") return dictionary.assignmentStatusDraft;
  if (status === "published") return dictionary.assignmentStatusPublished;
  if (status === "archived") return dictionary.classQuizStatusArchived;
  return status || dictionary.assignmentStatusDraft;
}

function questionTypeLabel(type: string, dictionary: Dictionary): string {
  if (type === "mcq") return dictionary.classQuizQuestionMcq;
  if (type === "true_false") return dictionary.classQuizQuestionTrueFalse;
  if (type === "written") return dictionary.classQuizQuestionWritten;
  return type || dictionary.classQuizQuestionMcq;
}

function attemptStatusLabel(status: string, dictionary: Dictionary): string {
  if (status === "submitted") return dictionary.submissionStatusSubmitted;
  if (status === "in_progress") return dictionary.classQuizAttemptInProgress;
  return status || dictionary.submissionStatusSubmitted;
}

function emptyMcqChoices(): QuizChoice[] {
  return [
    { text: "", is_correct: true, order: 0 },
    { text: "", is_correct: false, order: 1 }
  ];
}

function unwrap<T>(payload: Paginated<T> | T[] | { data?: T[] } | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function classroomKey(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as { public_id?: unknown; id?: unknown };
    return String(record.public_id ?? record.id ?? "");
  }
  return "";
}

/**
 * Class quizzes live on the class record, not the sidebar.
 * class_work.view lists quizzes and attempts; class_work.manage writes.
 */
export function ClassQuizzesPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const localeTag = locale === "en" ? "en-US" : "ar-SY";
  const { can } = useAdmin();
  const publicId = String(classroom.public_id ?? "");
  const canView = can("class_work.view");
  const canManage = can("class_work.manage");

  const [items, setItems] = useState<ClassQuiz[] | null>(null);
  const [editing, setEditing] = useState<ClassQuiz | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [status, setStatus] = useState<QuizStatus>("published");
  const [busy, setBusy] = useState(false);

  const [openQuestionsId, setOpenQuestionsId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [questionsBusy, setQuestionsBusy] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [questionPoints, setQuestionPoints] = useState("1");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [choices, setChoices] = useState<QuizChoice[]>(emptyMcqChoices());

  const [openAttemptsId, setOpenAttemptsId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[] | null>(null);
  const [attemptsBusy, setAttemptsBusy] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    if (!publicId || !canView) return;
    try {
      const response = await api.get<Paginated<ClassQuiz> | ClassQuiz[] | { data?: ClassQuiz[] }>(
        endpoints.admin.classQuizzes,
        {
          classroom: publicId,
          page_size: 100
        }
      );
      const rows = unwrap(response.data);
      const scoped = rows.filter((row) => {
        const owner = classroomKey(row.classroom);
        return !owner || owner === publicId;
      });
      scoped.sort((a, b) => String(a.due_at ?? "").localeCompare(String(b.due_at ?? "")));
      setItems(scoped);
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setItems([]);
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    }
  }, [canView, dictionary.actionFailed, publicId]);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDueAt("");
    setTimeLimit("");
    setStatus("published");
    setComposing(true);
  }

  function startEdit(item: ClassQuiz) {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setDueAt(toLocalInput(item.due_at));
    setTimeLimit(item.time_limit_minutes != null ? String(item.time_limit_minutes) : "");
    setStatus((item.status as QuizStatus) || "published");
    setComposing(true);
  }

  function cancelForm() {
    setComposing(false);
    setEditing(null);
    setTitle("");
    setDescription("");
    setDueAt("");
    setTimeLimit("");
    setStatus("published");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const minutes = Number.parseInt(timeLimit, 10);
      const body = {
        title: title.trim(),
        description: description.trim(),
        due_at: dueAt ? toIso(dueAt) : null,
        time_limit_minutes: Number.isFinite(minutes) && minutes >= 0 ? minutes : null,
        status
      };
      if (editing) {
        await api.patch(detailEndpoint(endpoints.admin.classQuizzes, editing.id), body);
        toast.success(dictionary.classQuizUpdated);
      } else {
        await api.post(endpoints.admin.classQuizzes, { classroom: publicId, ...body });
        toast.success(dictionary.classQuizCreated);
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

  async function remove(item: ClassQuiz) {
    if (!window.confirm(dictionary.deleteClassQuizConfirm)) return;
    setBusy(true);
    try {
      await api.delete(detailEndpoint(endpoints.admin.classQuizzes, item.id));
      toast.success(dictionary.classQuizDeleted);
      if (editing?.id === item.id) cancelForm();
      if (openQuestionsId === item.id) {
        setOpenQuestionsId(null);
        setQuestions(null);
      }
      if (openAttemptsId === item.id) {
        setOpenAttemptsId(null);
        setAttempts(null);
      }
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function fetchQuestions(quizId: number) {
    setQuestionsBusy(true);
    try {
      const response = await api.get<ClassQuiz>(detailEndpoint(endpoints.admin.classQuizzes, quizId));
      setQuestions(response.data?.questions ?? []);
      setAddingQuestion(false);
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setQuestions([]);
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setQuestionsBusy(false);
    }
  }

  async function toggleQuestions(item: ClassQuiz) {
    if (openQuestionsId === item.id) {
      setOpenQuestionsId(null);
      setQuestions(null);
      setAddingQuestion(false);
      return;
    }
    setOpenQuestionsId(item.id);
    setQuestions(null);
    await fetchQuestions(item.id);
  }

  function resetQuestionForm() {
    setQuestionText("");
    setQuestionType("mcq");
    setQuestionPoints("1");
    setQuestionExplanation("");
    setChoices(emptyMcqChoices());
    setAddingQuestion(false);
  }

  async function saveQuestion(event: FormEvent) {
    event.preventDefault();
    if (!openQuestionsId || !questionText.trim()) return;
    const points = Number.parseInt(questionPoints, 10);
    const order = questions?.length ?? 0;
    const body: Record<string, unknown> = {
      class_quiz: openQuestionsId,
      text: questionText.trim(),
      question_type: questionType,
      points: Number.isFinite(points) && points >= 0 ? points : 1,
      order,
      explanation: questionExplanation.trim()
    };
    if (questionType === "mcq") {
      const filled = choices.map((choice, index) => ({
        text: choice.text.trim(),
        is_correct: Boolean(choice.is_correct),
        order: index
      })).filter((choice) => choice.text);
      if (filled.length < 2) return;
      body.choices = filled;
    } else if (questionType === "true_false") {
      const trueCorrect = choices[0]?.is_correct !== false;
      body.choices = [
        { text: dictionary.classQuizTrue, is_correct: trueCorrect, order: 0 },
        { text: dictionary.classQuizFalse, is_correct: !trueCorrect, order: 1 }
      ];
    }
    setBusy(true);
    try {
      await api.post(endpoints.admin.classQuizQuestions, body);
      toast.success(dictionary.classQuizQuestionCreated);
      resetQuestionForm();
      await fetchQuestions(openQuestionsId);
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(question: QuizQuestion) {
    if (!window.confirm(dictionary.deleteClassQuizQuestionConfirm)) return;
    setBusy(true);
    try {
      await api.delete(detailEndpoint(endpoints.admin.classQuizQuestions, question.id));
      toast.success(dictionary.classQuizQuestionDeleted);
      if (openQuestionsId != null) await fetchQuestions(openQuestionsId);
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  async function fetchAttempts(quizId: number) {
    setAttemptsBusy(true);
    try {
      const response = await api.get<Paginated<QuizAttempt> | QuizAttempt[]>(classQuizAttemptsEndpoint(quizId), {
        page_size: 100
      });
      const rows = unwrap(response.data);
      setAttempts(rows);
      const drafts: Record<number, string> = {};
      for (const attempt of rows) {
        for (const answer of attempt.answers ?? []) {
          if (answer.id != null) drafts[answer.id] = answer.points_awarded ?? "";
        }
      }
      setGradeDrafts(drafts);
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setAttempts([]);
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setAttemptsBusy(false);
    }
  }

  async function toggleAttempts(item: ClassQuiz) {
    if (openAttemptsId === item.id) {
      setOpenAttemptsId(null);
      setAttempts(null);
      return;
    }
    setOpenAttemptsId(item.id);
    setAttempts(null);
    await fetchAttempts(item.id);
  }

  async function saveAnswerGrade(answer: QuizAnswer) {
    if (answer.id == null) return;
    const points = (gradeDrafts[answer.id] ?? "").trim();
    if (!points) return;
    setBusy(true);
    try {
      await api.patch(classQuizAnswerGradeEndpoint(answer.id), { points_awarded: points });
      toast.success(dictionary.gradeSaved);
      if (openAttemptsId != null) await fetchAttempts(openAttemptsId);
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
      <section aria-label={dictionary.classQuizzes} aria-busy="true">
        <h4>{dictionary.classQuizzes}</h4>
        <p className="muted">{dictionary.loading}</p>
      </section>
    );
  }

  return (
    <section aria-label={dictionary.classQuizzes} className="announcements-panel">
      <header className="announcements-panel__head">
        <div>
          <h4>{dictionary.classQuizzes}</h4>
          <p className="muted">{dictionary.classQuizzesDesc}</p>
        </div>
      </header>

      {canManage ? (
        composing ? (
          <form className="announcements-panel__composer" onSubmit={save}>
            <p className="announcements-panel__composer-kicker">
              {editing ? dictionary.editClassQuiz : dictionary.classQuizComposerHint}
            </p>
            <Field label={dictionary.classQuizTitle}>
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
            <Field label={dictionary.classQuizDescription}>
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
            <div className="events-panel__times">
              <Field label={dictionary.classQuizDue}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                  />
                )}
              </Field>
              <Field label={dictionary.classQuizTimeLimit}>
                {(props) => (
                  <TextInput
                    {...props}
                    type="number"
                    min={0}
                    value={timeLimit}
                    onChange={(event) => setTimeLimit(event.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={dictionary.assignmentStatus}>
              {(props) => (
                <Select
                  {...props}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as QuizStatus)}
                >
                  <option value="draft">{dictionary.assignmentStatusDraft}</option>
                  <option value="published">{dictionary.assignmentStatusPublished}</option>
                  <option value="archived">{dictionary.classQuizStatusArchived}</option>
                </Select>
              )}
            </Field>
            <footer className="announcements-panel__composer-bar">
              <div className="announcements-panel__form-actions">
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={cancelForm}>
                  {dictionary.cancel}
                </Button>
                <Button type="submit" size="sm" disabled={busy || !title.trim()}>
                  {busy ? dictionary.executing : editing ? dictionary.saveClassQuiz : dictionary.createClassQuiz}
                </Button>
              </div>
            </footer>
          </form>
        ) : (
          <button type="button" className="announcements-panel__launch" onClick={startCreate}>
            <span className="announcements-panel__launch-icon" aria-hidden="true">
              <Icon name="quiz" />
            </span>
            <span>
              <strong>{dictionary.createClassQuiz}</strong>
              <small>{dictionary.classQuizComposerHint}</small>
            </span>
          </button>
        )
      ) : null}

      {items.length === 0 ? (
        <p className="announcements-panel__empty">{dictionary.noClassQuizzes}</p>
      ) : (
        <ul className="announcements-panel__list">
          {items.map((item) => {
            const quizStatus = String(item.status ?? "draft");
            const dueLabel = item.due_at
              ? new Date(item.due_at).toLocaleString(localeTag, {
                  dateStyle: "medium",
                  timeStyle: "short"
                })
              : null;
            const questionsOpen = openQuestionsId === item.id;
            const attemptsOpen = openAttemptsId === item.id;
            return (
              <li key={item.id} className="announcements-panel__item">
                <div className="announcements-panel__item-head">
                  <strong>{item.title}</strong>
                  <Badge value={quizStatus} label={quizStatusLabel(quizStatus, dictionary)} />
                </div>
                {item.description ? <p>{item.description}</p> : null}
                <p className="assignments-panel__meta">
                  {item.subject_name ? <span>{item.subject_name}</span> : null}
                  {dueLabel ? <span>{dueLabel}</span> : null}
                  {item.time_limit_minutes != null ? (
                    <span>
                      {item.time_limit_minutes} {dictionary.classQuizTimeLimit}
                    </span>
                  ) : null}
                  <span>
                    {dictionary.classQuizQuestions}: {Number(item.questions_count ?? 0).toLocaleString(localeTag)}
                  </span>
                </p>
                <footer className="announcements-panel__item-foot">
                  <div className="announcements-panel__item-actions">
                    <Button size="sm" variant="ghost" disabled={questionsBusy} onClick={() => void toggleQuestions(item)}>
                      {questionsOpen ? dictionary.hideClassQuizQuestions : dictionary.openClassQuizQuestions}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={attemptsBusy} onClick={() => void toggleAttempts(item)}>
                      {attemptsOpen ? dictionary.hideClassQuizAttempts : dictionary.openClassQuizAttempts}
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

                {questionsOpen ? (
                  <div className="assignments-panel__submissions">
                    {questionsBusy || questions === null ? (
                      <p className="muted">{dictionary.loading}</p>
                    ) : (
                      <>
                        {questions.length === 0 ? (
                          <p className="muted">{dictionary.noClassQuizQuestions}</p>
                        ) : (
                          <ul>
                            {questions.map((question) => {
                              const type = String(question.question_type ?? "mcq");
                              return (
                                <li key={question.id} className="assignments-panel__submission">
                                  <div className="announcements-panel__item-head">
                                    <strong>{question.text}</strong>
                                    <Badge value={type} label={questionTypeLabel(type, dictionary)} />
                                  </div>
                                  <p className="assignments-panel__meta">
                                    {question.points != null ? (
                                      <span>
                                        {dictionary.classQuizQuestionPoints}: {question.points}
                                      </span>
                                    ) : null}
                                  </p>
                                  {question.choices?.length ? (
                                    <ul className="quizzes-panel__choices">
                                      {question.choices.map((choice, index) => (
                                        <li key={`${question.id}-${index}`}>
                                          {choice.text}
                                          {choice.is_correct ? ` · ${dictionary.classQuizChoiceCorrect}` : ""}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {question.explanation ? <p>{question.explanation}</p> : null}
                                  {canManage ? (
                                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void removeQuestion(question)}>
                                      {dictionary.deleteRecord}
                                    </Button>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {canManage ? (
                          addingQuestion ? (
                            <form className="announcements-panel__composer" onSubmit={saveQuestion}>
                              <Field label={dictionary.classQuizQuestionText}>
                                {(props) => (
                                  <textarea
                                    {...props}
                                    className="control announcements-panel__body"
                                    rows={3}
                                    required
                                    value={questionText}
                                    onChange={(event) => setQuestionText(event.target.value)}
                                  />
                                )}
                              </Field>
                              <div className="events-panel__times">
                                <Field label={dictionary.classQuizQuestionType}>
                                  {(props) => (
                                    <Select
                                      {...props}
                                      value={questionType}
                                      onChange={(event) => {
                                        const next = event.target.value as QuestionType;
                                        setQuestionType(next);
                                        if (next === "mcq") setChoices(emptyMcqChoices());
                                        else if (next === "true_false") {
                                          setChoices([{ text: dictionary.classQuizTrue, is_correct: true, order: 0 }]);
                                        } else {
                                          setChoices([]);
                                        }
                                      }}
                                    >
                                      <option value="mcq">{dictionary.classQuizQuestionMcq}</option>
                                      <option value="true_false">{dictionary.classQuizQuestionTrueFalse}</option>
                                      <option value="written">{dictionary.classQuizQuestionWritten}</option>
                                    </Select>
                                  )}
                                </Field>
                                <Field label={dictionary.classQuizQuestionPoints}>
                                  {(props) => (
                                    <TextInput
                                      {...props}
                                      type="number"
                                      min={0}
                                      value={questionPoints}
                                      onChange={(event) => setQuestionPoints(event.target.value)}
                                    />
                                  )}
                                </Field>
                              </div>
                              {questionType === "mcq"
                                ? choices.map((choice, index) => (
                                    <div key={index} className="quizzes-panel__choice-row">
                                      <Field label={`${dictionary.classQuizChoice} ${index + 1}`}>
                                        {(props) => (
                                          <TextInput
                                            {...props}
                                            value={choice.text}
                                            required
                                            maxLength={500}
                                            onChange={(event) =>
                                              setChoices((current) =>
                                                current.map((row, rowIndex) =>
                                                  rowIndex === index ? { ...row, text: event.target.value } : row
                                                )
                                              )
                                            }
                                          />
                                        )}
                                      </Field>
                                      <label className="announcements-panel__pin">
                                        <input
                                          type="radio"
                                          name={`correct-${item.id}`}
                                          checked={Boolean(choice.is_correct)}
                                          onChange={() =>
                                            setChoices((current) =>
                                              current.map((row, rowIndex) => ({
                                                ...row,
                                                is_correct: rowIndex === index
                                              }))
                                            )
                                          }
                                        />
                                        {dictionary.classQuizChoiceCorrect}
                                      </label>
                                    </div>
                                  ))
                                : null}
                              {questionType === "true_false" ? (
                                <Field label={dictionary.classQuizChoiceCorrect}>
                                  {(props) => (
                                    <Select
                                      {...props}
                                      value={choices[0]?.is_correct === false ? "false" : "true"}
                                      onChange={(event) =>
                                        setChoices([
                                          {
                                            text: dictionary.classQuizTrue,
                                            is_correct: event.target.value === "true",
                                            order: 0
                                          }
                                        ])
                                      }
                                    >
                                      <option value="true">{dictionary.classQuizTrue}</option>
                                      <option value="false">{dictionary.classQuizFalse}</option>
                                    </Select>
                                  )}
                                </Field>
                              ) : null}
                              <Field label={dictionary.classQuizQuestionExplanation}>
                                {(props) => (
                                  <textarea
                                    {...props}
                                    className="control announcements-panel__body"
                                    rows={2}
                                    value={questionExplanation}
                                    onChange={(event) => setQuestionExplanation(event.target.value)}
                                  />
                                )}
                              </Field>
                              <footer className="announcements-panel__composer-bar">
                                <div className="announcements-panel__form-actions">
                                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={resetQuestionForm}>
                                    {dictionary.cancel}
                                  </Button>
                                  <Button type="submit" size="sm" disabled={busy || !questionText.trim()}>
                                    {dictionary.addClassQuizQuestion}
                                  </Button>
                                </div>
                              </footer>
                            </form>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => setAddingQuestion(true)}>
                              {dictionary.addClassQuizQuestion}
                            </Button>
                          )
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                {attemptsOpen ? (
                  <div className="assignments-panel__submissions">
                    {attemptsBusy || attempts === null ? (
                      <p className="muted">{dictionary.loading}</p>
                    ) : attempts.length === 0 ? (
                      <p className="muted">{dictionary.noClassQuizAttempts}</p>
                    ) : (
                      <ul>
                        {attempts.map((attempt) => {
                          const student = attempt.student_name || attempt.student_email || dictionary.classQuizAttempts;
                          return (
                            <li key={attempt.id} className="assignments-panel__submission">
                              <div className="announcements-panel__item-head">
                                <strong>{student}</strong>
                                <Badge
                                  value={String(attempt.status ?? "submitted")}
                                  label={attemptStatusLabel(String(attempt.status ?? "submitted"), dictionary)}
                                />
                              </div>
                              {attempt.student_email && attempt.student_name ? <small>{attempt.student_email}</small> : null}
                              <p className="assignments-panel__meta">
                                {attempt.submitted_at || attempt.started_at ? (
                                  <span>
                                    {new Date(attempt.submitted_at || attempt.started_at || "").toLocaleString(localeTag, {
                                      dateStyle: "medium",
                                      timeStyle: "short"
                                    })}
                                  </span>
                                ) : null}
                                <span>
                                  {dictionary.classQuizScore}: {attempt.score ?? "—"}
                                  {attempt.max_score ? ` / ${attempt.max_score}` : ""}
                                  {attempt.percentage ? ` (${attempt.percentage}%)` : ""}
                                </span>
                                {attempt.fully_graded ? <span>{dictionary.classQuizFullyGraded}</span> : null}
                              </p>
                              {attempt.answers?.map((answer, index) => (
                                <div key={answer.id ?? index} className="quizzes-panel__answer">
                                  {answer.question_text ? <p>{answer.question_text}</p> : null}
                                  {answer.text_answer ? (
                                    <p>
                                      <span className="assignments-panel__label">{dictionary.classQuizAnswer}</span>
                                      {answer.text_answer}
                                    </p>
                                  ) : null}
                                  {canManage && answer.id != null ? (
                                    <form
                                      className="assignments-panel__grade"
                                      onSubmit={(event) => {
                                        event.preventDefault();
                                        void saveAnswerGrade(answer);
                                      }}
                                    >
                                      <Field label={dictionary.classQuizPointsAwarded}>
                                        {(props) => (
                                          <TextInput
                                            {...props}
                                            inputMode="decimal"
                                            value={gradeDrafts[answer.id!] ?? ""}
                                            onChange={(event) =>
                                              setGradeDrafts((current) => ({
                                                ...current,
                                                [answer.id!]: event.target.value
                                              }))
                                            }
                                          />
                                        )}
                                      </Field>
                                      <Button type="submit" size="sm" disabled={busy || !(gradeDrafts[answer.id] ?? "").trim()}>
                                        {dictionary.saveGrade}
                                      </Button>
                                    </form>
                                  ) : answer.points_awarded ? (
                                    <p>
                                      <span className="assignments-panel__label">{dictionary.classQuizPointsAwarded}</span>
                                      {answer.points_awarded}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
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
