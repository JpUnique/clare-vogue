"use client";

import { useState, FormEvent } from "react";
import { useSecureAuth } from "./use-secure-auth";
import ForgotPasswordScreen from "./forgot-password-screen";
import ResetPasswordScreen from "./reset-password-screen";
import LiveWorkroom from "./live-workroom";
import AuthScreen from "./auth-screen";

type ScreenMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "workspace";

const lampThemes = [
  { name: "fuchsia", color: "#d51d78" },
  { name: "gold", color: "#c59a4a" },
  { name: "rose", color: "#a82462" },
  { name: "champagne", color: "#e9c678" },
] as const;

export default function MediaWorkspaceSecure() {
  const auth = useSecureAuth();

  // Form states
  const [screen, setScreen] = useState<ScreenMode>("sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [accentIndex, setAccentIndex] = useState(0);

  // Password reset specific states
  const [resetToken, setResetToken] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Create ApiRequest function for authenticated API calls
  const apiRequest = (async (path: string, init: RequestInit = {}) => {
    const response = await fetch(
      `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:30000/api/v1${path}`,
      {
        ...init,
        credentials: "include", // Include cookies
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed (${response.status})`);
    }

    return response.json();
  }) as <T>(path: string, init?: RequestInit) => Promise<T>;

  // Show workspace if authenticated
  if (auth.status === "authenticated" && auth.user) {
    return (
      <LiveWorkroom
        request={apiRequest}
        displayName={auth.user.username || "User"}
      />
    );
  }

  // Sign in handler
  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError("");

    try {
      await auth.signin(username, password);
      setPassword("");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Sign in failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Sign up handler
  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError("");

    try {
      const normalizedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
        throw new Error(
          "Username must be 3-32 chars, start with letter/number, and contain only letters, numbers, dots, dashes, or underscores"
        );
      }

      await auth.signup({
        username: normalizedUsername,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setPassword("");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Sign up failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Forgot password handler
  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError("");

    try {
      await auth.forgotPassword(username);
      setForgotSuccess(true);
      setUsername("");
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Password reset request failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Reset password handler
  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLocalError("");

    try {
      await auth.resetPassword(resetToken, password);
      setResetSuccess(true);
      setResetToken("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Password reset failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Screen navigation handlers
  function goToSignIn() {
    setScreen("sign-in");
    setLocalError("");
    setForgotSuccess(false);
    setResetSuccess(false);
    setEmail("");
    setUsername("");
    setPassword("");
    setFullName("");
    setPhone("");
    setResetToken("");
    setConfirmPassword("");
    setAccentIndex((i) => (i + 1) % lampThemes.length);
  }

  function goToSignUp() {
    setScreen("sign-up");
    setLocalError("");
    setEmail("");
    setUsername("");
    setPassword("");
    setFullName("");
    setPhone("");
    setAccentIndex((i) => (i + 1) % lampThemes.length);
  }

  function goToForgotPassword() {
    setScreen("forgot-password");
    setLocalError("");
    setUsername("");
    setForgotSuccess(false);
  }

  function goToResetPassword() {
    setScreen("reset-password");
    setLocalError("");
    setResetToken("");
    setPassword("");
    setConfirmPassword("");
    setResetSuccess(false);
  }

  // Loading state
  if (auth.status === "checking" || auth.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Render appropriate screen
  if (screen === "sign-in") {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#08090d] text-white transition-colors duration-700">
        <AuthScreen
          authConfigured={true}
          authMode="sign-in"
          authTab="sign-in"
          busy={busy}
          email={email}
          error={localError || auth.error || ""}
          fullName={fullName}
          phone={phone}
          username={username}
          lampOn={false}
          mfaQrCode=""
          notice=""
          otp=""
          password={password}
          rememberMe={true}
          showPassword={showPassword}
          theme={lampThemes[accentIndex]}
          resetToken=""
          newPassword=""
          confirmPassword=""
          onEmailChange={setEmail}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onUsernameChange={setUsername}
          onLampToggle={() => {}}
          onMfaSubmit={() => {}}
          onOtpChange={() => {}}
          onPasswordChange={setPassword}
          onResetPassword={goToForgotPassword}
          onCompletePasswordReset={() => {}}
          onResetTokenChange={() => {}}
          onNewPasswordChange={() => {}}
          onConfirmPasswordChange={() => {}}
          onRememberMeChange={() => {}}
          onShowPasswordChange={setShowPassword}
          onSignIn={handleSignIn}
          onSignUp={() => goToSignUp()}
          onTabChange={() => goToSignUp()}
        />
        <button
          onClick={goToForgotPassword}
          className="fixed bottom-6 right-6 text-slate-400 hover:text-slate-300 text-sm"
        >
          Forgot password?
        </button>
      </main>
    );
  }

  if (screen === "sign-up") {
    return (
      <main className="relative isolate min-h-screen overflow-hidden bg-[#08090d] text-white transition-colors duration-700">
        <AuthScreen
          authConfigured={true}
          authMode="enroll"
          authTab="sign-up"
          busy={busy}
          email={email}
          error={localError || auth.error || ""}
          fullName={fullName}
          phone={phone}
          username={username}
          lampOn={false}
          mfaQrCode=""
          notice=""
          otp=""
          password={password}
          rememberMe={true}
          showPassword={showPassword}
          theme={lampThemes[accentIndex]}
          resetToken=""
          newPassword=""
          confirmPassword=""
          onEmailChange={setEmail}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onUsernameChange={setUsername}
          onLampToggle={() => {}}
          onMfaSubmit={() => {}}
          onOtpChange={() => {}}
          onPasswordChange={setPassword}
          onResetPassword={() => {}}
          onCompletePasswordReset={() => {}}
          onResetTokenChange={() => {}}
          onNewPasswordChange={() => {}}
          onConfirmPasswordChange={() => {}}
          onRememberMeChange={() => {}}
          onShowPasswordChange={setShowPassword}
          onSignIn={() => goToSignIn()}
          onSignUp={handleSignUp}
          onTabChange={() => goToSignIn()}
        />
      </main>
    );
  }

  if (screen === "forgot-password") {
    return (
      <ForgotPasswordScreen
        username={username}
        onUsernameChange={setUsername}
        onSubmit={handleForgotPassword}
        onBack={goToSignIn}
        error={localError}
        busy={busy}
        success={forgotSuccess}
      />
    );
  }

  if (screen === "reset-password") {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onTokenChange={setResetToken}
        password={password}
        onPasswordChange={setPassword}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        showPassword={showPassword}
        onShowPasswordChange={setShowPassword}
        onSubmit={handleResetPassword}
        onBack={goToSignIn}
        error={localError}
        busy={busy}
        success={resetSuccess}
      />
    );
  }

  // Default fallback
  return <div>Loading...</div>;
}
