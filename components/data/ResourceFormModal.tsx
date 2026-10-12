"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { nativeTextValue } from "@/lib/auth/native-form";

export type FormValue = string | number | boolean | File | null;
export type FormValues = Record<string, FormValue>;

export interface FormField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox" | "select" | "password" | "email" | "file";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  minLength?: number;
  min?: number;
}

export function ResourceFormModal({
  open,
  title,
  fields,
  initialValues,
  submitLabel,
  busy,
  error,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  fields: FormField[];
  initialValues?: FormValues;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: FormValues) => void | Promise<void>;
}) {
  const dictionary = useDictionary();
  const [values, setValues] = useState<FormValues>({});

  useEffect(() => {
    if (!open) return;
    const next: FormValues = {};
    for (const field of fields) {
      const seed = initialValues?.[field.key];
      if (seed !== undefined) next[field.key] = seed;
      else if (field.type === "checkbox") next[field.key] = false;
      else if (field.type === "number") next[field.key] = "";
      else if (field.type === "file") next[field.key] = null;
      else next[field.key] = "";
    }
    setValues(next);
  }, [open, fields, initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedValues = { ...values };
    for (const field of fields) {
      if (field.type === "checkbox") continue;
      if (field.type === "file") {
        const entry = formData.get(field.key);
        submittedValues[field.key] = entry instanceof File && entry.size > 0 ? entry : null;
        continue;
      }
      submittedValues[field.key] = nativeTextValue(
        formData,
        field.key,
        String(values[field.key] ?? ""),
      );
    }
    await onSubmit(submittedValues);
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form className="resource-form" onSubmit={handleSubmit}>
        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}
        {fields.map((field) => {
          const id = `field-${field.key}`;
          if (field.type === "checkbox") {
            return (
              <label key={field.key} className="resource-form__check">
                <input
                  id={id}
                  name={field.key}
                  type="checkbox"
                  checked={Boolean(values[field.key])}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.checked }))}
                />
                <span>{field.label}</span>
              </label>
            );
          }

          return (
            <label key={field.key} className="resource-form__field">
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.type === "file" ? (
                <input
                  id={id}
                  name={field.key}
                  type="file"
                  required={field.required}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.files?.[0] ?? null
                    }))
                  }
                />
              ) : field.type === "textarea" ? (
                <textarea
                  id={id}
                  name={field.key}
                  required={field.required}
                  value={String(values[field.key] ?? "")}
                  placeholder={field.placeholder}
                  rows={4}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              ) : field.type === "select" ? (
                <select
                  id={id}
                  name={field.key}
                  required={field.required}
                  value={String(values[field.key] ?? "")}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                >
                  <option value="">{dictionary.all}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  name={field.key}
                  type={field.type ?? "text"}
                  required={field.required}
                  minLength={field.minLength}
                  min={field.min}
                  value={String(values[field.key] ?? "")}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: field.type === "number" ? event.target.value : event.target.value
                    }))
                  }
                />
              )}
            </label>
          );
        })}
        <div className="resource-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {dictionary.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? dictionary.executing : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function valuesToPayload(values: FormValues, fields: FormField[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.key];
    if (field.type === "file") {
      if (raw instanceof File) payload[field.key] = raw;
      continue;
    }
    if (field.type === "checkbox") {
      payload[field.key] = Boolean(raw);
      continue;
    }
    if (field.type === "number") {
      const text = String(raw ?? "").trim();
      if (!text) {
        if (!field.required) continue;
        payload[field.key] = null;
      } else {
        payload[field.key] = Number(text);
      }
      continue;
    }
    const text = String(raw ?? "").trim();
    if (!text && !field.required) continue;
    payload[field.key] = text;
  }
  return payload;
}
