"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LightbulbOff,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import type { CSSProperties, FormEvent } from "react";
import DeskLamp from "./desk-lamp";

type AuthMode = "checking" | "sign-in" | "challenge" | "enroll";
type AuthTab = "sign-in" | "sign-up";

type AuthScreenProps = {
  authConfigured: boolean;
  authMode: AuthMode;
  authTab: AuthTab;
  busy: boolean;
  email: string;
  error: string;
  fullName: string;
  phone: string;
  username: string;
  lampOn: boolean;
  mfaQrCode: string;
  notice: string;
  otp: string;
  password: string;
  rememberMe: boolean;
  showPassword: boolean;
  theme: { name: string; color: string };
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onLampToggle: () => void;
  onMfaSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOtpChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onResetPassword: () => void;
  onRememberMeChange: (value: boolean) => void;
  onShowPasswordChange: (value: boolean) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignUp: (event: FormEvent<HTMLFormElement>) => void;
  onTabChange: (tab: AuthTab) => void;
};


export default function AuthScreen({
  authConfigured,
  authMode,
  authTab,
  busy,
  email,
  error,
  fullName,
  phone,
  username,
  lampOn,
  mfaQrCode,
  notice,
  otp,
  password,
  rememberMe,
  showPassword,
  theme,
  onEmailChange,
  onFullNameChange,
  onPhoneChange,
  onUsernameChange,
  onLampToggle,
  onMfaSubmit,
  onOtpChange,
  onPasswordChange,
  onResetPassword,
  onRememberMeChange,
  onShowPasswordChange,
  onSignIn,
  onSignUp,
  onTabChange,
}: AuthScreenProps) {
  const reduceMotion = useReducedMotion();
  const transitionDuration = reduceMotion ? 0.01 : 0.65;

  return (
    <main
      className="relative isolate min-h-screen overflow-hidden bg-[#08090d] text-white transition-colors duration-700"
      style={{ "--auth-accent": theme.color } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,.075) 1px, transparent 0)",
          backgroundSize: "34px 34px",
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{
          opacity: lampOn ? 1 : 0,
          background: `conic-gradient(from 32deg at 20% 34%, transparent 0deg, ${theme.color}0c 10deg, ${theme.color}20 31deg, transparent 59deg), radial-gradient(ellipse at 83% 40%, ${theme.color}1e, transparent 57%)`,
        }}
        transition={{ duration: transitionDuration, ease: "easeInOut" }}
      />
      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-end px-5 py-5 sm:px-8 lg:px-12">
        <span
          aria-label="Clare's Vogue"
          className="rounded-xl border border-[#c59a4a]/25 bg-[#1a1019]/55 px-4 py-2 font-serif text-2xl font-semibold tracking-wide sm:px-5 sm:py-2.5 sm:text-3xl"
          style={{
            backgroundImage:
              "linear-gradient(155deg, #fff4d8 0%, #e9c678 28%, #f15a9c 64%, #b51c64 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow:
              "1px 1px 0 #7c174b, 2px 2px 0 #c59a4a, 3px 4px 0 rgba(84,17,55,.9), 0 7px 12px rgba(0,0,0,.65), 0 0 20px rgba(213,29,120,.24)",
            borderBottomColor: "rgba(197,154,74,.5)",
          }}
        >
          Clare&apos;s Vogue
        </span>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-118px)] w-full max-w-[1440px] items-center gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 lg:px-12 lg:pb-16">
        <section className="relative flex h-[390px] flex-col items-center justify-center sm:h-[470px] lg:h-[580px]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.div
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 z-10 flex h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[#fffaf5] p-1 shadow-[0_0_0_2px_#c59a4a,0_0_70px_-15px_#d51d7866] sm:h-[360px] sm:w-[360px] lg:h-[420px] lg:w-[420px]"
              initial={false}
              animate={{
                opacity: lampOn ? 1 : 0,
                scale: lampOn ? 1 : 0.82,
              }}
              transition={{
                duration: transitionDuration,
                ease: [0.2, 0.7, 0.2, 1],
              }}
            >
              <Image
                src="/clare-vogue-logo.png"
                alt=""
                aria-hidden="true"
                width={420}
                height={336}
                className="h-full w-full rounded-full object-cover mix-blend-multiply"
                priority
              />
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {!lampOn && (
              <motion.div
                key="desk-lamp"
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: reduceMotion ? 1 : 0.94,
                  y: reduceMotion ? 0 : 12,
                }}
                transition={{ duration: transitionDuration, ease: "easeInOut" }}
              >
                <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-[min(100%,460px)] -translate-x-1/2 -translate-y-1/2">
                  <DeskLamp
                    accent={theme.color}
                    isOn={false}
                    onToggle={onLampToggle}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {lampOn && (
              <motion.button
                key="lamp-off"
                aria-label="Turn lamp off"
                className="absolute right-1 top-1 z-30 inline-flex items-center gap-2 rounded-full border border-[#d51d78]/30 bg-[#1a1019]/80 px-3 py-2 text-xs text-white/65 backdrop-blur transition hover:border-[#d51d78]/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d51d78] sm:right-3 sm:top-3"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                onClick={onLampToggle}
                type="button"
              >
                <LightbulbOff className="h-3.5 w-3.5 text-[#d51d78]" />
                Turn off
              </motion.button>
            )}
          </AnimatePresence>
        </section>

        <section className="relative flex min-h-[520px] items-center justify-center lg:min-h-[640px]">
          <AnimatePresence>
            {lampOn && (
              <motion.div
                key="auth-card"
                className="w-full max-w-[510px]"
                initial={{
                  opacity: 0,
                  x: reduceMotion ? 0 : 32,
                  y: reduceMotion ? 0 : 12,
                  scale: reduceMotion ? 1 : 0.98,
                }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{
                  opacity: 0,
                  x: reduceMotion ? 0 : 16,
                  y: reduceMotion ? 0 : 8,
                  scale: reduceMotion ? 1 : 0.99,
                }}
                transition={{
                  duration: transitionDuration,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
              >
                <div
                  className="relative overflow-hidden rounded-[30px] border bg-[#1a1019]/85 p-6 shadow-[0_35px_110px_-45px_rgba(0,0,0,.95)] backdrop-blur-2xl sm:p-9"
                  style={{ borderColor: `${theme.color}55` }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-10 top-0 h-px"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${theme.color}aa, transparent)`,
                    }}
                  />
                  <div className="mb-7 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white">
                        <Image
                          src="/clare-vogue-logo.png"
                          alt="Clare's Vogue logo"
                          width={88}
                          height={72}
                          className="h-11 w-11 object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.22em] text-white/45">
                          YOUR SPACE
                        </p>
                        <p className="mt-1 text-xs text-white/75">
                          Clare&apos;s Vogue Atelier
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
                      aria-label="Secure sign in"
                      title="Secure sign in"
                    >
                      <ShieldCheck
                        className="h-4 w-4"
                        style={{ color: theme.color }}
                      />
                    </div>
                  </div>

                  {!authConfigured ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                        Studio setup
                      </p>
                      <h1 className="mt-3 font-serif text-3xl text-white">
                        Connect your space
                      </h1>
                      <p className="mt-3 text-sm leading-6 text-white/60">
                        The running frontend cannot read your Supabase project
                        URL and publishable key. For Docker Compose, set
                        <code className="mx-1 text-white/85">SUPABASE_URL</code>
                        and
                        <code className="mx-1 text-white/85">
                          SUPABASE_PUBLISHABLE_KEY
                        </code>
                        in the repository-root
                        <code className="mx-1 text-white/85">.env</code>
                        and restart the frontend service. For local development,
                        set those same values in
                        <code className="mx-1 text-white/85">
                          apps/frontend/.env.local
                        </code>
                        and restart the dev server. The secret key is backend
                        only; never use it here.
                      </p>
                    </div>
                  ) : authMode === "checking" ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/65">
                      Checking your secure session…
                    </div>
                  ) : authMode === "challenge" || authMode === "enroll" ? (
                    <form className="space-y-5" onSubmit={onMfaSubmit}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                          {authMode === "enroll"
                            ? "One-time setup"
                            : "Second factor"}
                        </p>
                        <h1 className="mt-2 font-serif text-3xl text-white">
                          {authMode === "enroll"
                            ? "Connect your authenticator"
                            : "Verify it’s you"}
                        </h1>
                      </div>
                      {authMode === "enroll" && mfaQrCode && (
                        <div className="rounded-2xl bg-white p-4 text-center">
                          <Image
                            className="mx-auto h-40 w-40"
                            src={mfaQrCode}
                            alt="Authenticator setup QR code"
                            width={160}
                            height={160}
                            unoptimized
                          />
                          <p className="mt-3 text-xs text-slate-600">
                            Scan with an authenticator app, then enter its
                            six-digit code.
                          </p>
                        </div>
                      )}
                      <label className="block text-sm font-medium text-white/75">
                        Authenticator code
                        <input
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white outline-none transition focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(event) => onOtpChange(event.target.value)}
                        />
                      </label>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-semibold text-[#11131a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: theme.color }}
                        type="submit"
                        disabled={busy || otp.length !== 6}
                      >
                        {busy ? "Verifying…" : "Verify and open studio"}
                        {!busy && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1">
                        {(["sign-in", "sign-up"] as const).map((tab) => (
                          <button
                            key={tab}
                            aria-pressed={authTab === tab}
                            className="relative rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                            onClick={() => onTabChange(tab)}
                            type="button"
                          >
                            {authTab === tab && (
                              <motion.span
                                aria-hidden="true"
                                className="absolute inset-0 rounded-lg"
                                layoutId="auth-tab-highlight"
                                style={{
                                  backgroundColor: `${theme.color}26`,
                                  boxShadow: `inset 0 0 0 1px ${theme.color}55`,
                                }}
                                transition={{
                                  type: "spring",
                                  stiffness: 380,
                                  damping: 32,
                                }}
                              />
                            )}
                            <span
                              className="relative z-10"
                              style={{
                                color:
                                  authTab === tab ? theme.color : "#a1a1aa",
                              }}
                            >
                              {tab === "sign-in" ? "Sign in" : "Sign up"}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mb-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                          {authTab === "sign-in"
                            ? "Welcome back"
                            : "Make it yours"}
                        </p>
                        <h1 className="mt-2 font-serif text-3xl tracking-tight text-white sm:text-[2.1rem]">
                          {authTab === "sign-in"
                            ? "Your next chapter awaits."
                            : "Create your atelier space."}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-white/55">
                          {authTab === "sign-in"
                            ? "Sign in to keep every fitting, detail, and finished look close at hand."
                            : "Save each client’s style journey in one private, beautifully organized place."}
                        </p>
                      </div>

                      {authTab === "sign-in" ? (
                        <form className="space-y-4" onSubmit={onSignIn}>
                          <label className="block text-sm font-medium text-white/75">
                            Username
                            <input
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                              autoComplete="username"
                              placeholder="your.username"
                              required
                              value={username}
                              onChange={(event) =>
                                onUsernameChange(event.target.value)
                              }
                            />
                            <span className="mt-1 block text-xs text-white/40">
                              Existing accounts can still use their email.
                            </span>
                          </label>
                          <label className="block text-sm font-medium text-white/75">
                            Password
                            <span className="relative mt-2 block">
                              <input
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                required
                                value={password}
                                onChange={(event) =>
                                  onPasswordChange(event.target.value)
                                }
                              />
                              <button
                                aria-label={
                                  showPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/45 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--auth-accent)]"
                                onClick={() =>
                                  onShowPasswordChange(!showPassword)
                                }
                                type="button"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </span>
                          </label>
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-white/60">
                              <input
                                checked={rememberMe}
                                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-[var(--auth-accent)]"
                                onChange={(event) =>
                                  onRememberMeChange(event.target.checked)
                                }
                                type="checkbox"
                              />
                              Remember me
                            </label>
                            <button
                              className="font-medium transition hover:text-[var(--auth-accent)] disabled:opacity-50"
                              disabled={busy}
                              onClick={onResetPassword}
                              type="button"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <button
                            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-semibold text-[#11131a] shadow-[0_12px_34px_-18px_var(--auth-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: theme.color }}
                            type="submit"
                            disabled={busy}
                          >
                            {busy ? "Signing in…" : "Sign in to your space"}
                            {!busy && <ArrowRight className="h-4 w-4" />}
                          </button>
                          <p className="border-t border-white/10 pt-4 text-center text-xs leading-5 text-white/40">
                            Sign-in is protected with an authenticator code.
                            We&apos;ll guide you through setup if needed.
                          </p>
                        </form>
                      ) : (
                        <form className="space-y-4" onSubmit={onSignUp}>
                          <label className="block text-sm font-medium text-white/75">
                            Your name
                            <input
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                              autoComplete="name"
                              placeholder="Clare Vogue"
                              required
                              value={fullName}
                              onChange={(event) =>
                                onFullNameChange(event.target.value)
                              }
                            />
                          </label>
                          <label className="block text-sm font-medium text-white/75">
                            Username
                            <input
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                              autoComplete="username"
                              placeholder="Choose a unique username"
                              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}"
                              title="Use 3–32 letters, numbers, dots, underscores, or hyphens."
                              required
                              value={username}
                              onChange={(event) =>
                                onUsernameChange(event.target.value)
                              }
                            />
                            <span className="mt-1.5 block text-xs text-white/45">
                              3–32 characters; letters, numbers, dots,
                              underscores, and hyphens only.
                            </span>
                          </label>
                          <label className="block text-sm font-medium text-white/75">
                            Email address
                            <input
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              required
                              value={email}
                              onChange={(event) =>
                                onEmailChange(event.target.value)
                              }
                            />
                          </label>
                          <label className="block text-sm font-medium text-white/75">
                            Phone number
                            <input
                              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                              type="tel"
                              autoComplete="tel"
                              placeholder="+2348012345678"
                              pattern="\+[1-9][0-9]{7,14}"
                              title="Include your country code, for example +2348012345678."
                              required
                              value={phone}
                              onChange={(event) =>
                                onPhoneChange(event.target.value)
                              }
                            />
                            <span className="mt-1 block text-xs text-white/40">
                              Include your country code; this is saved as
                              contact information, not SMS verification.
                            </span>
                          </label>
                          <label className="block text-sm font-medium text-white/75">
                            Create a password
                            <span className="relative mt-2 block">
                              <input
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--auth-accent)] focus:ring-2 focus:ring-[var(--auth-accent)]/20"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                minLength={8}
                                required
                                value={password}
                                onChange={(event) =>
                                  onPasswordChange(event.target.value)
                                }
                              />
                              <button
                                aria-label={
                                  showPassword
                                    ? "Hide password"
                                    : "Show password"
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/45 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--auth-accent)]"
                                onClick={() =>
                                  onShowPasswordChange(!showPassword)
                                }
                                type="button"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </span>
                          </label>
                          <button
                            className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-semibold text-[#11131a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: theme.color }}
                            type="submit"
                            disabled={busy}
                          >
                            {busy ? "Creating your space…" : "Create account"}
                            {!busy && <ArrowRight className="h-4 w-4" />}
                          </button>
                          <p className="border-t border-white/10 pt-4 text-center text-xs leading-5 text-white/40">
                            New accounts are verified by email and protected
                            with authenticator-based sign-in.
                          </p>
                        </form>
                      )}

                    </>
                  )}

                  {(error || notice) && (
                    <p
                      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                        error
                          ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                          : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      }`}
                      role={error ? "alert" : "status"}
                    >
                      {error || notice}
                    </p>
                  )}

                  <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/35">
                    <KeyRound className="h-3 w-3" />
                    Your studio and client imagery stay private.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
