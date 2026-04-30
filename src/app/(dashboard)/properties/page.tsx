"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  ArrowUpRight,
  X,
  Trash2,
  Check,
} from "lucide-react";

async function fetchProperties(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.search) searchParams.set("search", params.search);
  if (params.status) searchParams.set("status", params.status);
  if (params.priority) searchParams.set("priority", params.priority);

  const res = await fetch(`/api/properties?${searchParams.toString()}`);
  return res.json();
}

const statusColors: Record<string, string> = {
  NEW: "bg-[#22c55e]/10 text-[#22c55e]",
  CONTACTED: "bg-[#3b82f6]/10 text-[#3b82f6]",
  NEGOTIATING: "bg-[#f59e0b]/10 text-[#f59e0b]",
  CLOSED: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  DEAD: "bg-[#94a3b8]/10 text-[#94a3b8]",
};

const priorityColors: Record<string, string> = {
  HIGH: "text-[#ef4444]",
  MEDIUM: "text-[#f59e0b]",
  LOW: "text-[#22c55e]",
};

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#94a3b8]">Loading...</div>}>
      <PropertiesContent />
    </Suspense>
  );
}

function PropertiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(25);

  const page = parseInt(searchParams.get("page") || "1");
  const { data, isLoading } = useQuery({
    queryKey: ["properties", { page, search, status, priority, limit }],
    queryFn: () => fetchProperties({ page, limit, search, status, priority }),
  });

  const properties = data?.properties || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/properties/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setSelectedIds([]);
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    router.push(`/properties?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPriority("");
    router.push("/properties");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === properties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(properties.map((p: { id: string }) => p.id));
    }
  }

  function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected properties?`)) return;
    deleteMutation.mutate(selectedIds);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address or city..."
              className="w-full pl-10 pr-4 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-white placeholder-[#94a3b8] focus:outline-none focus:border-[#3b82f6] transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
              showFilters || status || priority
                ? "bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]"
                : "bg-[#161d2e] border-[#1e2738] text-[#94a3b8] hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-all"
          >
            Search
          </button>
        </form>

        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4 animate-fade-in">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-sm text-white"
            >
              <option value="">All Status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="CLOSED">Closed</option>
              <option value="DEAD">Dead</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-2 bg-[#161d2e] border border-[#1e2738] rounded-lg text-sm text-white"
            >
              <option value="">All Priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {(status || priority) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-[#94a3b8] hover:text-white"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Batch Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 glass-card animate-fade-in">
          <p className="text-sm text-[#94a3b8]">
            {selectedIds.length} selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 border border-[#1e2738] text-[#94a3b8] hover:text-white rounded-lg text-sm"
            >
              Clear Selection
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] rounded-lg text-sm hover:bg-[#ef4444]/20 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#94a3b8]">Loading...</div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#94a3b8]">No properties found.</p>
            <Link href="/properties/new" className="text-[#3b82f6] hover:underline mt-2 inline-block">
              Add your first property
            </Link>
          </div>
        ) : (
          <>
            {/* List Header with Select All and Page Size */}
            <div className="flex items-center justify-between p-4 border-b border-[#1e2738]">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white"
              >
                <Check className="w-4 h-4" />
                {selectedIds.length === properties.length ? "Deselect All" : "Select All"}
              </button>
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#94a3b8]">
                  {pagination.total} properties
                </p>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value));
                    setSelectedIds([]);
                  }}
                  className="px-2 py-1 bg-[#161d2e] border border-[#1e2738] rounded-lg text-sm text-white"
                >
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-[#1e2738]">
              {properties.map((property: {
                id: string;
                addressRaw: string;
                city?: string;
                state?: string;
                status: string;
                priority: string;
                followUpDate?: string;
              }) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-4 hover:bg-[#161d2e] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSelect(property.id);
                      }}
                      className={`p-2 rounded-lg border transition-all ${
                        selectedIds.includes(property.id)
                          ? "bg-[#3b82f6] border-[#3b82f6] text-white"
                          : "bg-[#161d2e] border-[#1e2738] text-[#94a3b8] hover:border-[#3b82f6]"
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <Link href={`/properties/${property.id}`} className="flex items-center gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-[#161d2e] group-hover:bg-[#1e2738]">
                        <MapPin className="w-5 h-5 text-[#3b82f6]" />
                      </div>
                      <div>
                        <p className="font-medium">{property.addressRaw}</p>
                        <p className="text-sm text-[#94a3b8]">
                          {[property.city, property.state].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </Link>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          statusColors[property.status]
                        }`}
                      >
                        {property.status}
                      </span>
                      <span className={`text-sm font-medium ${priorityColors[property.priority]}`}>
                        {property.priority}
                      </span>
                    </div>
                    {property.followUpDate && (
                      <div className="flex items-center gap-1 text-sm text-[#f59e0b]">
                        <Calendar className="w-4 h-4" />
                        {new Date(property.followUpDate).toLocaleDateString()}
                      </div>
                    )}
                    <ArrowUpRight className="w-4 h-4 text-[#94a3b8] group-hover:text-white" />
                  </div>
                </div>
              ))}
            </div>

            {/* Select All Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#1e2738]">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white"
              >
                <Check className="w-4 h-4" />
                {selectedIds.length === properties.length ? "Deselect All" : "Select All"}
              </button>
              <p className="text-sm text-[#94a3b8]">
                {pagination.total} total properties
              </p>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#1e2738]">
                <p className="text-sm text-[#94a3b8]">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", (page - 1).toString());
                      router.push(`/properties?${params.toString()}`);
                    }}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-[#161d2e] text-[#94a3b8] hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", (page + 1).toString());
                      router.push(`/properties?${params.toString()}`);
                    }}
                    disabled={page === pagination.pages}
                    className="p-2 rounded-lg bg-[#161d2e] text-[#94a3b8] hover:text-white disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
