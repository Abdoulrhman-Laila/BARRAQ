"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { supportTicketMessagesEndpoint } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

function asMessages(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? (value as AnyRecord[]) : [];
}

export function SupportMessageThread({
  ticket,
  onReplied
}: {
  ticket: AnyRecord;
  onReplied: () => void | Promise<void>;
}) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = String(ticket.status) === "closed";
  const messages = asMessages(ticket.messages);
  const dateLocale = locale === "en" ? "en-US" : "ar-SY";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) {
      setError(dictionary.promptRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(supportTicketMessagesEndpoint(String(ticket.id)), {
        body: text,
        is_internal: internal
      });
      toast.success(dictionary.supportReplySent);
      setBody("");
      setInternal(false);
      await onReplied();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="support-thread" aria-label={dictionary.messageThread}>
      <header className="support-thread__header">
        <h3>{dictionary.messageThread}</h3>
        <span>
          {messages.length} {dictionary.colMessages}
        </span>
      </header>

      {messages.length === 0 ? (
        <p className="support-thread__empty">{dictionary.noMessagesYet}</p>
      ) : (
        <ul className="support-thread__list">
          {messages.map((message, index) => {
            const isInternal = Boolean(message.is_internal);
            const created = message.created_at ? new Date(String(message.created_at)) : null;
            return (
              <li
                key={String(message.id ?? index)}
                className={`support-thread__item${isInternal ? " support-thread__item--internal" : ""}`}
              >
                <div className="support-thread__meta">
                  <strong>{String(message.sender_email ?? dictionary.unknownSender)}</strong>
                  {isInternal ? <span className="support-thread__badge">{dictionary.internalNote}</span> : null}
                  <time dateTime={created && !Number.isNaN(created.getTime()) ? created.toISOString() : undefined}>
                    {created && !Number.isNaN(created.getTime())
                      ? created.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })
                      : "—"}
                  </time>
                </div>
                <p>{String(message.body ?? "")}</p>
              </li>
            );
          })}
        </ul>
      )}

      {closed ? (
        <p className="inline-error" role="status">
          {dictionary.ticketClosedNoReply}
        </p>
      ) : (
        <form className="support-thread__composer" onSubmit={submit}>
          {error ? (
            <div className="inline-error" role="alert">
              {error}
            </div>
          ) : null}
          <label className="resource-form__field">
            <span>{dictionary.replyBody}</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              required
              disabled={busy}
            />
          </label>
          <label className="resource-form__check">
            <input
              type="checkbox"
              checked={internal}
              onChange={(event) => setInternal(event.target.checked)}
              disabled={busy}
            />
            <span>{dictionary.internalNoteHint}</span>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? dictionary.executing : dictionary.sendReply}
          </Button>
        </form>
      )}
    </section>
  );
}
