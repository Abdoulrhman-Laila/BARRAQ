"use client";

import { useRef, type KeyboardEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  items,
  value,
  onChange
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const ids = items.map((item) => item.id);
    const index = Math.max(0, ids.indexOf(value));
    const rtl = listRef.current?.closest("[dir]")?.getAttribute("dir") === "rtl";
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ids.length - 1;
    else if (event.key === "ArrowRight") next = rtl ? index - 1 : index + 1;
    else if (event.key === "ArrowLeft") next = rtl ? index + 1 : index - 1;
    next = (next + ids.length) % ids.length;
    onChange(ids[next]);
    const button = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    button?.focus();
  };

  return (
    <div className="tabs" role="tablist" ref={listRef} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? "active" : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
