"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { isUnauthorizedError } from "@/lib/auth/session-expired";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import { nativeTextValue } from "@/lib/auth/native-form";

export function ChangePasswordModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dictionary = useDictionary();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const submittedCurrentPassword = nativeTextValue(
      formData,
      "current_password",
      currentPassword,
    );
    const submittedNewPassword = nativeTextValue(formData, "new_password", newPassword);

    if (submittedNewPassword.trim().length < 10) {
      setError(dictionary.passwordMinLength);
      return;
    }

    setBusy(true);
    try {
      await api.post(endpoints.auth.changePassword, {
        current_password: submittedCurrentPassword,
        new_password: submittedNewPassword
      });
      toast.success(dictionary.passwordChanged);
      setCurrentPassword("");
      setNewPassword("");
    } catch (reason) {
      if (isUnauthorizedError(reason)) return;
      toast.error(reason instanceof Error ? reason.message : dictionary.passwordChangeFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={dictionary.changePassword} onClose={onClose}>
      <form className="resource-form" onSubmit={submit}>
        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="resource-form__field">
          <span>{dictionary.currentPassword} *</span>
          <input
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label className="resource-form__field">
          <span>{dictionary.newPassword} *</span>
          <input
            name="new_password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        <p className="resource-form__hint">{dictionary.passwordMinLength}</p>
        <div className="resource-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {dictionary.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? dictionary.executing : dictionary.savePassword}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
