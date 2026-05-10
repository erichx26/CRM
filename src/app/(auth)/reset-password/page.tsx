"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Check, X } from "lucide-react";
import toast from "react-hot-toast";

function PasswordRule({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-[#22c55e]" : "text-[#94a3b8]"}`}>
      {met ? <Check className="w-3 h-3 text-[#22c55e]" /> : <X className="w-3 h-3 text-[#ef4444]" />}
      {label}
    </div>
  );
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Missing reset token");
      router.push("/login");
    }
  }, [token, router]);

  const isPasswordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("Please meet all password requirements");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
      } else {
        toast.success("Password reset! Sign in with your new password.");
        router.push("/login");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-[#080b12] via-[#0f1520] to-[#080b12]" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3b82f6]/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8b5cf6]/5 rounded-full blur-[128px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">New Chapter</h1>
            <p className="text-sm text-[#94a3b8]">Real Estate CRM</p>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-2">Set New Password</h2>
          <p className="text-sm text-[#94a3b8] mb-6">Choose a strong password that meets all requirements below.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#161d2e] border border-[#1e2738] rounded-lg">
              <p className="text-xs text-[#94a3b8] mb-2">Password must include:</p>
              <div className="space-y-1">
                <PasswordRule label="At least 8 characters" met={password.length >= 8} />
                <PasswordRule label="One uppercase letter" met={/[A-Z]/.test(password)} />
                <PasswordRule label="One lowercase letter" met={/[a-z]/.test(password)} />
                <PasswordRule label="One number" met={/[0-9]/.test(password)} />
                <PasswordRule label="One special character (!@#$...)" met={/[^A-Za-z0-9]/.test(password)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
                placeholder="••••••••"
              />
              {confirm && password !== confirm && (
                <p className="mt-1 text-xs text-[#ef4444]">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || password !== confirm}
              className="w-full py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
