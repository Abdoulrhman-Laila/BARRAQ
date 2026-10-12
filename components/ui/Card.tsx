import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <section
      className={`card ${interactive ? "card--interactive" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  );
}
