import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";

/**
 * A labelled form control.
 *
 * The label is tied to the control by id rather than by wrapping, so a
 * description or an error can sit between them without breaking the
 * association, and `aria-describedby` points at whichever of those exist.
 * Getting this wrong is invisible until someone navigates by keyboard or
 * screen reader, which is when it matters most.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className = ""
}: {
  label: string;
  hint?: string;
  error?: string | null;
  /** Receives the id and describedby to spread onto the control. */
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true } : {})
      })}
      {error ? (
        // role="alert" so a validation failure is announced when it appears,
        // rather than sitting silently below a control the user has left.
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`control ${className}`.trim()} {...props} />;
}

/**
 * A native select, deliberately.
 *
 * Its indicator is drawn by the browser on the side that matches the
 * document direction, and on a phone it opens the platform picker rather
 * than a listbox that has to reimplement typeahead, scrolling and
 * dismissal. A custom one would be more styleable and worse.
 */
export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`control ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}
