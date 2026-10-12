"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { authApi } from "@/lib/api/auth-client";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";
import { nativeTextValue } from "@/lib/auth/native-form";
import type { Locale } from "@/types/api";

export default function ForgotPasswordPage() {
  const params = useParams<{ locale: Locale }>();
  const locale = params.locale === "en" ? "en" : "ar";
  const dictionary = useDictionary();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedEmail = nativeTextValue(new FormData(event.currentTarget), "email", email)
      .trim()
      .toLowerCase();
    setBusy(true);
    try {
      const payload = await authApi.passwordReset(
        { email: submittedEmail },
        dictionary.passwordResetFailed
      );
      toast.success(payload.message ?? dictionary.passwordResetSent);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : dictionary.passwordResetFailed);
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
          <h1>{dictionary.forgotPasswordTitle}</h1>
          <p>{dictionary.forgotPasswordDesc}</p>
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
              <span>{dictionary.forgotPassword}</span>
              <h2>{dictionary.requestReset}</h2>
              <p>{dictionary.forgotPasswordHint}</p>
            </div>
          </div>

          <label className="login-field">
            <span>{dictionary.email}</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="admin@baraq.app"
            />
          </label>

          <Button type="submit" disabled={busy} aria-busy={busy} className="login-form__submit">
            {busy ? dictionary.executing : dictionary.sendResetLink}
          </Button>

          <p className="login-form__alt">
            <Link href={`/${locale}/login`}>{dictionary.backToLogin}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
