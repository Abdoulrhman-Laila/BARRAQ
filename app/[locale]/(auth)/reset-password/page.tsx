"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { authApi } from "@/lib/api/auth-client";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import { nativeTextValue } from "@/lib/auth/native-form";
import type { Locale } from "@/types/api";

export default function ResetPasswordPage() {
  const params = useParams<{ locale: Locale }>();
  const locale = params.locale === "en" ? "en" : "ar";
  const dictionary = useDictionary();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const uid = useMemo(() => searchParams.get("uid")?.trim() ?? "", [searchParams]);
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const missingLink = !uid || !token;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const submittedNewPassword = nativeTextValue(formData, "new_password", newPassword);
    const submittedConfirmPassword = nativeTextValue(
      formData,
      "confirm_password",
      confirmPassword,
    );

    if (missingLink) {
      setError(dictionary.resetLinkInvalid);
      return;
    }
    if (submittedNewPassword.length < 10) {
      setError(dictionary.passwordMinLength);
      return;
    }
    if (submittedNewPassword !== submittedConfirmPassword) {
      setError(dictionary.passwordMismatch);
      return;
    }

    setBusy(true);
    try {
      const payload = await authApi.passwordResetConfirm(
        { uid, token, new_password: submittedNewPassword },
        dictionary.passwordResetConfirmFailed
      );
      toast.success(payload.message ?? dictionary.passwordResetConfirmed);
      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : dictionary.passwordResetConfirmFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden={false}>
        <div className="login-visual__glow" aria-hidden="true" />
        <div className="login-visual__glow login-visual__glow--secondary" aria-hidden="true" />
        <div className="login-brand">
          <div className="login-brand__mark">
            <Image src="/brand/logo-light-removebg-preview.png" width={120} height={120} alt={dictionary.brandName} priority />
          </div>
          <div>
            <strong>{dictionary.brandName}</strong>
            <span>{dictionary.brandTagline}</span>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">{dictionary.loginEyebrow}</span>
          <h1>{dictionary.resetPasswordTitle}</h1>
          <p>{dictionary.resetPasswordDesc}</p>
        </div>
      </section>

      <section className="login-panel">
        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          aria-label={dictionary.toggleTheme}
          title={theme === "dark" ? dictionary.lightMode : dictionary.darkMode}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>

        <form className="login-form" onSubmit={submit}>
          <div className="login-form__header">
            <div className="login-form__logo">
              <Image src="/brand/logo-light-removebg-preview.png" width={72} height={72} alt="" />
            </div>
            <div>
              <span>{dictionary.resetPassword}</span>
              <h2>{dictionary.chooseNewPassword}</h2>
              <p>{dictionary.resetPasswordHint}</p>
            </div>
          </div>

          {missingLink ? (
            <div className="form-error" role="alert">
              {dictionary.resetLinkInvalid}
            </div>
          ) : null}
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="login-field">
            <span>{dictionary.newPassword}</span>
            <input
              name="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={10}
              disabled={missingLink || done}
            />
          </label>

          <label className="login-field">
            <span>{dictionary.confirmNewPassword}</span>
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={10}
              disabled={missingLink || done}
            />
          </label>

          <Button
            type="submit"
            disabled={busy || missingLink || done}
            aria-busy={busy}
            className="login-form__submit"
          >
            {busy ? dictionary.executing : dictionary.savePassword}
          </Button>

          <p className="login-form__alt">
            <Link href={`/${locale}/login`}>{dictionary.backToLogin}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
