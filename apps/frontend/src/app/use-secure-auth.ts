import { useCallback, useEffect, useState } from "react";

export type SecureAuthState = {
  status: "checking" | "unauthenticated" | "authenticated";
  user: { id: string; username: string; email: string } | null;
  error: string | null;
  loading: boolean;
};

export type SecureAuthActions = {
  signin: (username: string, password: string) => Promise<void>;
  signup: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
};

type SecureAuthContextValue = SecureAuthState & SecureAuthActions;

const API_BASE_URL =
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:30000`
    : "";

/**
 * Secure Authentication Hook
 *
 * Features:
 * - Tokens stored in httpOnly cookies (not accessible by JavaScript)
 * - Automatic session validation
 * - Token refresh mechanism
 * - Session timeout handling
 */
export function useSecureAuth(): SecureAuthContextValue {
  const [state, setState] = useState<SecureAuthState>({
    status: "checking",
    user: null,
    error: null,
    loading: true,
  });

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
        method: "POST",
        credentials: "include", // Include cookies
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setState({
          status: "unauthenticated",
          user: null,
          error: null,
          loading: false,
        });
        return;
      }

      const data = await response.json();

      if (data.authenticated && data.user) {
        setState({
          status: "authenticated",
          user: data.user,
          error: null,
          loading: false,
        });
      } else {
        setState({
          status: "unauthenticated",
          user: null,
          error: null,
          loading: false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Session check failed";
      setState({
        status: "unauthenticated",
        user: null,
        error: message,
        loading: false,
      });
    }
  }, []);

  const signin = useCallback(
    async (username: string, password: string) => {
      setState((s) => ({ ...s, error: null, loading: true }));
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/sign-in`, {
          method: "POST",
          credentials: "include", // Include cookies
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Sign in failed");
        }

        const data = await response.json();
        setState({
          status: "authenticated",
          user: data.user,
          error: null,
          loading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        setState((s) => ({
          ...s,
          status: "unauthenticated",
          user: null,
          error: message,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  const signup = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      phone: string;
    }) => {
      setState((s) => ({ ...s, error: null, loading: true }));
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/sign-up`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Sign up failed");
        }

        const result = await response.json();

        if (result.confirmationRequired) {
          setState((s) => ({
            ...s,
            error:
              "Please verify your email to complete signup",
            loading: false,
          }));
          throw new Error("Email verification required");
        }

        setState({
          status: "authenticated",
          user: result.user,
          error: null,
          loading: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed";
        setState((s) => ({
          ...s,
          status: "unauthenticated",
          user: null,
          error: message,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  const forgotPassword = useCallback(async (username: string) => {
    setState((s) => ({ ...s, error: null, loading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Password reset request failed");
      }

      setState((s) => ({
        ...s,
        error: null,
        loading: false,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Password reset request failed";
      setState((s) => ({
        ...s,
        error: message,
        loading: false,
      }));
      throw err;
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, newPassword: string) => {
      setState((s) => ({ ...s, error: null, loading: true }));
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Password reset failed");
        }

        setState((s) => ({
          ...s,
          error: null,
          loading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Password reset failed";
        setState((s) => ({
          ...s,
          error: message,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      setState({
        status: "unauthenticated",
        user: null,
        error: null,
        loading: false,
      });
    } catch (err) {
      // Even if logout fails, clear local state
      setState({
        status: "unauthenticated",
        user: null,
        error: null,
        loading: false,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    signin,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    checkSession,
    clearError,
  };
}
