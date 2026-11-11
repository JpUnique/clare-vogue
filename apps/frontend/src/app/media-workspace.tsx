"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AuthScreen from "./auth-screen";
import LiveWorkroom from "./live-workroom";

type AppConfig = {
  apiBaseUrl: string;
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
};

type Order = {
  id: string;
  reference: string;
  customerName: string;
  orderDate: string;
  summary: {
    status:
      "active" | "blocked" | "partially_delivered" | "completed" | "cancelled";
    garmentCount: number;
    activeCount: number;
    blockedCount: number;
    deliveredCount: number;
    cancelledCount: number;
  };
};

type Garment = {
  id: string;
  description: string;
  stage: string;
};

type MediaItem = {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: string;
  createdAt: string;
  status: string;
  downloadUrl: string;
  consent: ConsentEvent[];
};

type ConsentEvent = {
  id: string;
  action: "granted" | "withdrawn";
  method: "verbal" | "written" | "electronic" | null;
  occurredAt: string;
  note: string | null;
};

type UploadResponse = {
  media: { id: string };
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

const acceptedMediaTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
]);

const lampThemes = [
  { name: "fuchsia", color: "#d51d78" },
  { name: "gold", color: "#c59a4a" },
  { name: "rose", color: "#a82462" },
  { name: "champagne", color: "#e9c678" },
] as const;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatBytes(bytes: string): string {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return "Unknown size";
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOrderStatus(status: Order["summary"]["status"]): string {
  return status.replaceAll("_", " ");
}

export default function MediaWorkspace() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<
    "checking" | "sign-in" | "challenge" | "enroll"
  >("checking");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaQrCode, setMfaQrCode] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authTab, setAuthTab] = useState<"sign-in" | "sign-up">("sign-in");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [lampOn, setLampOn] = useState(false);
  const [accentIndex, setAccentIndex] = useState(0);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const accountCreationInProgress = useRef(false);
  const handledSessionToken = useRef<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [displayName, setDisplayName] = useState("Clare");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedGarmentId, setSelectedGarmentId] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [consentMethod, setConsentMethod] = useState<
    "verbal" | "written" | "electronic"
  >("written");
  const [consentNote, setConsentNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;

  const supabaseClient = useMemo(() => {
    if (!config?.supabaseUrl || !config.supabasePublishableKey) return null;
    return createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: rememberMe,
      },
    });
  }, [config, rememberMe]);

  const apiRequest = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!config || !accessToken || authMode !== "sign-in") {
        throw new Error("Sign in with a verified MFA session to continue.");
      }

      const response = await fetch(
        `${config.apiBaseUrl.replace(/\/$/, "")}/api/v1${path}`,
        {
          ...init,
          headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Request failed (${response.status}).`;
        throw new Error(message);
      }
      return payload as T;
    },
    [accessToken, authMode, config],
  );

  const handleSession = useCallback(
    async (session: Session | null) => {
      if (!session || !supabaseClient) {
        handledSessionToken.current = null;
        setAccessToken(null);
        setAuthMode("sign-in");
        setMfaFactorId("");
        setMfaQrCode("");
        setOrders([]);
        setOrdersLoaded(false);
        setOrdersLoadError("");
        setGarments([]);
        setMedia([]);
        setSelectedOrderId("");
        setSelectedGarmentId("");
        setSelectedFile(null);
        return;
      }

      if (handledSessionToken.current === session.access_token) return;
      handledSessionToken.current = session.access_token;
      try {
        setAuthMode("checking");
        setAccessToken(session.access_token);
        setError("");
        const name = session.user.user_metadata.full_name;
        if (typeof name === "string" && name.trim()) {
          setDisplayName(name.trim().split(/\s+/)[0]);
        }
        const assurance =
          await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assurance.error) throw assurance.error;
        if (assurance.data.currentLevel === "aal2") {
          setAuthMode("sign-in");
          setMfaFactorId("");
          setMfaQrCode("");
          return;
        }

        const factors = await supabaseClient.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        const verifiedTotp = factors.data.totp.find(
          (factor) => factor.status === "verified",
        );
        if (verifiedTotp) {
          setMfaFactorId(verifiedTotp.id);
          setAuthMode("challenge");
          return;
        }

        const enrollment = await supabaseClient.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Clare Vogue authenticator",
        });
        if (enrollment.error) throw enrollment.error;
        setMfaFactorId(enrollment.data.id);
        setMfaQrCode(enrollment.data.totp.qr_code);
        setAuthMode("enroll");
      } catch (cause) {
        handledSessionToken.current = null;
        throw cause;
      }
    },
    [supabaseClient],
  );

  useEffect(() => {
    let active = true;
    void fetch("/api/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Frontend configuration is unavailable.");
        return (await response.json()) as AppConfig;
      })
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch((cause: unknown) => {
        if (active) setError(getErrorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    let active = true;
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session) {
        void handleSession(null);
      } else if (event === "SIGNED_IN") {
        if (accountCreationInProgress.current) return;
        void handleSession(session).catch((cause: unknown) => {
          setAuthMode("sign-in");
          setError(getErrorMessage(cause));
        });
      } else if (event === "TOKEN_REFRESHED") {
        setAccessToken(session.access_token);
      }
    });
    void supabaseClient.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
          setAuthMode("sign-in");
        } else if (data.session) {
          void handleSession(data.session).catch((cause: unknown) => {
            setAuthMode("sign-in");
            setError(getErrorMessage(cause));
          });
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [handleSession, supabaseClient]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersLoadError("");
    try {
      const rows = await apiRequest<Order[]>("/orders?limit=50&offset=0");
      setOrders(rows);
      setOrdersLoaded(true);
    } catch (cause) {
      setOrdersLoadError(getErrorMessage(cause));
      throw cause;
    } finally {
      setOrdersLoading(false);
    }
  }, [apiRequest]);

  const loadMedia = useCallback(
    async (garmentId: string) => {
      setMedia([]);
      if (!garmentId) return;
      const rows = await apiRequest<
        Omit<MediaItem, "downloadUrl" | "consent">[]
      >(`/garments/${encodeURIComponent(garmentId)}/media`);
      const enriched = await Promise.all(
        rows.map(async (item) => {
          const [download, consent] = await Promise.all([
            apiRequest<{ downloadUrl: string }>(
              `/media/${encodeURIComponent(item.id)}/download-url`,
            ),
            apiRequest<ConsentEvent[]>(
              `/media/${encodeURIComponent(item.id)}/portfolio-consent`,
            ),
          ]);
          return {
            ...item,
            downloadUrl: download.downloadUrl,
            consent,
          };
        }),
      );
      setMedia(enriched);
    },
    [apiRequest],
  );

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseClient || !config) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${config.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/username-sign-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Sign-in failed (${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("accessToken" in payload) ||
        typeof payload.accessToken !== "string" ||
        !("refreshToken" in payload) ||
        typeof payload.refreshToken !== "string"
      ) {
        throw new Error("The sign-in service returned an invalid response.");
      }
      const result = await supabaseClient.auth.setSession({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
      });
      if (result.error) throw result.error;
      if (!result.data.session) {
        throw new Error(
          "No active session was returned. Confirm your email, then try signing in again.",
        );
      }
      setPassword("");
    } catch (cause) {
      setAuthMode("sign-in");
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseClient || !config) return;
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
      setError(
        "Username must be 3–32 characters, start with a letter or number, and use only letters, numbers, dots, underscores, or hyphens.",
      );
      return;
    }
    setBusy(true);
    accountCreationInProgress.current = true;
    setError("");
    setNotice("");
    try {
      const availabilityResponse = await fetch(
        `${config.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/username-availability`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalizedUsername }),
        },
      );
      const availabilityPayload: unknown = await availabilityResponse
        .json()
        .catch(() => null);
      if (!availabilityResponse.ok) {
        const message =
          typeof availabilityPayload === "object" &&
          availabilityPayload !== null &&
          "message" in availabilityPayload &&
          typeof availabilityPayload.message === "string"
            ? availabilityPayload.message
            : `Username check failed (${availabilityResponse.status}).`;
        throw new Error(message);
      }
      if (
        typeof availabilityPayload !== "object" ||
        availabilityPayload === null ||
        !("available" in availabilityPayload) ||
        availabilityPayload.available !== true
      ) {
        throw new Error("That username is already taken. Choose another.");
      }

      const response = await fetch(
        `${config.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/username-sign-up`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: normalizedUsername,
            email: email.trim(),
            password,
            fullName: fullName.trim(),
            phone: phone.trim(),
          }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Account creation failed (${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("confirmationRequired" in payload) ||
        typeof payload.confirmationRequired !== "boolean" ||
        !("accessToken" in payload) ||
        !(
          typeof payload.accessToken === "string" ||
          payload.accessToken === null
        ) ||
        !("refreshToken" in payload) ||
        !(
          typeof payload.refreshToken === "string" ||
          payload.refreshToken === null
        )
      ) {
        throw new Error("The sign-up service returned an invalid response.");
      }

      if (payload.accessToken && payload.refreshToken) {
        const sessionResult = await supabaseClient.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });
        if (sessionResult.error) throw sessionResult.error;
        if (!sessionResult.data.session) {
          throw new Error("The authentication session could not be started.");
        }
        await handleSession(sessionResult.data.session);
        setPassword("");
      } else if (payload.confirmationRequired) {
        setNotice(
          "Account created. Check your email to confirm your address, then sign in.",
        );
        setAuthTab("sign-in");
        setAccentIndex((value) => (value + 1) % lampThemes.length);
        setPassword("");
      } else {
        throw new Error("The sign-up service returned an invalid response.");
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      accountCreationInProgress.current = false;
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!config) return;
    if (!username.trim()) {
      setError("Enter your username first so we can send a reset link.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${config.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : `Password reset failed (${response.status}).`;
        throw new Error(message);
      }
      setNotice(
        "If an account exists for that username or email, a reset link is on its way.",
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }


  function switchAuthTab(tab: "sign-in" | "sign-up") {
    if (tab === authTab) return;
    setAuthTab(tab);
    setAccentIndex((value) => (value + 1) % lampThemes.length);
    setError("");
    setNotice("");
  }

  function toggleLamp() {
    const turningOn = !lampOn;
    setLampOn(turningOn);

    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) {
      setNotice(
        "Your browser does not support lamp sound; the light still works.",
      );
      return;
    }

    try {
      const context = new AudioContextClass();
      const now = context.currentTime;
      void context.resume().catch(() => {
        setNotice("Your browser muted the lamp sound; the light still works.");
      });

      const click = context.createOscillator();
      const clickGain = context.createGain();
      click.type = "triangle";
      click.frequency.setValueAtTime(turningOn ? 980 : 720, now);
      click.frequency.exponentialRampToValueAtTime(
        turningOn ? 340 : 260,
        now + 0.055,
      );
      clickGain.gain.setValueAtTime(0.045, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      click.connect(clickGain);
      clickGain.connect(context.destination);
      click.start(now);
      click.stop(now + 0.07);

      if (turningOn) {
        const hum = context.createOscillator();
        const humGain = context.createGain();
        hum.type = "sine";
        hum.frequency.setValueAtTime(120, now + 0.06);
        humGain.gain.setValueAtTime(0.0001, now + 0.06);
        humGain.gain.exponentialRampToValueAtTime(0.012, now + 0.12);
        humGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
        hum.connect(humGain);
        humGain.connect(context.destination);
        hum.start(now + 0.06);
        hum.stop(now + 0.64);
      }

      window.setTimeout(() => {
        void context.close();
      }, 750);
    } catch {
      setNotice("Your browser muted the lamp sound; the light still works.");
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabaseClient || !mfaFactorId) return;
    setBusy(true);
    setError("");
    try {
      const challenge = await supabaseClient.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challenge.error) throw challenge.error;
      const verified = await supabaseClient.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.data.id,
        code: otp,
      });
      if (verified.error) throw verified.error;
      setOtp("");
      setNotice("Authenticator verified. Your secure workspace is ready.");
      await handleSession(verified.data);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabaseClient.auth.signOut();
      if (result.error) throw result.error;
      await handleSession(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !selectedGarmentId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!acceptedMediaTypes.has(selectedFile.type)) {
        throw new Error("Choose a JPEG, PNG, WebP, MP4, or MOV file.");
      }
      const response = await apiRequest<UploadResponse>(
        `/garments/${encodeURIComponent(selectedGarmentId)}/media/upload-url`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: selectedFile.name,
            contentType: selectedFile.type,
            fileSizeBytes: selectedFile.size,
          }),
        },
      );
      const upload = await fetch(response.uploadUrl, {
        method: "PUT",
        headers: response.requiredHeaders,
        body: selectedFile,
      });
      if (!upload.ok) {
        throw new Error(
          `Private storage rejected the upload (${upload.status}). Check the bucket CORS settings and try again.`,
        );
      }
      await apiRequest(
        `/media/${encodeURIComponent(response.media.id)}/complete`,
        {
          method: "POST",
        },
      );
      setSelectedFile(null);
      const input = document.getElementById(
        "media-file",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      setNotice("Upload verified and added to this garment.");
      await loadMedia(selectedGarmentId);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function updateConsent(item: MediaItem) {
    const activeConsent =
      [...item.consent].sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )[0]?.action === "granted";
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(
        `/media/${encodeURIComponent(item.id)}/portfolio-consent${activeConsent ? "/withdraw" : ""}`,
        {
          method: "POST",
          body: JSON.stringify(
            activeConsent
              ? { withdrawnAt: new Date().toISOString(), note: consentNote }
              : {
                  consentedAt: new Date().toISOString(),
                  method: consentMethod,
                  note: consentNote,
                },
          ),
        },
      );
      setConsentNote("");
      setNotice(
        activeConsent
          ? "Portfolio consent withdrawal recorded."
          : "Portfolio consent recorded for this media only.",
      );
      await loadMedia(selectedGarmentId);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const readyForWorkspace = Boolean(accessToken && authMode === "sign-in");
  const authConfigured = Boolean(
    config?.supabaseUrl && config.supabasePublishableKey,
  );
  const lampTheme = lampThemes[accentIndex];
  const activeOrders = orders.filter(
    (order) =>
      order.summary.status !== "completed" &&
      order.summary.status !== "cancelled",
  ).length;
  const activeGarments = orders.reduce(
    (count, order) => count + order.summary.activeCount,
    0,
  );
  const blockedGarments = orders.reduce(
    (count, order) => count + order.summary.blockedCount,
    0,
  );
  const firstName = displayName || "Clare";

  return (
    <>
      {!readyForWorkspace && (
        <AuthScreen
          authConfigured={authConfigured}
          authMode={authMode}
          authTab={authTab}
          busy={busy}
          email={email}
          error={error}
          fullName={fullName}
          phone={phone}
          username={username}
          lampOn={lampOn}
          mfaQrCode={mfaQrCode}
          notice={notice}
          otp={otp}
          password={password}
          rememberMe={rememberMe}
          showPassword={showPassword}
          theme={lampTheme}
          onEmailChange={setEmail}
          onFullNameChange={setFullName}
          onPhoneChange={setPhone}
          onUsernameChange={setUsername}
          onLampToggle={toggleLamp}
          onMfaSubmit={submitMfa}
          onOtpChange={setOtp}
          onPasswordChange={setPassword}
          onResetPassword={sendPasswordReset}
          onRememberMeChange={setRememberMe}
          onShowPasswordChange={setShowPassword}
          onSignIn={submitSignIn}
          onSignUp={submitSignUp}
          onTabChange={switchAuthTab}
        />
      )}
      {readyForWorkspace && (
        <main className="min-h-screen bg-[#fffaf7] text-[#35232d]">
          <header className="border-b border-[#f2dce6] bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src="/clare-vogue-logo.png"
                  alt="Clare's Vogue Fashion Designer"
                  width={132}
                  height={106}
                  priority
                  className="h-[68px] w-[86px] object-contain sm:h-[82px] sm:w-[106px]"
                />
              </Link>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-[#f2dce6] bg-[#fff7fb] px-4 py-2 text-xs font-medium tracking-wide text-[#a82462] sm:inline">
                  CLARE&apos;S VOGUE ATELIER
                </span>
                {accessToken && (
                  <button
                    className="rounded-full border border-[#efc5d8] px-4 py-2 text-sm font-medium text-[#a82462] transition hover:bg-[#fff3f8] disabled:opacity-50"
                    onClick={() => void signOut()}
                    disabled={busy}
                  >
                    {readyForWorkspace ? "Sign out" : "Cancel and sign out"}
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="hidden">
            {readyForWorkspace && (
              <div className="mb-10 space-y-8">
                <motion.section
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
                  className="relative overflow-hidden rounded-[2rem] border border-[#f0d7df] bg-gradient-to-br from-white via-[#fff8fb] to-[#fff3e1] p-7 shadow-[0_24px_70px_-52px_rgba(177,44,104,0.42)] sm:p-10"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-[#e9bc72]/35"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-[#d51d78]/10"
                  />
                  <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#a82462]">
                        Your atelier, all in one place
                      </p>
                      <h1 className="font-serif text-4xl leading-tight tracking-tight text-[#3b2430] sm:text-5xl">
                        Welcome back, {firstName}.
                      </h1>
                      <p className="mt-4 max-w-xl text-base leading-7 text-[#75636b]">
                        Your orders, fittings, and private garment stories are
                        ready when you are.
                      </p>
                    </div>
                    <a
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#d51d78] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(213,29,120,0.7)] transition hover:bg-[#b81766] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d51d78]"
                      href="#studio-workspace"
                      onClick={() => {
                        if (orders[0]) setSelectedOrderId(orders[0].id);
                      }}
                    >
                      Continue to your studio
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </motion.section>

                <section
                  aria-label="Studio overview"
                  className="grid gap-4 sm:grid-cols-3"
                >
                  {[
                    {
                      label: "Active orders",
                      value: activeOrders,
                      detail: "Among your latest orders",
                      accent: "text-[#a82462]",
                    },
                    {
                      label: "Pieces in progress",
                      value: activeGarments,
                      detail: "Across the orders shown",
                      accent: "text-[#795817]",
                    },
                    {
                      label: "Need attention",
                      value: blockedGarments,
                      detail:
                        blockedGarments === 1
                          ? "Piece currently blocked"
                          : "Pieces currently blocked",
                      accent:
                        blockedGarments > 0
                          ? "text-[#a82462]"
                          : "text-[#795817]",
                    },
                  ].map((item, index) => (
                    <motion.article
                      key={item.label}
                      initial={
                        shouldReduceMotion ? false : { opacity: 0, y: 10 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.3,
                        delay: shouldReduceMotion ? 0 : index * 0.06,
                      }}
                      className="rounded-2xl border border-[#f1e2e8] bg-white p-5 shadow-[0_12px_36px_-30px_rgba(68,39,54,0.35)] sm:p-6"
                    >
                      <p className="text-sm font-medium text-[#75636b]">
                        {item.label}
                      </p>
                      <p className={`mt-3 font-serif text-4xl ${item.accent}`}>
                        {ordersLoaded ? item.value : "—"}
                      </p>
                      <p className="mt-2 text-xs text-[#8a7a81]">
                        {item.detail}
                      </p>
                    </motion.article>
                  ))}
                </section>

                <section aria-labelledby="recent-orders-title">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d51d78]">
                        A thoughtful overview
                      </p>
                      <h2
                        className="mt-1 font-serif text-2xl text-[#3b2430]"
                        id="recent-orders-title"
                      >
                        Recent orders
                      </h2>
                    </div>
                    <a
                      className="text-sm font-semibold text-[#a82462] underline decoration-[#e9bc72] underline-offset-4 transition hover:text-[#d51d78]"
                      href="#studio-workspace"
                    >
                      Open media studio
                    </a>
                  </div>

                  {ordersLoadError ? (
                    <div
                      className="rounded-2xl border border-[#f0c7d7] bg-white px-6 py-7 text-center"
                      role="alert"
                    >
                      <p className="text-sm text-[#9b315a]">
                        Recent orders could not be loaded.
                      </p>
                      <button
                        className="mt-4 rounded-full border border-[#efc5d8] px-4 py-2 text-sm font-semibold text-[#a82462] transition hover:bg-[#fff3f8] disabled:opacity-50"
                        disabled={ordersLoading}
                        onClick={() =>
                          void loadOrders().catch((cause: unknown) =>
                            setError(getErrorMessage(cause)),
                          )
                        }
                        type="button"
                      >
                        {ordersLoading ? "Trying again…" : "Try again"}
                      </button>
                    </div>
                  ) : ordersLoading || !ordersLoaded ? (
                    <div
                      aria-label="Loading recent orders"
                      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                      role="status"
                    >
                      {[0, 1, 2].map((item) => (
                        <div
                          className={`h-36 rounded-2xl border border-[#f1e2e8] bg-white ${
                            shouldReduceMotion ? "" : "animate-pulse"
                          }`}
                          key={item}
                        />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#e8d7dc] bg-white px-6 py-9 text-center">
                      <h3 className="font-serif text-xl text-[#3b2430]">
                        Your first order will feel right at home here.
                      </h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#75636b]">
                        When orders are added to your atelier, you&apos;ll find
                        their progress and garment stories on this page.
                      </p>
                      <a
                        className="mt-5 inline-flex rounded-full border border-[#efc5d8] px-5 py-2.5 text-sm font-semibold text-[#a82462] transition hover:bg-[#fff3f8]"
                        href="#studio-workspace"
                      >
                        Open your media studio
                      </a>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {orders.slice(0, 3).map((order, index) => (
                        <motion.button
                          key={order.id}
                          initial={
                            shouldReduceMotion ? false : { opacity: 0, y: 10 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: shouldReduceMotion ? 0 : 0.3,
                            delay: shouldReduceMotion ? 0 : index * 0.06,
                          }}
                          className={`group rounded-2xl border border-[#f1e2e8] bg-white p-5 text-left shadow-[0_12px_36px_-30px_rgba(68,39,54,0.35)] transition hover:border-[#e9bc72] hover:shadow-[0_18px_42px_-30px_rgba(168,36,98,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d51d78] ${
                            shouldReduceMotion ? "" : "hover:-translate-y-0.5"
                          }`}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            document
                              .getElementById("studio-workspace")
                              ?.scrollIntoView({
                                behavior: shouldReduceMotion
                                  ? "auto"
                                  : "smooth",
                              });
                          }}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a82462]">
                                {order.reference}
                              </p>
                              <h3 className="mt-2 font-serif text-xl text-[#3b2430]">
                                {order.customerName}
                              </h3>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-semibold capitalize ${
                                order.summary.status === "blocked"
                                  ? "bg-[#fff1f4] text-[#a82462]"
                                  : order.summary.status === "completed"
                                    ? "bg-[#f5f1e8] text-[#795817]"
                                    : "bg-[#fff7fb] text-[#795c70]"
                              }`}
                            >
                              {formatOrderStatus(order.summary.status)}
                            </span>
                          </div>
                          <div className="mt-5 flex items-center justify-between border-t border-[#f5eaf0] pt-4 text-xs text-[#75636b]">
                            <span>
                              {order.summary.activeCount} in progress
                              {order.summary.blockedCount > 0 &&
                                ` · ${order.summary.blockedCount} need attention`}
                            </span>
                            <span className="font-medium text-[#a82462] transition group-hover:translate-x-0.5">
                              View
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {(error || notice) && (
              <div
                role={error ? "alert" : "status"}
                className={`mb-7 rounded-2xl border px-5 py-4 text-sm ${
                  error
                    ? "border-[#f0c7d7] bg-[#fff2f6] text-[#9b315a]"
                    : "border-[#eddcb7] bg-[#fff9e9] text-[#795817]"
                }`}
              >
                {error || notice}
              </div>
            )}

            {!config && !error && (
              <div className="rounded-3xl border border-[#f1e2e8] bg-white p-8 text-[#75636b]">
                Preparing the secure workspace…
              </div>
            )}

            {config && !accessToken && (
              <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative overflow-hidden rounded-[2rem] border border-[#f0c5d8] bg-gradient-to-br from-[#fff0f7] via-[#fff8fb] to-[#fff3e1] p-7 shadow-[0_24px_70px_-45px_rgba(177,44,104,0.42)] sm:p-10">
                  <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-[#e9bc72]/50" />
                  <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border border-[#e9bc72]/50" />
                  <div className="relative flex h-full flex-col">
                    <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-[#f0d7a8] bg-white/75 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9b712c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d51d78]" />
                      MADE WITH HEART
                    </div>
                    <div className="mb-7 flex justify-center rounded-[1.5rem] border border-white/80 bg-white/85 p-2 shadow-sm">
                      <Image
                        src="/clare-vogue-logo.png"
                        alt="Clare's Vogue Fashion Designer"
                        width={360}
                        height={288}
                        priority
                        className="h-auto max-h-56 w-full max-w-[300px] object-contain sm:max-h-64"
                      />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d51d78]">
                      Your atelier, all in one place
                    </p>
                    <h2 className="mt-3 max-w-lg font-serif text-3xl leading-tight text-[#3b2430] sm:text-4xl">
                      Beautiful work. Thoughtfully remembered.
                    </h2>
                    <p className="mt-4 max-w-xl leading-7 text-[#75636b]">
                      Keep fitting photos and finished looks beside each
                      garment. Every image stays private until your client gives
                      permission for that photo to be shared.
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-7">
                      {[
                        "Private client gallery",
                        "Per-photo permission",
                        "Always your work",
                      ].map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-[#f0d7a8] bg-white/70 px-3 py-2 text-xs font-medium text-[#795c38]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-[2rem] border border-[#f1e2e8] bg-white p-7 shadow-[0_24px_70px_-48px_rgba(68,39,54,0.28)] sm:p-10">
                  {!authConfigured ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d51d78]">
                        One last step
                      </p>
                      <h2 className="mt-2 font-serif text-2xl text-[#3b2430]">
                        Connect your studio
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-[#75636b]">
                        Add your Supabase project URL and publishable key to the
                        root
                        <code className="mx-1 rounded bg-[#fff0f7] px-1.5 py-0.5 text-[#a82462]">
                          .env
                        </code>
                        file, then restart Docker Compose.
                        <code className="mx-1 rounded bg-[#fff0f7] px-1.5 py-0.5 text-[#a82462]">
                          SUPABASE_URL
                        </code>
                        and
                        <code className="mx-1 rounded bg-[#fff0f7] px-1.5 py-0.5 text-[#a82462]">
                          SUPABASE_PUBLISHABLE_KEY
                        </code>
                        are client-safe public settings; never use a
                        service-role key here.
                      </p>
                    </>
                  ) : authMode === "checking" ? (
                    <p className="text-sm leading-6 text-[#75636b]">
                      Checking your secure session…
                    </p>
                  ) : authMode === "sign-in" ? (
                    <form className="space-y-5" onSubmit={submitSignIn}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d51d78]">
                          YOUR ATELIER AWAITS
                        </p>
                        <h2 className="mt-2 font-serif text-3xl text-[#3b2430]">
                          Welcome back
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-[#75636b]">
                          Sign in to pick up right where your creativity left
                          off.
                        </p>
                      </div>
                      <label className="block text-sm font-medium">
                        Email address
                        <input
                          className="mt-2 w-full rounded-xl border border-[#eadde2] bg-[#fffdfd] px-4 py-3 outline-none transition placeholder:text-[#b6a7ad] focus:border-[#d51d78] focus:ring-2 focus:ring-[#d51d78]/10"
                          type="email"
                          autoComplete="username"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        Password
                        <input
                          className="mt-2 w-full rounded-xl border border-[#eadde2] bg-[#fffdfd] px-4 py-3 outline-none transition placeholder:text-[#b6a7ad] focus:border-[#d51d78] focus:ring-2 focus:ring-[#d51d78]/10"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                        />
                      </label>
                      <button
                        className="w-full rounded-xl bg-[#d51d78] px-5 py-3.5 font-semibold text-white shadow-[0_10px_24px_-12px_rgba(213,29,120,0.75)] transition hover:bg-[#b81766] disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        disabled={busy}
                      >
                        {busy ? "Signing in…" : "Continue securely"}
                      </button>
                      <p className="border-t border-[#f1e2e8] pt-4 text-xs leading-5 text-[#8a7a81]">
                        Sign-in is protected with an authenticator code. If your
                        studio account needs to enroll, we&apos;ll guide you
                        through setup.
                      </p>
                    </form>
                  ) : (
                    <form className="space-y-5" onSubmit={submitMfa}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d51d78]">
                          {authMode === "enroll"
                            ? "One-time setup"
                            : "Second factor"}
                        </p>
                        <h2 className="mt-2 font-serif text-3xl text-[#3b2430]">
                          {authMode === "enroll"
                            ? "Connect your authenticator"
                            : "Verify it’s you"}
                        </h2>
                      </div>
                      {authMode === "enroll" && mfaQrCode && (
                        <div className="rounded-2xl bg-[#f7f5f0] p-5 text-center">
                          <Image
                            className="mx-auto h-44 w-44"
                            src={mfaQrCode}
                            alt="Authenticator setup QR code"
                            width={176}
                            height={176}
                            unoptimized
                          />
                          <p className="mt-3 text-xs text-[#6d6d64]">
                            Scan with an authenticator app, then enter its
                            six-digit code.
                          </p>
                        </div>
                      )}
                      <label className="block text-sm font-medium">
                        Authenticator code
                        <input
                          className="mt-2 w-full rounded-xl border border-[#eadde2] bg-[#fffdfd] px-4 py-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[#d51d78] focus:ring-2 focus:ring-[#d51d78]/10"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(event) => setOtp(event.target.value)}
                        />
                      </label>
                      <button
                        className="w-full rounded-xl bg-[#d51d78] px-5 py-3.5 font-semibold text-white shadow-[0_10px_24px_-12px_rgba(213,29,120,0.75)] transition hover:bg-[#b81766] disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        disabled={busy || otp.length !== 6}
                      >
                        {busy ? "Verifying…" : "Verify and open studio"}
                      </button>
                    </form>
                  )}
                </div>
              </section>
            )}

            {readyForWorkspace && (
              <section className="space-y-8" id="studio-workspace">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d51d78]">
                    Your private atelier
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-[#3b2430]">
                    Media studio
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#75636b]">
                    Select an order and garment to securely add fitting and
                    progress photos.
                  </p>
                </div>
                <div className="grid gap-5 rounded-[2rem] border border-[#f1e2e8] bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
                  <label className="block text-sm font-medium">
                    Order
                    <select
                      className="mt-2 w-full rounded-xl border border-[#eadde2] bg-white px-4 py-3 outline-none focus:border-[#d51d78] focus:ring-2 focus:ring-[#d51d78]/10"
                      value={selectedOrderId}
                      onChange={(event) => {
                        setSelectedOrderId(event.target.value);
                        setError("");
                      }}
                      disabled={busy}
                    >
                      <option value="">Choose an order</option>
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.reference} · {order.customerName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Garment
                    <select
                      className="mt-2 w-full rounded-xl border border-[#eadde2] bg-white px-4 py-3 outline-none focus:border-[#d51d78] focus:ring-2 focus:ring-[#d51d78]/10"
                      value={selectedGarmentId}
                      onChange={(event) => {
                        setSelectedGarmentId(event.target.value);
                        setError("");
                      }}
                      disabled={!garments.length || busy}
                    >
                      <option value="">Choose a garment</option>
                      {garments.map((garment) => (
                        <option key={garment.id} value={garment.id}>
                          {garment.description} ·{" "}
                          {garment.stage.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
                  <form
                    className="h-fit rounded-[2rem] bg-gradient-to-br from-[#d51d78] to-[#a91d62] p-7 text-white shadow-[0_22px_55px_-32px_rgba(169,29,98,0.65)] sm:p-8"
                    onSubmit={uploadMedia}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ffe3ef]">
                      Private by default
                    </p>
                    <h2 className="mt-3 font-serif text-2xl">
                      Add garment media
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">
                      Upload a clear progress or fitting photo. Images up to 20
                      MB and videos up to 200 MB are supported.
                    </p>
                    <label className="mt-6 block rounded-2xl border border-dashed border-white/35 bg-white/5 p-5 text-sm">
                      Select a photo or video
                      <input
                        id="media-file"
                        className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-[#b81766]"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                        onChange={onFileChange}
                        disabled={!selectedGarmentId || busy}
                      />
                    </label>
                    {selectedFile && (
                      <p className="mt-3 truncate text-sm text-white/80">
                        {selectedFile.name} ·{" "}
                        {formatBytes(String(selectedFile.size))}
                      </p>
                    )}
                    <button
                      className="mt-5 w-full rounded-xl bg-[#f7dfb0] px-5 py-3.5 font-semibold text-[#644517] transition hover:bg-[#ffe9c2] disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={!selectedFile || !selectedGarmentId || busy}
                    >
                      {busy ? "Working…" : "Upload privately"}
                    </button>
                    <p className="mt-4 text-xs leading-5 text-white/65">
                      Upload does not grant portfolio permission. Consent is
                      recorded separately for each image.
                    </p>
                  </form>

                  <div>
                    <div className="mb-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d51d78]">
                          Secure gallery
                        </p>
                        <h2 className="mt-2 font-serif text-2xl">
                          Garment media
                        </h2>
                      </div>
                      <span className="text-sm text-[#77776e]">
                        {media.length} {media.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    {!selectedGarmentId ? (
                      <div className="rounded-[2rem] border border-dashed border-[#d8d5cc] px-6 py-14 text-center text-[#77776e]">
                        Choose an order and garment to see its private media.
                      </div>
                    ) : media.length === 0 ? (
                      <div className="rounded-[2rem] border border-dashed border-[#d8d5cc] px-6 py-14 text-center text-[#77776e]">
                        No available media yet. Upload the first item for this
                        garment.
                      </div>
                    ) : (
                      <div className="grid gap-5 sm:grid-cols-2">
                        {media.map((item) => {
                          const latestConsent = [...item.consent].sort(
                            (a, b) =>
                              new Date(b.occurredAt).getTime() -
                              new Date(a.occurredAt).getTime(),
                          )[0];
                          const hasConsent =
                            latestConsent?.action === "granted";
                          return (
                            <article
                              className="overflow-hidden rounded-[1.75rem] border border-[#e6e2d9] bg-white"
                              key={item.id}
                            >
                              <div className="aspect-[4/3] bg-[#eeece6]">
                                {item.contentType.startsWith("video/") ? (
                                  <video
                                    className="h-full w-full object-cover"
                                    controls
                                    preload="metadata"
                                    src={item.downloadUrl}
                                  />
                                ) : (
                                  <Image
                                    className="h-full w-full object-cover"
                                    src={item.downloadUrl}
                                    alt={item.originalFilename}
                                    width={800}
                                    height={600}
                                    unoptimized
                                  />
                                )}
                              </div>
                              <div className="space-y-4 p-5">
                                <div>
                                  <h3 className="truncate font-medium">
                                    {item.originalFilename}
                                  </h3>
                                  <p className="mt-1 text-xs text-[#77776e]">
                                    {formatBytes(item.fileSizeBytes)} ·{" "}
                                    {formatDate(item.createdAt)}
                                  </p>
                                </div>
                                <div
                                  className={`rounded-xl px-3 py-2 text-xs ${
                                    hasConsent
                                      ? "bg-[#fff1f7] text-[#a82462]"
                                      : "bg-[#fff8e9] text-[#786444]"
                                  }`}
                                >
                                  {hasConsent
                                    ? `Portfolio consent · ${latestConsent.method}`
                                    : "Private · no active portfolio consent"}
                                </div>
                                <div className="space-y-3 border-t border-[#eeeae2] pt-4">
                                  {!hasConsent && (
                                    <label className="block text-xs font-medium text-[#62635b]">
                                      Consent method
                                      <select
                                        className="mt-1.5 w-full rounded-lg border border-[#eadde2] bg-white px-3 py-2 text-sm focus:border-[#d51d78] focus:outline-none"
                                        value={consentMethod}
                                        onChange={(event) =>
                                          setConsentMethod(
                                            event.target.value as
                                              | "verbal"
                                              | "written"
                                              | "electronic",
                                          )
                                        }
                                        disabled={busy}
                                      >
                                        <option value="written">Written</option>
                                        <option value="electronic">
                                          Electronic
                                        </option>
                                        <option value="verbal">Verbal</option>
                                      </select>
                                    </label>
                                  )}
                                  <label className="block text-xs font-medium text-[#62635b]">
                                    {hasConsent
                                      ? "Withdrawal note (optional)"
                                      : "Consent note (optional)"}
                                    <textarea
                                      className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-[#eadde2] bg-white px-3 py-2 text-sm focus:border-[#d51d78] focus:outline-none"
                                      maxLength={2000}
                                      value={consentNote}
                                      onChange={(event) =>
                                        setConsentNote(event.target.value)
                                      }
                                      disabled={busy}
                                    />
                                  </label>
                                  <button
                                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                                      hasConsent
                                        ? "border border-[#efc5d8] text-[#a82462] hover:bg-[#fff3f8]"
                                        : "bg-[#f7dfb0] text-[#644517] hover:bg-[#ffe9c2]"
                                    }`}
                                    onClick={() => void updateConsent(item)}
                                    disabled={busy}
                                  >
                                    {hasConsent
                                      ? "Record consent withdrawal"
                                      : "Record portfolio consent"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
          <LiveWorkroom request={apiRequest} displayName={firstName} />
          <footer className="border-t border-[#f2dce6] bg-white">
            <div className="mx-auto max-w-7xl px-5 py-6 text-xs leading-5 text-[#77776e] sm:px-8">
              Client work stays private. Portfolio use requires separate,
              recorded consent. Storage URLs expire and are never published.
            </div>
          </footer>
        </main>
      )}
    </>
  );
}
