"use client";

import { type FormEvent, useState } from "react";
import AuthScreen from "./auth-screen";
import LiveWorkroom from "./live-workroom";
import { useAuth } from "./use-auth";

const lampThemes = [
  { name: "fuchsia", color: "#d51d78" },
  { name: "gold", color: "#c59a4a" },
  { name: "rose", color: "#a82462" },
  { name: "champagne", color: "#e9c678" },
] as const;

export default function MediaWorkspace() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authTab, setAuthTab] = useState<"sign-in" | "sign-up">("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [accentIndex, setAccentIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  // Create ApiRequest function for authenticated API calls
  const apiRequest = (async (path: string, init: RequestInit = {}) => {
    if (!auth.token) throw new Error("Not authenticated");

    const response = await fetch(
      `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:30000/api/v1${path}`,
      {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
          Authorization: `Bearer ${auth.token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed (${response.status})`);
    }

    return response.json();
  }) as <T>(path: string, init?: RequestInit) => Promise<T>;

  // Show main workspace if authenticated
  if (auth.status === "authenticated" && auth.token) {
    return <LiveWorkroom request={apiRequest} displayName={auth.username || "User"} />;
  }

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await auth.signin(username, password);
      setPassword("");
    } catch {
      // Error is already in auth.error state
    } finally {
      setBusy(false);
    }
  }

  async function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const normalizedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
        auth.clearError();
        return;
      }

      await auth.signup({
        username: normalizedUsername,
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setPassword("");
    } catch {
      // Error is already in auth.error state
    } finally {
      setBusy(false);
    }
  }

  function toggleLamp() {
    setLampOn(!lampOn);
  }

  function switchAuthTab(tab: "sign-in" | "sign-up") {
    if (tab === authTab) return;
    setAuthTab(tab);
    setAccentIndex((value) => (value + 1) % lampThemes.length);
    auth.clearError();
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#08090d] text-white transition-colors duration-700">
      <AuthScreen
        authConfigured={true}
        authMode={auth.status === "checking" ? "checking" : "sign-in"}
        authTab={authTab}
        busy={busy || auth.status === "checking"}
        email={email}
        error={auth.error || ""}
        fullName={fullName}
        phone={phone}
        username={username}
        lampOn={lampOn}
        mfaQrCode=""
        notice=""
        otp=""
        password={password}
        rememberMe={true}
        showPassword={showPassword}
        theme={lampThemes[accentIndex]}
        onEmailChange={setEmail}
        onFullNameChange={setFullName}
        onPhoneChange={setPhone}
        onUsernameChange={setUsername}
        onLampToggle={toggleLamp}
        onMfaSubmit={() => {}}
        onOtpChange={() => {}}
        onPasswordChange={setPassword}
        onResetPassword={() => {}}
        onRememberMeChange={() => {}}
        onShowPasswordChange={setShowPassword}
        onSignIn={submitSignIn}
        onSignUp={submitSignUp}
        onTabChange={switchAuthTab}
      />
    </main>
  );
}
