"use client";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useDictionary, useLocale } from "@/lib/i18n/useDictionary";
import type { AdminScope } from "@/types/api";

/**
 * A class supervisor's home.
 *
 * They hold no organization-wide grant, so there is no organization total
 * they may read -- but the classes they supervise are the whole of their
 * job, and listing them is both useful and something they are plainly
 * entitled to see. The previous behaviour sent them to an empty state
 * telling them to "add an admin account", which described a task they
 * cannot perform and have no reason to want.
 *
 * Names only, straight from their own scope. No counts are fetched here:
 * a supervisor's numbers live on the class page itself, and inventing a
 * summary would mean asking for data this account may not have.
 */
export function ClassOverview({ classes }: { classes: AdminScope[] }) {
  const dictionary = useDictionary();
  // The dashboard has no locale-aware Link, so the base is explicit --
  // the same way the sidebar builds its hrefs. Hardcoding /ar here is the
  // bug this codebase has already paid for once.
  const locale = useLocale();

  return (
    <div className="class-overview">
      <PageHeader title={dictionary.classes} description={dictionary.classOverviewDesc} />

      <ul className="class-overview__list">
        {classes.map((scope) => {
          const classroom = scope.classroom;
          if (!classroom) return null;

          return (
            <li key={classroom.public_id}>
              <Card interactive className="class-overview__item">
                <Link href={`/${locale}/classes?search=${encodeURIComponent(classroom.name)}`}>
                  <span className="class-overview__icon" aria-hidden="true">
                    <Icon name="book" />
                  </span>
                  <span className="class-overview__text">
                    <strong>{classroom.name}</strong>
                    {scope.organization ? <small>{scope.organization.name}</small> : null}
                  </span>
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
