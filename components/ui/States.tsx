"use client";

import { BrandSpinner } from "@/components/ui/BrandSpinner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useDictionary } from "@/lib/i18n/useDictionary";

export function LoadingState({ size = "md" }: { size?: "sm" | "md" | "lg"; rows?: number }) {
  const dictionary = useDictionary();

  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true" aria-label={dictionary.loading}>
      <BrandSpinner size={size} label={dictionary.loading} />
    </div>
  );
}

/**
 * An empty list is a question -- "is this broken, or is there nothing yet?"
 * -- and the answer differs per resource. Callers supply the copy that says
 * which, and where possible the action that resolves it, so the screen is a
 * place to continue from rather than a dead end.
 */
export function EmptyState({
  title,
  description,
  action
}: {
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  const dictionary = useDictionary();

  return (
    <div className="empty-state" role="status">
      <div className="empty-state__icon" aria-hidden="true">
        <Icon name="file" />
      </div>
      <h3>{title ?? dictionary.emptyTitle}</h3>
      <p>{description ?? dictionary.emptyDescription}</p>
      {action ? (
        <div className="empty-state__action">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const dictionary = useDictionary();

  return (
    <div className="error-state" role="alert">
      <div className="error-state__icon" aria-hidden="true">
        <Icon name="close" />
      </div>
      <div>
        <h3>{dictionary.loadFailed}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          <Icon name="refresh" />
          {dictionary.retry}
        </Button>
      ) : null}
    </div>
  );
}
