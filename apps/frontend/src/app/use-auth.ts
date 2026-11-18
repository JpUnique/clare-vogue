import { useCallback, useEffect, useState } from "react";

export type AuthState = {
  status: "checking" | "unauthenticated" | "authenticated";
  token: string | null;
  username: string | null;
  error: string | null;
};

export type AuthActions = {
  signin: (username: string, password: string) => Promise<void>;
  signup: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

type AuthContextValue = AuthState & AuthActions;

const API_BASE_URL =
  typeof window !== "undefined"
    ? new URL(window.location.origin).protocol === "https:"
      ? `${window.location.protocol}//${window.location.hostname}:30000`
      : `http://${window.location.hostname}:30000`
    : "";

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    status: "checking",
    token: null,
    username: null,
    error: null,
  });

  // Initialize from localStorage
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const username = localStorage.getItem("authUsername");
    setState({
      status: token ? "authenticated" : "unauthenticated",
      token,
      username,
      error: null,
    });
  }, []);

  const signin = useCallback(
    async (username: string, password: string) => {
      setState((s) => ({ ...s, error: null }));
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/username-sign-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Sign in failed");
        }

        const data = await response.json();
        localStorage.setItem("authToken", data.accessToken);
        localStorage.setItem("authUsername", username);

        setState({
          status: "authenticated",
          token: data.accessToken,
          username,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        setState((s) => ({
          ...s,
          error: message,
          status: "unauthenticated",
          token: null,
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
      setState((s) => ({ ...s, error: null }));
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/username-sign-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Sign up failed");
        }

        const result = await response.json();

        if (result.accessToken && result.refreshToken) {
          localStorage.setItem("authToken", result.accessToken);
          localStorage.setItem("authUsername", data.username);

          setState({
            status: "authenticated",
            token: result.accessToken,
            username: data.username,
            error: null,
          });
        } else {
          throw new Error("Account created but no session returned");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed";
        setState((s) => ({
          ...s,
          error: message,
          status: "unauthenticated",
          token: null,
        }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUsername");
    setState({
      status: "unauthenticated",
      token: null,
      username: null,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    signin,
    signup,
    logout,
    clearError,
  };
}
