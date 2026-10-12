"use client";

import { useEffect, useRef, useState } from "react";

import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * Copies a value without ever rendering it.
 *
 * Invitation codes and links are credentials. Printing one into a table
 * puts it on screen for as long as the page is open, in front of whoever
 * walks past; copying it puts it where the operator needs it -- the
 * clipboard -- and nowhere else.
 *
 * The result is announced rather than only coloured, because "did that
 * work?" is the entire question the button exists to answer.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const dictionary = useDictionary();
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      // Clipboard access is refused outright in insecure contexts and by
      // some policies. Say so rather than claiming a copy that never
      // happened.
      setState("failed");
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  const text =
    state === "done" ? dictionary.copied : state === "failed" ? dictionary.copyFailed : label;

  return (
    <button type="button" className="copy-button" data-state={state} onClick={copy} disabled={!value}>
      <span aria-hidden="true">{text}</span>
      {/* The visible label changes under the pointer; the accessible name
          must not, or the control is renamed mid-interaction. */}
      <span className="sr-only">{label}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "done" ? dictionary.copied : state === "failed" ? dictionary.copyFailed : ""}
      </span>
    </button>
  );
}
