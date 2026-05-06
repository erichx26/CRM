"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Settings as SettingsIcon, User, Download, Database, Save, Loader2 } from "lucide-react";

async function fetchProfile() {
  const res = await fetch("/api/users/me");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function updateProfile(data: { name: string }) {
  const res = await fetch("/api/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update");
  return res.json();
}

async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await fetch("/api/users/me/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to change password");
  }
  return res.json();
}

async function exportProperties() {
  const res = await fetch("/api/properties/export");
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `properties-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function exportActivity() {
  const res = await fetch("/api/activity/export");
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `activity-log-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

async function exportBackup() {
  const res = await fetch("/api/backup");
  if (!res.ok) throw new Error("Failed to export");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useState(() => {
    if (profile) setName(profile.name || "");
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordMsg("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    },
    onError: (err: Error) => {
      setPasswordMsg(err.message);
    },
  });

  const handleSaveName = () => {
    updateMutation.mutate({ name });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg("New password must be at least 6 characters");
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-[#94a3b8]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Nav */}
        <div className="glass-card p-4">
          <nav className="space-y-1">
            <a href="#profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-[#3b82f6]/10 text-[#3b82f6]">
              <User className="w-4 h-4" />
              My Profile
            </a>
            {isAdmin && (
              <>
                <a href="#data" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#161d2e]">
                  <Download className="w-4 h-4" />
                  Data Management
                </a>
                <a href="#backup" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#94a3b8] hover:text-white hover:bg-[#161d2e]">
                  <Database className="w-4 h-4" />
                  System Backup
                </a>
              </>
            )}
          </nav>
        </div>

        {/* Right Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Profile Section */}
          <div id="profile" className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              My Profile
            </h2>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-xl font-medium">
                {profile?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm text-[#94a3b8]">Avatar</p>
                <p className="text-xs text-[#64748b]">Auto-generated from name</p>
              </div>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#94a3b8] mb-1">Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                />
                <button
                  onClick={handleSaveName}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
              {updateMutation.isSuccess && <p className="text-xs text-[#22c55e] mt-1">Profile updated</p>}
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#94a3b8] mb-1">Email</label>
              <input
                type="email"
                value={profile?.email || ""}
                readOnly
                className="w-full px-4 py-2 bg-[#0f1520] border border-[#1e2738] rounded-lg text-[#64748b] cursor-not-allowed"
              />
              <p className="text-xs text-[#64748b] mt-1">Email cannot be changed</p>
            </div>

            {/* Change Password */}
            <div className="border-t border-[#1e2738] pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                />
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
                />
                <button
                  type="submit"
                  disabled={passwordMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg disabled:opacity-50"
                >
                  {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Change Password
                </button>
                {passwordMsg && (
                  <p className={`text-xs ${passwordMsg.includes("success") ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                    {passwordMsg}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Data Management Section (Admin Only) */}
          {isAdmin && (
            <div id="data" className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Data Management
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#161d2e] rounded-lg">
                  <h3 className="font-medium mb-1">Export Properties</h3>
                  <p className="text-sm text-[#94a3b8] mb-3">Download all properties as CSV file</p>
                  <button
                    onClick={exportProperties}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
                <div className="p-4 bg-[#161d2e] rounded-lg">
                  <h3 className="font-medium mb-1">Export Activity Log</h3>
                  <p className="text-sm text-[#94a3b8] mb-3">Download all activity history as CSV file</p>
                  <button
                    onClick={exportActivity}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Backup Section (Admin Only) */}
          {isAdmin && (
            <div id="backup" className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                System Backup
              </h2>
              <div className="p-4 bg-[#161d2e] rounded-lg">
                <h3 className="font-medium mb-1">Full Database Backup</h3>
                <p className="text-sm text-[#94a3b8] mb-3">Download complete database as JSON file including all properties, users, activities, and relations</p>
                <button
                  onClick={exportBackup}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-sm"
                >
                  <Database className="w-4 h-4" />
                  Download Backup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
