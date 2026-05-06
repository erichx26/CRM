"use client";

import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Calendar,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

async function fetchStats() {
  const res = await fetch("/api/properties?limit=1000");
  const data = await res.json();
  return data.properties || [];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchStats,
    staleTime: 30000,
    refetchInterval: 10000,
  });

  const stats = {
    total: properties.length,
    new: properties.filter((p: { status: string }) => p.status === "NEW").length,
    contacted: properties.filter((p: { status: string }) => p.status === "CONTACTED").length,
    negotiating: properties.filter((p: { status: string }) => p.status === "NEGOTIATING").length,
    highPriority: properties.filter((p: { priority: string }) => p.priority === "HIGH").length,
    followUp: properties.filter((p: { followUpDate: string }) => {
      if (!p.followUpDate) return false;
      const followUp = new Date(p.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return followUp >= today;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-[#94a3b8]">Here&apos;s what&apos;s happening with your leads.</p>
        </div>
        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Total Properties",
            value: stats.total,
            icon: MapPin,
            color: "from-[#3b82f6] to-[#8b5cf6]",
            href: "/properties",
          },
          {
            label: "New Leads",
            value: stats.new,
            icon: TrendingUp,
            color: "from-[#22c55e] to-[#16a34a]",
            href: "/properties?status=NEW",
          },
          {
            label: "Contacted",
            value: stats.contacted,
            icon: Phone,
            color: "from-[#3b82f6] to-[#2563eb]",
            href: "/properties?status=CONTACTED",
          },
          {
            label: "In Negotiation",
            value: stats.negotiating,
            icon: Clock,
            color: "from-[#f59e0b] to-[#d97706]",
            href: "/properties?status=NEGOTIATING",
          },
          {
            label: "High Priority",
            value: stats.highPriority,
            icon: AlertCircle,
            color: "from-[#ef4444] to-[#dc2626]",
            href: "/properties?priority=HIGH",
          },
          {
            label: "Follow-up",
            value: stats.followUp,
            icon: Calendar,
            color: "from-[#ec4899] to-[#db2777]",
            href: "/properties?followUp=upcoming",
          },
        ].map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`glass-card p-5 animate-fade-in stagger-${i + 1} hover:bg-[#1e2738] transition-all group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#94a3b8]">{stat.label}</p>
                <p className="text-3xl font-semibold mt-1">{isLoading ? "..." : stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Priority */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">High Priority</h2>
            <Link href="/properties?priority=HIGH" className="text-sm text-[#ef4444] hover:underline">{stats.highPriority} properties</Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-[#94a3b8]">Loading...</p>
            ) : stats.highPriority === 0 ? (
              <p className="text-[#94a3b8]">No high priority properties.</p>
            ) : (
              properties
                .filter((p: { priority: string }) => p.priority === "HIGH")
                .slice(0, 5)
                .map((property: { id: string; addressRaw: string; city?: string; state?: string; priority: string }) => (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="flex items-center justify-between p-3 bg-[#161d2e] rounded-lg hover:bg-[#1e2738] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-[#ef4444]" />
                      <span className="text-sm font-medium">{property.addressRaw}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#94a3b8] group-hover:text-white" />
                  </Link>
                ))
            )}
          </div>
        </div>

        {/* Recent Properties */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Properties</h2>
            <Link href="/properties" className="text-sm text-[#3b82f6] hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-[#94a3b8]">Loading...</p>
            ) : properties.length === 0 ? (
              <p className="text-[#94a3b8]">No properties yet. Add your first lead!</p>
            ) : (
              properties.slice(0, 5).map((property: { id: string; addressRaw: string; city?: string; state?: string; status: string; priority: string }) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="flex items-center justify-between p-3 bg-[#161d2e] rounded-lg hover:bg-[#1e2738] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                    <span className="text-sm font-medium">{property.addressRaw}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#94a3b8] group-hover:text-white" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Follow Up Reminders */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Follow Up Needed</h2>
            <Link href="/properties?followUp=upcoming" className="text-sm text-[#f59e0b] hover:underline">{stats.followUp} pending</Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-[#94a3b8]">Loading...</p>
            ) : stats.followUp === 0 ? (
              <p className="text-[#94a3b8]">No follow-ups scheduled.</p>
            ) : (
              properties
                .filter((p: { followUpDate: string }) => {
                  if (!p.followUpDate) return false;
                  const followUp = new Date(p.followUpDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return followUp >= today;
                })
                .sort((a: { followUpDate: string }, b: { followUpDate: string }) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime())
                .slice(0, 5)
                .map((property: { id: string; addressRaw: string; city?: string; state?: string; followUpDate: string }) => (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="flex items-center justify-between p-3 bg-[#161d2e] rounded-lg hover:bg-[#1e2738] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#f59e0b]" />
                      <span className="text-sm font-medium">{property.addressRaw}{property.city ? `, ${property.city}` : ""}{property.state ? `, ${property.state}` : ""}</span>
                    </div>
                    <span className="text-xs text-[#94a3b8]">
                      {new Date(property.followUpDate).toLocaleDateString()}
                    </span>
                  </Link>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
