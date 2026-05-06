"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { User, Download, Database, Save, Loader2, Plus, Trash2, Key, X } from "lucide-react";

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

async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function createUser(data: { email: string; password: string; name: string; role: string }) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to create user");
  return body;
}

async function updateUser(id: string, data: { name?: string; role?: string }) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to update user");
  }
  return res.json();
}

async function deleteUser(id: string) {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || "Failed to delete user");
  }
  return res.json();
}

async function resetUserPassword(id: string) {
  const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Failed to reset password");
  return body;
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

  // User management
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: "", password: "", name: "", role: "POWER_USER" });
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");
  const [resetPasswordResult, setResetPasswordResult] = useState<{ id: string; tempPassword: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

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

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      setAddUserSuccess(`User created! Temp password: ${data.tempPassword}`);
      setAddUserError("");
      setNewUserForm({ email: "", password: "", name: "", role: "POWER_USER" });
      refetchUsers();
      setTimeout(() => setAddUserSuccess(""), 10000);
    },
    onError: (err: Error) => {
      setAddUserError(err.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: string } }) => updateUser(id, data),
    onSuccess: () => {
      refetchUsers();
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      refetchUsers();
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (data) => {
      setResetPasswordResult({ id: data.id, tempPassword: data.tempPassword });
      setTimeout(() => setResetPasswordResult(null), 30000);
    },
    onError: (err: Error) => {
      alert(err.message);
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Row 1: My Profile + User Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Profile Section */}
        <div id="profile" className="glass-card p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            My Profile
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-lg font-medium">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm text-[#94a3b8]">Avatar</p>
              <p className="text-xs text-[#64748b]">Auto-generated from name</p>
            </div>
          </div>

          {/* Name */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-[#94a3b8] mb-1">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white text-sm"
              />
              <button
                onClick={handleSaveName}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
            {updateMutation.isSuccess && <p className="text-xs text-[#22c55e] mt-1">Profile updated</p>}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#94a3b8] mb-1">Email</label>
            <input
              type="email"
              value={profile?.email || ""}
              readOnly
              className="w-full px-3 py-2 bg-[#0f1520] border border-[#1e2738] rounded-lg text-[#64748b] cursor-not-allowed text-sm"
            />
            <p className="text-xs text-[#64748b] mt-1">Email cannot be changed</p>
          </div>

          {/* Change Password */}
          <div className="border-t border-[#1e2738] pt-3 mt-3">
            <h3 className="text-sm font-medium mb-2">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-2">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white text-sm"
              />
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white text-sm"
              />
              <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm disabled:opacity-50"
              >
                {passwordMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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

        {/* User Management Section (Admin Only) */}
        {isAdmin && (
          <div id="users" className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                User Management
              </h2>
              <button
                onClick={() => { setShowAddUser(true); setAddUserError(""); setAddUserSuccess(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add User
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="mb-4 p-3 bg-[#161d2e] rounded-lg border border-[#1e2738]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">New User</p>
                  <button onClick={() => setShowAddUser(false)} className="text-[#94a3b8] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="px-2.5 py-1.5 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-xs"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="px-2.5 py-1.5 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-xs"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="px-2.5 py-1.5 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-xs"
                  />
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="px-2.5 py-1.5 bg-[#0f1520] border border-[#1e2738] rounded-lg text-white text-xs"
                  >
                    <option value="POWER_USER">Power User</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {addUserError && <p className="text-xs text-[#ef4444] mt-1.5">{addUserError}</p>}
                {addUserSuccess && <p className="text-xs text-[#22c55e] mt-1.5">{addUserSuccess}</p>}
                <button
                  onClick={() => {
                    if (!newUserForm.email || !newUserForm.password || !newUserForm.name) {
                      setAddUserError("All fields required");
                      return;
                    }
                    if (newUserForm.password.length < 6) {
                      setAddUserError("Min 6 characters");
                      return;
                    }
                    createUserMutation.mutate(newUserForm);
                  }}
                  disabled={createUserMutation.isPending}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs disabled:opacity-50"
                >
                  {createUserMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create User
                </button>
              </div>
            )}

            {/* Reset Password Result */}
            {resetPasswordResult && (
              <div className="mb-3 p-2.5 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg">
                <p className="text-xs text-[#22c55e]">
                  Temp password: <strong>{resetPasswordResult.tempPassword}</strong>
                </p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">Share with user — they should change it after login.</p>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#94a3b8] border-b border-[#1e2738]">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u: { id: string; name: string; email: string; role: string }) => (
                    <tr key={u.id} className="border-b border-[#1e2738]/50">
                      <td className="py-2 text-white">{u.name}</td>
                      <td className="py-2 text-[#94a3b8]">{u.email}</td>
                      <td className="py-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                          disabled={updateUserMutation.isPending}
                          className="px-1.5 py-0.5 bg-[#161d2e] border border-[#1e2738] rounded text-white"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="POWER_USER">Power User</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => resetPasswordMutation.mutate(u.id)}
                            disabled={resetPasswordMutation.isPending}
                            className="p-1 bg-[#f59e0b]/10 text-[#f59e0b] rounded hover:bg-[#f59e0b]/20 disabled:opacity-50"
                            title="Reset password"
                          >
                            <Key className="w-3 h-3" />
                          </button>
                          {deleteConfirm === u.id ? (
                            <>
                              <button
                                onClick={() => deleteUserMutation.mutate(u.id)}
                                disabled={deleteUserMutation.isPending}
                                className="px-1.5 py-0.5 bg-[#ef4444] text-white rounded text-[10px]"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-1.5 py-0.5 bg-[#1e2738] text-[#94a3b8] rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="p-1 bg-[#ef4444]/10 text-[#ef4444] rounded hover:bg-[#ef4444]/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users?.length === 0 && (
                <p className="text-xs text-[#94a3b8] py-3 text-center">No other users yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Data Management + System Backup (Admin Only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Data Management Section */}
          <div id="data" className="glass-card p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Data Management
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-[#161d2e] rounded-lg">
                <h3 className="font-medium text-sm mb-0.5">Export Properties</h3>
                <p className="text-xs text-[#94a3b8] mb-2">Download all properties as CSV</p>
                <button
                  onClick={exportProperties}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
              <div className="p-3 bg-[#161d2e] rounded-lg">
                <h3 className="font-medium text-sm mb-0.5">Export Activity Log</h3>
                <p className="text-xs text-[#94a3b8] mb-2">Download all activity history as CSV</p>
                <button
                  onClick={exportActivity}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>

          {/* System Backup Section */}
          <div id="backup" className="glass-card p-5">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              System Backup
            </h2>
            <div className="p-3 bg-[#161d2e] rounded-lg">
              <h3 className="font-medium text-sm mb-0.5">Full Database Backup</h3>
              <p className="text-xs text-[#94a3b8] mb-3">Download complete database as JSON including all properties, users, activities, and relations</p>
              <button
                onClick={exportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg text-xs"
              >
                <Database className="w-3.5 h-3.5" />
                Download Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
