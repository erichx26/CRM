"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    addressRaw: "",
    city: "",
    state: "",
    zip: "",
    status: "NEW",
    priority: "MEDIUM",
    followUpDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      console.log("API Response:", data);
      if (!res.ok) {
        setError(data.error || "Failed to create property");
      } else {
        router.push(`/properties/${data.id}`);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Properties
      </Link>

      <div className="glass-card p-6">
        <h1 className="text-xl font-semibold mb-6">Add New Property</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
              Address *
            </label>
            <input
              type="text"
              value={form.addressRaw}
              onChange={(e) => setForm({ ...form, addressRaw: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] transition-all"
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] transition-all"
                placeholder="Phoenix"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] transition-all"
                placeholder="AZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                ZIP
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] transition-all"
                placeholder="85001"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
              >
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="CLOSED">Closed</option>
                <option value="DEAD">Dead</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                Follow-up Date
              </label>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg">
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Link
              href="/properties"
              className="px-4 py-2 border border-[#1e2738] text-[#94a3b8] hover:text-white rounded-lg transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Property"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
