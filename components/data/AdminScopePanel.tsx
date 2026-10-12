"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Field";
import { api } from "@/lib/api/client";
import { adminAssignRolesEndpoint, endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import type { AnyRecord } from "@/types/api";

interface Option {
  public_id: string;
  name: string;
}

type ScopeType = "global" | "organization" | "class";

function parseRoleCodes(input: string): string[] {
  return input
    .split(/[,،]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Assigning a role and choosing the data it applies to, in one place.
 *
 * They belong together because the backend now refuses to guess: a scoped
 * operator must say what they are granting, and nobody can grant reach they
 * do not already hold. A text box that could only name roles would leave a
 * scoped manager unable to delegate at all, and would quietly re-create the
 * assumption this phase removed -- that every assignment means "the whole
 * platform".
 *
 * The pickers are filled from what the backend returns for this operator, so
 * they offer only what it would accept. The rule still lives on the server;
 * this just avoids presenting choices that are going to be refused.
 */
export function AdminScopePanel({
  admin,
  onAssigned
}: {
  admin: AnyRecord;
  onAssigned: () => void | Promise<void>;
}) {
  const dictionary = useDictionary();
  const [roleCodes, setRoleCodes] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("organization");
  const [target, setTarget] = useState("");
  const [organizations, setOrganizations] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<{ data?: Option[]; results?: Option[] }>(endpoints.admin.organizations, { page_size: 100 }),
      api.get<{ data?: Option[]; results?: Option[] }>(endpoints.admin.classes, { page_size: 200 })
    ])
      .then(([orgs, cls]) => {
        if (cancelled) return;
        // API wrapper normalizes responses to ApiEnvelope<T>
        // So orgs.data is already the array of organizations
        const orgsData = Array.isArray(orgs.data) ? orgs.data : [];
        const clsData = Array.isArray(cls.data) ? cls.data : [];
        console.log("Organizations:", orgsData.length, "Classes:", clsData.length);
        setOrganizations(orgsData);
        setClasses(clsData);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("API Error:", error);
          setOrganizations([]);
          setClasses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const targets = scopeType === "class" ? classes : organizations;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const codes = parseRoleCodes(roleCodes);
    if (!codes.length) {
      setError(dictionary.promptRequired);
      return;
    }
    if (scopeType !== "global" && !target) {
      setError(dictionary.promptRequired);
      return;
    }

    const scope =
      scopeType === "global"
        ? { scope_type: "global" }
        : scopeType === "organization"
          ? { scope_type: "organization", organization: target }
          : { scope_type: "class", classroom: target };

    setBusy(true);
    setError(null);
    try {
      await api.post(adminAssignRolesEndpoint(String(admin.id)), {
        role_codes: codes,
        scopes: [scope]
      });
      toast.success(dictionary.adminRolesAssigned);
      setRoleCodes("");
      await onAssigned();
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={dictionary.assignRoles} className="scope-panel">
      <h4>{dictionary.assignRoles}</h4>
      <form className="scope-panel__form" onSubmit={submit}>
        <Field label={dictionary.roleCodesHint} hint={dictionary.assignRolesPrompt} error={error}>
          {(control) => (
            <TextInput
              {...control}
              value={roleCodes}
              placeholder={dictionary.assignRolesPrompt}
              onChange={(event) => setRoleCodes(event.target.value)}
            />
          )}
        </Field>

        <Field label={dictionary.yourScope}>
          {(control) => (
            <Select
              {...control}
              value={scopeType}
              onChange={(event) => {
                setScopeType(event.target.value as ScopeType);
                setTarget("");
              }}
            >
              <option value="organization">{dictionary.scopeOrganization}</option>
              <option value="class">{dictionary.scopeClass}</option>
              <option value="global">{dictionary.scopeGlobal}</option>
            </Select>
          )}
        </Field>

        {scopeType === "global" ? null : (
          <Field
            label={scopeType === "class" ? dictionary.colClass : dictionary.colOrganization}
            hint={loading ? "جارٍ التحميل..." : `${targets.length} متاح`}
          >
            {(control) => (
              <Select
                {...control}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={loading}
              >
                <option value="">—</option>
                {targets.length > 0 ? (
                  targets.map((option) => (
                    <option key={option.public_id} value={option.public_id}>
                      {option.name}
                    </option>
                  ))
                ) : (
                  <option disabled>لا توجد خيارات</option>
                )}
              </Select>
            )}
          </Field>
        )}
        <div>
          <Button type="submit" disabled={busy}>
            {dictionary.assignRoles}
          </Button>
        </div>
      </form>
    </section>
  );
}
