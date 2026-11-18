"use client";

import { FormEvent, useState } from "react";

type ForgotPasswordScreenProps = {
  username: string;
  onUsernameChange: (username: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onBack: () => void;
  error: string;
  busy: boolean;
  success: boolean;
};

export default function ForgotPasswordScreen({
  username,
  onUsernameChange,
  onSubmit,
  onBack,
  error,
  busy,
  success,
}: ForgotPasswordScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400 mb-6">
            Enter your username or email to receive a password reset link
          </p>

          {success ? (
            <div className="bg-green-900/30 border border-green-700 rounded p-4 mb-6">
              <p className="text-green-300 text-sm">
                If an account exists with that username or email, a reset link
                has been sent to your email.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your username or email"
                  disabled={busy}
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded p-3">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !username.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
              >
                {busy ? "Sending..." : "Send Reset Link"}
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
