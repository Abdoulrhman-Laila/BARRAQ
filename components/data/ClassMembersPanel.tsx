"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { api } from "@/lib/api/client";
import { classMemberActionEndpoint, classMembersEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface Member {
  id: number;
  user_email?: string;
  user_full_name?: string;
  status: string;
  joined_at?: string | null;
}

interface ClassOption {
  public_id: string;
  name: string;
  organization?: string;
}

/**
 * The members of one class, and the two things an operator does to them.
 *
 * Removal keeps the row and marks it removed: a learner who leaves and
 * comes back must not be blocked by their own history, and a roster with no
 * record of who was in it last term is not a roster.
 *
 * Transfer offers only classes in the same organization. The backend
 * refuses a cross-organization move outright -- moving a learner between
 * schools is an enrolment decision, not a seating change -- so offering it
 * here would only produce an error the operator cannot act on.
 *
 * The table scrolls inside its own container rather than stretching the
 * page, and each row carries its own labelled transfer target so the
 * controls stay associated when the layout narrows.
 */
export function ClassMembersPanel({ classroom }: { classroom: AnyRecord }) {
  const dictionary = useDictionary();
  const publicId = String(classroom.public_id ?? "");
  const organization = String(classroom.organization ?? "");

  const [members, setMembers] = useState<Member[] | null>(null);
  const [siblings, setSiblings] = useState<ClassOption[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [target, setTarget] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ results?: Member[] } | Member[]>(
        classMembersEndpoint(publicId)
      );
      const payload = response.data as { results?: Member[] } | Member[];
      setMembers(Array.isArray(payload) ? payload : (payload.results ?? []));
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      setMembers([]);
    }
  }, [publicId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!organization) return;
    let cancelled = false;
    api
      .get<{ results?: ClassOption[] }>(endpoints.admin.classes, {
        organization,
        page_size: 100
      })
      .then((response) => {
        if (cancelled) return;
        setSiblings((response.data?.results ?? []).filter((row) => row.public_id !== publicId));
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organization, publicId]);

  async function act(member: Member, action: "remove" | "transfer") {
    if (action === "remove" && !window.confirm(dictionary.removeMemberConfirm)) return;
    const targetClass = target[member.id];
    if (action === "transfer" && !targetClass) return;

    setBusy(member.id);
    try {
      await api.post(classMemberActionEndpoint(publicId, action), {
        membership: member.id,
        ...(action === "transfer" ? { target_classroom: targetClass } : {})
      });
      toast.success(action === "remove" ? dictionary.memberRemoved : dictionary.memberTransferred);
      await load();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(null);
    }
  }

  if (members === null) {
    return (
      <section aria-label={dictionary.members} aria-busy="true">
        <h4>{dictionary.members}</h4>
        <p className="muted">{dictionary.loading}</p>
      </section>
    );
  }

  return (
    <section aria-label={dictionary.members} className="members-panel">
      <h4>{dictionary.members}</h4>

      {members.length === 0 ? (
        <p className="muted">{dictionary.noMembers}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <caption className="sr-only">{dictionary.membersDesc}</caption>
            <thead>
              <tr>
                <th scope="col">{dictionary.colUser}</th>
                <th scope="col">{dictionary.status}</th>
                <th scope="col">{dictionary.actions}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const active = member.status === "active";
                const working = busy === member.id;
                return (
                  <tr key={member.id}>
                    <th scope="row" className="members-panel__who">
                      <strong>{member.user_full_name ?? "—"}</strong>
                      <small>{member.user_email ?? ""}</small>
                    </th>
                    <td>
                      <Badge value={member.status} />
                    </td>
                    <td>
                      <div className="members-panel__actions">
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!active || working}
                          onClick={() => act(member, "remove")}
                        >
                          {dictionary.removeMember}
                        </Button>

                        {siblings.length > 0 ? (
                          <>
                            <label className="sr-only" htmlFor={`transfer-${member.id}`}>
                              {/* Named per row: "Transfer to class" alone
                                  does not say whose membership moves. */}
                              {`${dictionary.transferTo} — ${member.user_full_name ?? member.user_email ?? ""}`}
                            </label>
                            <Select
                              id={`transfer-${member.id}`}
                              className="members-panel__target"
                              value={target[member.id] ?? ""}
                              disabled={!active || working}
                              onChange={(event) =>
                                setTarget((current) => ({
                                  ...current,
                                  [member.id]: event.target.value
                                }))
                              }
                            >
                              <option value="">{dictionary.transferTo}</option>
                              {siblings.map((option) => (
                                <option key={option.public_id} value={option.public_id}>
                                  {option.name}
                                </option>
                              ))}
                            </Select>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!active || !target[member.id] || working}
                              onClick={() => act(member, "transfer")}
                            >
                              {dictionary.transferMember}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
