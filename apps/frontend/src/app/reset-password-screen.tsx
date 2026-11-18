"use client";

import { FormEvent, useState } from "react";

type ResetPasswordScreenProps = {
  token: string;
  onTokenChange: (token: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (password: string) => void;
  showPassword: boolean;
  onShowPasswordChange: (show: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBack: () => void;
  error: string;
  busy: boolean;
  success: boolean;
};

export default function ResetPasswordScreen({
  token,
  onTokenChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  showPassword,
  onShowPasswordChange,
  onSubmit,
  onBack,
  error,
  busy,
  success,
}: ResetPasswordScreenProps) {
  const passwordsMatch = password === confirmPassword && password.length >= 8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400 mb-6">
            Enter the reset code from your email and your new password
          </p>

          {success ? (
            <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-6">
              <p className="text-green-300 text-sm">
                Your password has been reset successfully. Please sign in with
                your new password.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Reset Code
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => onTokenChange(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter the code from your email"
                  disabled={busy}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="At least 8 characters"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => onShowPasswordChange(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => onConfirmPasswordChange(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your new password"
                  disabled={busy}
                />
              </div>

              {password && confirmPassword && !passwordsMatch && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3">
                  <p className="text-red-300 text-sm">
                    Passwords must match and be at least 8 characters
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !passwordsMatch || !token.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
              >
                {busy ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <button
            onClick={onBack}
            className="w-full mt-4 text-slate-400 hover:text-slate-300 text-sm transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
